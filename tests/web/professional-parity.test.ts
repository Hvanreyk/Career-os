import { describe, expect, it } from 'vitest';

import { loadPros } from '../scoring/fixtures';
import {
  summarizeProfessionalParity,
  summarizeScoringParity,
} from '../../web/lib/professionals/parity';

describe('professional migration parity', () => {
  it('reports exact parity without exposing professional identifiers', () => {
    const professionals = loadPros();
    const summary = summarizeProfessionalParity(professionals, structuredClone(professionals));
    expect(summary.exact).toBe(true);
    expect(summary.mismatched_professional_count).toBe(0);
    expect(JSON.stringify(summary)).not.toContain(professionals[0]!.id);
  });

  it('detects field and cohort differences as aggregate counts', () => {
    const legacy = loadPros();
    const normalized = structuredClone(legacy);
    normalized[0]!.experiences[0]!.duration_months = 999;
    normalized.pop();
    const summary = summarizeProfessionalParity(legacy, normalized);
    expect(summary.exact).toBe(false);
    expect(summary.mismatched_professional_count).toBe(2);
  });

  it('supports documented floating point tolerance for scoring output', () => {
    const summary = summarizeScoringParity(
      { distance: 0.123456789, matches: 10 },
      { distance: 0.1234567890001, matches: 10 },
      1e-12,
    );
    expect(summary.exact).toBe(false);
    expect(summary.equivalent_within_tolerance).toBe(true);
  });

});
