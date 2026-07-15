import type { RecruitingCycle } from '../courses/timeline';
import type { TargetCoverageRow } from './coverage';
import type { FollowUpKind, FollowUpStatus, RelationshipStage } from './types';

// ============================================================
// Weekly plan engine — turns raw workspace state into "what should
// I do right now". Deterministic: debriefs and thank-yous first,
// then due work, then chat prep, silence bumps, coverage gaps and
// stale relationships, weighted by the AU recruiting timeline.
// No opaque AI ranking. Pure module — no I/O; `nowIso` is injected.
// ============================================================

export interface PlanContact {
  id: string;
  full_name: string;
  stage: RelationshipStage;
  do_not_contact: boolean;
  created_at: string;
  last_outbound_at: string | null;
  last_inbound_at: string | null;
  has_active_followup: boolean;
}

export interface PlanFollowUp {
  id: string;
  contact_id: string;
  contact_name: string;
  kind: FollowUpKind;
  status: FollowUpStatus;
  due_at: string;
}

export interface PlanCoffeeChat {
  id: string;
  contact_id: string;
  contact_name: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  scheduled_at: string;
  has_prep: boolean;
  has_debrief: boolean;
}

export type PlanActionType =
  | 'debrief_chat'
  | 'thank_you'
  | 'overdue_followup'
  | 'due_followup'
  | 'prep_chat'
  | 'silence_bump'
  | 'coverage_gap'
  | 'start_outreach'
  | 'stale_connection';

export interface PlanAction {
  type: PlanActionType;
  title: string;
  detail: string;
  contactId?: string;
  followUpId?: string;
  chatId?: string;
  targetId?: string;
  dueAt?: string;
}

export interface WeeklyPlan {
  recommended: PlanAction | null;
  actions: PlanAction[];
  overdueCount: number;
  dueTodayCount: number;
  upcomingChatCount: number;
  weeklyOutreachTarget: number;
  timelineNotices: string[];
}

const ACTION_RANK: Record<PlanActionType, number> = {
  debrief_chat: 0,
  thank_you: 1,
  overdue_followup: 2,
  due_followup: 3,
  prep_chat: 4,
  silence_bump: 5,
  coverage_gap: 6,
  start_outreach: 7,
  stale_connection: 8,
};

const DAY_MS = 86_400_000;

/**
 * Formats an instant as a calendar date in the Australia/Sydney time zone.
 *
 * @param iso - An ISO timestamp
 * @returns The date in `YYYY-MM-DD` format
 */
export function sydneyDate(iso: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Australia/Sydney',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso));
}

/**
 * Extracts the month from an ISO timestamp in Australia/Sydney time.
 *
 * @param iso - The ISO timestamp to convert
 * @returns The month number from 1 through 12
 */
function sydneyMonth(iso: string): number {
  return Number(sydneyDate(iso).slice(5, 7));
}

/**
 * Computes the whole-day difference between two timestamps.
 *
 * @param nowIso - The reference timestamp in ISO format
 * @param iso - The timestamp to compare with the reference
 * @returns The elapsed whole days from `iso` to `nowIso`
 */
function daysSince(nowIso: string, iso: string): number {
  return Math.floor((new Date(nowIso).getTime() - new Date(iso).getTime()) / DAY_MS);
}

const MONTHS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];

/**
 * Finds month names contained in a string.
 *
 * @param text - The text to search
 * @returns The matching month numbers from 1 through 12
 */
function monthIndexes(text: string): number[] {
  const lower = text.toLowerCase();
  return MONTHS.flatMap((name, i) => (lower.includes(name) ? [i + 1] : []));
}

export type CycleWindowState = 'open' | 'approaching' | 'quiet';

/**
 * Classifies a recruiting cycle against the current Sydney month.
 * 'open' while applications are typically open, 'approaching' in the
 * two months before the window. Month-name-free windows (e.g.
 * "Year-round") return 'quiet' and are handled editorially instead.
 */
export function cycleWindowState(cycle: RecruitingCycle, nowIso: string): CycleWindowState {
  const openMonths = monthIndexes(cycle.typical_open);
  const closeMonths = monthIndexes(cycle.typical_close);
  if (openMonths.length === 0 || closeMonths.length === 0) return 'quiet';
  const start = Math.min(...openMonths);
  const end = Math.max(...closeMonths);
  const month = sydneyMonth(nowIso);
  const inWindow = start <= end
    ? month >= start && month <= end
    : month >= start || month <= end;
  if (inWindow) return 'open';
  const monthsUntil = (start - month + 12) % 12;
  return monthsUntil >= 1 && monthsUntil <= 2 ? 'approaching' : 'quiet';
}

