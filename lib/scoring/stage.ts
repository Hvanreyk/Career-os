/**
 * Layer 2 — Stage classification: assign S0..S5 from a student
 * profile + computed fields. First-match-wins; rules ordered most
 * specific first. See scoring spec for stage definitions.
 */

import type { ComputedFields, Stage, StudentProfile } from './types';
import { TIER_LEVEL } from './types';

export function classifyStage(
  profile: StudentProfile,
  computed: ComputedFields,
): Stage {
  // S5: lateral mover — set by user flag at intake.
  if (profile.is_lateral_candidate) return 'S5';

  // S4: has FT IB offer (out of scope for action gen, but classified
  // so the LLM layer can render a brief "you're set" message).
  if (computed.has_full_time_ib) return 'S4';

  // S3: penultimate already secured.
  if (computed.has_penultimate_internship) return 'S3';

  // S2: pre-penultimate, recruiting imminent (Y3+ within 6 months
  // of the July penultimate cycle).
  if (
    profile.current_year >= 3 &&
    computed.months_until_penultimate_recruiting <= 6
  ) {
    return 'S2';
  }

  // S1: building — has at least one relevant experience at Big 4
  // tier or above.
  if (
    computed.experience_count_relevant >= 1 &&
    computed.highest_firm_tier_reached >= TIER_LEVEL.big4
  ) {
    return 'S1';
  }

  // S0: foundation — no relevant experience yet.
  return 'S0';
}
