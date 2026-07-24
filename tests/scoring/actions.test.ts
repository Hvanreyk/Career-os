/**
 * Action generator — competitiveness + timeline driven (NOT S0–S5 stage).
 *
 * Hermetic: synthetic students + inline synthetic matches built here, no
 * loadPros / snapshot fixture. We compose the real pipeline pieces
 * (computeFields → analyzeGaps → computeScorecard → generateActions) exactly
 * as score() does, so the behaviour under test is the production path.
 */

import { describe, it, expect } from 'vitest';
import { computeFields } from '../../lib/scoring/computed.js';
import { analyzeGaps } from '../../lib/scoring/gaps.js';
import { computeScorecard } from '../../lib/scoring/scorecard.js';
import { generateActions } from '../../lib/scoring/actions.js';
import type {
  Action,
  Experience,
  MatchResult,
  Professional,
  SignalTag,
  StudentProfile,
} from '../../lib/scoring/types.js';

const NOW = new Date('2026-05-08T00:00:00Z');

// ------------------------------------------------------------
// Builders
// ------------------------------------------------------------

function exp(overrides: Partial<Experience>): Experience {
  return {
    type: 'summer_internship',
    firm: 'A Firm',
    firm_tier: 'bb',
    industry: 'ib',
    role_function: 'ib_coverage',
    role_relevance: 5,
    year: 2024,
    duration_months: 3,
    how_obtained: 'online_application',
    converted_to_ft: 'NA',
    ...overrides,
  };
}

