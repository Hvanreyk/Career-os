/**
 * Weight sensitivity analysis for the matching distance function.
 *
 * For a set of representative student archetypes, computes the baseline
 * top-K match ranking, then perturbs each feature weight (drop to 0, halve,
 * double) and measures how much the ranking actually moves:
 *
 *   - top-20 overlap: |baseline top-20 ∩ perturbed top-20| / 20
 *   - top-5 overlap:  same for the top-5 shown to the user
 *   - Δ reached-target: change in "matches that reached BB" among top-20
 *
 * Features whose perturbation barely moves the ranking contribute little
 * signal at their current weight; features that reshuffle the top-5 are
 * the ones worth tuning carefully.
 *
 * Run:  DATABASE_XLSX_PATH=/path/to/Database.xlsx npx tsx scripts/weight-sensitivity.ts
 */

import { loadProfessionalsFromXlsx } from '../lib/db/xlsx';
import {
  classifyStage,
  computeDistanceWithBreakdown,
  computeFields,
  filterPool,
  reconstructAtStage,
  studentForDistance,
} from '../lib/scoring/index';
import type { DistanceBreakdown } from '../lib/scoring/distance';
import type { StudentProfile } from '../lib/scoring/types';
import { TIER_LEVEL } from '../lib/scoring/types';

const K = 20;
const NOW = new Date();

// ----- Student archetypes -----

const base: Omit<StudentProfile, 'id' | 'email'> = {
  university: 'UNSW',
  university_tier: 'go8_top',
  degree: 'Bachelor of Commerce',
  degree_type: 'bachelor',
  majors: ['Finance'],
  current_year: 2,
  expected_graduation_year: 2028,
  wam_band: 'd',
  has_honours: false,
  has_masters_or_second_degree: false,
  high_school: null,
  high_school_type: 'unknown',
  atar_band: 'unknown',
  experiences: [],
  signals: [],
  target_role: 'ib_analyst',
  target_firm_tier: 'bb',
  target_geography: 'sydney',
  is_lateral_candidate: false,
};

const archetypes: Array<{ name: string; student: StudentProfile }> = [
  {
    name: 'Y2 HD + BB internship (strong)',
    student: {
      ...base,
      id: 'a1', email: 'a1@example.com',
      wam_band: 'hd',
      signals: ['wam_hd', 'investment_society_committee', 'modelling_course'],
      experiences: [{
        type: 'summer_internship', firm: 'J.P. Morgan', firm_tier: 'bb', industry: 'ib',
        role_function: 'ib_coverage', role_relevance: 5, year: 2025, duration_months: 3,
        how_obtained: 'online_application', converted_to_ft: false,
      }],
    },
  },
  {
    name: 'Y2 D-WAM, no experience (foundation)',
    student: { ...base, id: 'a2', email: 'a2@example.com' },
  },
  {
    name: 'Y3 D-WAM + Big4 advisory (converter)',
    student: {
      ...base,
      id: 'a3', email: 'a3@example.com',
      current_year: 3,
      expected_graduation_year: 2027,
      signals: ['has_big4_advisory'],
      experiences: [{
        type: 'internship', firm: 'KPMG', firm_tier: 'big4', industry: 'big4_advisory',
        role_function: 'transaction_services', role_relevance: 3, year: 2025, duration_months: 6,
        how_obtained: 'online_application', converted_to_ft: false,
      }],
    },
  },
  {
    name: 'Y2 C-WAM + boutique internship (scrapper)',
    student: {
      ...base,
      id: 'a4', email: 'a4@example.com',
      wam_band: 'c',
      university_tier: 'atn',
      signals: ['fin_society_committee'],
      experiences: [{
        type: 'internship', firm: 'Local Advisory', firm_tier: 'boutique', industry: 'ib',
        role_function: 'ib_coverage', role_relevance: 4, year: 2025, duration_months: 4,
        how_obtained: 'cold_email', converted_to_ft: false,
      }],
    },
  },
];

// ----- Ranking under a weight override -----

interface ScoredPro {
  id: string;
  tier: string;
  breakdown: DistanceBreakdown;
}

