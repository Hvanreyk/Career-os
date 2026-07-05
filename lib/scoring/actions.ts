/**
 * Layer 7 — Action generation. Stage-specific deterministic rules.
 * Three actions per stage, prioritised. Always cap at 3.
 *
 * The LLM never invents actions; it only formats what we produce
 * here. So the descriptions need to be specific (named firms,
 * named match counts, named deadlines) before they hit the LLM.
 */

import type {
  Action,
  ComputedFields,
  Experience,
  MatchResult,
  Stage,
  StudentProfile,
  TargetFirmTier,
} from './types';
import { TIER_LEVEL, WAM_RANKS } from './types';
import { societyRecommendationText, orgsFor } from './universities';

// ============================================================
// Helpers
// ============================================================

function addMonths(date: Date, n: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + n);
  return d;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function nextSemesterEnd(now: Date): string {
  // Australian academic calendar: S1 ends ~end of June, S2 ends ~end of November.
  const month = now.getMonth(); // 0-indexed
  const year = now.getFullYear();
  if (month <= 5) return `${year}-06-30`;     // before/during S1
  if (month <= 10) return `${year}-11-30`;    // S2
  return `${year + 1}-06-30`;                 // summer/break → next S1
}

function nextSocietyApplicationDeadline(now: Date): string {
  // Most AU finance societies open recruitment early in each semester.
  // Use the start of the next semester window as deadline guidance.
  const month = now.getMonth();
  const year = now.getFullYear();
  if (month < 2) return `${year}-03-15`;      // before S1 → mid-March
  if (month < 7) return `${year}-08-15`;      // before/during S1 → mid-August
  return `${year + 1}-03-15`;                 // late year → next March
}

/** July 31 of the year that the student's penultimate apps open. */
function penultimateAppsDeadline(student: StudentProfile, now: Date): string {
  const penultYear = student.expected_graduation_year - 1;
  // Apps open mid-July, close mid-August; "deadline" we render is the close.
  return `${penultYear}-08-31`;
}

/** March 31 of the student's grad year (grad apps close ~end of March). */
function gradAppsDeadline(student: StudentProfile): string {
  return `${student.expected_graduation_year}-03-31`;
}

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

/** All distinct firms across any of the given tiers. */
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

/** Firm-tier values that count toward a given student target, for copy
 * purposes. Elite Boutique / Mid-Market targets also match the legacy
 * combined tier, since existing professional records haven't been split
 * into the two new tiers yet. */
function firmTiersForTarget(target: TargetFirmTier): Experience['firm_tier'][] {
  switch (target) {
    case 'elite_boutique': return ['elite_boutique', 'elite_boutique_and_mm'];
    case 'mid_market': return ['mid_market', 'elite_boutique_and_mm'];
    default: return ['bb'];
  }
}

/** Short display label for a student's target tier. */
function tierLabelForTarget(target: TargetFirmTier): string {
  switch (target) {
    case 'elite_boutique': return 'Elite Boutique';
    case 'mid_market': return 'Mid-Market';
    default: return 'BB';
  }
}

/** Most-common first-experience firm (by tier filter). */
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

/** Snapshot-based: did the pro have this feature AT THE STUDENT'S STAGE? */
function hadFeature(m: MatchResult, key: keyof ComputedFields): boolean {
  return Boolean(m.snapshot.computed[key]);
}

/** Full-career: did the pro EVER have this feature? Used for "what did
 * successful paths look like end-to-end" framing, where snapshot-at-stage
 * is too early to credit the move. */
function hadFeatureEver(m: MatchResult, key: keyof ComputedFields): boolean {
  // Re-derive from the full experiences + signals (cheap; small lists).
  const exps = m.professional.experiences;
  const sigs = new Set<string>(m.professional.signals);
  switch (key) {
    case 'has_modelling_course':
      return sigs.has('modelling_course');
    case 'has_dean_list':
      return sigs.has('deans_list');
    case 'has_smif':
      return ['investment_society_member', 'investment_society_committee', 'investment_society_president']
        .some(s => sigs.has(s));
    case 'has_society_committee':
      return ['fin_society_committee', 'investment_society_committee', 'investment_society_president',
              'consulting_society_committee', 'society_committee'].some(s => sigs.has(s));
    case 'has_big4_advisory_experience':
      return exps.some(e => e.industry === 'big4_advisory' && e.role_relevance >= 3);
    case 'has_pe_experience':
      return exps.some(e => e.industry === 'private_equity');
    case 'is_co_op_program':
      return sigs.has('co_op_program');
    case 'cfa_level':
      return sigs.has('cfa_l1') || sigs.has('cfa_l2') || sigs.has('cfa_l3');
    default:
      return Boolean(m.snapshot.computed[key]);
  }
}

