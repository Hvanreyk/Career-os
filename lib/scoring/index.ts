/**
 * Layer 8 — Output structuring + main entry point.
 *
 * `score(student, professionals)` runs the full pipeline and returns
 * a typed ScoringOutput. The Phase 3 LLM layer takes this object and
 * formats it into prose for the user. Nothing in this file talks to
 * the network or the database.
 */

import type {
  Action,
  FitBand,
  Gap,
  MatchResult,
  Professional,
  ScoringOutput,
  Stage,
  StudentProfile,
} from './types';
import { TIER_LEVEL } from './types';

import { computeFields } from './computed';
import { classifyStage } from './stage';
import { filterPool } from './pool';
import { findKNearest, DEFAULT_K } from './matcher';
import { analyzeGaps } from './gaps';
import { generateActions } from './actions';

export interface ScoreOptions {
  K?: number;
  now?: Date;
}

export function score(
  student: StudentProfile,
  professionals: Professional[],
  opts: ScoreOptions = {},
): ScoringOutput {
  const K = opts.K ?? DEFAULT_K;
  const now = opts.now ?? new Date();

  // 1. Computed fields
  const computed = computeFields({
    experiences: student.experiences,
    signals: student.signals,
    current_year: student.current_year,
    expected_graduation_year: student.expected_graduation_year,
    now,
  });

  // 2. Stage
  const stage = classifyStage(student, computed);

  // 3. Filtered pool — comparable peers by geography + cohort. Tier is
  // deliberately not filtered: reached_target_count downstream measures
  // how many similar profiles actually made the target tier.
  const pool = filterPool(
    professionals,
    student.target_geography,
    stage,
  );

  // 4-5. Top-K matches
  const matches = findKNearest(student, computed, pool, stage, K);

  // 6. Gaps
  const gaps = analyzeGaps(student, computed, matches, student.target_firm_tier);

  // 7. Actions
  const actions = generateActions(stage, student, computed, matches, now);

  // 8. Output structuring
  return assembleOutput(student, stage, professionals.length, pool, matches, gaps, actions, now);
}

// ============================================================
// Output assembly
// ============================================================

/**
 * Fit band = how the student's matched cohort compares to the *base rate*
 * of reaching the target tier across the whole comparable pool. A ratio of
 * 0.45 sounds low in absolute terms but is strong when only ~30% of the
 * pool made the target ("lift" > 1). Absolute-ratio thresholds calibrated
 * for the old tier-pre-filtered funnel (where ratio was always 1.0) would
 * mislabel everyone as a reach.
 */
interface FitBandResult {
  band: FitBand;
  ratio: number;
  // Null (not Infinity — that doesn't survive JSON round-tripping through
  // the DB) when the pool base rate is 0, i.e. lift can't be computed.
  lift: number | null;
  avg_top5_distance: number;
}

function fitBand(
  matches: MatchResult[],
  reachedTarget: number,
  poolBaseRate: number,
): FitBandResult {
  if (matches.length === 0) {
    return { band: 'long_shot', ratio: 0, lift: null, avg_top5_distance: 1 };
  }
  const ratio = reachedTarget / matches.length;
  const liftRaw = poolBaseRate > 0 ? ratio / poolBaseRate : ratio > 0 ? Infinity : 1;
  const lift = Number.isFinite(liftRaw) ? liftRaw : null;
  // Average distance among the top-5 — closer = more confident
  const top = matches.slice(0, 5);
  const avg_top5_distance = top.reduce((acc, m) => acc + m.distance, 0) / top.length;

  // Threshold checks below use liftRaw (pre-null) so an infinite lift still
  // clears the >= comparisons rather than failing them.
  let band: FitBand;
  if (ratio >= 0.45 && liftRaw >= 1.2 && avg_top5_distance < 0.35) band = 'strong_fit';
  // A saturated base rate (e.g. target tier 'any') can't produce lift; treat
  // matching the base rate as achievable when the base rate itself is high.
  else if (ratio >= 0.45 && poolBaseRate >= 0.9 && avg_top5_distance < 0.35) band = 'strong_fit';
  else if (ratio >= 0.3 && liftRaw >= 0.9) band = 'stretch_but_achievable';
  else if (ratio >= 0.15 || liftRaw >= 0.5) band = 'reach';
  else band = 'long_shot';

  return { band, ratio, lift, avg_top5_distance };
}

function stageDescription(stage: Stage): string {
  switch (stage) {
    case 'S0': return 'Foundation — no relevant experience yet; build WAM, society, first internship.';
    case 'S1': return 'Building — at least one relevant experience; position for penultimate.';
    case 'S2': return 'Pre-Penultimate — recruiting opens within 6 months; apply now.';
    case 'S3': return 'Penultimate Secured — convert your offer or hedge with grad apps.';
    case 'S4': return 'FT Offer Secured — out of scope for action generation.';
    case 'S5': return 'Lateral — already in industry, pivoting into IB.';
  }
}

