import { describe, it, expect } from 'vitest';
import {
  DIAGNOSTIC_QUESTIONS,
  DIMENSIONS,
  DiagnosticAnswersSchema,
  prefillFromProfile,
} from '../../lib/courses/diagnostic.js';
import {
  computeReadiness,
  computeFinalReadiness,
  prioritiseModules,
  DIMENSION_WEIGHTS,
  MODULE_DIMENSIONS,
  ROADMAP_MODULE_SLUG,
} from '../../lib/courses/readiness.js';
import type { StudentProfile } from '../../lib/scoring/types.js';

const TEST_NOW = new Date('2026-07-07T00:00:00Z');

/** Answer every question with its weakest / strongest / given option. */
function answersAt(pick: 'min' | 'max'): Record<string, string> {
  return Object.fromEntries(
    DIAGNOSTIC_QUESTIONS.map((q) => {
      const sorted = [...q.options].sort((a, b) => a.points - b.points);
      const opt = pick === 'min' ? sorted[0]! : sorted[sorted.length - 1]!;
      return [q.id, opt.id];
    }),
  );
}

describe('diagnostic structure', () => {
  it('has exactly two questions per dimension', () => {
    for (const d of DIMENSIONS) {
      expect(DIAGNOSTIC_QUESTIONS.filter((q) => q.dimension === d)).toHaveLength(2);
    }
  });

  it('dimension weights sum to 1', () => {
    const sum = Object.values(DIMENSION_WEIGHTS).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 10);
  });

  it('option ids are unique within each question', () => {
    for (const q of DIAGNOSTIC_QUESTIONS) {
      expect(new Set(q.options.map((o) => o.id)).size).toBe(q.options.length);
    }
  });
});

describe('DiagnosticAnswersSchema', () => {
  it('accepts a complete valid answer set', () => {
    expect(DiagnosticAnswersSchema.safeParse(answersAt('max')).success).toBe(true);
  });

  it('rejects missing answers', () => {
    const partial = answersAt('max');
    delete partial['ib_explain'];
    expect(DiagnosticAnswersSchema.safeParse(partial).success).toBe(false);
  });

  it('rejects invalid option ids and unknown questions', () => {
    expect(
      DiagnosticAnswersSchema.safeParse({ ...answersAt('max'), ib_explain: 'zz' }).success,
    ).toBe(false);
    expect(
      DiagnosticAnswersSchema.safeParse({ ...answersAt('max'), bogus_question: 'a' }).success,
    ).toBe(false);
  });
});

describe('computeReadiness', () => {
  it('scores 0 for all-weakest answers (timeline floor aside)', () => {
    const r = computeReadiness(answersAt('min'), TEST_NOW);
    // timeline's weakest options carry 1 point (there is no zero-runway
    // "good" answer), so overall is low but not exactly 0.
    expect(r.score).toBeLessThan(15);
    expect(r.dimensions.technical).toBe(0);
    expect(r.dimensions.profile).toBe(0);
  });

  it('scores 100 for all-strongest answers', () => {
    const r = computeReadiness(answersAt('max'), TEST_NOW);
    expect(r.score).toBe(100);
    for (const d of DIMENSIONS) expect(r.dimensions[d]).toBe(100);
  });

  it('is deterministic and stamps computed_at from injected now', () => {
    const a = computeReadiness(answersAt('max'), TEST_NOW);
    const b = computeReadiness(answersAt('max'), TEST_NOW);
    expect(a).toEqual(b);
    expect(a.computed_at).toBe(TEST_NOW.toISOString());
  });

  it('throws on unvalidated bad input', () => {
    expect(() => computeReadiness({ ib_explain: 'nope' } as never, TEST_NOW)).toThrow();
  });
});

