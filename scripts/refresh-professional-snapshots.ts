/**
 * Rebuild the QA/cache feature snapshots from the normalized compatibility
 * view. The scoring engine continues using live reconstructAtStage(); these
 * rows are not a production scoring source.
 */

import { createHash } from 'node:crypto';
import { config as loadEnv } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

import {
  CAREER_COMPASS_DERIVATION_VERSION,
  PROFESSIONAL_FEATURE_VERSION,
} from '../lib/career-compass/taxonomy.js';
import { parseProfessionalRowsOrThrow } from '../lib/scoring/professional-adapter.js';
import { reconstructAtStage } from '../lib/scoring/snapshot.js';
import type { Professional, Stage } from '../lib/scoring/types.js';

loadEnv();

const DRY_RUN = process.argv.includes('--dry-run');
const STAGES: readonly Stage[] = ['S0', 'S1', 'S2', 'S3', 'S4', 'S5'];

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

function hash(value: unknown): string {
  return createHash('sha256').update(stableStringify(value)).digest('hex');
}

function sourceHashes(professional: Professional) {
  return {
    education_source_hash: hash({
      university: professional.university,
      university_tier: professional.university_tier,
      degree: professional.degree,
      degree_type: professional.degree_type,
      majors: professional.majors,
      wam_band: professional.wam_band,
      graduation_year: professional.graduation_year,
      has_honours: professional.has_honours,
      has_masters_or_second_degree: professional.has_masters_or_second_degree,
      high_school: professional.high_school,
      high_school_type: professional.high_school_type,
      atar_band: professional.atar_band,
    }),
    experience_source_hash: hash(professional.experiences),
    achievement_source_hash: hash(professional.signals),
  };
}

async function main() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');

  const client = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await client.from('professional_scoring_input_v1').select('*');
  if (error || !data) throw new Error('Normalized professional source query failed');
  const professionals = parseProfessionalRowsOrThrow(data, 'normalized');
  const asOfDate = new Date().toISOString().slice(0, 10);

  const rows = professionals.flatMap((professional) => {
    const hashes = sourceHashes(professional);
    return STAGES.map((stage) => {
      const snapshot = reconstructAtStage(professional, stage);
      return {
        professional_id: professional.id,
        career_stage: stage,
        feature_version: PROFESSIONAL_FEATURE_VERSION,
        derivation_version: CAREER_COMPASS_DERIVATION_VERSION,
        as_of_date: asOfDate,
        computed_fields: snapshot.computed,
        knownness: {
          wam_known: professional.wam_band !== 'unknown',
          atar_known: professional.atar_band !== 'unknown',
          graduation_year_known: professional.graduation_year !== null,
          all_experience_durations_known: professional.experiences.every(
            (experience) => experience.duration_months !== null,
          ),
        },
        ...hashes,
      };
    });
  });

  if (DRY_RUN) {
    console.log(JSON.stringify({ professionals: professionals.length, snapshots: rows.length }));
    return;
  }

  const { error: writeError } = await client
    .from('professional_feature_snapshots')
    .upsert(rows, {
      onConflict: 'professional_id,career_stage,feature_version,as_of_date',
    });
  if (writeError) throw new Error('Feature snapshot upsert failed');
  console.log(JSON.stringify({ professionals: professionals.length, snapshots: rows.length }));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Snapshot refresh failed');
  process.exitCode = 1;
});
