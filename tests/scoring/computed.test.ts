import { describe, it, expect } from 'vitest';
import { computeFields } from '../../lib/scoring/computed.js';
import { loadPros, TEST_NOW, Y2_UNSW_COOP_HD_JPM } from './fixtures.js';
import { TIER_LEVEL } from '../../lib/scoring/types.js';

describe('computeFields — P001 Thomas Sukkar', () => {
  const p001 = loadPros().find(p => p.id === 'P001')!;

  it('matches the spec test conditions', () => {
    const c = computeFields({
      experiences: p001.experiences,
      signals: p001.signals,
    });
    expect(c.has_ib_experience).toBe(true);
    expect(c.has_pe_experience).toBe(true);
    expect(c.highest_firm_tier_reached).toBe(TIER_LEVEL.bb);
    expect(c.has_conversion).toBe(true); // exp3 has how_obtained='return_offer'
    expect(c.has_smif).toBe(true);        // signals contain investment_society_committee
    expect(c.is_co_op_program).toBe(true);
  });
});

describe('computeFields — Y2 UNSW Co-op HD JPM student', () => {
  it('produces correct flags and time-sensitive numbers', () => {
    const c = computeFields({
      experiences: Y2_UNSW_COOP_HD_JPM.experiences,
      signals: Y2_UNSW_COOP_HD_JPM.signals,
      current_year: Y2_UNSW_COOP_HD_JPM.current_year,
      expected_graduation_year: Y2_UNSW_COOP_HD_JPM.expected_graduation_year,
      now: TEST_NOW,
    });
    expect(c.has_ib_experience).toBe(true);
    expect(c.has_bb_experience).toBe(true);
    expect(c.has_summer_internship).toBe(true);
    expect(c.experience_count_relevant).toBe(1);
    expect(c.is_co_op_program).toBe(true);

    // expected_graduation_year=2028 → penultimate apps July 2027 → ~14 months from May 2026
    expect(c.months_until_penultimate_recruiting).toBeGreaterThanOrEqual(13);
    expect(c.months_until_penultimate_recruiting).toBeLessThanOrEqual(15);
  });

  it('preserves the approved Release A unknown-as-zero duration behaviour', () => {
    const experience = {
      ...Y2_UNSW_COOP_HD_JPM.experiences[0]!,
      duration_months: null,
    };
    const computed = computeFields({ experiences: [experience], signals: [] });
    expect(computed.total_experience_months).toBe(0);
  });
});
