import { describe, expect, it } from 'vitest';
import {
  buildWeeklyPlan,
  cycleWindowState,
  sydneyDate,
  type PlanCoffeeChat,
  type PlanContact,
  type PlanFollowUp,
} from '../../lib/networking/plan.js';
import type { TargetCoverageRow } from '../../lib/networking/coverage.js';
import type { RecruitingCycle } from '../../lib/courses/timeline.js';

const NOW = '2026-07-15T00:00:00.000Z'; // AEST winter — mid-year

function baseContact(overrides: Partial<PlanContact> = {}): PlanContact {
  return {
    id: 'c1',
    full_name: 'Jane Doe',
    stage: 'prospect',
    do_not_contact: false,
    created_at: '2026-07-01T00:00:00.000Z',
    last_outbound_at: null,
    last_inbound_at: null,
    has_active_followup: false,
    ...overrides,
  };
}

const emptyPlanInput = { nowIso: NOW, contacts: [], followUps: [], coffeeChats: [], coverage: [], cycles: [] };

describe('buildWeeklyPlan ordering', () => {
  it('ranks an unfinished debrief above everything else', () => {
    const chats: PlanCoffeeChat[] = [{
      id: 'chat1', contact_id: 'c1', contact_name: 'Jane', status: 'completed',
      scheduled_at: '2026-07-14T00:00:00.000Z', has_prep: true, has_debrief: false,
    }];
    const followUps: PlanFollowUp[] = [{
      id: 'f1', contact_id: 'c2', contact_name: 'Bo', kind: 'thank_you', status: 'open',
      due_at: '2026-07-14T00:00:00.000Z',
    }];
    const plan = buildWeeklyPlan({ ...emptyPlanInput, coffeeChats: chats, followUps });
    expect(plan.recommended?.type).toBe('debrief_chat');
    expect(plan.actions[0].type).toBe('debrief_chat');
    expect(plan.actions[1].type).toBe('thank_you');
  });

  it('counts overdue vs due-today follow-ups correctly', () => {
    const followUps: PlanFollowUp[] = [
      { id: 'f1', contact_id: 'c1', contact_name: 'A', kind: 'follow_up_no_reply', status: 'open', due_at: '2026-07-10T00:00:00.000Z' },
      { id: 'f2', contact_id: 'c2', contact_name: 'B', kind: 'follow_up_no_reply', status: 'open', due_at: '2026-07-15T00:00:00.000Z' },
      { id: 'f3', contact_id: 'c3', contact_name: 'C', kind: 'follow_up_no_reply', status: 'open', due_at: '2026-07-20T00:00:00.000Z' },
    ];
    const plan = buildWeeklyPlan({ ...emptyPlanInput, followUps });
    expect(plan.overdueCount).toBe(1);
    expect(plan.dueTodayCount).toBe(1);
  });

  it('flags a silence bump only after 7+ days with no reply and no active follow-up', () => {
    const contacts = [baseContact({
      stage: 'contacted',
      last_outbound_at: '2026-07-07T00:00:00.000Z',
    })];
    const plan = buildWeeklyPlan({ ...emptyPlanInput, contacts });
    expect(plan.actions.some((a) => a.type === 'silence_bump')).toBe(true);
  });

  it('does not silence-bump a contact with an active follow-up', () => {
    const contacts = [baseContact({
      stage: 'contacted',
      last_outbound_at: '2026-07-01T00:00:00.000Z',
      has_active_followup: true,
    })];
    const plan = buildWeeklyPlan({ ...emptyPlanInput, contacts });
    expect(plan.actions.some((a) => a.type === 'silence_bump')).toBe(false);
  });

  it('suggests starting outreach for an untouched prospect after 3+ days', () => {
    const contacts = [baseContact({ stage: 'prospect', created_at: '2026-07-01T00:00:00.000Z' })];
    const plan = buildWeeklyPlan({ ...emptyPlanInput, contacts });
    expect(plan.actions.some((a) => a.type === 'start_outreach')).toBe(true);
  });

  it('surfaces the most urgent coverage gap', () => {
    const coverage: TargetCoverageRow[] = [{
      target: { id: 't1', bank_name: 'Macquarie', tier: 'bb', priority: 1, status: 'researching', apps_close: null },
      contactCount: 0, juniorCount: 0, seniorCount: 0, recruiterCount: 0,
      strongestStage: null, lastTouch: null, daysToClose: null,
      status: 'none', gaps: ['No contacts at this firm yet'], urgency: 30,
    }];
    const plan = buildWeeklyPlan({ ...emptyPlanInput, coverage });
    expect(plan.actions.some((a) => a.type === 'coverage_gap')).toBe(true);
  });

  it('returns null recommendation and empty actions when nothing is due', () => {
    const plan = buildWeeklyPlan(emptyPlanInput);
    expect(plan.recommended).toBeNull();
    expect(plan.actions).toHaveLength(0);
  });
});

describe('sydneyDate', () => {
  it('formats an ISO instant as YYYY-MM-DD in Australia/Sydney', () => {
    expect(sydneyDate('2026-07-15T00:00:00.000Z')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('cycleWindowState', () => {
  const cycle: RecruitingCycle = {
    id: 'summer_internship', name: 'Summer internships', audience: 'Penultimate-year',
    typical_open: 'February–March', typical_close: 'March–April',
    program_period: 'November–February', notes: '',
  };

  it('is open during the typical window', () => {
    expect(cycleWindowState(cycle, '2026-03-15T00:00:00.000Z')).toBe('open');
  });

  it('is approaching one to two months before the window', () => {
    expect(cycleWindowState(cycle, '2026-01-15T00:00:00.000Z')).toBe('approaching');
  });

  it('is quiet well outside the window', () => {
    expect(cycleWindowState(cycle, '2026-08-15T00:00:00.000Z')).toBe('quiet');
  });

  it('treats a month-name-free window as quiet', () => {
    const yearRound: RecruitingCycle = { ...cycle, typical_open: 'Year-round', typical_close: 'Year-round' };
    expect(cycleWindowState(yearRound, NOW)).toBe('quiet');
  });
});
