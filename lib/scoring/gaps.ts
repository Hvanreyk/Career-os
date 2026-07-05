/**
 * Layer 6 — Gap analysis. Identify features common in successful
 * matches (those who reached the target tier) but missing in the
 * student. Sorted by impact = match_pct × actionability_weight.
 */

import type {
  ComputedFields,
  Gap,
  MatchResult,
  StudentProfile,
  TargetFirmTier,
  WamBand,
} from './types';
import { TIER_LEVEL, WAM_RANKS } from './types';

interface CandidateFeature {
  key: keyof ComputedFields | 'cfa_l1';
  display: string;
  actionability: 'high' | 'medium' | 'low';
  time: number;
}

const CANDIDATE_FEATURES: CandidateFeature[] = [
  { key: 'has_smif',                       display: 'Student investment fund (SMIF/MUTIS/ASAM/UNIT)',     actionability: 'medium', time: 6 },
  { key: 'has_society_committee',          display: 'Finance society committee role',                      actionability: 'medium', time: 6 },
  { key: 'has_modelling_course',           display: 'Financial modelling course (WSP/BIWS/Mazars)',        actionability: 'high',   time: 1 },
  { key: 'has_big4_advisory_experience',   display: 'Big 4 advisory / TS experience',                      actionability: 'medium', time: 6 },
  { key: 'has_pe_experience',              display: 'PE-side internship',                                  actionability: 'low',    time: 12 },
  { key: 'has_dean_list',                  display: "Dean's List or equivalent academic recognition",      actionability: 'medium', time: 6 },
  { key: 'cfa_l1',                         display: 'CFA Level 1',                                         actionability: 'medium', time: 6 },
  { key: 'has_elite_boutique_experience',  display: 'Elite boutique experience',                           actionability: 'low',    time: 12 },
  { key: 'has_mid_market_experience',      display: 'Mid-market experience',                               actionability: 'low',    time: 12 },
  { key: 'has_boutique_experience',        display: 'Boutique IB experience',                              actionability: 'medium', time: 4 },
  { key: 'is_co_op_program',               display: 'Co-op program enrolment',                             actionability: 'low',    time: 24 },
];

const ACTIONABILITY_WEIGHT = { high: 1.0, medium: 0.7, low: 0.3 } as const;

function extractFeature(c: ComputedFields, key: CandidateFeature['key']): boolean {
  if (key === 'cfa_l1') return c.cfa_level >= 1;
  return Boolean(c[key as keyof ComputedFields]);
}

function median(xs: number[]): number {
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1]! + sorted[mid]!) / 2
    : sorted[mid]!;
}

function reverseLookup<T extends Record<string, number>>(table: T, value: number): keyof T | null {
  for (const [k, v] of Object.entries(table)) {
    if (v === value) return k as keyof T;
  }
  return null;
}

export function analyzeGaps(
  student: StudentProfile,
  studentComputed: ComputedFields,
  matches: MatchResult[],
  target_tier: TargetFirmTier,
): Gap[] {
  // Only consider matches that actually reached the student's target tier.
  const tgtLevel = target_tier === 'any'
    ? 0
    : (TIER_LEVEL[target_tier as keyof typeof TIER_LEVEL] ?? 0);

  const successful = matches.filter(m => {
    const profLevel = TIER_LEVEL[m.professional.current_firm_tier as keyof typeof TIER_LEVEL] ?? 0;
    return profLevel >= tgtLevel;
  });

  if (successful.length === 0) return [];

  const gaps: Gap[] = [];

  for (const feat of CANDIDATE_FEATURES) {
    const hadCount = successful.filter(m => extractFeature(m.snapshot.computed, feat.key)).length;
    const match_pct = hadCount / successful.length;
    const studentHas = extractFeature(studentComputed, feat.key);

    if (match_pct >= 0.5 && !studentHas) {
      gaps.push({
        gap_key: String(feat.key),
        display_name: feat.display,
        match_pct,
        student_has: false,
        actionability: feat.actionability,
        time_to_address_months: feat.time,
      });
    }
  }

  // WAM gap (only when student has a known WAM and we have ≥3 known WAMs in the pool)
  if (student.wam_band !== 'unknown') {
    const knownWams = successful
      .filter(m => m.snapshot.wam_band !== 'unknown')
      .map(m => WAM_RANKS[m.snapshot.wam_band as Exclude<WamBand, 'unknown'>]);

    if (knownWams.length >= 3) {
      const med = median(knownWams);
      const studentRank = WAM_RANKS[student.wam_band as Exclude<WamBand, 'unknown'>];
      if (studentRank < med - 0.5) {
        const targetBand = reverseLookup(WAM_RANKS, Math.round(med));
        gaps.push({
          gap_key: 'wam_below_target',
          display_name: `WAM below median for target (median ${targetBand ?? 'd'})`,
          match_pct: 1.0,
          student_has: false,
          actionability: 'medium',
          time_to_address_months: 6,
        });
      }
    }
  }

  // Sort by impact: match_pct × actionability weight
  gaps.sort(
    (a, b) =>
      b.match_pct * ACTIONABILITY_WEIGHT[b.actionability] -
      a.match_pct * ACTIONABILITY_WEIGHT[a.actionability],
  );

  return gaps;
}