function nextRecruitingWindowText(student: StudentProfile, now: Date): string {
  const penultYear = student.expected_graduation_year - 1;
  const julyTarget = new Date(penultYear, 6, 15);
  const monthsUntilPenult =
    (julyTarget.getFullYear() - now.getFullYear()) * 12 +
    (julyTarget.getMonth() - now.getMonth());

  if (monthsUntilPenult > 0) {
    return `Penultimate apps open ~July ${penultYear} (~${monthsUntilPenult} months).`;
  }
  const marchTarget = new Date(student.expected_graduation_year, 2, 15);
  const monthsUntilGrad =
    (marchTarget.getFullYear() - now.getFullYear()) * 12 +
    (marchTarget.getMonth() - now.getMonth());
  if (monthsUntilGrad > 0) {
    return `Grad apps open ~March ${student.expected_graduation_year} (~${monthsUntilGrad} months).`;
  }
  return 'Recruiting windows passed for current cycle — focus on lateral/grad pipeline.';
}

function buildSummary(student: StudentProfile, fit: FitBand): string {
  const wam = student.wam_band === 'unknown' ? 'unknown WAM' : `${student.wam_band.toUpperCase()} WAM`;
  const yearLabel = `Y${student.current_year}`;
  const tier = student.target_firm_tier === 'any' ? 'any tier' : student.target_firm_tier.toUpperCase();
  const fitLabel = fit.replace(/_/g, ' ');
  return `You're a ${yearLabel} ${student.university} ${student.degree} student with ${wam}. ` +
         `Your profile is in ${fitLabel} territory for ${tier} ${student.target_geography}.`;
}

function assembleOutput(
  student: StudentProfile,
  stage: Stage,
  total_professionals: number,
  pool: Professional[],
  matches: MatchResult[],
  gaps: Gap[],
  actions: Action[],
  now: Date,
): ScoringOutput {
  const tgtLevel =
    student.target_firm_tier === 'any'
      ? 0
      : TIER_LEVEL[student.target_firm_tier as keyof typeof TIER_LEVEL] ?? 0;

  const reached_target_count = matches.filter(
    m => (TIER_LEVEL[m.professional.current_firm_tier as keyof typeof TIER_LEVEL] ?? 0) >= tgtLevel,
  ).length;

  const reached_one_below = matches.filter(m => {
    const lvl = TIER_LEVEL[m.professional.current_firm_tier as keyof typeof TIER_LEVEL] ?? 0;
    return lvl >= tgtLevel - 1 && lvl < tgtLevel;
  }).length;

  // Base rate: how much of the whole comparable pool made the target tier.
  const pool_reached_target_count = pool.filter(
    p => (TIER_LEVEL[p.current_firm_tier as keyof typeof TIER_LEVEL] ?? 0) >= tgtLevel,
  ).length;
  const poolBaseRate = pool.length > 0 ? pool_reached_target_count / pool.length : 0;

  const fitResult = fitBand(matches, reached_target_count, poolBaseRate);

  const top_paths = matches.slice(0, 5).map(m => ({
    path_summary: m.professional.path_summary ?? '—',
    distance: Number(m.distance.toFixed(4)),
    reached_tier: m.professional.current_firm_tier,
    anonymised_profile_id: m.professional.id,
  }));

  return {
    student_summary: buildSummary(student, fitResult.band),
    stage,
    stage_description: stageDescription(stage),

    target: {
      role: student.target_role,
      tier: student.target_firm_tier,
      geography: student.target_geography,
    },

    match_summary: {
      total_professionals,
      pool_size: pool.length,
      pool_reached_target_count,
      matched_count: matches.length,
      reached_target_count,
      fit_band: fitResult.band,
      fit_ratio: fitResult.ratio,
      fit_lift: fitResult.lift,
      avg_top5_distance: fitResult.avg_top5_distance,
      low_data_warning: matches.length < DEFAULT_K,
      boutique_data_warning: student.target_firm_tier === 'boutique',
    },

    probability_data: {
      matched_count: matches.length,
      reached_target: reached_target_count,
      reached_one_below,
    },

    top_paths,
    gaps,
    actions,

    context: {
      current_date: now.toISOString().slice(0, 10),
      next_recruiting_window: nextRecruitingWindowText(student, now),
    },
  };
}

// Re-exports for the LLM layer + tests
export * from './types';
export { computeFields } from './computed';
export { classifyStage } from './stage';
export { filterPool } from './pool';
export { reconstructAtStage } from './snapshot';
export { computeDistance, computeDistanceWithBreakdown, studentForDistance } from './distance';
export { findKNearest } from './matcher';
export { analyzeGaps } from './gaps';
export { generateActions } from './actions';
