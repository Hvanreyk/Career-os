import type { JdMatch, JdRequirement } from './document';

export interface CoverageReport {
  // 0-100, rounded to the nearest integer.
  percent: number;
  direct: number;
  stretch: number;
  gaps: number;
  total_requirements: number;
}

const MUST_HAVE_WEIGHT = 2;
const NICE_TO_HAVE_WEIGHT = 1;
const MATCH_SCORES: Record<JdMatch['match'], number> = {
  direct: 1,
  stretch: 0.5,
  gap: 0,
};

/**
 * Computes JD coverage deterministically from the model's requirement and
 * match lists — the LLM never does this arithmetic. Must-have requirements
 * weigh double; a direct match scores 1.0 and a stretch match 0.5. A
 * requirement with no match entry counts as a gap.
 */
export function computeCoverage(
  requirements: JdRequirement[],
  matches: JdMatch[],
): CoverageReport {
  const matchByRequirement = new Map<string, JdMatch>();
  for (const match of matches) {
    if (!matchByRequirement.has(match.requirement_id)) {
      matchByRequirement.set(match.requirement_id, match);
    }
  }

  let weightTotal = 0;
  let weightCovered = 0;
  let direct = 0;
  let stretch = 0;
  let gaps = 0;

  for (const requirement of requirements) {
    const weight = requirement.kind === 'must_have' ? MUST_HAVE_WEIGHT : NICE_TO_HAVE_WEIGHT;
    const match = matchByRequirement.get(requirement.id);
    const kind = match?.match ?? 'gap';
    weightTotal += weight;
    weightCovered += weight * MATCH_SCORES[kind];
    if (kind === 'direct') direct += 1;
    else if (kind === 'stretch') stretch += 1;
    else gaps += 1;
  }

  return {
    percent: weightTotal === 0 ? 0 : Math.round((weightCovered / weightTotal) * 100),
    direct,
    stretch,
    gaps,
    total_requirements: requirements.length,
  };
}