function fmtList(xs: string[], joiner = ', '): string {
  return xs.length === 0 ? '' : xs.join(joiner);
}

// ============================================================
// S0 — Foundation
// ============================================================

function generateS0Actions(
  student: StudentProfile,
  computed: ComputedFields,
  matches: MatchResult[],
  now: Date,
): Action[] {
  const actions: Action[] = [];

  // 1) WAM target if unknown or below D
  const wamRank = student.wam_band === 'unknown' ? -1 : WAM_RANKS[student.wam_band];
  if (wamRank < WAM_RANKS.d) {
    const knownWamMatches = matches.filter(m => m.snapshot.wam_band !== 'unknown');
    const dOrAbove = countMatches(
      knownWamMatches,
      m => WAM_RANKS[m.snapshot.wam_band as 'hd' | 'd' | 'c' | 'p'] >= WAM_RANKS.d,
    );
    actions.push({
      priority: 1,
      action_type: 'wam_target',
      title: 'Target Distinction (75+) WAM minimum',
      description:
        `Aim for D or HD this semester. Of ${knownWamMatches.length} matched paths with known WAM, ` +
        `${dOrAbove} maintained D or HD throughout. Below D significantly narrows your IB options.`,
      deadline: nextSemesterEnd(now),
      estimated_effort: 'high',
    });
  }

  // 2) Join finance society + investment fund
  if (!computed.has_society_committee && !computed.has_smif) {
    actions.push({
      priority: 1,
      action_type: 'join_society',
      title: "Join your university's finance society and student investment fund",
      description: societyRecommendationText(student.university),
      deadline: nextSocietyApplicationDeadline(now),
      estimated_effort: 'medium',
    });
  }

  // 3) First relevant experience
  if (computed.experience_count_relevant === 0) {
    const commonFirstFirms = mostCommonFirstFirm(
      matches,
      ['boutique', 'big4', 'private_equity'],
      5,
    );
    const firmList = commonFirstFirms.length
      ? commonFirstFirms.join(', ')
      : 'boutique IB shops, Big 4 TS practices, and PE firms';
    actions.push({
      priority: 2,
      action_type: 'first_experience',
      title: 'Land your first relevant experience this semester',
      description:
        `Cold email these firms — most common starting points in your matched paths: ${firmList}. ` +
        `Your first experience doesn't need to be prestigious; it needs to be relevant. ` +
        `Insight programs (Optiver, Jane Street, MS, GS) are a low-friction entry.`,
      deadline: isoDate(addMonths(now, 3)),
      estimated_effort: 'medium',
    });
  }

  return actions.slice(0, 3);
}

// ============================================================
// S1 — Building (1+ relevant exp, pre-penultimate)
// ============================================================

