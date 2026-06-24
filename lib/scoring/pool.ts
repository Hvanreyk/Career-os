/**
 * Layer 3 — Pool filtering. Narrows the professional set down to
 * comparable peers before we run distance computation.
 *
 * Rules (per scoring_engine_spec_v3.md):
 * - Hard filter on geography (target student wants Sydney → only
 *   Sydney pros).
 * - Tier filter: include the target tier and one tier above
 *   ("BB target" therefore matches BB only — there is no tier above
 *   BB; "elite_boutique_and_mm target" matches that and BB; etc.).
 * - Cohort filter:
 *   - Entry-level stages (S0–S4): exclude `years_to_current_role > 3`.
 *     A Y2 student should not be matched to a 9-year veteran.
 *   - S5 (lateral mover): require `years_to_current_role > 2` AND
 *     the professional's first IB experience came after at least one
 *     non-IB experience. Anyone whose first job out of uni was IB is
 *     not a lateral example.
 */

import type {
  Professional,
  Stage,
  TargetFirmTier,
  TargetGeography,
} from './types';
import { TIER_LEVEL } from './types';

export function filterPool(
  professionals: Professional[],
  target_tier: TargetFirmTier,
  target_geography: TargetGeography,
  stage: Stage,
): Professional[] {
  return professionals.filter(p => {
    // Geography (hard filter)
    if (p.current_geography !== target_geography) return false;

    // Tier — target tier and above. 'any' skips this check.
    if (target_tier !== 'any') {
      const profTier = TIER_LEVEL[p.current_firm_tier as keyof typeof TIER_LEVEL] ?? 0;
      const tgtTier = TIER_LEVEL[target_tier as keyof typeof TIER_LEVEL] ?? 0;
      if (profTier < tgtTier) return false;
    }

    // Cohort filter
    if (stage === 'S5') {
      if (p.years_to_current_role <= 2) return false;
      const sortedExps = [...p.experiences].sort((a, b) => a.year - b.year);
      const firstNonIB = sortedExps[0] && sortedExps[0].industry !== 'ib';
      const hasLaterIB =
        sortedExps.length >= 2 &&
        sortedExps.some((e, i) => i > 0 && e.industry === 'ib');
      if (!(firstNonIB && hasLaterIB)) return false;
    } else {
      // S0–S4: strict entry-level only.
      if (p.years_to_current_role > 3) return false;
    }

    return true;
  });
}
