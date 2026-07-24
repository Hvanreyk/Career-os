/**
 * Layer 7 — Action generation.
 *
 * "What to do next" is driven by three things, NOT the S0–S5 stage:
 *   1. WHERE the student sits in the AU recruiting timeline (a phase derived
 *      from months-until-penultimate / months-until-grad plus what they've
 *      already secured),
 *   2. HOW competitive they screen (the scorecard band + recommended target),
 *   3. WHICH gaps close the most index points and are still feasible in the
 *      remaining window (the ranked `gaps`, priced with the counterfactual
 *      `actionImpact`).
 *
 * Always cap at 3 actions, priority 1 (most important) .. 3.
 *
 * The LLM never invents actions; it only formats what we produce here. So the
 * descriptions carry the specifics (named firms, real percentages, deadlines,
 * index-point deltas) before they ever hit the LLM.
 */

import type {
  Action,
  ComputedFields,
  Experience,
  Gap,
  MatchResult,
  StudentProfile,
  TargetFirmTier,
} from './types';
import { TIER_LEVEL } from './types';
import { actionImpact, type Scorecard, type CompetitivenessBand } from './scorecard';
import { PENULTIMATE_TO_FT_RATE } from './funnel';
import { orgsFor } from './universities';

// ============================================================
// Date / deadline helpers
// ============================================================