function generateS1Actions(
  student: StudentProfile,
  computed: ComputedFields,
  matches: MatchResult[],
  now: Date,
): Action[] {
  const actions: Action[] = [];

  // 1) Secure penultimate at BB / EB-MM (always — the central S1 task)
  const reachedTarget = matches.filter(m => {
    const pl = TIER_LEVEL[m.professional.current_firm_tier as keyof typeof TIER_LEVEL] ?? 0;
    const tl = student.target_firm_tier === 'any'
      ? 0
      : TIER_LEVEL[student.target_firm_tier as keyof typeof TIER_LEVEL] ?? 0;
    return pl >= tl;
  });
  // End-to-end view: did this pro EVER have a penultimate/summer at BB/EB-MM
  // in their pre-FT career? (Snapshot at S1 is too early — most BB summers
  // happen in Y3, after the S1 cutoff.) We exclude their FT current role
  // by only counting non-full_time experiences.
  const targetFirmTiers = firmTiersForTarget(student.target_firm_tier);
  const hadPenult = countMatches(
    reachedTarget,
    m =>
      m.professional.experiences.some(
        e =>
          (e.type === 'penultimate_internship' || e.type === 'summer_internship') &&
          (e.firm_tier === 'bb' || targetFirmTiers.includes(e.firm_tier)),
      ),
  );
  const targetTierFirms = firmsAtTiers(reachedTarget, targetFirmTiers).slice(0, 5);
  const tierLabel = tierLabelForTarget(student.target_firm_tier);

  actions.push({
    priority: 1,
    action_type: 'secure_penultimate',
    title: `Secure your penultimate summer at a ${tierLabel}`,
    description:
      `Of the ${reachedTarget.length} ${tierLabel}-reaching matches, ${hadPenult} had a penultimate ` +
      `or summer internship at a ${tierLabel} firm. Apply to ` +
      `${fmtList(targetTierFirms)} penultimate programs — apps open July ${student.expected_graduation_year - 1}.`,
    deadline: penultimateAppsDeadline(student, now),
    estimated_effort: 'high',
  });

  // 2) Build conversion-favourable signals (gap-driven)
  const signalActions: { feature: keyof ComputedFields; title: string; desc: (n: number, d: number) => string }[] = [
    {
      feature: 'has_modelling_course',
      title: 'Complete a financial modelling course (WSP / BIWS / Mazars)',
      desc: (n, d) => `${n} of ${d} matches had completed a modelling course before penultimate apps. Knock this out in 2-3 weekends — high signal, low time cost.`,
    },
    {
      feature: 'has_dean_list',
      title: "Lock in Dean's List (or equivalent) recognition",
      desc: (n, d) => `${n} of ${d} matches had Dean's List or a faculty prize by the time they applied for penultimate. Push HD in your finance subjects this semester.`,
    },
  ];
  for (const s of signalActions) {
    if (computed[s.feature]) continue;
    const had = countMatches(reachedTarget, m => hadFeatureEver(m, s.feature));
    if (reachedTarget.length === 0 || had / reachedTarget.length < 0.5) continue;
    actions.push({
      priority: 2,
      action_type: `build_${String(s.feature)}`,
      title: s.title,
      description: s.desc(had, reachedTarget.length),
      deadline: nextSemesterEnd(now),
      estimated_effort: s.feature === 'has_modelling_course' ? 'low' : 'high',
    });
    if (actions.length === 2) break; // we want at most one signal-action so action 3 can be networking
  }

  // 3) Network targeted at coverage groups (always)
  const topFirms = topCurrentFirms(reachedTarget, 3);
  actions.push({
    priority: 3,
    action_type: 'coverage_networking',
    title: 'Network targeted at high-conversion Sydney coverage groups',
    description:
      topFirms.length
        ? `Sydney groups featured in your matched paths: ${fmtList(topFirms)}. ` +
          `Map analysts in those groups via LinkedIn and request 15-min coffees ` +
          `before penultimate apps open in July.`
        : `Map Sydney BB analysts via LinkedIn and request 15-min coffees before penultimate apps open in July.`,
    deadline: penultimateAppsDeadline(student, now),
    estimated_effort: 'medium',
  });

  return actions.slice(0, 3);
}

// ============================================================
// S2 — Pre-Penultimate (Y3+, recruiting in <6 months)
// ============================================================

