/**
 * Resource recommendation — which learning resource this specific student
 * should use next, and *why for them*.
 *
 * Deterministic and pure (no catalog / DB / LLM), in the same spirit as the
 * diagnostic and readiness engines. The choice is rooted in the individual's
 * own scoring signals — their single highest-leverage action, the biggest
 * negative driver on their competitiveness index, and their unclosed
 * high-actionability gaps — NOT a lifecycle bucket. There is no S0–S5 stage
 * here; the join key is always a concrete driver the report can cite by name.
 *
 * The web layer (web/lib/report/recommend.ts) resolves these slugs to titles
 * and live URLs and gates hotlinks on published content. This module only
 * decides the ranking and records the driving signal.
 */

import type { Action, ScoringOutput } from '../scoring/types';

export type RecommendedResourceSlug =
  | 'investment-banking-guides'
  | 'resume-cover-letter'
  | 'networking-strategy'
  | 'interview-preparation'
  | 'deal-breakdown-templates'
  | 'market-awareness';

/** The specific profile signal that selected a resource — so the report can
 * say "start here *because* …" in the student's own terms. */
export interface RecommendationDriver {
  kind: 'action' | 'gap' | 'contribution' | 'band';
  /** Machine key: action_type / gap_key / contribution feature / band. */
  key: string;
  /** Human-facing phrase (action title, gap name, contribution label). */
  label: string;
  /** Signed competitiveness points, for a contribution driver. */
  points?: number;
  /** Counterfactual index delta, for a gap-closing action driver. */
  indexImpact?: number;
}

export interface ResourceRecommendation {
  slug: RecommendedResourceSlug;
  /** 1 = the primary recommendation. */
  priority: number;
  drivenBy: RecommendationDriver;
}

// action_type → the resource that best supports that move. `close_<gap_key>`
// actions are routed via GAP_RESOURCE instead (see resourceForAction).
const ACTION_RESOURCE: Record<string, RecommendedResourceSlug> = {
  ft_offer_secured: 'interview-preparation', // already in — sharpen for the desk
  convert_offer: 'interview-preparation',
  apply_penultimate_now: 'resume-cover-letter',
  secure_penultimate: 'resume-cover-letter',
  apply_grad_now: 'resume-cover-letter',
  protect_lead: 'networking-strategy',
  pivot_lateral: 'networking-strategy',
  targeted_networking: 'networking-strategy',
  first_experience: 'investment-banking-guides',
};

// gap_key → resource. Profile-signal and academic gaps route to the guides
// (learn what matters + build the credential); experience-acquisition gaps
// route to networking (you land these through outreach and referrals).
const GAP_RESOURCE: Record<string, RecommendedResourceSlug> = {
  has_modelling_course: 'investment-banking-guides',
  has_smif: 'investment-banking-guides',
  has_society_committee: 'investment-banking-guides',
  has_dean_list: 'investment-banking-guides',
  cfa_l1: 'investment-banking-guides',
  is_co_op_program: 'investment-banking-guides',
  wam_below_target: 'investment-banking-guides',
  has_big4_advisory_experience: 'networking-strategy',
  has_pe_experience: 'networking-strategy',
  has_boutique_experience: 'networking-strategy',
  has_mid_market_experience: 'networking-strategy',
  has_elite_boutique_experience: 'networking-strategy',
};

// Negative competitiveness contribution feature → resource. Only features with
// a clear learning home appear; academic drivers (WAM/uni/ATAR) have none.
const CONTRIBUTION_RESOURCE: Record<string, RecommendedResourceSlug> = {
  has_ib_experience: 'investment-banking-guides', // "No IB internship yet" (−15)
};

const BAND_LABELS: Record<string, string> = {
  strong: 'strongly competitive', competitive: 'competitive',
  developing: 'developing', reach: 'a reach at your target',
};

function resourceForAction(action: Action): RecommendedResourceSlug | null {
  if (action.action_type.startsWith('close_')) {
    const gapKey = action.action_type.slice('close_'.length);
    return GAP_RESOURCE[gapKey] ?? 'investment-banking-guides';
  }
  return ACTION_RESOURCE[action.action_type] ?? null;
}

/**
 * Rank the resources most useful to THIS student, most useful first, each
 * tagged with the driver that selected it. Deduplicated by slug (the first,
 * strongest driver wins). The caller typically shows the top one or two.
 */
export function recommendResources(output: ScoringOutput): ResourceRecommendation[] {
  const { actions, gaps, competitiveness } = output;
  const ordered: ResourceRecommendation[] = [];
  const seen = new Set<RecommendedResourceSlug>();

  const push = (slug: RecommendedResourceSlug | null, drivenBy: RecommendationDriver) => {
    if (!slug || seen.has(slug)) return;
    seen.add(slug);
    ordered.push({ slug, priority: ordered.length + 1, drivenBy });
  };

  // 1) The student's own action plan, in priority order — the primary
  //    recommendation is tied to their single highest-leverage move.
  for (const action of [...actions].sort((a, b) => a.priority - b.priority)) {
    push(resourceForAction(action), {
      kind: 'action',
      key: action.action_type,
      label: action.title,
      ...(action.index_impact !== undefined ? { indexImpact: action.index_impact } : {}),
    });
  }

  // 2) The biggest single thing dragging their competitiveness index down.
  if (competitiveness) {
    const worst = competitiveness.contributions
      .filter((c) => c.points < 0 && CONTRIBUTION_RESOURCE[c.feature])
      .sort((a, b) => a.points - b.points)[0];
    if (worst) {
      push(CONTRIBUTION_RESOURCE[worst.feature] ?? null, {
        kind: 'contribution', key: worst.feature, label: worst.label, points: worst.points,
      });
    }
  }

  // 3) Unclosed gaps they can move quickly on.
  for (const gap of gaps) {
    if (gap.actionability !== 'high') continue;
    push(GAP_RESOURCE[gap.gap_key] ?? 'investment-banking-guides', {
      kind: 'gap', key: gap.gap_key, label: gap.display_name,
    });
  }

  // 4) Safety net — always return at least one, chosen from their band.
  if (ordered.length === 0) {
    const band = competitiveness?.band;
    const slug: RecommendedResourceSlug =
      band === 'strong' || band === 'competitive' ? 'networking-strategy' : 'investment-banking-guides';
    push(slug, { kind: 'band', key: band ?? 'unknown', label: BAND_LABELS[band ?? ''] ?? 'your current standing' });
  }

  return ordered;
}