describe('prioritiseModules', () => {
  it('puts modules for the weakest dimension first and roadmap last', () => {
    const dims = Object.fromEntries(DIMENSIONS.map((d) => [d, 80])) as Record<
      (typeof DIMENSIONS)[number],
      number
    >;
    dims.technical = 10;
    const order = prioritiseModules(dims);
    expect(order[0]).toBe('technical-foundations');
    expect(order[order.length - 1]).toBe(ROADMAP_MODULE_SLUG);
    expect(order).toHaveLength(MODULE_DIMENSIONS.length + 1);
  });

  it('preserves course order within equal dimensions', () => {
    const dims = Object.fromEntries(DIMENSIONS.map((d) => [d, 50])) as Record<
      (typeof DIMENSIONS)[number],
      number
    >;
    const order = prioritiseModules(dims);
    const ibModules = MODULE_DIMENSIONS.filter((m) => m.dimension === 'ib_understanding').map(
      (m) => m.slug,
    );
    const positions = ibModules.map((slug) => order.indexOf(slug));
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });
});

describe('computeFinalReadiness', () => {
  const initial = computeReadiness(answersAt('min'), TEST_NOW);

  it('improves a dimension when its module quiz goes well', () => {
    const final = computeFinalReadiness(
      initial,
      { 'technical-foundations': { score: 8, total: 8 } },
      0.5,
      TEST_NOW,
    );
    expect(final.dimensions.technical).toBeGreaterThan(initial.dimensions.technical);
    expect(final.score).toBeGreaterThan(initial.score);
    expect(final.completed_lesson_ratio).toBe(0.5);
  });

  it('never drops below the initial readiness on a bad quiz', () => {
    const strong = computeReadiness(answersAt('max'), TEST_NOW);
    const final = computeFinalReadiness(
      strong,
      { 'technical-foundations': { score: 0, total: 8 } },
      1,
      TEST_NOW,
    );
    expect(final.dimensions.technical).toBe(strong.dimensions.technical);
    expect(final.score).toBe(strong.score);
  });

  it('clamps completed_lesson_ratio into [0, 1]', () => {
    const final = computeFinalReadiness(initial, {}, 3, TEST_NOW);
    expect(final.completed_lesson_ratio).toBe(1);
  });
});

describe('prefillFromProfile', () => {
  const base: StudentProfile = {
    id: 'test',
    email: 'test@example.com',
    university: 'UNSW',
    university_tier: 'go8_top',
    degree: 'Commerce',
    degree_type: 'bachelor',
    majors: ['Finance'],
    current_year: 2,
    expected_graduation_year: 2029,
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

  it('maps no experience to the weakest option', () => {
    expect(prefillFromProfile(base, TEST_NOW).prof_experience).toBe('a');
  });

  it('maps front-office experience to the strongest option', () => {
    const profile: StudentProfile = {
      ...base,
      experiences: [
        {
          type: 'summer_internship',
          firm: 'A Bank',
          firm_tier: 'bb',
          industry: 'investment_banking',
          role_function: 'ib_analyst_intern',
          role_relevance: 5,
          year: 2025,
          duration_months: 3,
          how_obtained: 'direct_application',
          converted_to_ft: false,
        } as StudentProfile['experiences'][number],
      ],
    };
    expect(prefillFromProfile(profile, TEST_NOW).prof_experience).toBe('e');
  });

  it('maps society signals to finance-adjacent', () => {
    const profile: StudentProfile = { ...base, signals: ['investment_society_committee'] };
    expect(prefillFromProfile(profile, TEST_NOW).prof_experience).toBe('c');
  });

  it('maps graduation distance to timeline options', () => {
    // 2029 grad, now 2026 → 3 years remaining → option c
    expect(prefillFromProfile(base, TEST_NOW).time_year).toBe('c');
    expect(
      prefillFromProfile({ ...base, expected_graduation_year: 2028 }, TEST_NOW).time_year,
    ).toBe('a'); // penultimate now
    expect(
      prefillFromProfile({ ...base, expected_graduation_year: 2027 }, TEST_NOW).time_year,
    ).toBe('b'); // final year
  });
});