function generateS2Actions(
  student: StudentProfile,
  computed: ComputedFields,
  matches: MatchResult[],
  _now: Date,
): Action[] {
  const actions: Action[] = [];
  const targetTier = student.target_firm_tier;
  const reached = matches.filter(m => {
    const pl = TIER_LEVEL[m.professional.current_firm_tier as keyof typeof TIER_LEVEL] ?? 0;
    const tl = targetTier === 'any' ? 0 : TIER_LEVEL[targetTier as keyof typeof TIER_LEVEL] ?? 0;
    return pl >= tl;
  });
  const tierLabel = tierLabelForTarget(targetTier);
  const targetFirms = firmsAtTiers(reached, firmTiersForTarget(targetTier)).slice(0, 6);

  actions.push({
    priority: 1,
    action_type: 'apply_now_penultimate',
    title: `Apply now to ${tierLabel} penultimate programs`,
    description:
      `Penultimate apps open in <6 months. Submit to ${fmtList(targetFirms)}. ` +
      `${reached.length} matches reached ${tierLabel} via this exact entry point.`,
    deadline: penultimateAppsDeadline(student, _now),
    estimated_effort: 'high',
  });

  actions.push({
    priority: 2,
    action_type: 'interview_prep',
    title: 'Run technical interview prep sprint',
    description:
      `Drill the standard IB technicals: 3-statement, DCF, accretion/dilution, LBO. ` +
      `If you don't already have a modelling course done, complete WSP or BIWS this month — ` +
      `${countMatches(reached, m => hadFeatureEver(m, 'has_modelling_course'))} of ${reached.length} matches had one.`,
    deadline: penultimateAppsDeadline(student, _now),
    estimated_effort: 'high',
  });

  // 3) Closing signal gaps that are still feasible in <6 months
  if (!computed.has_dean_list) {
    const had = countMatches(reached, m => hadFeatureEver(m, 'has_dean_list'));
    if (reached.length > 0 && had / reached.length >= 0.5) {
      actions.push({
        priority: 3,
        action_type: 'lock_grades',
        title: "Lock HD in core finance subjects this semester",
        description:
          `${had} of ${reached.length} matches had Dean's List or equivalent by the time they applied. ` +
          `Push HD in your finance / accounting subjects — your transcript hits the panel before you do.`,
        deadline: nextSemesterEnd(_now),
        estimated_effort: 'high',
      });
    }
  }
  if (actions.length < 3) {
    const topFirms = topCurrentFirms(reached, 3);
    actions.push({
      priority: 3,
      action_type: 'targeted_networking',
      title: 'Targeted networking before applications open',
      description: topFirms.length
        ? `Reach out to analysts at ${fmtList(topFirms)} via LinkedIn — your matched paths cluster in these firms.`
        : 'Map analysts in your target firms via LinkedIn and request 15-min coffees this month.',
      deadline: penultimateAppsDeadline(student, _now),
      estimated_effort: 'medium',
    });
  }

  return actions.slice(0, 3);
}

// ============================================================
// S3 — Penultimate Secured
// ============================================================

function generateS3Actions(
  student: StudentProfile,
  _computed: ComputedFields,
  matches: MatchResult[],
  _now: Date,
): Action[] {
  const actions: Action[] = [];
  const targetTier = student.target_firm_tier;
  const reached = matches.filter(m => {
    const pl = TIER_LEVEL[m.professional.current_firm_tier as keyof typeof TIER_LEVEL] ?? 0;
    const tl = targetTier === 'any' ? 0 : TIER_LEVEL[targetTier as keyof typeof TIER_LEVEL] ?? 0;
    return pl >= tl;
  });

  const conversions = countMatches(reached, m =>
    m.professional.experiences.some(
      e => e.how_obtained === 'conversion' || e.how_obtained === 'return_offer',
    ),
  );

  actions.push({
    priority: 1,
    action_type: 'convert_penultimate',
    title: 'Convert your penultimate offer into the FT return',
    description:
      `${conversions} of ${reached.length} matches converted their penultimate / summer offer into ` +
      `their first FT IB role (return offers + conversions). Treat the internship as a 10-week interview: ` +
      `over-deliver on staffings, document your contributions, and request feedback every 2 weeks.`,
    deadline: gradAppsDeadline(student),
    estimated_effort: 'high',
  });

  // 2) Hedge: lateral apps in case the conversion fails
  const tierLabel = tierLabelForTarget(targetTier);
  const altFirms = firmsAtTiers(reached, firmTiersForTarget(targetTier)).slice(0, 5);
  actions.push({
    priority: 2,
    action_type: 'grad_pipeline_hedge',
    title: `Hedge with grad applications across ${tierLabel}`,
    description:
      `Grad apps open in March of your final year. Even if you expect to convert, file at ` +
      `${fmtList(altFirms)} — return offer + lateral grad pipeline together meaningfully de-risk a single-firm conversion bet.`,
    deadline: gradAppsDeadline(student),
    estimated_effort: 'medium',
  });

  // 3) Network across coverage groups (within or beyond your firm)
  actions.push({
    priority: 3,
    action_type: 'coverage_breadth',
    title: 'Get exposure to multiple coverage groups during the internship',
    description:
      `Even if you're staffed primarily in one team, ask to shadow a deal in another group. ` +
      `Coverage diversity reads stronger on the FT panel and gives you a backup story if the ` +
      `primary group has no FT spots.`,
      deadline: null,
      estimated_effort: 'low',
  });

  return actions.slice(0, 3);
}

