/**
 * Competitiveness scorecard — the spine of the report.
 *
 * An expert-weighted score over the student's own profile features, chosen over
 * a raw kNN vote because it does three things a vote cannot:
 *   1. DECOMPOSES — every point traces to a feature, so we can show the "why".
 *   2. SUPPORTS COUNTERFACTUALS — the engine is pure, so re-scoring with a gap
 *      closed yields the point-impact of an action ("modelling course -> +4").
 *   3. SWAPS TO A LEARNED MODEL — the weights below are expert judgement today;
 *      they become fitted coefficients once real student outcomes are tracked.
 *
 * The index is a RELATIVE strength measure (0-100). Combined with the funnel
 * base rates it yields an honest per-tier probability estimate. The kNN matcher
 * is retained elsewhere for the "people like you" evidence and as a cross-check;
 * it is deliberately NOT an input here, to keep attribution clean.
 *
 * Pure. No I/O.
 */

import type {
  ComputedFields,
  StudentProfile,
  TargetFirmTier,
  UniversityTier,
  WamBand,
  AtarBand,
} from './types';
import { TIER_LEVEL } from './types';
import {
  baseSeatRate,
  basePlacementRate,
  probabilityCeiling,
} from './funnel';

export type CompetitivenessBand = 'strong' | 'competitive' | 'developing' | 'reach';

export interface FeatureContribution {
  /** Machine key. */
  feature: string;
  /** Human-facing label, e.g. "HD WAM". */
  label: string;
  /** Signed points this feature adds to (or subtracts from) the index. */
  points: number;
}

export interface TierCompetitiveness {
  tier: TargetFirmTier;
  /** 0-100 competitiveness index for this specific tier. */
  index: number;
  band: CompetitivenessBand;
  /** Honest per-cycle estimate (0-1): base rate x competitiveness multiplier, capped. */
  estimatedProbability: number;
  /** How many times the average serious candidate's odds this profile represents. */
  multiplierVsField: number;
}

export interface Scorecard {
  primaryTier: TargetFirmTier;
  /** Index for the student's chosen target tier. */
  index: number;
  band: CompetitivenessBand;
  /** Signed contributions, largest magnitude first — the "what's driving your score". */
  contributions: FeatureContribution[];
  /** Competitiveness across every real tier (bb, elite_boutique, mid_market, boutique). */
  perTier: TierCompetitiveness[];
  /** Highest tier where the student is at least "competitive". */
  recommendedTarget: TargetFirmTier;
  /** One tier above the recommended (a genuine stretch). */
  stretchTarget: TargetFirmTier;
  /** One tier below the recommended (a safety). */
  safetyTarget: TargetFirmTier;
  /**
   * Chance of landing SOME front-office IB seat across the tier ladder this
   * cycle — the honest, non-bleak headline (a strong candidate's real on-ramp
   * is far better than any single tier's odds).
   */
  anyFrontOfficeProbability: number;
}

// Tiers we score, hardest -> easiest. `any` is excluded (it is not a landing tier).
const REAL_TIERS: TargetFirmTier[] = ['bb', 'elite_boutique', 'mid_market', 'boutique'];

// Difficulty bonus added to the raw index per tier — easier tiers score higher
// for the same profile. Ordering matches TIER_LEVEL (bb 7 > eb 6 > mm 5 > boutique 4).
const TIER_DIFFICULTY_BONUS: Record<string, number> = {
  bb: 0,
  elite_boutique: 6,
  mid_market: 12,
  boutique: 20,
};

const WAM_POINTS: Record<WamBand, number> = { hd: 12, d: 5, c: -4, p: -12, unknown: 0 };
const UNI_POINTS: Record<UniversityTier, number> = {
  go8_top: 8, international_top: 8, top_global: 8,
  go8_other: 4, atn: 0, other_global: 0, other_au: -4,
};
const ATAR_POINTS: Record<AtarBand, number> = {
  '99_plus': 3, '98_99': 2, '95_98': 1, '90_95': 0, '85_90': -1, 'below_85': -2, unknown: 0,
};