/**
 * Builds a prioritized weekly outreach plan from contacts, follow-ups, chats, coverage gaps, and recruiting cycles.
 *
 * @param input - Workspace data and the timestamp used to determine due actions and timeline states
 * @returns A plan containing prioritized actions, the recommended action, activity counts, outreach target, and timeline notices
 */
export function buildWeeklyPlan(input: {
  nowIso: string;
  contacts: PlanContact[];
  followUps: PlanFollowUp[];
  coffeeChats: PlanCoffeeChat[];
  coverage: TargetCoverageRow[];
  cycles: RecruitingCycle[];
}): WeeklyPlan {
  const { nowIso, contacts, followUps, coffeeChats, coverage, cycles } = input;
  const today = sydneyDate(nowIso);
  const actions: PlanAction[] = [];

  // 1. Chats needing a debrief: completed without one, or scheduled in the past.
  for (const chat of coffeeChats) {
    const past = chat.scheduled_at < nowIso;
    if ((chat.status === 'completed' && !chat.has_debrief) || (chat.status === 'scheduled' && past)) {
      actions.push({
        type: 'debrief_chat',
        chatId: chat.id,
        contactId: chat.contact_id,
        title: `Debrief your chat with ${chat.contact_name}`,
        detail: 'Record what you learned, any names dropped, and queue the thank-you while it is fresh.',
        dueAt: chat.scheduled_at,
      });
    }
  }

  // 2–4. Follow-ups: thank-yous outrank everything except debriefs.
  const activeFollowUps = followUps.filter((f) => f.status === 'open' || f.status === 'snoozed');
  let overdueCount = 0;
  let dueTodayCount = 0;
  for (const followUp of activeFollowUps) {
    const dueDay = sydneyDate(followUp.due_at);
    if (dueDay > today) continue;
    const overdue = dueDay < today;
    if (overdue) overdueCount += 1;
    else dueTodayCount += 1;
    if (followUp.kind === 'thank_you') {
      actions.push({
        type: 'thank_you',
        followUpId: followUp.id,
        contactId: followUp.contact_id,
        title: `Send your thank-you to ${followUp.contact_name}`,
        detail: 'Thank-yous within 24 hours are the highest-value follow-up you can send.',
        dueAt: followUp.due_at,
      });
    } else {
      actions.push({
        type: overdue ? 'overdue_followup' : 'due_followup',
        followUpId: followUp.id,
        contactId: followUp.contact_id,
        title: `${overdue ? 'Overdue' : 'Due today'}: ${followUp.contact_name}`,
        detail: followUpDetail(followUp.kind),
        dueAt: followUp.due_at,
      });
    }
  }

  // 5. Prep for chats inside the next 48 hours.
  const in48h = new Date(new Date(nowIso).getTime() + 2 * DAY_MS).toISOString();
  for (const chat of coffeeChats) {
    if (chat.status !== 'scheduled' || chat.has_prep) continue;
    if (chat.scheduled_at >= nowIso && chat.scheduled_at <= in48h) {
      actions.push({
        type: 'prep_chat',
        chatId: chat.id,
        contactId: chat.contact_id,
        title: `Prepare for your chat with ${chat.contact_name}`,
        detail: 'Fill in your prep sheet: their background, your questions, and your ask.',
        dueAt: chat.scheduled_at,
      });
    }
  }

  // 6. Silence bumps: outreach ≥7 days old with no reply and no queued action.
  for (const contact of contacts) {
    if (contact.do_not_contact || contact.has_active_followup) continue;
    if (contact.stage !== 'contacted' || !contact.last_outbound_at) continue;
    const replied = contact.last_inbound_at && contact.last_inbound_at > contact.last_outbound_at;
    if (!replied && daysSince(nowIso, contact.last_outbound_at) >= 7) {
      actions.push({
        type: 'silence_bump',
        contactId: contact.id,
        title: `Follow up with ${contact.full_name}`,
        detail: `No reply in ${daysSince(nowIso, contact.last_outbound_at)} days. One brief, polite bump is normal — then let it rest.`,
      });
    }
  }

  // 7. Coverage gaps, already urgency-ranked by the coverage engine.
  for (const row of coverage.filter((r) => (r.status === 'none' || r.status === 'thin') && r.urgency > 0).slice(0, 2)) {
    const closing = row.daysToClose !== null && row.daysToClose >= 0 && row.daysToClose <= 45
      ? ` Applications close in ~${row.daysToClose} days.`
      : '';
    actions.push({
      type: 'coverage_gap',
      targetId: row.target.id,
      title: `Build coverage at ${row.target.bank_name}`,
      detail: `${row.gaps[0] ?? 'Coverage is thin.'}${closing}`,
    });
  }

  // 8. Prospects sitting untouched for 3+ days.
  for (const contact of contacts.slice().sort((a, b) => a.created_at.localeCompare(b.created_at))) {
    if (contact.do_not_contact || contact.has_active_followup) continue;
    if (contact.stage !== 'prospect' && contact.stage !== 'ready_to_contact') continue;
    if (daysSince(nowIso, contact.created_at) >= 3) {
      actions.push({
        type: 'start_outreach',
        contactId: contact.id,
        title: `Start outreach to ${contact.full_name}`,
        detail: 'This contact has no first message yet. Draft it in the Message Lab.',
      });
    }
  }

  // 9. Connected relationships going cold.
  for (const contact of contacts) {
    if (contact.do_not_contact || contact.has_active_followup || contact.stage !== 'connected') continue;
    const lastTouch = [contact.last_outbound_at, contact.last_inbound_at]
      .filter((v): v is string => Boolean(v))
      .sort()
      .pop();
    if (lastTouch && daysSince(nowIso, lastTouch) >= 30) {
      actions.push({
        type: 'stale_connection',
        contactId: contact.id,
        title: `Reconnect with ${contact.full_name}`,
        detail: 'Over a month since your last touch. Share a brief, useful update to keep the relationship warm.',
      });
    }
  }

  // Cap repetitive categories so the queue stays a plan, not a backlog.
  const capped = capPerType(actions, { start_outreach: 3, silence_bump: 3, stale_connection: 2 });
  capped.sort(
    (a, b) => ACTION_RANK[a.type] - ACTION_RANK[b.type] || (a.dueAt ?? '9999').localeCompare(b.dueAt ?? '9999'),
  );

  // Timeline notices + outreach target.
  const timelineNotices: string[] = [];
  let cycleOpen = false;
  for (const cycle of cycles) {
    const state = cycleWindowState(cycle, nowIso);
    if (state === 'open') {
      cycleOpen = true;
      timelineNotices.push(
        `${cycle.name}: applications typically close ${cycle.typical_close} — verify each firm's dates and prioritise those relationships now.`,
      );
    } else if (state === 'approaching') {
      timelineNotices.push(
        `${cycle.name}: applications typically open ${cycle.typical_open} — build relationships before the window opens.`,
      );
    }
  }

  const uncovered = coverage.filter((r) => r.status === 'none' || r.status === 'thin').length;
  const weeklyOutreachTarget = Math.min(8, Math.max(3, 4 + (cycleOpen ? 2 : 0) + (uncovered > 0 ? 1 : 0)));

  const upcomingChatCount = coffeeChats.filter(
    (c) => c.status === 'scheduled' && c.scheduled_at >= nowIso
      && daysSince(c.scheduled_at, nowIso) >= -7,
  ).length;

  return {
    recommended: capped[0] ?? null,
    actions: capped,
    overdueCount,
    dueTodayCount,
    upcomingChatCount,
    weeklyOutreachTarget,
    timelineNotices,
  };
}