// ============================================================
// S4 — FT offer secured (out of scope for action gen)
// ============================================================

function generateS4Actions(): Action[] {
  return [
    {
      priority: 1,
      action_type: 'noop_s4',
      title: "You're set — focus on starting strong",
      description:
        `You have a confirmed full-time IB offer. Action generation is out of scope at this stage. ` +
        `Use the remaining time to lock in modelling fundamentals and build relationships with future colleagues.`,
      deadline: null,
      estimated_effort: 'low',
    },
  ];
}

// ============================================================
// S5 — Lateral mover
// ============================================================

function generateS5Actions(
  student: StudentProfile,
  computed: ComputedFields,
  matches: MatchResult[],
  now: Date,
): Action[] {
  const actions: Action[] = [];
  const currentExternal = student.current_external_role ?? 'corporate';

  // Lateral pivot path summary — drawn from the matched lateral cohort
  const pivotExamples: string[] = [];
  for (const m of matches.slice(0, 3)) {
    if (m.professional.path_summary) {
      pivotExamples.push(`${m.professional.id}: ${m.professional.path_summary}`);
    }
  }

  actions.push({
    priority: 1,
    action_type: 'lateral_pivot_path',
    title: `Recommended pivot path from ${currentExternal}`,
    description:
      `${matches.length} matched lateral movers from ${currentExternal}-style backgrounds reached IB. ` +
      `Specific transitions: ${fmtList(pivotExamples, '; ') || '—'}.`,
    deadline: null,
    estimated_effort: 'high',
  });

  // 2) Lateral credentials gap
  if (!computed.has_modelling_course || computed.cfa_level < 1) {
    const modelled = countMatches(matches, m => hadFeatureEver(m, 'has_modelling_course'));
    const cfaSomething = countMatches(matches, m =>
      m.professional.signals.some(s => s === 'cfa_l1' || s === 'cfa_l2' || s === 'cfa_l3'),
    );
    actions.push({
      priority: 1,
      action_type: 'lateral_credentials',
      title: 'Build technical credentials for the pivot',
      description:
        `${modelled} of ${matches.length} matched lateral movers had completed a modelling course. ` +
        `${cfaSomething} of ${matches.length} had at least CFA Level 1. Both are baseline IB-readiness signals for laterals.`,
      deadline: isoDate(addMonths(now, 6)),
      estimated_effort: 'high',
    });
  }

  // 3) Networking via existing deal contacts
  actions.push({
    priority: 2,
    action_type: 'lateral_networking',
    title: 'Leverage existing deal-side contacts for IB referrals',
    description:
      `Lateral hires almost always come via referral. Map your Big 4 / consulting / law deal contacts ` +
      `who have already moved to IB and request introductions. Recruiter-led laterals exist but referral-led ` +
      `is the dominant pattern.`,
    deadline: null,
    estimated_effort: 'medium',
  });

  return actions.slice(0, 3);
}

// ============================================================
// Public dispatch
// ============================================================

export function generateActions(
  stage: Stage,
  student: StudentProfile,
  computed: ComputedFields,
  matches: MatchResult[],
  now: Date = new Date(),
): Action[] {
  switch (stage) {
    case 'S0': return generateS0Actions(student, computed, matches, now);
    case 'S1': return generateS1Actions(student, computed, matches, now);
    case 'S2': return generateS2Actions(student, computed, matches, now);
    case 'S3': return generateS3Actions(student, computed, matches, now);
    case 'S4': return generateS4Actions();
    case 'S5': return generateS5Actions(student, computed, matches, now);
  }
}

// Re-export a couple of helpers for tests / index.ts
export { topCurrentFirms, firmsAtTiers, mostCommonFirstFirm, addMonths, isoDate, orgsFor };
