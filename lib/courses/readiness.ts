import {
  DIAGNOSTIC_QUESTIONS,
  DIMENSIONS,
  type Dimension,
  type DiagnosticAnswers,
} from './diagnostic';

// ============================================================
// Readiness scoring — deterministic, pure, unit-tested.
//
// computeReadiness      diagnostic answers → 0–100 score + dimension
//                       breakdown + recommended module order
// computeFinalReadiness blends module quiz results + lesson completion
//                       into the initial readiness for the end-of-course
//                       before/after comparison
// ============================================================

/** Weight of each dimension in the overall score (sums to 1). */
export const DIMENSION_WEIGHTS: Record<Dimension, number> = {
  ib_understanding: 0.2,
  technical: 0.2,
  recruiting_process: 0.15,
  profile: 0.2,
  networking: 0.15,
  timeline: 0.1,
};

/**
 * Course modules mapped to the dimension they most improve, in the
 * course's canonical order. Used to turn weak dimensions into a
 * recommended module order. Module 9 (the roadmap) is always last —
 * it consumes the rest of the course.
 */
export const MODULE_DIMENSIONS: { slug: string; dimension: Dimension }[] = [
  { slug: 'what-is-ib', dimension: 'ib_understanding' },
  { slug: 'ib-groups', dimension: 'ib_understanding' },
  { slug: 'life-as-an-analyst', dimension: 'ib_understanding' },
  { slug: 'how-deals-work', dimension: 'ib_understanding' },
  { slug: 'technical-foundations', dimension: 'technical' },
  { slug: 'the-recruiting-process', dimension: 'recruiting_process' },
  { slug: 'building-a-competitive-profile', dimension: 'profile' },
  { slug: 'bank-and-role-selection', dimension: 'networking' },
];
export const ROADMAP_MODULE_SLUG = 'personalised-recruiting-roadmap';

export interface Readiness {
  /** Overall 0–100. */
  score: number;
  /** Per-dimension 0–100. */
  dimensions: Record<Dimension, number>;
  /** Module slugs, weakest-dimension modules first (roadmap module last). */
  module_priorities: string[];
  computed_at: string;
}

export interface FinalReadiness extends Readiness {
  /** Ratio of published lessons completed, 0–1. */
  completed_lesson_ratio: number;
}

/** Per-module quiz performance: best score / total questions. */
export type QuizScores = Record<string, { score: number; total: number }>;

function round(n: number): number {
  return Math.round(n);
}

function overallFrom(dimensions: Record<Dimension, number>): number {
  return round(
    DIMENSIONS.reduce((sum, d) => sum + dimensions[d] * DIMENSION_WEIGHTS[d], 0),
  );
}

/**
 * Order modules for the student: weakest dimensions first, preserving
 * course order within a dimension (stable tie-break: dimension score,
 * then canonical course order). The roadmap module is always last.
 */
export function prioritiseModules(dimensions: Record<Dimension, number>): string[] {
  const ordered = [...MODULE_DIMENSIONS]
    .map((m, i) => ({ ...m, courseIndex: i }))
    .sort((a, b) => {
      const scoreDiff = dimensions[a.dimension] - dimensions[b.dimension];
      if (scoreDiff !== 0) return scoreDiff;
      return a.courseIndex - b.courseIndex;
    })
    .map((m) => m.slug);
  return [...ordered, ROADMAP_MODULE_SLUG];
}

export function computeReadiness(
  answers: DiagnosticAnswers,
  now: Date = new Date(),
): Readiness {
  const earned: Record<Dimension, number> = Object.fromEntries(
    DIMENSIONS.map((d) => [d, 0]),
  ) as Record<Dimension, number>;
  const possible: Record<Dimension, number> = Object.fromEntries(
    DIMENSIONS.map((d) => [d, 0]),
  ) as Record<Dimension, number>;

  for (const q of DIAGNOSTIC_QUESTIONS) {
    const chosen = q.options.find((o) => o.id === answers[q.id]);
    if (!chosen) {
      // DiagnosticAnswersSchema guarantees this can't happen for parsed
      // input; guard anyway so a bad call fails loudly.
      throw new Error(`readiness: missing/invalid answer for '${q.id}'`);
    }
    const max = Math.max(...q.options.map((o) => o.points));
    earned[q.dimension] += chosen.points;
    possible[q.dimension] += max;
  }

  const dimensions = Object.fromEntries(
    DIMENSIONS.map((d) => [d, possible[d] === 0 ? 0 : round((earned[d] / possible[d]) * 100)]),
  ) as Record<Dimension, number>;

  return {
    score: overallFrom(dimensions),
    dimensions,
    module_priorities: prioritiseModules(dimensions),
    computed_at: now.toISOString(),
  };
}

/**
 * End-of-course readiness. Quiz performance updates the dimension each
 * module maps to: the final dimension score blends the initial score
 * with the quiz percentage (50/50 when quizzes exist for that
 * dimension), and never drops below the initial score — completing the
 * course can only improve measured readiness.
 */
export function computeFinalReadiness(
  initial: Readiness,
  quizScores: QuizScores,
  completedLessonRatio: number,
  now: Date = new Date(),
): FinalReadiness {
  // Collect quiz percentages per dimension.
  const byDimension = new Map<Dimension, number[]>();
  for (const { slug, dimension } of MODULE_DIMENSIONS) {
    const quiz = quizScores[slug];
    if (quiz && quiz.total > 0) {
      const pct = (quiz.score / quiz.total) * 100;
      byDimension.set(dimension, [...(byDimension.get(dimension) ?? []), pct]);
    }
  }

  const dimensions = { ...initial.dimensions };
  for (const [dimension, pcts] of byDimension) {
    const avg = pcts.reduce((a, b) => a + b, 0) / pcts.length;
    const blended = round(0.5 * initial.dimensions[dimension] + 0.5 * avg);
    dimensions[dimension] = Math.max(initial.dimensions[dimension], blended);
  }

  const ratio = Math.min(1, Math.max(0, completedLessonRatio));
  return {
    score: overallFrom(dimensions),
    dimensions,
    module_priorities: prioritiseModules(dimensions),
    completed_lesson_ratio: ratio,
    computed_at: now.toISOString(),
  };
}
