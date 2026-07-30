/**
 * Pulls the real scoring-ready professional cohort from Supabase's
 * `professional_scoring_input` view for LOCAL, real-data-backed work (mainly
 * scripts/compass-calibration.ts). Writes to a git-ignored local-only path —
 * this must NEVER be committed.
 *
 * The canonical Professional shape excludes name/LinkedIn identity, but the
 * education fields (esp. `high_school`) can still be individually
 * re-identifying once combined with university/firm/year — real people did
 * not consent to their career history being committed into permanent git
 * history. The scoring test-suite instead runs against a fully synthetic,
 * committed fixture — see scripts/generate-synthetic-professionals.ts and
 * tests/scoring/professionals.snapshot.json.
 *
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/snapshot-professionals.ts
 */
import 'dotenv/config';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { parseProfessionalRowsOrThrow } from '../lib/scoring/professional-adapter.js';

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (service role) to snapshot.');
  process.exit(1);
}

const supabase = createClient(url, key);
const PAGE = 50;

async function main() {
  const rows: Record<string, unknown>[] = [];
  let lastId = '';
  for (;;) {
    const { data, error } = await supabase
      .from('professional_scoring_input')
      .select('*')
      .gt('id', lastId)
      .order('id', { ascending: true })
      .limit(PAGE);
    if (error) throw error;
    if (!data || data.length === 0) break;
    rows.push(...(data as Record<string, unknown>[]));
    lastId = String(data[data.length - 1]!.id);
    if (data.length < PAGE) break;
  }

  // Validate through the same adapter the app and tests use — fail loudly if
  // the live view emits anything the scoring schema would reject.
  parseProfessionalRowsOrThrow(rows, 'normalized');
  rows.sort((a, b) => String(a.id).localeCompare(String(b.id)));

  // Local-only, git-ignored — see the module docstring for why this must
  // never be the committed test fixture.
  const out = resolve('tests/scoring/professionals.snapshot.local.json');
  writeFileSync(out, `${JSON.stringify(rows, null, 2)}\n`);
  console.log(`Wrote ${rows.length} scoring-ready professionals to ${out} (local-only, not committed)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