function addMonths(date: Date, n: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  return d;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Close of the penultimate application window (~end Aug of the penult year). */
function penultimateAppsDeadline(student: StudentProfile): string {
  const penultYear = student.expected_graduation_year - 1;
  return `${penultYear}-08-31`;
}

/** Grad apps close ~end of March of the student's grad year. */
function gradAppsDeadline(student: StudentProfile): string {
  return `${student.expected_graduation_year}-03-31`;
}

// ============================================================
// Match-derived firm helpers
// ============================================================

/** Top firms by frequency among matches' current employers. */
function topCurrentFirms(matches: MatchResult[], n: number): string[] {
  const counts = new Map<string, number>();
  for (const m of matches) {
    const f = m.professional.current_firm;
    counts.set(f, (counts.get(f) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([firm]) => firm);
}

/** Distinct firms (frequency-ordered) appearing in any experience at the given tiers. */
function firmsAtTiers(matches: MatchResult[], tiers: Experience['firm_tier'][]): string[] {
  const seen = new Map<string, number>();
  for (const m of matches) {
    for (const e of m.professional.experiences) {
      if (tiers.includes(e.firm_tier)) {
        seen.set(e.firm, (seen.get(e.firm) ?? 0) + 1);
      }
    }
  }
  return [...seen.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([f]) => f);
}

/** Firm-tier values that count toward a given target tier, for copy purposes.
 * Elite Boutique / Mid-Market also match the legacy combined tier, since older
 * professional records haven't been split into the two new tiers yet. */
function firmTiersForTarget(target: TargetFirmTier): Experience['firm_tier'][] {
  switch (target) {
    case 'elite_boutique': return ['elite_boutique', 'elite_boutique_and_mm'];
    case 'mid_market': return ['mid_market', 'elite_boutique_and_mm'];
    case 'boutique': return ['boutique'];
    default: return ['bb'];
  }
}

/** Short display label for a target tier. */
function tierLabelForTarget(target: TargetFirmTier): string {
  switch (target) {
    case 'elite_boutique': return 'Elite Boutique';
    case 'mid_market': return 'Mid-Market';
    case 'boutique': return 'Boutique';
    default: return 'BB';
  }
}

/** Most-common first-experience firm across matches (by tier filter). */
function mostCommonFirstFirm(
  matches: MatchResult[],
  tiers: Experience['firm_tier'][],
  n: number,
): string[] {
  const counts = new Map<string, number>();
  for (const m of matches) {
    const sorted = [...m.professional.experiences].sort((a, b) => a.year - b.year);
    const first = sorted.find(e => tiers.includes(e.firm_tier));
    if (first) counts.set(first.firm, (counts.get(first.firm) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([f]) => f);
}

function countMatches(matches: MatchResult[], pred: (m: MatchResult) => boolean): number {
  return matches.filter(pred).length;
}

function fmtList(xs: string[], joiner = ', '): string {
  return xs.length === 0 ? '' : xs.join(joiner);
}

/** Matches whose current firm sits at (or above) the target tier. */
function reachedTargetMatches(matches: MatchResult[], target: TargetFirmTier): MatchResult[] {
  const tl = target === 'any' ? 0 : TIER_LEVEL[target as keyof typeof TIER_LEVEL] ?? 0;
  return matches.filter(
    m => (TIER_LEVEL[m.professional.current_firm_tier as keyof typeof TIER_LEVEL] ?? 0) >= tl,
  );
}

/** Firms matches most often INTERNED at, for the given target tier. */
function internFirmsAtTarget(matches: MatchResult[], target: TargetFirmTier, n: number): string[] {
  return firmsAtTiers(matches, firmTiersForTarget(target)).slice(0, n);
}

/** Firms matches currently WORK at, for the given target tier (falls back to
 * intern firms when no match currently sits at the tier). */
function currentFirmsAtTarget(matches: MatchResult[], target: TargetFirmTier, n: number): string[] {
  const tiers = firmTiersForTarget(target);
  const atTier = matches.filter(m =>
    tiers.includes(m.professional.current_firm_tier as Experience['firm_tier']),
  );
  const cur = topCurrentFirms(atTier, n);
  return cur.length ? cur : internFirmsAtTarget(matches, target, n);
}

/** Matched lateral movers: > 3 years to current role AND a non-IB first job. */
function lateralMovers(matches: MatchResult[]): MatchResult[] {
  return matches.filter(m => {
    if (m.professional.years_to_current_role <= 3) return false;
    const sorted = [...m.professional.experiences].sort((a, b) => a.year - b.year);
    return sorted[0] ? sorted[0].industry !== 'ib' : false;
  });
}

// ============================================================
// Recruiting-timeline phase
// ============================================================

type TimelinePhase =
  | 'HAS_FT_OFFER'
  | 'PENULT_SECURED'
  | 'PENULT_WINDOW'
  | 'BUILDING'
  | 'LATE'
  | 'PASSED';

/**
 * Where the student sits in the AU recruiting timeline. Derived from the
 * computed month-distances plus what's already been secured — NOT the stage.
 */
function timelinePhase(computed: ComputedFields): TimelinePhase {
  if (computed.has_full_time_ib) return 'HAS_FT_OFFER';
  if (computed.has_penultimate_internship) return 'PENULT_SECURED';

  const toPenult = computed.months_until_penultimate_recruiting;
  const toGrad = computed.months_until_grad_recruiting;

  if (toPenult > 6) return 'BUILDING';
  if (toPenult > -3) return 'PENULT_WINDOW'; // in (-3, 6]
  // Penultimate window has passed.
  if (toGrad > -3) return 'LATE'; // grad cycle still ahead
  return 'PASSED';
}

/** Months to the recruiting window that's actually next for this phase. */
function monthsToRelevantWindow(phase: TimelinePhase, computed: ComputedFields): number {
  switch (phase) {
    case 'BUILDING':
    case 'PENULT_WINDOW':
      return computed.months_until_penultimate_recruiting;
    default:
      return computed.months_until_grad_recruiting;
  }
}

// ============================================================
// PRIMARY action (priority 1) — phase × scorecard band
// ============================================================

function primaryAction(
  student: StudentProfile,
  computed: ComputedFields,
  scorecard: Scorecard,
  matches: MatchResult[],
  phase: TimelinePhase,
  band: CompetitivenessBand,
  now: Date,
): Action {
  const rec = scorecard.recommendedTarget;
  const tierLabel = tierLabelForTarget(rec);

  switch (phase) {
    case 'HAS_FT_OFFER':
      return {
        priority: 1,
        action_type: 'ft_offer_secured',
        title: "You're set — a full-time IB offer is already in hand",
        description:
          `You already hold a full-time IB offer, so the competitiveness engine has nothing left to ` +
          `optimise. Use the runway to lock in modelling fundamentals and build relationships with your ` +
          `future desk before you start.`,
        deadline: null,
        estimated_effort: 'low',
      };

    case 'PENULT_SECURED': {
      const reached = reachedTargetMatches(matches, rec);
      const conversions = countMatches(reached, m =>
        m.professional.experiences.some(
          e => e.how_obtained === 'conversion' || e.how_obtained === 'return_offer',
        ),
      );
      const rate = Math.round(PENULTIMATE_TO_FT_RATE.base * 100);
      return {
        priority: 1,
        action_type: 'convert_offer',
        title: 'Convert your penultimate offer into the full-time return',
        description:
          `${conversions} of ${reached.length} matched ${tierLabel}-reaching paths converted a ` +
          `penultimate/summer offer into their first full-time IB role, and the market penultimate→FT ` +
          `rate sits around ${rate}%. Treat the internship as a 10-week interview: over-deliver on ` +
          `staffings, document your contributions, and ask for feedback every fortnight.`,
        deadline: gradAppsDeadline(student),
        estimated_effort: 'high',
      };
    }

    case 'PENULT_WINDOW': {
      const firms = internFirmsAtTarget(matches, rec, 6);
      return {
        priority: 1,
        action_type: 'apply_penultimate_now',
        title: `Apply now to ${tierLabel} penultimate programs`,
        description:
          `Penultimate applications are open (or open within months) — the single highest-leverage ` +
          `window in the AU timeline. Submit to ` +
          `${fmtList(firms) || `${tierLabel} programs in ${student.target_geography}`}, the firms your ` +
          `matched ${tierLabel}-reaching paths most often interned at.`,
        deadline: penultimateAppsDeadline(student),
        estimated_effort: 'high',
      };
    }

    case 'BUILDING': {
      if (band === 'strong') {
        const firms = currentFirmsAtTarget(matches, rec, 3);
        return {
          priority: 1,
          action_type: 'protect_lead',
          title: 'Protect your lead — you already screen as strongly competitive',
          description:
            `Your profile already sits in ${tierLabel} territory. Hold your WAM, deepen one ` +
            `differentiator (a committee lead, a live SMIF pitch, or a modelling credential), and start ` +
            `networking early with analysts at ${fmtList(firms) || `Sydney ${tierLabel} desks`}. Don't ` +
            `add breadth for its own sake — convert the lead you already have.`,
          deadline: penultimateAppsDeadline(student),
          estimated_effort: 'medium',
        };
      }
      if (!computed.has_ib_experience) {
        const firms = mostCommonFirstFirm(matches, ['boutique', 'big4', 'private_equity'], 5);
        return {
          priority: 1,
          action_type: 'first_experience',
          title: 'Land your first relevant experience this cycle',
          description:
            `Cold-email the most common starting points in your matched paths: ` +
            `${fmtList(firms) || 'boutique IB shops, Big 4 TS practices, and PE firms'}. Your first ` +
            `experience doesn't need prestige — it needs relevance. Insight programs (Optiver, MS, GS) ` +
            `are a low-friction entry.`,
          deadline: isoDate(addMonths(now, 3)),
          estimated_effort: 'medium',
        };
      }
      const firms = internFirmsAtTarget(matches, rec, 5);
      return {
        priority: 1,
        action_type: 'secure_penultimate',
        title: `Secure your penultimate summer at a ${tierLabel}`,
        description:
          `Aim your penultimate applications at ` +
          `${fmtList(firms) || `${tierLabel} programs`} — where your matched ${tierLabel}-reaching ` +
          `paths interned. Apps open July ${student.expected_graduation_year - 1}; everything you build ` +
          `between now and then should point at that window.`,
        deadline: penultimateAppsDeadline(student),
        estimated_effort: 'high',
      };
    }

    case 'LATE':
    case 'PASSED': {
      if (band === 'reach' || band === 'developing') {
        const laterals = lateralMovers(matches);
        const examples = laterals
          .slice(0, 3)
          .map(m => m.professional.path_summary)
          .filter((s): s is string => Boolean(s));
        const lateralNote = laterals.length
          ? `Matched lateral movers who broke in after a non-IB start: ${fmtList(examples, '; ') || `${laterals.length} in your cohort`}.`
          : `The lateral route (Big 4 TS / consulting → IB via referral) stays open even after the graduate cycle.`;
        return {
          priority: 1,
          action_type: 'pivot_lateral',
          title: `Anchor on ${tierLabel} and open the lateral route`,
          description:
            `The penultimate window has passed, so anchor realistic targets at ${tierLabel} (a tier ` +
            `where you screen as reachable) rather than forcing a bulge bracket now. ${lateralNote} ` +
            `The alternative is extending your degree a year to re-enter the penultimate cycle — a real ` +
            `trade-off worth weighing against a straight graduate/lateral push.`,
          deadline: gradAppsDeadline(student),
          estimated_effort: 'high',
        };
      }
      const firms = internFirmsAtTarget(matches, rec, 6);
      return {
        priority: 1,
        action_type: 'apply_grad_now',
        title: `Push graduate and off-cycle ${tierLabel} applications now`,
        description:
          `You screen as ${band}, but the penultimate window has passed. Go hard on graduate and ` +
          `off-cycle roles at ${fmtList(firms) || `${tierLabel} firms`} — your strength travels into ` +
          `the wider on-ramp even outside the summer cycle.`,
        deadline: gradAppsDeadline(student),
        estimated_effort: 'high',
      };
    }
  }
}

// ============================================================
// GAP actions (priority 2) — counterfactual index impact
// ============================================================

/** gap_key → the ComputedFields override that models closing it. Gaps absent
 * here (e.g. `wam_below_target`) have no clean counterfactual, so we omit
 * `index_impact` for them. */
const GAP_OVERRIDES: Record<string, Partial<ComputedFields>> = {
  has_smif: { has_smif: true },
  has_society_committee: { has_society_committee: true },
  has_modelling_course: { has_modelling_course: true },
  has_big4_advisory_experience: { has_big4_advisory_experience: true },
  has_pe_experience: { has_pe_experience: true },
  has_dean_list: { has_dean_list: true },
  cfa_l1: { cfa_level: 1 },
  is_co_op_program: { is_co_op_program: true },
  has_boutique_experience: { has_ib_experience: true, highest_firm_tier_reached: TIER_LEVEL.boutique },
  has_mid_market_experience: { has_ib_experience: true, highest_firm_tier_reached: TIER_LEVEL.mid_market },
  has_elite_boutique_experience: { has_ib_experience: true, highest_firm_tier_reached: TIER_LEVEL.elite_boutique },
};

/** Higher actionability = less effort to close. */
const EFFORT_FOR_ACTIONABILITY: Record<Gap['actionability'], Action['estimated_effort']> = {
  high: 'low',
  medium: 'medium',
  low: 'high',
};

function gapAction(
  student: StudentProfile,
  computed: ComputedFields,
  gap: Gap,
  tierLabel: string,
  deadline: string,
): Action {
  const override = GAP_OVERRIDES[gap.gap_key];
  const pct = Math.round(gap.match_pct * 100);

  let index_impact: number | undefined;
  let roi = '';
  if (override) {
    index_impact = actionImpact(student, computed, override);
    const sign = index_impact >= 0 ? '+' : '';
    const unit = Math.abs(index_impact) === 1 ? 'point' : 'points';
    roi = ` Closing it moves your competitiveness index by about ${sign}${index_impact} ${unit}.`;
  }

  return {
    priority: 2,
    action_type: `close_${gap.gap_key}`,
    title: `Close a common gap: ${gap.display_name}`,
    description:
      `${pct}% of your matched ${tierLabel}-reaching paths had ${gap.display_name}, and you don't ` +
      `yet.${roi}`,
    deadline,
    estimated_effort: EFFORT_FOR_ACTIONABILITY[gap.actionability],
    ...(index_impact !== undefined ? { index_impact } : {}),
  };
}

// ============================================================
// Public entry point
// ============================================================

/**
 * Deterministic "what to do next". Driven by the recruiting-timeline phase,
 * the competitiveness band + recommended target, and the ranked gaps —
 * never the S0–S5 stage. Always ≤ 3 actions, most important first.
 */
export function generateActions(
  student: StudentProfile,
  computed: ComputedFields,
  scorecard: Scorecard,
  gaps: Gap[],
  matches: MatchResult[],
  now: Date = new Date(),
): Action[] {
  const phase = timelinePhase(computed);
  const actions: Action[] = [];

  // 1) The one thing that matters most, given phase × competitiveness.
  actions.push(primaryAction(student, computed, scorecard, matches, phase, scorecard.band, now));

  // Someone with a confirmed FT offer needs nothing else from us.
  if (phase === 'HAS_FT_OFFER') return actions.slice(0, 3);

  const rec = scorecard.recommendedTarget;
  const tierLabel = tierLabelForTarget(rec);
  const windowMonths = monthsToRelevantWindow(phase, computed);
  const windowDeadline =
    phase === 'BUILDING' || phase === 'PENULT_WINDOW'
      ? penultimateAppsDeadline(student)
      : gradAppsDeadline(student);

  // 2) Gap-closing actions (already ranked by impact), kept only when still
  //    feasible before the relevant upcoming window. Priced with the
  //    counterfactual index delta.
  for (const gap of gaps) {
    if (actions.length >= 3) break;
    if (gap.time_to_address_months > windowMonths) continue;
    actions.push(gapAction(student, computed, gap, tierLabel, windowDeadline));
  }

  // 3) Networking, if a slot remains — named at the recommended tier.
  if (actions.length < 3) {
    const firms = currentFirmsAtTarget(matches, rec, 3);
    actions.push({
      priority: 3,
      action_type: 'targeted_networking',
      title: `Network into ${tierLabel} coverage groups`,
      description: firms.length
        ? `Map and coffee-chat analysts at ${fmtList(firms)} — the firms your matched ` +
          `${tierLabel}-reaching paths most often work at. Referrals move the needle more than any ` +
          `cold application.`
        : `Map ${tierLabel} analysts in ${student.target_geography} on LinkedIn and request ` +
          `15-minute coffee chats before applications open.`,
      deadline: windowDeadline,
      estimated_effort: 'medium',
    });
  }

  return actions.slice(0, 3);
}

// Re-export a couple of helpers for tests / index.ts.
export { topCurrentFirms, firmsAtTiers, mostCommonFirstFirm, addMonths, isoDate, orgsFor };
