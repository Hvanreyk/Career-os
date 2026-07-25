import { describe, it, expect } from 'vitest';
import { recommendResources } from '../../lib/courses/recommend.js';
import type { Action, Gap, ScoringOutput } from '../../lib/scoring/types.js';

// Minimal ScoringOutput builder — only the fields recommendResources reads
// (actions, gaps, competitiveness) matter; the rest are filled with inert
// defaults so we exercise the ranking in isolation.
function buildOutput(overrides: {
  actions?: Action[];
  gaps?: Gap[];
  contributions?: { feature: string; label: string; points: number }[];
  band?: 'strong' | 'competitive' | 'developing' | 'reach';
  withCompetitiveness?: boolean;
}): ScoringOutput {
  const {
    actions = [],
    gaps = [],
    contributions = [],
    band = 'developing',
    withCompetitiveness = true,
  } = overrides;
  return {
    student_summary: '',
    stage: 'S2' as ScoringOutput['stage'],
    stage_description: '',
    target: { role: 'analyst', tier: 'bb', geography: 'Sydney' },
    match_summary: {
      pool_size: 10, matched_count: 8, reached_target_count: 3,
      fit_band: 'reach', low_data_warning: false, boutique_data_warning: false,
    },
    competitiveness: withCompetitiveness
      ? {
          primary_tier: 'bb', index: 50, band,
          estimated_probability: 0.05, multiplier_vs_field: 1,
          any_front_office_probability: 0.3,
          contributions, per_tier: [],
          recommended_target: 'mid_market', stretch_target: 'bb', safety_target: 'boutique',
        }
      : undefined,
    probability_data: { matched_count: 8, reached_target: 3, reached_one_below: 2 },
    top_paths: [],
    gaps,
    actions,
    context: { current_date: '2026-07-24', next_recruiting_window: 'July 2026' },
  };
}

const action = (priority: 1 | 2 | 3, action_type: string, extra: Partial<Action> = {}): Action => ({
  priority, action_type, title: `Action ${action_type}`,
  description: '', deadline: null, estimated_effort: 'medium', ...extra,
});

const gap = (gap_key: string, actionability: Gap['actionability']): Gap => ({
  gap_key, display_name: `Gap ${gap_key}`, match_pct: 0.6, student_has: false,
  actionability, time_to_address_months: 3,
});

describe('recommendResources', () => {
  it('recommends the guides for an early, knowledge-gap-dominant student', () => {
    const out = buildOutput({
      band: 'reach',
      actions: [action(1, 'first_experience'), action(3, 'targeted_networking')],
      contributions: [{ feature: 'has_ib_experience', label: 'No IB internship yet', points: -15 }],
    });
    const recs = recommendResources(out);
    expect(recs[0]?.slug).toBe('investment-banking-guides');
    expect(recs[0]?.drivenBy.kind).toBe('action');
    expect(recs[0]?.drivenBy.key).toBe('first_experience');
    // Networking still surfaces as a secondary, driven by their #3 action.
    expect(recs.some((r) => r.slug === 'networking-strategy')).toBe(true);
  });

  it('recommends networking first for a strong student protecting a lead', () => {
    const out = buildOutput({
      band: 'strong',
      actions: [action(1, 'protect_lead'), action(2, 'close_has_modelling_course', { index_impact: 4 })],
    });
    const recs = recommendResources(out);
    expect(recs[0]?.slug).toBe('networking-strategy');
    expect(recs[0]?.drivenBy.key).toBe('protect_lead');
    // The gap-closing action routes to the guides as a secondary.
    expect(recs[1]?.slug).toBe('investment-banking-guides');
  });

  it('routes application-phase actions to the resume resource', () => {
    const out = buildOutput({
      band: 'competitive',
      actions: [action(1, 'apply_penultimate_now')],
    });
    const recs = recommendResources(out);
    expect(recs[0]?.slug).toBe('resume-cover-letter');
  });

  it('carries the driving signal for a gap-closing action', () => {
    const out = buildOutput({
      actions: [action(2, 'close_has_smif', { index_impact: 3 })],
    });
    const primary = recommendResources(out)[0];
    expect(primary?.slug).toBe('investment-banking-guides');
    expect(primary?.drivenBy.indexImpact).toBe(3);
  });

  it('deduplicates resources, keeping the strongest driver', () => {
    const out = buildOutput({
      actions: [action(1, 'apply_penultimate_now'), action(2, 'secure_penultimate')],
    });
    const recs = recommendResources(out);
    expect(recs.filter((r) => r.slug === 'resume-cover-letter')).toHaveLength(1);
    expect(recs[0]?.drivenBy.key).toBe('apply_penultimate_now');
  });

  it('always returns at least one recommendation via the band safety net', () => {
    const strong = recommendResources(buildOutput({ band: 'strong', actions: [], gaps: [] }));
    expect(strong[0]?.slug).toBe('networking-strategy');
    expect(strong[0]?.drivenBy.kind).toBe('band');

    const reach = recommendResources(buildOutput({ band: 'reach', actions: [], gaps: [] }));
    expect(reach[0]?.slug).toBe('investment-banking-guides');
  });

  it('surfaces high-actionability gaps when actions leave room', () => {
    const out = buildOutput({
      actions: [action(1, 'apply_grad_now')],
      gaps: [gap('has_modelling_course', 'high'), gap('has_pe_experience', 'low')],
    });
    const recs = recommendResources(out);
    // resume (from action) then guides (from the high-actionability modelling gap).
    expect(recs.map((r) => r.slug)).toContain('investment-banking-guides');
    // The low-actionability PE gap must not add networking here.
    const guideRec = recs.find((r) => r.slug === 'investment-banking-guides');
    expect(guideRec?.drivenBy.key).toBe('has_modelling_course');
  });
});
