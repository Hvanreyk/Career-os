/**
 * Phase 1 import script.
 *
 * Reads Database_v7_clean.xlsx, validates every row against the Zod
 * schema in lib/scoring/types.ts, upserts the legacy professionals table, then
 * invokes the idempotent normalized refresh transaction. The website remains
 * legacy-authoritative until shadow parity passes.
 *
 * Usage:
 *   tsx scripts/import-csv.ts --dry-run     # validate only, no DB writes
 *   tsx scripts/import-csv.ts                # validate + upsert
 *   tsx scripts/import-csv.ts --reject-test  # inject a bad row, expect rejection
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { config as loadEnv } from 'dotenv';
import * as XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';
import { ZodError } from 'zod';

import {
  ProfessionalRowSchema,
  flattenForDb,
  type ProfessionalRow,
} from '../lib/scoring/types.js';

loadEnv();

const argv = new Set(process.argv.slice(2));
const REJECT_TEST = argv.has('--reject-test');
// reject-test implies dry-run — it's a validation test, not a DB write test.
const DRY_RUN = argv.has('--dry-run') || REJECT_TEST;

const XLSX_PATH =
  process.env.DATABASE_XLSX_PATH ??
  '/Users/hudsonvanreyk/Downloads/claude codev1/Database_v7_clean.xlsx';

// ============================================================
// Cell normalisation
// ============================================================
//
// xlsx returns cells as strings/numbers/null. The Zod schema is
// strict about types (booleans must be booleans, ints must be ints).
// These helpers normalise raw cell values BEFORE validation.

function isBlank(v: unknown): boolean {
  return v === null || v === undefined || (typeof v === 'string' && v.trim() === '');
}

function asString(v: unknown): string | null {
  if (isBlank(v)) return null;
  return String(v).trim();
}

function asInt(v: unknown): number | null {
  if (isBlank(v)) return null;
  const n = typeof v === 'number' ? v : Number(String(v).trim());
  if (!Number.isFinite(n) || !Number.isInteger(n)) {
    throw new Error(`expected integer, got ${JSON.stringify(v)}`);
  }
  return n;
}

function asBool(v: unknown): boolean {
  // Strict: only literal 'TRUE' / 'FALSE' (or real booleans). No truthy/falsy coercion.
  if (typeof v === 'boolean') return v;
  if (typeof v === 'string') {
    const s = v.trim().toUpperCase();
    if (s === 'TRUE') return true;
    if (s === 'FALSE') return false;
  }
  throw new Error(`expected TRUE/FALSE boolean, got ${JSON.stringify(v)}`);
}

function asConvertedToFt(v: unknown): boolean | 'NA' {
  if (typeof v === 'string' && v.trim().toUpperCase() === 'NA') return 'NA';
  return asBool(v);
}

function parseSignals(raw: unknown): string[] {
  if (isBlank(raw)) return [];
  return String(raw)
    .split(',')
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

// ============================================================
// Build one ProfessionalRow from a raw xlsx row dict
// ============================================================

type RawRow = Record<string, unknown>;

function buildExpSlot(raw: RawRow, n: 1 | 2 | 3 | 4 | 5) {
  const k = (suffix: string) => raw[`exp${n}_${suffix}`];
  // Slot is "empty" only if all 10 cells are blank. Anything in
  // between (some filled, some not) gets passed through and Zod
  // will reject it.
  const cells = [
    k('type'), k('firm'), k('firm_tier'), k('industry'),
    k('role_function'), k('role_relevance'), k('year'),
    k('duration_months'), k('how_obtained'), k('converted_to_ft'),
  ];
  const allBlank = cells.every(isBlank);
  if (allBlank) {
    return {
      type: null, firm: null, firm_tier: null, industry: null,
      role_function: null, role_relevance: null, year: null,
      duration_months: null, how_obtained: null, converted_to_ft: null,
    };
  }
  return {
    type: asString(k('type')),
    firm: asString(k('firm')),
    firm_tier: asString(k('firm_tier')),
    industry: asString(k('industry')),
    role_function: asString(k('role_function')),
    role_relevance: asInt(k('role_relevance')),
    year: asInt(k('year')),
    duration_months: asInt(k('duration_months')),
    how_obtained: asString(k('how_obtained')),
    converted_to_ft: isBlank(k('converted_to_ft'))
      ? null
      : asConvertedToFt(k('converted_to_ft')),
  };
}

function normaliseRow(raw: RawRow): unknown {
  return {
    // Identity
    id: asString(raw.id),
    full_name_internal: asString(raw.full_name_internal),
    linkedin_url_internal: asString(raw.linkedin_url_internal),

    // Current state
    current_role: asString(raw.current_role),
    current_firm: asString(raw.current_firm),
    current_firm_tier: asString(raw.current_firm_tier),
    current_geography: asString(raw.current_geography),
    current_role_start_year: asInt(raw.current_role_start_year),
    years_to_current_role: asInt(raw.years_to_current_role),

    // Education
    university: asString(raw.university),
    university_tier: asString(raw.university_tier),
    degree: asString(raw.degree),
    degree_type: asString(raw.degree_type),
    majors: asString(raw.majors),
    wam_band: asString(raw.wam_band),
    graduation_year: asInt(raw.graduation_year),
    has_honours: asBool(raw.has_honours),
    has_masters_or_second_degree: asBool(raw.has_masters_or_second_degree),
    secondary_education_notes: asString(raw.secondary_education_notes),
    education_achievements: asString(raw.education_achievements),
    high_school: asString(raw.high_school),
    high_school_type: asString(raw.high_school_type),
    atar_band: asString(raw.atar_band),

    // Experience slots
    exp1: buildExpSlot(raw, 1),
    exp2: buildExpSlot(raw, 2),
    exp3: buildExpSlot(raw, 3),
    exp4: buildExpSlot(raw, 4),
    exp5: buildExpSlot(raw, 5),

    // Signals + meta
    signals: parseSignals(raw.signals),
    extra_experiences_notes: asString(raw.extra_experiences_notes),
    path_summary: asString(raw.path_summary),
    data_source: asString(raw.data_source),
    data_confidence: asString(raw.data_confidence),
    notes: asString(raw.notes),
    date_added: asString(raw.date_added),
  };
}

// ============================================================
// Read all rows from the xlsx
// ============================================================

function readRows(path: string): RawRow[] {
  const buf = readFileSync(resolve(path));
  const wb = XLSX.read(buf, { type: 'buffer' });
  const sheet = wb.Sheets['professionals'];
  if (!sheet) throw new Error(`Sheet 'professionals' not found in ${path}`);
  // raw: false => xlsx coerces to strings/numbers as displayed.
  // defval: null => empty cells become null (not undefined keys).
  return XLSX.utils.sheet_to_json<RawRow>(sheet, { raw: false, defval: null });
}

// ============================================================
// Main
// ============================================================

interface Reject {
  rowIndex: number; // 1-based, matches xlsx row numbers (header is row 1, data starts at row 2)
  id: string | null;
  errors: string[];
}

function formatZodError(err: ZodError): string[] {
  return err.errors.map(e => `${e.path.join('.') || '<root>'}: ${e.message}`);
}

async function main() {
  console.log(`Reading: ${XLSX_PATH}`);
  let rawRows = readRows(XLSX_PATH);
  console.log(`Loaded ${rawRows.length} raw rows from sheet 'professionals'`);

  if (REJECT_TEST) {
    // Inject a bad row at the end with a deliberately invalid enum value.
    const bad: RawRow = { ...rawRows[0], id: 'P999', current_firm_tier: 'tier_one_invalid' };
    rawRows = [...rawRows, bad];
    console.log("→ Injected synthetic row P999 with current_firm_tier='tier_one_invalid'");
  }

  const validated: ProfessionalRow[] = [];
  const rejects: Reject[] = [];

  rawRows.forEach((raw, i) => {
    const xlsxRowNum = i + 2; // header is row 1
    const id = asString(raw.id);
    try {
      const normalised = normaliseRow(raw);
      const parsed = ProfessionalRowSchema.parse(normalised);
      validated.push(parsed);
    } catch (err) {
      const errors =
        err instanceof ZodError
          ? formatZodError(err)
          : [(err as Error).message];
      rejects.push({ rowIndex: xlsxRowNum, id, errors });
    }
  });

  console.log(`\nValidation: ${validated.length} ok, ${rejects.length} rejected`);
  if (rejects.length > 0) {
    console.error('\n--- REJECTED ROWS ---');
    for (const r of rejects) {
      console.error(`  row ${r.rowIndex} (id=${r.id ?? 'n/a'}):`);
      for (const e of r.errors) console.error(`    - ${e}`);
    }
  }

  // Distribution checks against the brief
  const tierCounts = validated.reduce<Record<string, number>>((acc, r) => {
    acc[r.current_firm_tier] = (acc[r.current_firm_tier] ?? 0) + 1;
    return acc;
  }, {});
  console.log('\nDistribution: current_firm_tier =', tierCounts);

  // Signal-tag sanity: every parsed signal already validated against
  // SignalTag enum, but log the unique set for visibility.
  const signalSet = new Set<string>();
  for (const r of validated) for (const s of r.signals) signalSet.add(s);
  console.log(`Distinct signals across dataset: ${signalSet.size}`);

  // In --reject-test mode the bad row MUST have been rejected.
  if (REJECT_TEST) {
    const rejectedIds = rejects.map(r => r.id);
    if (!rejectedIds.includes('P999')) {
      console.error('\n[FAIL] reject-test: P999 should have been rejected.');
      process.exit(2);
    }
    console.log('\n[PASS] reject-test: P999 was rejected as expected.');
  }

  if (DRY_RUN) {
    console.log('\nDry run — no DB writes.');
    process.exit(rejects.length === (REJECT_TEST ? 1 : 0) ? 0 : 1);
  }

  if (rejects.length > 0) {
    console.error('\nImport aborted — all rows must validate before any DB writes.');
    process.exit(1);
  }

  // ----- DB upsert -----
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error(
      '\nMissing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. ' +
      'Set them in .env or run with --dry-run.',
    );
    process.exit(1);
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const flatRows = validated.map(flattenForDb);
  console.log(`\nUpserting ${flatRows.length} rows into professionals…`);

  // Upsert in one batch (the current professional cohort is intentionally small).
  const { error, count } = await supabase
    .from('professionals')
    .upsert(flatRows, { onConflict: 'id', count: 'exact' });

  if (error) {
    console.error('Supabase error:', error);
    process.exit(1);
  }

  console.log(`✓ Upsert ok. Rows affected: ${count ?? 'n/a'}`);

  const professionalIds = validated.map((row) => row.id);
  const { data: normalizationRunId, error: normalizationError } = await supabase
    .rpc('refresh_normalized_professionals_from_legacy', {
      p_professional_ids: professionalIds,
    });
  if (normalizationError || !normalizationRunId) {
    console.error('Normalized refresh RPC failed:', normalizationError);
    process.exit(1);
  }

  const { data: normalizationRun, error: runError } = await supabase
    .from('professional_normalization_runs')
    .select('status, professional_count, education_count, experience_count, achievement_count, quarantine_count')
    .eq('run_id', normalizationRunId)
    .single();
  if (runError || !normalizationRun || normalizationRun.status !== 'complete') {
    console.error('Normalized refresh did not complete:', runError ?? normalizationRun?.status);
    process.exit(1);
  }
  console.log('✓ Normalized refresh complete:', normalizationRun);

  // Verification queries (Phase 1 acceptance criteria)
  const { count: bbCount, error: bbErr } = await supabase
    .from('professionals')
    .select('*', { count: 'exact', head: true })
    .eq('current_firm_tier', 'bb');
  if (bbErr) {
    console.error('Verification query failed:', bbErr);
    process.exit(1);
  }
  const expectedBbCount = validated.filter((row) => row.current_firm_tier === 'bb').length;
  console.log(`bb-tier count: ${bbCount} (expected ${expectedBbCount})`);

  const { count: totalCount } = await supabase
    .from('professionals')
    .select('*', { count: 'exact', head: true });
  console.log(`total count: ${totalCount} (expected at least ${validated.length})`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
