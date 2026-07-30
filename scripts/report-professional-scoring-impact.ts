/**
 * One-time aggregate comparison between the Release A compatibility view and
 * the canonical normalized scoring view. The output contains no professional
 * identifiers or private fields and intentionally does not fail merely because
 * reviewed data cleanup changes scores.
 */

import { config as loadEnv } from 'dotenv';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { score } from '../lib/scoring/index.js';
import { parseProfessionalRowsOrThrow } from '../lib/scoring/professional-adapter.js';
import type { Professional } from '../lib/scoring/types.js';
import {
  LATERAL_BIG4_AUDIT,
  TEST_NOW,
  Y2_FOUNDATION,
  Y2_UNSW_COOP_HD_JPM,
  Y3_NO_IB_PRE_RECRUITING,
  Y6_EXTENDED_DEGREE,
} from '../tests/scoring/fixtures.js';
import {
  summarizeProfessionalParity,
  summarizeScoringParity,
} from '../web/lib/professionals/parity.js';

loadEnv();

const PAGE_SIZE = 500;

async function readView(client: SupabaseClient, view: string): Promise<Professional[]> {
  const rows: unknown[] = [];
  let lastId: string | undefined;

  for (;;) {
    let query = client
      .from(view)
      .select('*')
      .order('id', { ascending: true })
      .limit(PAGE_SIZE);
    if (lastId) query = query.gt('id', lastId);

    const { data, error } = await query;
    if (error || !data) throw new Error(`${view} query failed`);
    rows.push(...data);
    if (data.length < PAGE_SIZE) break;

    const nextId = (data[data.length - 1] as { id?: unknown } | undefined)?.id;
    if (typeof nextId !== 'string' || nextId === lastId) {
      throw new Error(`${view} pagination did not advance`);
    }
    lastId = nextId;
  }

  return parseProfessionalRowsOrThrow(rows, 'normalized');
}

async function main(): Promise<void> {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  }

  const client = createClient(url, key, { auth: { persistSession: false } });
  const [releaseA, canonical] = await Promise.all([
    readView(client, 'professional_scoring_input_v1'),
    readView(client, 'professional_scoring_input'),
  ]);

  const fixtures = [
    Y2_FOUNDATION,
    Y2_UNSW_COOP_HD_JPM,
    Y3_NO_IB_PRE_RECRUITING,
    Y6_EXTENDED_DEGREE,
    LATERAL_BIG4_AUDIT,
  ];
  const comparisons = fixtures.map((fixture) => summarizeScoringParity(
    score(fixture, releaseA, { now: TEST_NOW }),
    score(fixture, canonical, { now: TEST_NOW }),
  ));

  const result = {
    dataset: summarizeProfessionalParity(releaseA, canonical),
    scoring_fixture_count: comparisons.length,
    exact_fixture_count: comparisons.filter((comparison) => comparison.exact).length,
    tolerance_equivalent_fixture_count: comparisons.filter(
      (comparison) => comparison.equivalent_within_tolerance,
    ).length,
    differing_leaf_count: comparisons.reduce(
      (total, comparison) => total + comparison.differing_leaf_count,
      0,
    ),
  };

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Scoring impact report failed');
  process.exitCode = 1;
});
