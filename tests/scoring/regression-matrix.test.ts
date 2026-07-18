import { describe, expect, it } from 'vitest';

import { score } from '../../lib/scoring/index.js';
import type { StudentProfile, TargetFirmTier, TargetGeography } from '../../lib/scoring/types.js';
import {
  LATERAL_BIG4_AUDIT,
  TEST_NOW,
  Y2_FOUNDATION,
  Y2_UNSW_COOP_HD_JPM,
  Y3_NO_IB_PRE_RECRUITING,
  loadPros,
} from './fixtures.js';

const TARGET_TIERS: TargetFirmTier[] = [
  'bb',
  'elite_boutique',
  'mid_market',
  'boutique',
  'any',
];

const TARGET_GEOGRAPHIES: TargetGeography[] = [
  'sydney',
  'melbourne',
  'perth',
  'adelaide',
  'brisbane',
];

const PENULTIMATE_SECURED: StudentProfile = {
  ...Y2_UNSW_COOP_HD_JPM,
  id: 'student-test-penultimate-secured',
  experiences: [{
    ...Y2_UNSW_COOP_HD_JPM.experiences[0]!,
    type: 'penultimate_internship',
  }],
};

const FULL_TIME_IB: StudentProfile = {
  ...Y2_UNSW_COOP_HD_JPM,
  id: 'student-test-full-time-ib',
  current_year: 4,
  experiences: [{
    ...Y2_UNSW_COOP_HD_JPM.experiences[0]!,
    type: 'full_time',
  }],
};

const STAGE_FIXTURES: Array<{ expectedStage: string; profile: StudentProfile }> = [
  { expectedStage: 'S0', profile: Y2_FOUNDATION },
  { expectedStage: 'S1', profile: Y2_UNSW_COOP_HD_JPM },
  { expectedStage: 'S2', profile: Y3_NO_IB_PRE_RECRUITING },
  { expectedStage: 'S3', profile: PENULTIMATE_SECURED },
  { expectedStage: 'S4', profile: FULL_TIME_IB },
  { expectedStage: 'S5', profile: LATERAL_BIG4_AUDIT },
];

function assertFiniteNumbers(value: unknown, path = '<root>'): void {
  if (typeof value === 'number') {
    expect(Number.isFinite(value), `${path} must be finite`).toBe(true);
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertFiniteNumbers(entry, `${path}.${index}`));
    return;
  }
  if (value !== null && typeof value === 'object') {
    Object.entries(value).forEach(([key, entry]) => {
      assertFiniteNumbers(entry, `${path}.${key}`);
    });
  }
}

describe('scoring regression matrix', () => {
  const professionals = loadPros();

  it.each(STAGE_FIXTURES)(
    'keeps the $expectedStage classification deterministic',
    ({ expectedStage, profile }) => {
      const first = score(profile, professionals, { now: TEST_NOW });
      const second = score(structuredClone(profile), structuredClone(professionals), {
        now: new Date(TEST_NOW),
      });
      expect(first.stage).toBe(expectedStage);
      expect(second).toEqual(first);
      assertFiniteNumbers(first);
    },
  );

  it('produces internally consistent output for every target tier and geography', () => {
    for (const target_firm_tier of TARGET_TIERS) {
      for (const target_geography of TARGET_GEOGRAPHIES) {
        const profile: StudentProfile = {
          ...Y2_UNSW_COOP_HD_JPM,
          id: `matrix-${target_firm_tier}-${target_geography}`,
          target_firm_tier,
          target_geography,
        };
        const output = score(profile, professionals, { now: TEST_NOW });

        expect(output.target.tier).toBe(target_firm_tier);
        expect(output.target.geography).toBe(target_geography);
        expect(output.match_summary.matched_count).toBe(output.probability_data.matched_count);
        expect(output.probability_data.reached_target).toBeLessThanOrEqual(
          output.probability_data.matched_count,
        );
        expect(output.probability_data.reached_one_below).toBeLessThanOrEqual(
          output.probability_data.matched_count,
        );
        expect(output.match_summary.pool_size).toBeLessThanOrEqual(professionals.length);
        assertFiniteNumbers(output);
      }
    }
  });

  it('preserves null-duration and unknown education inputs without invalid numbers', () => {
    const professionalsWithUnknowns = structuredClone(professionals);
    professionalsWithUnknowns[0]!.wam_band = 'unknown';
    professionalsWithUnknowns[0]!.atar_band = 'unknown';
    professionalsWithUnknowns[0]!.graduation_year = null;
    professionalsWithUnknowns[0]!.experiences[0]!.duration_months = null;

    const output = score(Y2_FOUNDATION, professionalsWithUnknowns, { now: TEST_NOW });
    assertFiniteNumbers(output);
  });
});
