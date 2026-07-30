/**
 * Read-only Release A gate. Compares legacy and normalized professional
 * sources, then runs both through the same scoring fixture matrix. Output is
 * aggregate-only and safe for deployment logs.
 */

import { config as loadEnv } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

import { score } from '../lib/scoring/index.js';
import { parseProfessionalRowsOrThrow } from '../lib/scoring/professional-adapter.js';
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

async function main() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  }

  const client = createClient(url, key, { auth: { persistSession: false } });
  const [legacyResult, normalizedResult] = await Promise.all([
    client.from('professionals').select('*'),
    client.from('professional_scoring_input_v1').select('*'),
  ]);
  if (legacyResult.error || !legacyResult.data) {
    throw new Error('Legacy professional source query failed');
  }
  if (normalizedResult.error || !normalizedResult.data) {
    throw new Error('Normalized professional source query failed');
  }

  const legacy = parseProfessionalRowsOrThrow(legacyResult.data, 'legacy');
  const normalized = parseProfessionalRowsOrThrow(normalizedResult.data, 'normalized');
  const sourceParity = summarizeProfessionalParity(legacy, normalized);

  const fixtures = [
    Y2_FOUNDATION,
    Y2_UNSW_COOP_HD_JPM,
    Y3_NO_IB_PRE_RECRUITING,
    Y6_EXTENDED_DEGREE,
    LATERAL_BIG4_AUDIT,
  ];
  const scoringParity = fixtures.map((fixture) => summarizeScoringParity(
    score(fixture, legacy, { now: TEST_NOW }),
    score(fixture, normalized, { now: TEST_NOW }),
  ));

  const result = {
    source: sourceParity,
    scoring_fixture_count: fixtures.length,
    scoring_exact_count: scoringParity.filter((entry) => entry.exact).length,
    scoring_tolerance_equivalent_count: scoringParity.filter(
      (entry) => entry.equivalent_within_tolerance,
    ).length,
    scoring_differing_leaf_count: scoringParity.reduce(
      (total, entry) => total + entry.differing_leaf_count,
      0,
    ),
  };
  console.log(JSON.stringify(result, null, 2));

  if (!sourceParity.exact || scoringParity.some((entry) => !entry.equivalent_within_tolerance)) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : 'Professional parity check failed');
  process.exitCode = 1;
});
