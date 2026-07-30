import { describe, expect, it } from 'vitest';
import {
  baseSeatRate,
  basePlacementRate,
  candidatesPerSeat,
  probabilityCeiling,
  seriousCandidatesFor,
  SERIOUS_CANDIDATES,
  SUMMER_SEATS,
  PENULTIMATE_TO_FT_RATE,
} from '../../lib/scoring/funnel.js';

const approx = (a: number, b: number, tol = 0.002) => Math.abs(a - b) <= tol;

describe('funnel base rates', () => {
  it('BB summer base rate is ~2% of serious candidates', () => {
    expect(approx(baseSeatRate('bb').base, 58 / 2900)).toBe(true); // ~0.02
  });

  it('any-core base rate is ~5% of serious candidates', () => {
    expect(approx(baseSeatRate('any').base, 145 / 2900)).toBe(true); // ~0.05
  });

  it('elite_boutique and mid_market share one seat bucket (source does not split them)', () => {
    expect(baseSeatRate('elite_boutique')).toEqual(baseSeatRate('mid_market'));
    expect(baseSeatRate('mid_market').base).toBeCloseTo(55 / 2900, 6);
  });

  it('placement rate (incl. off-cycle) exceeds the summer-only rate', () => {
    expect(basePlacementRate('bb').base).toBeGreaterThan(baseSeatRate('bb').base);
    expect(basePlacementRate('any').base).toBeGreaterThan(baseSeatRate('any').base);
  });

  it('every range is ordered low <= base <= high', () => {
    for (const tier of ['bb', 'elite_boutique', 'mid_market', 'boutique', 'any'] as const) {
      const rate = baseSeatRate(tier);
      expect(rate.low).toBeLessThanOrEqual(rate.base);
      expect(rate.base).toBeLessThanOrEqual(rate.high);
    }
  });
});

describe('competition intensity', () => {
  it('~50 serious candidates per BB summer seat', () => {
    expect(Math.round(candidatesPerSeat('bb').base)).toBe(50); // 2900/58
  });

  it('~20 serious candidates per core seat overall', () => {
    expect(Math.round(candidatesPerSeat('any').base)).toBe(20); // 2900/145
  });
});

describe('probability ceiling keeps estimates honest', () => {
  it('caps above the base rate but never absurd', () => {
    for (const tier of ['bb', 'elite_boutique', 'mid_market', 'boutique', 'any'] as const) {
      const ceil = probabilityCeiling(tier);
      expect(ceil).toBeGreaterThan(baseSeatRate(tier).base);
      expect(ceil).toBeLessThanOrEqual(0.6);
    }
  });

  it('BB ceiling stays modest — a strong candidate is not a lock', () => {
    // 70 / 800 ~= 0.0875, so even the best profile tops out well under 15%.
    expect(probabilityCeiling('bb')).toBeLessThan(0.15);
  });
});

describe('geography + conversion', () => {
  it('Sydney has the largest serious-candidate pool', () => {
    expect(seriousCandidatesFor('sydney')).toBeGreaterThan(seriousCandidatesFor('melbourne'));
    expect(seriousCandidatesFor('melbourne')).toBeGreaterThan(seriousCandidatesFor('perth'));
  });

  it('penultimate -> FT conversion is a strong ~63%', () => {
    expect(PENULTIMATE_TO_FT_RATE.base).toBeCloseTo(0.63, 2);
  });

  it('sanity: serious pool and BB seats match the source', () => {
    expect(SERIOUS_CANDIDATES.base).toBe(2900);
    expect(SUMMER_SEATS.bb.base).toBe(58);
  });
});