function rankUnder(scored: ScoredPro[], overrides: Record<string, number>): string[] {
  const rescored = scored.map(s => {
    let sum = 0;
    let wt = 0;
    for (const c of s.breakdown.components) {
      if (c.skipped) continue;
      const w = overrides[c.feat] ?? c.weight;
      sum += w * c.dist;
      wt += w;
    }
    return { id: s.id, d: wt === 0 ? 1 : sum / wt };
  });
  rescored.sort((a, b) => a.d - b.d || (a.id < b.id ? -1 : 1));
  return rescored.slice(0, K).map(r => r.id);
}

function overlap(a: string[], b: string[], n: number): number {
  const sa = new Set(a.slice(0, n));
  return b.slice(0, n).filter(x => sa.has(x)).length / Math.min(n, a.length, b.length);
}

// ----- Main -----

const pros = loadProfessionalsFromXlsx();
console.log(`Loaded ${pros.length} professionals.\n`);

const FEATURES: Array<{ feat: string; weight: number }> = [];

// Aggregated disturbance per feature across archetypes/perturbations
const agg: Record<string, { top20: number[]; top5: number[]; dReached: number[] }> = {};

for (const { name, student } of archetypes) {
  const computed = computeFields({
    experiences: student.experiences,
    signals: student.signals,
    current_year: student.current_year,
    expected_graduation_year: student.expected_graduation_year,
    now: NOW,
  });
  const stage = classifyStage(student, computed);
  const pool = filterPool(pros, student.target_geography, stage);
  const sd = studentForDistance(student, computed);

  const scored: ScoredPro[] = pool.map(p => ({
    id: p.id,
    tier: p.current_firm_tier,
    breakdown: computeDistanceWithBreakdown(sd, reconstructAtStage(p, stage)),
  }));
  const tierOf = new Map(scored.map(s => [s.id, s.tier]));
  const reachedIn = (ids: string[]) =>
    ids.filter(id => (TIER_LEVEL[tierOf.get(id) as keyof typeof TIER_LEVEL] ?? 0) >= TIER_LEVEL.bb).length;

  const baselineIds = rankUnder(scored, {});
  const baseReached = reachedIn(baselineIds);

  console.log(`── ${name} — stage ${stage}, pool ${pool.length}, baseline reached-BB ${baseReached}/${Math.min(K, pool.length)}`);

  if (FEATURES.length === 0 && scored[0]) {
    for (const c of scored[0].breakdown.components) FEATURES.push({ feat: c.feat, weight: c.weight });
  }

  for (const { feat, weight } of FEATURES) {
    for (const mult of [0, 0.5, 2]) {
      const ids = rankUnder(scored, { [feat]: weight * mult });
      const o20 = overlap(baselineIds, ids, K);
      const o5 = overlap(baselineIds, ids, 5);
      const dR = reachedIn(ids) - baseReached;
      (agg[feat] ??= { top20: [], top5: [], dReached: [] });
      agg[feat]!.top20.push(o20);
      agg[feat]!.top5.push(o5);
      agg[feat]!.dReached.push(dR);
    }
  }
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

console.log('\nFeature sensitivity (averaged over archetypes × {drop, halve, double}):');
console.log('lower overlap = weight matters more; Δreached = effect on the headline stat\n');
const rows = FEATURES.map(({ feat, weight }) => ({
  feat,
  weight,
  top20: mean(agg[feat]!.top20),
  top5: mean(agg[feat]!.top5),
  maxAbsDReached: Math.max(...agg[feat]!.dReached.map(Math.abs)),
})).sort((a, b) => a.top5 - b.top5 || a.top20 - b.top20);

console.log('feature                          weight  top20-overlap  top5-overlap  max|Δreached|');
for (const r of rows) {
  console.log(
    `${r.feat.padEnd(32)} ${String(r.weight).padStart(5)}  ${r.top20.toFixed(3).padStart(13)}  ${r.top5.toFixed(3).padStart(12)}  ${String(r.maxAbsDReached).padStart(13)}`,
  );
}