function student(overrides: Partial<StudentProfile> = {}): StudentProfile {
  return {
    id: 's', email: 's@example.com',
    university: 'UNSW', university_tier: 'go8_top',
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

let proSeq = 0;
function makePro(overrides: Partial<Professional> = {}): Professional {
  proSeq += 1;
  return {
    id: `P${String(100 + proSeq)}`,
    current_role: 'ib_analyst',
    current_firm: 'J.P. Morgan',
    current_firm_tier: 'bb',
    current_geography: 'sydney',
    current_role_start_year: 2024,
    years_to_current_role: 2,
    university: 'UNSW', university_tier: 'go8_top',
    degree: 'Bachelor of Commerce', degree_type: 'bachelor', majors: 'Finance',
    wam_band: 'd', graduation_year: 2024,
    has_honours: false, has_masters_or_second_degree: false,
    high_school: null, high_school_type: 'unknown', atar_band: 'unknown',
    experiences: [],
    signals: [],
    path_summary: 'BCom → BB summer → BB analyst',
    data_source: 'linkedin', data_confidence: 'medium',
    ...overrides,
  };
}

function toMatch(pro: Professional, distance = 0.1): MatchResult {
  const computed = computeFields({ experiences: pro.experiences, signals: pro.signals });
  return {
    professional: pro,
    snapshot: {
      university_tier: pro.university_tier,
      wam_band: pro.wam_band,
      atar_band: pro.atar_band,
      high_school_type: pro.high_school_type,
      has_honours: pro.has_honours,
      has_masters_or_second_degree: pro.has_masters_or_second_degree,
      experiences: pro.experiences,
      signals: pro.signals,
      computed,
    },
    distance,
  };
}

/** Compose the pipeline exactly as score() does, then generate actions. */
function run(s: StudentProfile, matches: MatchResult[]): Action[] {
  const computed = computeFields({
    experiences: s.experiences, signals: s.signals,
    current_year: s.current_year, expected_graduation_year: s.expected_graduation_year, now: NOW,
  });
  const gaps = analyzeGaps(s, computed, matches, s.target_firm_tier);
  const scorecard = computeScorecard(s, computed);
  return generateActions(s, computed, scorecard, gaps, matches, NOW);
}

/** BB professional who interned at a BB and carries the given committee/course
 * signals — used to manufacture common gaps among successful matches. */
function bbMatchWith(signals: SignalTag[]): MatchResult {
  return toMatch(makePro({
    current_firm: 'Goldman Sachs',
    current_firm_tier: 'bb',
    experiences: [exp({ firm: 'Goldman Sachs', firm_tier: 'bb', type: 'penultimate_internship' })],
    signals,
  }));
}

// ------------------------------------------------------------
// Tests
// ------------------------------------------------------------

describe('generateActions — timeline + competitiveness driven', () => {
  it('a BUILDING student gets a gap action with a positive index_impact', () => {
    // Y2, penultimate ~14 months out → BUILDING. One boutique IB internship, D
    // WAM → band "competitive" (not strong), and has IB experience.
    const s = student({
      wam_band: 'd',
      experiences: [exp({ firm: 'A Boutique', firm_tier: 'boutique', type: 'summer_internship' })],
      signals: [],
    });
    // Every BB-reaching match has a modelling course + investment society, which
    // the student lacks → those become common, closable gaps.
    const gapSignals: SignalTag[] = ['modelling_course', 'investment_society_committee'];
    const matches = [
      bbMatchWith(gapSignals),
      bbMatchWith(gapSignals),
      bbMatchWith(gapSignals),
    ];

    const actions = run(s, matches);

    // Primary is timeline-driven (has IB, competitive, building).
    expect(actions[0]!.action_type).toBe('secure_penultimate');

    const gapAction = actions.find(a => a.priority === 2);
    expect(gapAction).toBeDefined();
    expect(gapAction!.action_type.startsWith('close_')).toBe(true);
    expect(gapAction!.index_impact).toBeGreaterThan(0);
    // Description cites the match percentage.
    expect(gapAction!.description).toMatch(/\d+%/);
  });

  it('a reach + final-year student gets the pivot/lateral branch', () => {
    // Final year: penultimate window passed, grad cycle still just ahead → LATE.
    // Weak profile (P WAM, non-target uni, no experience) → band "reach".
    const s = student({
      university_tier: 'other_au',
      wam_band: 'p',
      current_year: 3,
      expected_graduation_year: 2026,
      experiences: [],
      signals: [],
    });
    const lateralPro = makePro({
      current_firm: 'Jefferies',
      current_firm_tier: 'elite_boutique',
      years_to_current_role: 5,
      path_summary: 'Big 4 transaction services → EB associate (lateral)',
      experiences: [
        exp({ firm: 'KPMG', firm_tier: 'big4', industry: 'big4_advisory', type: 'full_time', year: 2020, how_obtained: 'graduate_program' }),
        exp({ firm: 'Jefferies', firm_tier: 'elite_boutique', type: 'full_time', industry: 'ib', year: 2023, how_obtained: 'lateral' }),
      ],
    });
    const matches = [lateralPro, makePro({ years_to_current_role: 2 })].map(p => toMatch(p));

    const actions = run(s, matches);

    expect(actions[0]!.action_type).toBe('pivot_lateral');
    // Cites the matched lateral mover's path.
    expect(actions[0]!.description).toContain('lateral');
    expect(actions[0]!.description).toContain('transaction services');
  });

  it('a PENULT_SECURED student gets a convert action', () => {
    // Secured a penultimate internship → PENULT_SECURED regardless of timing.
    const s = student({
      wam_band: 'hd',
      experiences: [exp({ firm: 'UBS', firm_tier: 'bb', type: 'penultimate_internship' })],
      signals: ['investment_society_committee'],
    });
    const matches = [
      toMatch(makePro({
        current_firm: 'UBS', current_firm_tier: 'bb',
        experiences: [exp({ firm: 'UBS', firm_tier: 'bb', type: 'penultimate_internship', how_obtained: 'return_offer' })],
      })),
      toMatch(makePro({
        current_firm: 'Citi', current_firm_tier: 'bb',
        experiences: [exp({ firm: 'Citi', firm_tier: 'bb', type: 'penultimate_internship', how_obtained: 'conversion' })],
      })),
    ];

    const actions = run(s, matches);

    expect(actions[0]!.action_type).toBe('convert_offer');
    expect(actions[0]!.title.toLowerCase()).toContain('convert');
    // Cites the market penultimate→FT conversion rate (~63%).
    expect(actions[0]!.description).toContain('63%');
  });

  it('never returns more than 3 actions', () => {
    const s = student({
      wam_band: 'd',
      experiences: [exp({ firm: 'A Boutique', firm_tier: 'boutique' })],
      signals: [],
    });
    // Lots of manufactured gaps so gap actions could otherwise overflow.
    const rich: SignalTag[] = ['modelling_course', 'investment_society_committee', 'deans_list', 'cfa_l1'];
    const matches = Array.from({ length: 6 }, () => bbMatchWith(rich));

    const actions = run(s, matches);
    expect(actions.length).toBeLessThanOrEqual(3);
    // Priorities are a valid 1..3 sequence, most-important first.
    expect(actions[0]!.priority).toBe(1);
    for (const a of actions) expect(a.priority).toBeGreaterThanOrEqual(1);
  });
});
