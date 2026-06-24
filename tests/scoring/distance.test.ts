import { describe, it, expect } from 'vitest';
import {
  binaryDistance,
  bucketedDistance,
  categoricalDistance,
  computeDistance,
  computeDistanceWithBreakdown,
  ordinalDistance,
  studentForDistance,
} from '../../lib/scoring/distance.js';
import { computeFields } from '../../lib/scoring/computed.js';
import { reconstructAtStage } from '../../lib/scoring/snapshot.js';
import { WAM_RANKS, ATAR_RANKS } from '../../lib/scoring/types.js';
import { loadPros, Y2_UNSW_COOP_HD_JPM, TEST_NOW } from './fixtures.js';

describe('primitive distances', () => {
  it('categorical: same → 0, different → 1', () => {
    expect(categoricalDistance('a', 'a')).toBe(0);
    expect(categoricalDistance('a', 'b')).toBe(1);
  });
  it('binary: same → 0, different → 1', () => {
    expect(binaryDistance(true, true)).toBe(0);
    expect(binaryDistance(true, false)).toBe(1);
  });
  it('bucketed: capped at max_diff', () => {
    expect(bucketedDistance(0, 0, 4)).toBe(0);
    expect(bucketedDistance(0, 4, 4)).toBe(1);
    expect(bucketedDistance(0, 100, 4)).toBe(1); // capped
  });
  it('ordinal: hd vs hd = 0, hd vs p = 1 (max range)', () => {
    expect(ordinalDistance('hd', 'hd', WAM_RANKS)).toBe(0);
    expect(ordinalDistance('hd', 'p', WAM_RANKS)).toBe(1);
    expect(ordinalDistance('99_plus', 'below_85', ATAR_RANKS)).toBe(1);
  });
});

describe('computeDistance', () => {
  it('a profile vs its own snapshot → near-zero', () => {
    const pros = loadPros();
    const p008 = pros.find(p => p.id === 'P008')!;
    const snap = reconstructAtStage(p008, 'S1');
    const sFromP008 = {
      university_tier: p008.university_tier,
      wam_band: p008.wam_band,
      atar_band: p008.atar_band,
      high_school_type: p008.high_school_type,
      has_honours: p008.has_honours,
      computed: snap.computed,
    };
    const d = computeDistance(sFromP008, snap);
    expect(d).toBeLessThan(0.05);
  });

  it('skips wam feature when either side is unknown', () => {
    const pros = loadPros();
    const p017 = pros.find(p => p.id === 'P017')!; // wam_band='unknown'
    const snap = reconstructAtStage(p017, 'S1');
    const sd = studentForDistance(
      { ...Y2_UNSW_COOP_HD_JPM, wam_band: 'hd' },
      computeFields({
        experiences: Y2_UNSW_COOP_HD_JPM.experiences,
        signals: Y2_UNSW_COOP_HD_JPM.signals,
        current_year: 2,
        expected_graduation_year: 2028,
        now: TEST_NOW,
      }),
    );
    const breakdown = computeDistanceWithBreakdown(sd, snap);
    const wamComp = breakdown.components.find(c => c.feat === 'wam_band')!;
    expect(wamComp.skipped).toBe(true);
  });
});
