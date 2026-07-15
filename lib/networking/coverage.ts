import { stageRank } from './stages';
import type { ContactSeniority, RelationshipStage } from './types';

// ============================================================
// Coverage engine — the "strategy" in Networking Strategy.
//
// For each bank target: how many relationships exist, at what
// seniority mix and depth, and how urgent the gap is given the
// application window. Deterministic and explainable — no scores
// a student can't reconstruct. Pure module — no I/O.
// ============================================================

/** Default coverage goal per serious target firm. */
export const COVERAGE_GOAL = { junior: 2, senior: 1 } as const;

const JUNIOR: ReadonlySet<ContactSeniority> = new Set(['student', 'analyst', 'associate']);
const SENIOR: ReadonlySet<ContactSeniority> = new Set(['vp', 'director', 'md']);

export interface CoverageTarget {
  id: string;
  bank_name: string;
  tier: string | null;
  priority: number;
  status: string;
  apps_close: string | null;
}

export interface CoverageContact {
  id: string;
  full_name: string;
  stage: RelationshipStage;
  seniority: ContactSeniority;
  do_not_contact: boolean;
  bank_target_ids: string[];
  last_interaction_at: string | null;
  has_active_followup: boolean;
}

export type CoverageStatus = 'none' | 'thin' | 'building' | 'covered';

export interface TargetCoverageRow {
  target: CoverageTarget;
  contactCount: number;
  juniorCount: number;
  seniorCount: number;
  recruiterCount: number;
  strongestStage: RelationshipStage | null;
  lastTouch: string | null;
  daysToClose: number | null;
  status: CoverageStatus;
  gaps: string[];
  /** Deterministic ranking weight: priority + window proximity + gap size. */
  urgency: number;
}

export interface CoverageSummary {
  rows: TargetCoverageRow[];
  coveredCount: number;
  uncoveredCount: number;
  totalTargets: number;
}

const INACTIVE_TARGET_STATUSES = new Set(['rejected', 'closed']);

function daysBetween(nowIso: string, dateIso: string): number {
  const ms = new Date(dateIso).getTime() - new Date(nowIso).getTime();
  return Math.floor(ms / 86_400_000);
}

/**
 * Computes relationship coverage for every bank target.
 *
 * @param targets - The student's bank targets (from bank_targets)
 * @param contacts - Contact summaries with their linked target ids
 * @param nowIso - The current instant, injected for determinism
 * @returns Coverage rows sorted most-urgent first, plus summary counts
 */
export function computeCoverage(
  targets: CoverageTarget[],
  contacts: CoverageContact[],
  nowIso: string,
): CoverageSummary {
  const rows = targets.map((target) => {
    const linked = contacts.filter(
      (contact) => !contact.do_not_contact && contact.bank_target_ids.includes(target.id),
    );
    const juniorCount = linked.filter((c) => JUNIOR.has(c.seniority)).length;
    const seniorCount = linked.filter((c) => SENIOR.has(c.seniority)).length;
    const recruiterCount = linked.filter((c) => c.seniority === 'recruiter').length;

    let strongestStage: RelationshipStage | null = null;
    let lastTouch: string | null = null;
    for (const contact of linked) {
      if (!strongestStage || stageRank(contact.stage) > stageRank(strongestStage)) {
        strongestStage = contact.stage;
      }
      if (contact.last_interaction_at && (!lastTouch || contact.last_interaction_at > lastTouch)) {
        lastTouch = contact.last_interaction_at;
      }
    }

    const contactCount = linked.length;
    let status: CoverageStatus;
    if (contactCount === 0) status = 'none';
    else if (juniorCount >= COVERAGE_GOAL.junior && seniorCount >= COVERAGE_GOAL.senior) status = 'covered';
    else if (contactCount >= 2) status = 'building';
    else status = 'thin';

    const gaps: string[] = [];
    if (contactCount === 0) {
      gaps.push('No contacts at this firm yet');
    } else {
      if (juniorCount < COVERAGE_GOAL.junior) {
        gaps.push(`Only ${juniorCount} junior contact${juniorCount === 1 ? '' : 's'} (aim for ${COVERAGE_GOAL.junior})`);
      }
      if (seniorCount < COVERAGE_GOAL.senior) {
        gaps.push('No contact at VP level or above');
      }
      if (!strongestStage || stageRank(strongestStage) < stageRank('conversation_booked')) {
        gaps.push('No conversation booked or held yet');
      }
      if (!linked.some((c) => c.has_active_followup)) {
        gaps.push('No active next action for this firm');
      }
    }

    const daysToClose = target.apps_close ? daysBetween(nowIso, target.apps_close) : null;
    const inactive = INACTIVE_TARGET_STATUSES.has(target.status);

    let urgency = 0;
    if (!inactive) {
      urgency += (4 - Math.min(Math.max(target.priority, 1), 3)) * 10;
      if (daysToClose !== null && daysToClose >= 0) {
        if (daysToClose <= 21) urgency += 40;
        else if (daysToClose <= 45) urgency += 25;
        else if (daysToClose <= 90) urgency += 10;
      }
      if (status === 'none') urgency += 20;
      else if (status === 'thin') urgency += 10;
      else if (status === 'building') urgency += 5;
    }

    return {
      target,
      contactCount,
      juniorCount,
      seniorCount,
      recruiterCount,
      strongestStage,
      lastTouch,
      daysToClose,
      status,
      gaps,
      urgency,
    } satisfies TargetCoverageRow;
  });

  rows.sort((a, b) => b.urgency - a.urgency || a.target.bank_name.localeCompare(b.target.bank_name));
  const coveredCount = rows.filter((r) => r.status === 'covered').length;
  return {
    rows,
    coveredCount,
    uncoveredCount: rows.filter((r) => r.status === 'none').length,
    totalTargets: rows.length,
  };
}