/**
 * Provides the action description associated with a follow-up kind.
 *
 * @param kind - The type of follow-up action
 * @returns A description of the action to complete
 */
function followUpDetail(kind: FollowUpKind): string {
  switch (kind) {
    case 'send_outreach': return 'Send the first message you planned for this contact.';
    case 'follow_up_no_reply': return 'Send one brief, polite follow-up on your earlier message.';
    case 'schedule_chat': return 'Propose times for a coffee chat.';
    case 'prep_chat': return 'Complete your prep sheet before the conversation.';
    case 'debrief': return 'Record the outcome and choose the next action.';
    case 'maintain': return 'Send a short, useful update to keep this relationship warm.';
    default: return 'Complete the next action you scheduled for this contact.';
  }
}

/**
 * Limits selected action types to their configured maximum counts.
 *
 * @param actions - Actions to filter while preserving their encounter order
 * @param caps - Maximum number of actions to retain for each selected action type
 * @returns The filtered actions
 */
function capPerType(actions: PlanAction[], caps: Partial<Record<PlanActionType, number>>): PlanAction[] {
  const seen: Partial<Record<PlanActionType, number>> = {};
  return actions.filter((action) => {
    const cap = caps[action.type];
    if (cap === undefined) return true;
    const count = (seen[action.type] ?? 0) + 1;
    seen[action.type] = count;
    return count <= cap;
  });
}