const WAM_LABEL: Record<WamBand, string> = {
  hd: 'HD WAM', d: 'Distinction WAM', c: 'Credit WAM', p: 'Pass WAM', unknown: 'WAM not provided',
};
const UNI_LABEL: Record<UniversityTier, string> = {
  go8_top: 'Go8 target university', international_top: 'Top global university',
  top_global: 'Top global university', go8_other: 'Go8 university',
  atn: 'ATN university', other_global: 'International university', other_au: 'Non-target university',
};

// Baseline index before contributions — roughly the "average serious candidate".
const BASE_INDEX = 42;

function bandFor(index: number): CompetitivenessBand {
  if (index >= 80) return 'strong';
  if (index >= 65) return 'competitive';
  if (index >= 45) return 'developing';
  return 'reach';
}

/**
 * Map an index to a multiplier on the average serious candidate's odds.
 * index 50 -> 1x, +18 doubles, -18 halves. Monotonic; the caller caps the
 * resulting probability by the funnel ceiling so it can never run away.
 */
export function indexToMultiplier(index: number): number {
  return 2 ** ((index - 50) / 18);
}

/** The signed feature contributions — the attribution surface. */
function buildContributions(s: StudentProfile, c: ComputedFields): FeatureContribution[] {
  const out: FeatureContribution[] = [];
  const add = (feature: string, label: string, points: number) => {
    if (points !== 0) out.push({ feature, label, points });
  };

  add('wam_band', WAM_LABEL[s.wam_band], WAM_POINTS[s.wam_band]);
  add('university_tier', UNI_LABEL[s.university_tier], UNI_POINTS[s.university_tier]);
  add('atar_band', s.atar_band === 'unknown' ? 'ATAR' : `ATAR ${s.atar_band.replace(/_/g, '–')}`, ATAR_POINTS[s.atar_band]);

  // Experience — the biggest differentiators.
  add('has_ib_experience', c.has_ib_experience ? 'IB internship experience' : 'No IB internship yet',
    c.has_ib_experience ? 15 : -15);
  if (c.highest_firm_tier_reached >= TIER_LEVEL.bb) add('highest_firm_tier', 'Reached a bulge-bracket internship', 10);
  else if (c.highest_firm_tier_reached >= TIER_LEVEL.mid_market) add('highest_firm_tier', 'Reached an EB/MM internship', 7);
  else if (c.highest_firm_tier_reached >= TIER_LEVEL.big4) add('highest_firm_tier', 'Reached a Big 4 / boutique internship', 4);

  if (c.has_penultimate_internship) add('has_penultimate_internship', 'Penultimate internship secured', 12);
  if (c.has_big4_advisory_experience) add('has_big4_advisory_experience', 'Big 4 advisory / TS experience', 5);
  if (c.has_pe_experience) add('has_pe_experience', 'PE-side experience', 4);

  const relevant = Math.min(c.experience_count_relevant, 4);
  if (relevant >= 2) add('experience_count', `${relevant} relevant experiences`, Math.min(relevant * 2, 6));

  // Signals.
  if (c.has_smif) add('has_smif', 'Student investment fund', 5);
  if (c.has_society_committee) add('has_society_committee', 'Finance society committee', 5);
  if (c.has_modelling_course) add('has_modelling_course', 'Financial modelling course', 4);
  if (c.has_dean_list || s.has_honours) add('has_dean_list', s.has_honours ? 'Honours' : "Dean's List", 3);
  if (c.cfa_level > 0) add('cfa_level', `CFA Level ${c.cfa_level}`, c.cfa_level * 2);
  if (c.is_co_op_program) add('is_co_op_program', 'Co-op program', 3);

  out.sort((a, b) => Math.abs(b.points) - Math.abs(a.points));
  return out;
}

