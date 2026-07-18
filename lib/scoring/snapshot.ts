/**
 * Layer 4 — Stage-aligned snapshot reconstruction. We compare the
 * student's *current* state against each professional's state *at
 * the same career stage*, not their final state. Otherwise a Y2
 * student looks miles away from a Citi FT analyst — even though
 * that analyst's Y2 self looked very similar.
 *
 * Approximation: signals (society committee, modelling course, etc.)
 * don't have timestamps in the dataset. We treat them as available
 * from S1 onward but NOT at S0 (S0 is too early for most of these).
 */

import type {
  Experience,
  Professional,
  ProfileSnapshot,
  SignalTag,
  Stage,
} from './types';
import { computeFields } from './computed';

function inferGraduationYear(prof: Professional): number {
  // current_role_start_year - years_to_current_role gives an upper
  // bound on grad year (assumes the current role started shortly
  // after grad). Good enough for cutoff purposes.
  return prof.graduation_year ?? prof.current_role_start_year - prof.years_to_current_role;
}

function cutoffYearForStage(prof: Professional, stage: Stage): number {
  const grad = inferGraduationYear(prof);
  switch (stage) {
    case 'S0': return grad - 3;
    case 'S1': return grad - 2;
    case 'S2': return grad - 1;
    case 'S3': return grad - 1;
    case 'S4': return grad;
    case 'S5': return prof.current_role_start_year - 1;
  }
}

export function reconstructAtStage(
  prof: Professional,
  target_stage: Stage,
): ProfileSnapshot {
  const cutoff = cutoffYearForStage(prof, target_stage);
  const past_experiences: Experience[] = prof.experiences.filter(e => e.year <= cutoff);

  // Achievement timing supersedes the old blanket S1 gate when it is known.
  // Existing signals without timing metadata, plus explicitly undated
  // achievements, retain the conservative S1-and-later behavior.
  const achievementsByTag = new Map<SignalTag, NonNullable<Professional['achievements']>>();
  for (const achievement of prof.achievements ?? []) {
    const rows = achievementsByTag.get(achievement.tag) ?? [];
    rows.push(achievement);
    achievementsByTag.set(achievement.tag, rows);
  }

  const candidateSignals = new Set<SignalTag>([
    ...prof.signals,
    ...(prof.achievements ?? []).map((achievement) => achievement.tag),
  ]);
  const signals = [...candidateSignals].filter((tag) => {
    const achievements = achievementsByTag.get(tag);
    if (!achievements?.length) return target_stage !== 'S0';
    return achievements.some((achievement) => {
      if (achievement.effective_year !== null) {
        return achievement.effective_year <= cutoff;
      }
      return target_stage !== 'S0';
    });
  });

  const computed = computeFields({ experiences: past_experiences, signals });

  return {
    university_tier: prof.university_tier,
    wam_band: prof.wam_band,
    atar_band: prof.atar_band,
    high_school_type: prof.high_school_type,
    has_honours: prof.has_honours,
    has_masters_or_second_degree: prof.has_masters_or_second_degree,
    experiences: past_experiences,
    signals,
    computed,
  };
}
