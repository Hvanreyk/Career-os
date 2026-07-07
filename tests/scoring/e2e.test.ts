/**
 * End-to-end test from project_brief.md Phase 2 acceptance:
 *
 *   "Given a synthetic Y2 USYD BCom student with HD WAM and a JPM IB
 *    internship, the engine produces:
 *      - Stage = S1
 *      - Top matches include P007 (Sophie Ellis), P008 (Annie Yan)
 *      - Top action = secure penultimate at BB
 *      - Match count includes only entry-level pros
 *        (excludes P004, P005, P017 — and per memory, also P006 + P009)"
 *
 * The fixture uses UNSW (Co-op) instead of USYD because the matches the
 * brief names (Sophie Ellis P007 = UNSW BCom Co-op, Annie Yan P008 = UNSW
 * BCom) are UNSW. The brief wording slips between USYD and UNSW; the
 * test profile follows the matched-professional schools.
 */

import { describe, it, expect } from 'vitest';
import { score } from '../../lib/scoring/index.js';
import { DEFAULT_K } from '../../lib/scoring/matcher.js';
import { TIER_LEVEL } from '../../lib/scoring/types.js';
import { loadPros, Y2_UNSW_COOP_HD_JPM, TEST_NOW } from './fixtures.js';

describe('Phase 2 e2e — Y2 UNSW Co-op HD JPM student → BB Sydney', () => {
  const pros = loadPros();
  const out = score(Y2_UNSW_COOP_HD_JPM, pros, { now: TEST_NOW });

  // Data-derived expectations — the dataset grows/gets relabeled over time.
  const entrySydney = pros.filter(
    p => p.current_geography === 'sydney' && p.years_to_current_role <= 3,
  );
  const seniorIds = pros
    .filter(p => p.years_to_current_role > 3)
    .map(p => p.id);

  it('classifies as stage S1', () => {
    expect(out.stage).toBe('S1');
  });

  it('senior cohort excluded (entry-level only — strict years_to_current_role <= 3)', () => {
    const matchedIds = out.top_paths.map(p => p.anonymised_profile_id);
    for (const seniorId of seniorIds) {
      expect(matchedIds).not.toContain(seniorId);
    }
  });

  it('pool = all entry-level Sydney pros regardless of tier; matches capped at K (plus distance ties)', () => {
    expect(out.match_summary.pool_size).toBe(entrySydney.length);
    expect(out.match_summary.matched_count).toBeGreaterThanOrEqual(
      Math.min(entrySydney.length, DEFAULT_K),
    );
    expect(out.match_summary.matched_count).toBeLessThanOrEqual(entrySydney.length);
  });

  it('total_professionals reports the whole database analysed', () => {
    expect(out.match_summary.total_professionals).toBe(pros.length);
  });

  it('top matches include P007 Sophie Ellis and P008 Annie Yan', () => {
    const top5 = out.top_paths.slice(0, 5).map(p => p.anonymised_profile_id);
    expect(top5).toContain('P007');
    expect(top5).toContain('P008');
  });

  it('low_data_warning reflects whether fewer than K matches were found', () => {
    expect(out.match_summary.low_data_warning).toBe(entrySydney.length < DEFAULT_K);
  });

  it('boutique_data_warning is false (target=bb)', () => {
    expect(out.match_summary.boutique_data_warning).toBe(false);
  });

  it('top action is "secure penultimate at BB"', () => {
    expect(out.actions.length).toBeGreaterThan(0);
    expect(out.actions[0]!.action_type).toBe('secure_penultimate');
    expect(out.actions[0]!.title.toLowerCase()).toContain('penultimate');
    expect(out.actions[0]!.title).toContain('BB');
  });

  it('top action description names specific BB firms drawn from matches', () => {
    const desc = out.actions[0]!.description;
    // At least one of the actual BB firms in the dataset should appear.
    const bbFirms = ['Citi', 'Morgan Stanley', 'J.P. Morgan', 'UBS', 'Goldman'];
    const found = bbFirms.some(f => desc.includes(f));
    expect(found).toBe(true);
  });

  it('reached_target counts matches at/above the BB target — no longer tautologically equal to matched_count', () => {
    const { matched_count, reached_target } = out.probability_data;
    expect(reached_target).toBeLessThanOrEqual(matched_count);
    if (entrySydney.length <= DEFAULT_K) {
      // Every comparable pro is matched, so the expected count is exactly
      // the entry-level Sydney pros whose current tier ranks >= BB.
      const reachedBB = entrySydney.filter(
        p => (TIER_LEVEL[p.current_firm_tier as keyof typeof TIER_LEVEL] ?? 0) >= TIER_LEVEL.bb,
      ).length;
      expect(reached_target).toBe(reachedBB);
    }
  });

  it('next recruiting window text mentions July with months count', () => {
    expect(out.context.next_recruiting_window).toMatch(/July/);
    expect(out.context.next_recruiting_window).toMatch(/months/);
  });

  it('top_paths include real path narratives (path_summary)', () => {
    expect(out.top_paths.length).toBeGreaterThan(0);
    for (const p of out.top_paths) {
      expect(p.path_summary).toBeTruthy();
      expect(p.path_summary).not.toBe('—');
    }
  });

  it('actions are capped at 3', () => {
    expect(out.actions.length).toBeLessThanOrEqual(3);
  });
});