function tierCompetitiveness(tier: TargetFirmTier, rawIndex: number): TierCompetitiveness {
  const index = Math.max(0, Math.min(100, rawIndex + (TIER_DIFFICULTY_BONUS[tier] ?? 0)));
  const multiplier = indexToMultiplier(index);
  const estimate = Math.min(baseSeatRate(tier).base * multiplier, probabilityCeiling(tier));
  return {
    tier,
    index: Math.round(index),
    band: bandFor(index),
    estimatedProbability: estimate,
    multiplierVsField: multiplier,
  };
}

const BAND_RANK: Record<CompetitivenessBand, number> = { strong: 3, competitive: 2, developing: 1, reach: 0 };

export interface ScorecardOptions {
  /** Override the point contributions, e.g. to model "what if this gap were closed". */
  overrides?: Partial<ComputedFields>;
}

export function computeScorecard(
  student: StudentProfile,
  computed: ComputedFields,
  opts: ScorecardOptions = {},
): Scorecard {
  const c = opts.overrides ? { ...computed, ...opts.overrides } : computed;
  const contributions = buildContributions(student, c);
  const rawIndex = BASE_INDEX + contributions.reduce((acc, f) => acc + f.points, 0);

  const perTier = REAL_TIERS.map(t => tierCompetitiveness(t, rawIndex));
  const byTier = new Map(perTier.map(t => [t.tier, t]));

  const primaryTier = student.target_firm_tier === 'any' ? 'bb' : student.target_firm_tier;
  const primary = byTier.get(primaryTier) ?? perTier[0]!;

  // REAL_TIERS is hardest -> easiest. Recommended = highest tier that is at
  // least "competitive"; fall back to the easiest if none clear the bar.
  const recommended = perTier.find(t => BAND_RANK[t.band] >= BAND_RANK.competitive)?.tier
    ?? perTier[perTier.length - 1]!.tier;
  const recIdx = REAL_TIERS.indexOf(recommended);
  const stretchTarget = REAL_TIERS[Math.max(0, recIdx - 1)]!;
  const safetyTarget = REAL_TIERS[Math.min(REAL_TIERS.length - 1, recIdx + 1)]!;

  // Portfolio: chance of landing SOME front-office seat across the ladder,
  // using the wider (incl. off-cycle) placement base rates and the same
  // multiplier. Treated with partial independence (correlated apps), so we
  // combine as 1 - prod(1 - p_i) but damp it to avoid overstating.
  // Iterate over UNIQUE placement buckets only — elite_boutique and mid_market
  // share the same "mm_and_independent" seat pool in funnel.ts, so including
  // both here would count that one pool's odds twice.
  const UNIQUE_PLACEMENT_TIERS: TargetFirmTier[] = ['bb', 'mid_market', 'boutique'];
  const multiplier = indexToMultiplier(Math.max(0, Math.min(100, rawIndex)));
  const anyMiss = UNIQUE_PLACEMENT_TIERS.reduce((acc, t) => {
    const p = Math.min(basePlacementRate(t).base * multiplier, probabilityCeiling(t));
    return acc * (1 - p);
  }, 1);
  const anyFrontOfficeProbability = Math.min(1 - anyMiss, 0.75);

  return {
    primaryTier,
    index: primary.index,
    band: primary.band,
    contributions,
    perTier,
    recommendedTarget: recommended,
    stretchTarget,
    safetyTarget,
    anyFrontOfficeProbability,
  };
}

/**
 * Counterfactual: how many index points (for the primary tier) closing a given
 * gap would add. Feeds the "action ROI" surface — e.g. "+4 pts". Returns the
 * signed delta on the primary-tier index.
 */
export function actionImpact(
  student: StudentProfile,
  computed: ComputedFields,
  overrides: Partial<ComputedFields>,
): number {
  const before = computeScorecard(student, computed).index;
  const after = computeScorecard(student, computed, { overrides }).index;
  return after - before;
}
