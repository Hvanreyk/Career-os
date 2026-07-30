/**
 * Layer 3 — Pool filtering. Narrows the professional set down to
 * comparable peers before we run distance computation.
 *
 * Rules:
 * - Hard filter on geography (target student wants Sydney → only
 *   Sydney pros). Perth/Adelaide/Brisbane targets broaden this to match
 *   any confirmed-AU geography instead, since there's no dedicated
 *   professional data for those cities yet (see AU_BROAD_MATCH_TARGETS).
 * - Cohort filter:
 *   - Entry-level stages (S0–S4): exclude `years_to_current_role > 3`.
 *     A Y2 student should not be matched to a 9-year veteran.
 *   - S5 (lateral mover): require `years_to_current_role > 2` AND
 *     the professional's first IB experience came after at least one
 *     non-IB experience. Anyone whose first job out of uni was IB is
 *     not a lateral example.
 *
 * Deliberately NOT filtered here: firm tier. The pool is "people on a
 * comparable path", regardless of where they ended up — matching runs
 * on similarity alone, and `reached_target_count` is then computed
 * downstream as the fraction of matches that made the student's target
 * tier. Pre-filtering by tier made that fraction tautologically 100%.
 */

import type {
  Professional,
  Stage,
  TargetGeography,
} from './types';
import { AU_BROAD_MATCH_TARGETS, AU_CONFIRMED_GEOGRAPHIES } from './types';

export function filterPool(
  professionals: Professional[],
  target_geography: TargetGeography,
  stage: Stage,
): Professional[] {
  return professionals.filter(p => {
    // Geography (hard filter). Perth/Adelaide/Brisbane targets broaden to
    // any confirmed-AU geography — there's no dedicated professional data
    // for those cities yet.
    if (AU_BROAD_MATCH_TARGETS.includes(target_geography)) {
      if (!AU_CONFIRMED_GEOGRAPHIES.includes(p.current_geography)) return false;
    } else if (p.current_geography !== target_geography) {
      return false;
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
