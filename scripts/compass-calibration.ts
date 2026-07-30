/**
 * Competitiveness calibration harness.
 *
 * The scorecard claims a higher index means a stronger IB candidate. This
 * script sanity-checks that against the REAL cohort: for each scoring-ready
 * professional, reconstruct the profile they had around their penultimate
 * year, compute the (tier-independent) competitiveness index, and compare it
 * to the tier they ACTUALLY reached. If the index is meaningful, higher index
 * should track a higher achieved tier.
 *
 * Because the database is survivors-only (everyone made it into IB), this
 * validates the index's DIRECTION and monotonicity, not an absolute
 * probability. Real probability calibration needs tracked student outcomes.
 *
 * Requires real data — run scripts/snapshot-professionals.ts first (needs
 * Supabase service-role credentials) to produce the local, git-ignored
 * snapshot this reads. Deliberately NOT the committed synthetic test fixture:
 * calibrating against fabricated data would be meaningless.
 *
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/snapshot-professionals.ts
 *   npx tsx scripts/compass-calibration.ts
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseProfessionalRowsOrThrow } from '../lib/scoring/professional-adapter.js';
import { reconstructAtStage } from '../lib/scoring/snapshot.js';
import { computeScorecard } from '../lib/scoring/scorecard.js';
import { TIER_LEVEL, type Professional, type StudentProfile } from '../lib/scoring/types.js';

const SNAPSHOT_PATH = resolve('tests/scoring/professionals.snapshot.local.json');
if (!existsSync(SNAPSHOT_PATH)) {
  console.error(
    `No local real-data snapshot found at ${SNAPSHOT_PATH}.\n` +
    'Run scripts/snapshot-professionals.ts first (requires Supabase service-role credentials):\n' +
    '  SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/snapshot-professionals.ts',
  );
  process.exit(1);
}
const rows = JSON.parse(readFileSync(SNAPSHOT_PATH, 'utf8')) as unknown[];
const pros = parseProfessionalRowsOrThrow(rows, 'normalized');

// Build a student-shaped profile from a professional's education fields.
function asStudent(p: Professional): StudentProfile {
  return {
    id: p.id, email: `${p.id}@example.com`,
    university: p.university, university_tier: p.university_tier,
    degree: p.degree, degree_type: p.degree_type,
    majors: p.majors ? p.majors.split(',').map(s => s.trim()) : [],
    current_year: 3, expected_graduation_year: (p.graduation_year ?? 2024),
    wam_band: p.wam_band, has_honours: p.has_honours,
    has_masters_or_second_degree: p.has_masters_or_second_degree,
    high_school: p.high_school, high_school_type: p.high_school_type, atar_band: p.atar_band,
    experiences: [], signals: [],
    target_role: 'ib_analyst', target_firm_tier: 'bb', target_geography: 'sydney',
    is_lateral_candidate: false,
  };
}

interface Point { id: string; index: number; achieved: number; tier: string; }

const points: Point[] = pros.map(p => {
  // Reconstruct the pre-penultimate snapshot (their profile as a ~penultimate student).
  const snap = reconstructAtStage(p, 'S2');
  const student = asStudent(p);
  // Feed the reconstructed experiences/signals in as the student's own.
  const card = computeScorecard(student, snap.computed);
  const bb = card.perTier.find(t => t.tier === 'bb')!;
  return {
    id: p.id,
    index: bb.index, // BB index == the tier-independent raw strength
    achieved: TIER_LEVEL[p.current_firm_tier as keyof typeof TIER_LEVEL] ?? 0,
    tier: p.current_firm_tier,
  };
});

// Spearman rank correlation between index and achieved tier level.
function rank(xs: number[]): number[] {
  const order = xs.map((v, i) => [v, i] as const).sort((a, b) => a[0] - b[0]);
  const ranks = new Array(xs.length).fill(0);
  for (let i = 0; i < order.length;) {
    let j = i;
    while (j + 1 < order.length && order[j + 1]![0] === order[i]![0]) j++;
    const avg = (i + j) / 2 + 1;
    for (let k = i; k <= j; k++) ranks[order[k]![1]] = avg;
    i = j + 1;
  }
  return ranks;
}
function spearman(a: number[], b: number[]): number {
  const ra = rank(a), rb = rank(b), n = a.length;
  const mean = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / xs.length;
  const ma = mean(ra), mb = mean(rb);
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) {
    num += (ra[i]! - ma) * (rb[i]! - mb);
    da += (ra[i]! - ma) ** 2; db += (rb[i]! - mb) ** 2;
  }
  return num / Math.sqrt(da * db);
}

const rho = spearman(points.map(p => p.index), points.map(p => p.achieved));

console.log(`\nCompetitiveness calibration — ${points.length} professionals\n`);
console.log(`Spearman rank correlation (index vs achieved tier): ${rho.toFixed(3)}`);
console.log('  > 0 means a higher index tracks reaching a higher tier (index direction is valid).\n');

// Bucketed table: index bucket -> count, mean achieved tier level, tier mix.
const buckets = [
  { label: '80-100 (strong)', min: 80, max: 101 },
  { label: '65-79  (competitive)', min: 65, max: 80 },
  { label: '45-64  (developing)', min: 45, max: 65 },
  { label: '0-44   (reach)', min: 0, max: 45 },
];
console.log('index bucket           n   mean tier lvl   tier mix (bb/eb/mm/boutique/other)');
for (const b of buckets) {
  const inB = points.filter(p => p.index >= b.min && p.index < b.max);
  if (inB.length === 0) { console.log(`${b.label.padEnd(22)} ${String(0).padStart(2)}`); continue; }
  const meanLvl = inB.reduce((s, p) => s + p.achieved, 0) / inB.length;
  const mix = (t: (tier: string) => boolean) => inB.filter(p => t(p.tier)).length;
  const bb = mix(t => t === 'bb');
  const eb = mix(t => t === 'elite_boutique');
  const mm = mix(t => t === 'mid_market');
  const bq = mix(t => t === 'boutique');
  const other = inB.length - bb - eb - mm - bq;
  console.log(
    `${b.label.padEnd(22)} ${String(inB.length).padStart(2)}   ${meanLvl.toFixed(2).padStart(11)}   ${bb}/${eb}/${mm}/${bq}/${other}`,
  );
}
console.log('');
