import { describe, it, expect } from 'vitest';
import { classifyStage } from '../../lib/scoring/stage.js';
import { computeFields } from '../../lib/scoring/computed.js';
import {
  Y2_UNSW_COOP_HD_JPM,
  Y3_NO_IB_PRE_RECRUITING,
  Y2_FOUNDATION,
  LATERAL_BIG4_AUDIT,
  Y6_EXTENDED_DEGREE,
  TEST_NOW,
} from './fixtures.js';

function classify(student: typeof Y2_UNSW_COOP_HD_JPM) {
  const c = computeFields({
    experiences: student.experiences,
    signals: student.signals,
    current_year: student.current_year,
    expected_graduation_year: student.expected_graduation_year,
    now: TEST_NOW,
  });
  return classifyStage(student, c);
}

describe('classifyStage', () => {
  it('Y2 UNSW Co-op with one BB IB internship → S1', () => {
    expect(classify(Y2_UNSW_COOP_HD_JPM)).toBe('S1');
  });

  it('Y3 May 2026 with no IB experience → S2 (recruiting <6 months)', () => {
    expect(classify(Y3_NO_IB_PRE_RECRUITING)).toBe('S2');
  });

  it('Y2 with no relevant experience → S0', () => {
    expect(classify(Y2_FOUNDATION)).toBe('S0');
  });

  it('lateral candidate flag → S5 regardless of other fields', () => {
    expect(classify(LATERAL_BIG4_AUDIT)).toBe('S5');
  });

  it('Y6 extended-degree student graduating 2027 → S2 (Y3+ and July 2026 recruiting is <6 months from TEST_NOW)', () => {
    expect(classify(Y6_EXTENDED_DEGREE)).toBe('S2');
  });
});
