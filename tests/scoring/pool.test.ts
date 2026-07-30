import { describe, it, expect } from 'vitest';
import { filterPool } from '../../lib/scoring/pool.js';
import { loadPros } from './fixtures.js';

// Expectations are derived from the loaded dataset rather than hardcoded
// row counts — the professional database grows/gets relabeled over time
// and these rules should hold for any snapshot of it.
describe('filterPool', () => {
  const pros = loadPros();
  const entrySydney = pros.filter(
    p => p.current_geography === 'sydney' && p.years_to_current_role <= 3,
  );

  it('Sydney + S1 → exactly the entry-level Sydney cohort, regardless of firm tier', () => {
    const filtered = filterPool(pros, 'sydney', 'S1');
    expect(filtered.map(p => p.id).sort()).toEqual(entrySydney.map(p => p.id).sort());
  });

  it('keeps below-target tiers in the pool (reached-target is measured downstream, not pre-filtered)', () => {
    const filtered = filterPool(pros, 'sydney', 'S1');
    const tiers = new Set(filtered.map(p => p.current_firm_tier));
    expect(tiers.size).toBeGreaterThan(1);
  });

  it('S1 excludes seniors (years_to_current_role > 3)', () => {
    const filtered = filterPool(pros, 'sydney', 'S1');
    for (const p of filtered) {
      expect(p.years_to_current_role).toBeLessThanOrEqual(3);
    }
  });

  it('Sydney + S5 keeps only strict laterals (years > 2 AND non-IB first role before IB)', () => {
    const filtered = filterPool(pros, 'sydney', 'S5');
    expect(filtered.length).toBeGreaterThan(0);
    for (const p of filtered) {
      expect(p.years_to_current_role).toBeGreaterThan(2);
      const sorted = [...p.experiences].sort((a, b) => a.year - b.year);
      expect(sorted[0]!.industry).not.toBe('ib');
      expect(sorted.slice(1).some(e => e.industry === 'ib')).toBe(true);
    }
  });

  it('Melbourne target → only melbourne pros', () => {
    const filtered = filterPool(pros, 'melbourne', 'S1');
    for (const p of filtered) {
      expect(p.current_geography).toBe('melbourne');
    }
  });

  it('Perth/Adelaide/Brisbane targets fall back to the national AU pool', () => {
    const au = pros.filter(
      p =>
        ['sydney', 'melbourne', 'perth', 'adelaide', 'brisbane'].includes(p.current_geography) &&
        p.years_to_current_role <= 3,
    );
    for (const city of ['perth', 'adelaide', 'brisbane'] as const) {
      const filtered = filterPool(pros, city, 'S1');
      expect(filtered.map(p => p.id).sort()).toEqual(au.map(p => p.id).sort());
    }
  });
});
