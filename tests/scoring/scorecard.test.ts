import { describe, expect, it } from 'vitest';
import { computeFields } from '../../lib/scoring/computed.js';
import { computeScorecard, actionImpact, indexToMultiplier } from '../../lib/scoring/scorecard.js';
import type { StudentProfile, Experience } from '../../lib/scoring/types.js';

const NOW = new Date('2026-05-08T00:00:00Z');

function student(overrides: Partial<StudentProfile> = {}): StudentProfile {
  return {
    id: 's', email: 's@example.com',
    university: 'University of Sydney', university_tier: 'go8_top',
    degree: 'Bachelor of Commerce', degree_type: 'bachelor', majors: ['Finance'],
    current_year: 2, expected_graduation_year: 2028,
    wam_band: 'd', has_honours: false, has_masters_or_second_degree: false,
    high_school: null, high_school_type: 'unknown', atar_band: 'unknown',
    experiences: [], signals: [],
    target_role: 'ib_analyst', target_firm_tier: 'bb', target_geography: 'sydney',
    is_lateral_candidate: false,
    ...overrides,
  };
}

const bbInternship: Experience = {
  type: 'penultimate_internship', firm: 'J.P. Morgan', firm_tier: 'bb', industry: 'ib',
  role_function: 'ib_coverage', role_relevance: 5, year: 2025, duration_months: 3,
  how_obtained: 'online_application', converted_to_ft: 'NA',
};

function scoreOf(s: StudentProfile) {
  const computed = computeFields({
    experiences: s.experiences, signals: s.signals,
    current_year: s.current_year, expected_graduation_year: s.expected_graduation_year, now: NOW,
  });
  return { computed, card: computeScorecard(s, computed) };
}

describe('competitiveness index', () => {
  it('a strong profile (HD, Go8, BB internship, committee) is competitive+ for BB', () => {
    const { card } = scoreOf(student({
      wam_band: 'hd', atar_band: '99_plus',
      experiences: [bbInternship],
      signals: ['investment_society_committee', 'modelling_course'],
    }));
    expect(card.index).toBeGreaterThanOrEqual(65);
    expect(['competitive', 'strong']).toContain(card.band);
  });

  it('a foundation profile (no experience, credit WAM) is a reach for BB', () => {
    const { card } = scoreOf(student({ wam_band: 'c', experiences: [], signals: [] }));
    expect(card.index).toBeLessThan(50);
    expect(['reach', 'developing']).toContain(card.band);
  });

  it('easier tiers score higher than harder tiers for the same profile', () => {
    const { card } = scoreOf(student({ wam_band: 'hd', signals: ['modelling_course'] }));
    const idx = (t: string) => card.perTier.find(p => p.tier === t)!.index;
    expect(idx('boutique')).toBeGreaterThan(idx('mid_market'));
    expect(idx('mid_market')).toBeGreaterThan(idx('elite_boutique'));
    expect(idx('elite_boutique')).toBeGreaterThan(idx('bb'));
  });
});

describe('attribution (the "why")', () => {
  it('surfaces the missing-IB-internship penalty as the biggest drag for a green profile', () => {
    const { card } = scoreOf(student({ wam_band: 'hd', signals: ['investment_society_committee'] }));
    const noIb = card.contributions.find(c => c.feature === 'has_ib_experience');
    expect(noIb).toBeDefined();
    expect(noIb!.points).toBeLessThan(0);
    // HD WAM should be a positive contributor.
    expect(card.contributions.find(c => c.feature === 'wam_band')!.points).toBeGreaterThan(0);
  });

  it('contributions are sorted by magnitude', () => {
    const { card } = scoreOf(student({ wam_band: 'hd', experiences: [bbInternship] }));
    const mags = card.contributions.map(c => Math.abs(c.points));
    for (let i = 1; i < mags.length; i++) expect(mags[i - 1]!).toBeGreaterThanOrEqual(mags[i]!);
  });
});

describe('action ROI (counterfactual)', () => {
  it('adding a modelling course raises the index', () => {
    const s = student({ wam_band: 'hd', signals: ['investment_society_committee'] });
    const { computed } = scoreOf(s);
    const delta = actionImpact(s, computed, { has_modelling_course: true });
    expect(delta).toBeGreaterThan(0);
  });

  it('landing a first IB internship is a large positive swing', () => {
    const s = student({ wam_band: 'hd' });
    const { computed } = scoreOf(s);
    const delta = actionImpact(s, computed, { has_ib_experience: true, highest_firm_tier_reached: 4 });
    expect(delta).toBeGreaterThanOrEqual(10);
  });
});

describe('probability + targets', () => {
  it('BB estimate never exceeds the funnel ceiling and is a small honest number', () => {
    const { card } = scoreOf(student({
      wam_band: 'hd', atar_band: '99_plus', experiences: [bbInternship],
      signals: ['investment_society_committee', 'modelling_course', 'deans_list'],
    }));
    const bb = card.perTier.find(p => p.tier === 'bb')!;
    expect(bb.estimatedProbability).toBeGreaterThan(0);
    expect(bb.estimatedProbability).toBeLessThan(0.2); // honest, not fantasy
    expect(bb.multiplierVsField).toBeGreaterThan(1); // above the field
  });

  it('anyFrontOffice on-ramp is meaningfully higher than the BB-alone odds', () => {
    const { card } = scoreOf(student({ wam_band: 'hd', signals: ['modelling_course'] }));
    const bb = card.perTier.find(p => p.tier === 'bb')!;
    expect(card.anyFrontOfficeProbability).toBeGreaterThan(bb.estimatedProbability);
  });

  it('recommends a reachable tier and a stretch above it', () => {
    const { card } = scoreOf(student({ wam_band: 'd', target_firm_tier: 'bb' }));
    expect(['bb', 'elite_boutique', 'mid_market', 'boutique']).toContain(card.recommendedTarget);
    expect(card.perTier.find(p => p.tier === card.recommendedTarget)!.index)
      .toBeGreaterThanOrEqual(card.perTier.find(p => p.tier === card.stretchTarget)!.index);
  });

  it('indexToMultiplier is 1x at the average and doubles every 18 points', () => {
    expect(indexToMultiplier(50)).toBeCloseTo(1, 5);
    expect(indexToMultiplier(68)).toBeCloseTo(2, 5);
    expect(indexToMultiplier(32)).toBeCloseTo(0.5, 5);
  });
});
