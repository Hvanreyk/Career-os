import { describe, expect, it } from 'vitest';
import { computeCoverage, type CoverageContact, type CoverageTarget } from '../../lib/networking/coverage.js';

const NOW = '2026-07-15T00:00:00.000Z';

function target(overrides: Partial<CoverageTarget> = {}): CoverageTarget {
  return {
    id: 't1',
    bank_name: 'Macquarie',
    tier: 'bb',
    priority: 1,
    status: 'researching',
    apps_close: null,
    ...overrides,
  };
}

function contact(overrides: Partial<CoverageContact> = {}): CoverageContact {
  return {
    id: 'c1',
    full_name: 'Jane Doe',
    stage: 'prospect',
    seniority: 'analyst',
    do_not_contact: false,
    bank_target_ids: ['t1'],
    last_interaction_at: null,
    has_active_followup: false,
    ...overrides,
  };
}

describe('computeCoverage', () => {
  it('classifies a target with no linked contacts as none', () => {
    const summary = computeCoverage([target()], [], NOW);
    expect(summary.rows[0].status).toBe('none');
    expect(summary.rows[0].gaps).toContain('No contacts at this firm yet');
    expect(summary.uncoveredCount).toBe(1);
  });

  it('classifies a fully covered target correctly', () => {
    const contacts: CoverageContact[] = [
      contact({ id: 'a1', seniority: 'analyst', stage: 'conversation_booked', has_active_followup: true }),
      contact({ id: 'a2', seniority: 'associate', stage: 'connected', has_active_followup: true }),
      contact({ id: 'v1', seniority: 'vp', stage: 'connected', has_active_followup: true }),
    ];
    const summary = computeCoverage([target()], contacts, NOW);
    expect(summary.rows[0].status).toBe('covered');
    expect(summary.rows[0].gaps).toHaveLength(0);
    expect(summary.coveredCount).toBe(1);
  });

  it('excludes do-not-contact contacts from coverage', () => {
    const contacts = [contact({ do_not_contact: true })];
    const summary = computeCoverage([target()], contacts, NOW);
    expect(summary.rows[0].contactCount).toBe(0);
  });

  it('ranks urgency higher for closer application windows', () => {
    const soon = target({ id: 'soon', bank_name: 'Soon Bank', apps_close: '2026-07-25' });
    const far = target({ id: 'far', bank_name: 'Far Bank', apps_close: '2027-01-01' });
    const summary = computeCoverage([far, soon], [], NOW);
    expect(summary.rows[0].target.id).toBe('soon');
  });

  it('deprioritises rejected/closed targets to zero urgency', () => {
    const closed = target({ status: 'closed', priority: 1 });
    const summary = computeCoverage([closed], [], NOW);
    expect(summary.rows[0].urgency).toBe(0);
  });
});
