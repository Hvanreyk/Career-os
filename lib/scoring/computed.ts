/**
 * Layer 1 — Profile normalisation: derive ComputedFields from raw
 * experiences + signals.
 *
 * Pure function. No I/O. Used for both the student profile and
 * the professional snapshots produced by Layer 4.
 */

import type { ComputedFields, Experience, SignalTag } from './types';
import { TIER_LEVEL } from './types';

export interface ComputeInput {
  experiences: Experience[];
  signals: SignalTag[];
  // Time-sensitive fields are only computed when these are provided.
  // For a professional snapshot we leave them undefined; the engine
  // doesn't need months_until_X for matching.
  current_year?: number;
  expected_graduation_year?: number;
  now?: Date;
}

// ----- Signal helpers (set lookup is cheaper than .includes) -----

const SMIF_SIGNALS: SignalTag[] = [
  'investment_society_member',
  'investment_society_committee',
  'investment_society_president',
];

const COMMITTEE_SIGNALS: SignalTag[] = [
  'fin_society_committee',
  'investment_society_committee',
  'investment_society_president',
  'consulting_society_committee',
  'society_committee',
];

function hasAny(signals: Set<string>, candidates: SignalTag[]): boolean {
  for (const c of candidates) if (signals.has(c)) return true;
  return false;
}

// ----- Time helpers -----

function monthsBetween(from: Date, to: Date): number {
  const years = to.getFullYear() - from.getFullYear();
  const months = to.getMonth() - from.getMonth();
  return years * 12 + months;
}

// Penultimate year = expected_graduation_year - 1.
// Australian recruiting opens ~mid-July of the penultimate year.
function monthsUntilPenultimateRecruiting(
  expectedGraduationYear: number,
  now: Date,
): number {
  const penultimateYear = expectedGraduationYear - 1;
  const target = new Date(penultimateYear, 6, 15); // July 15
  return monthsBetween(now, target);
}

// Grad apps open March of final (graduation) year.
function monthsUntilGradRecruiting(
  expectedGraduationYear: number,
  now: Date,
): number {
  const target = new Date(expectedGraduationYear, 2, 15); // March 15
  return monthsBetween(now, target);
}

// ----- Main -----

export function computeFields(input: ComputeInput): ComputedFields {
  const { experiences, signals } = input;
  const sigSet = new Set<string>(signals);

  // Industry-based booleans
  const has_ib_experience = experiences.some(e => e.industry === 'ib');
  const has_pe_experience = experiences.some(e => e.industry === 'private_equity');
  const has_law_experience = experiences.some(e => e.industry === 'law');
  const has_big4_advisory_experience = experiences.some(
    e => (e.industry === 'big4_advisory' || e.industry === 'big4_business_advisory') && e.role_relevance >= 3,
  );

  // Firm-tier booleans
  const has_bb_experience = experiences.some(e => e.firm_tier === 'bb');
  const has_elite_boutique_experience = experiences.some(e => e.firm_tier === 'elite_boutique');
  // Legacy combined value counts toward mid-market, conservatively (see TIER_LEVEL).
  const has_mid_market_experience = experiences.some(
    e => e.firm_tier === 'mid_market' || e.firm_tier === 'elite_boutique_and_mm',
  );
  const has_boutique_experience = experiences.some(e => e.firm_tier === 'boutique');

  // Type-based booleans
  const has_penultimate_internship = experiences.some(e => e.type === 'penultimate_internship');
  const has_summer_internship = experiences.some(e => e.type === 'summer_internship');
  const has_full_time_ib = experiences.some(
    e => e.type === 'full_time' && e.industry === 'ib',
  );

  // Aggregates
  const experience_count_relevant = experiences.filter(e => e.role_relevance >= 3).length;
  const total_experience_months = experiences.reduce(
    (acc, e) => acc + (e.duration_months ?? 0),
    0,
  );

  let highest_firm_tier_reached = 0;
  for (const e of experiences) {
    const lvl = TIER_LEVEL[e.firm_tier as keyof typeof TIER_LEVEL] ?? 0;
    if (lvl > highest_firm_tier_reached) highest_firm_tier_reached = lvl;
  }

  // Transition signals derived from how_obtained
  const has_conversion = experiences.some(
    e => e.how_obtained === 'conversion' || e.how_obtained === 'return_offer',
  );
  const has_lateral = experiences.some(e => e.how_obtained === 'lateral');

  // Signal flags
  const has_smif = hasAny(sigSet, SMIF_SIGNALS);
  const has_society_committee = hasAny(sigSet, COMMITTEE_SIGNALS);
  const has_modelling_course = sigSet.has('modelling_course');
  const has_dean_list = sigSet.has('deans_list');
  const is_co_op_program = sigSet.has('co_op_program');

  let cfa_level: 0 | 1 | 2 | 3 = 0;
  if (sigSet.has('cfa_l3')) cfa_level = 3;
  else if (sigSet.has('cfa_l2')) cfa_level = 2;
  else if (sigSet.has('cfa_l1')) cfa_level = 1;

  // Time-sensitive — only computed when student timing context is provided.
  // For professional snapshots these stay 0; the engine doesn't read
  // them when matching, only when generating actions.
  let months_until_penultimate_recruiting = 0;
  let months_until_grad_recruiting = 0;
  if (input.expected_graduation_year !== undefined) {
    const now = input.now ?? new Date();
    months_until_penultimate_recruiting = monthsUntilPenultimateRecruiting(
      input.expected_graduation_year, now,
    );
    months_until_grad_recruiting = monthsUntilGradRecruiting(
      input.expected_graduation_year, now,
    );
  }

  return {
    has_ib_experience,
    has_bb_experience,
    has_elite_boutique_experience,
    has_mid_market_experience,
    has_boutique_experience,
    has_big4_advisory_experience,
    has_pe_experience,
    has_law_experience,
    has_penultimate_internship,
    has_summer_internship,
    has_full_time_ib,
    experience_count_relevant,
    total_experience_months,
    highest_firm_tier_reached,
    has_conversion,
    has_lateral,
    months_until_penultimate_recruiting,
    months_until_grad_recruiting,
    has_smif,
    has_society_committee,
    has_modelling_course,
    has_dean_list,
    cfa_level,
    is_co_op_program,
  };
}

