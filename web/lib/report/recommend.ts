import {
  recommendResources,
  type RecommendationDriver,
} from '@trajectoryos/core/courses/recommend';
import type { ScoringOutput } from '@trajectoryos/core/scoring/types';
import type { DeepDiveResourceInput } from '@trajectoryos/core/llm/types';
import { getResourceDefinition } from '@/lib/resources/catalog';
import { getCourseStructure } from '@/lib/courses/queries';

// Resolves the engine's individualised resource picks (pure, from the student's
// own scoring signals) into titles + live, absolute URLs for the deep-dive
// report. Hotlinks are gated on published content: an unlaunched resource falls
// back to the /resources hub rather than 404-ing a deep link.

const MAX_RECOMMENDATIONS = 2;

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
}

/** Turns the driver that selected a resource into a plain-English reason the
 * LLM can weave in and the PDF can print. */
function reasonFor(driver: RecommendationDriver): string {
  switch (driver.kind) {
    case 'action':
      return driver.indexImpact != null
        ? `it maps to your top move — "${driver.label}" (worth about ${driver.indexImpact > 0 ? '+' : ''}${driver.indexImpact} index points)`
        : `it maps to your top move — "${driver.label}"`;
    case 'contribution':
      return `${driver.label} is the biggest drag on your competitiveness index (${driver.points} points)`;
    case 'gap':
      return `you haven't yet closed a common, quick-to-fix gap: ${driver.label}`;
    case 'band':
    default:
      return `it's the best starting point given where you stand (${driver.label})`;
  }
}

export interface ResolvedRecommendation extends DeepDiveResourceInput {
  /** True when the resource has published content and `url` deep-links to its
   * overview; false when it falls back to the /resources hub. */
  live: boolean;
}

/**
 * Top resource recommendations for this student, resolved to display titles and
 * live URLs. Runs in a server context (needs the RLS course-content check).
 */
export async function resolveRecommendations(
  output: ScoringOutput,
): Promise<ResolvedRecommendation[]> {
  const recs = recommendResources(output).slice(0, MAX_RECOMMENDATIONS);
  const base = siteUrl();

  return Promise.all(
    recs.map(async (rec) => {
      const def = getResourceDefinition(rec.slug);
      // Published-only RLS: null means no live overview page to link yet. A
      // transient lookup failure must not sink the whole recommendation list —
      // treat it as "not live" and fall back to the hub for this item.
      let live = false;
      try {
        live = Boolean(await getCourseStructure(rec.slug));
      } catch {
        live = false;
      }
      return {
        slug: rec.slug,
        title: def?.title ?? rec.slug,
        reason: reasonFor(rec.drivenBy),
        url: live ? `${base}/resources/${rec.slug}` : `${base}/resources`,
        live,
      };
    }),
  );
}
