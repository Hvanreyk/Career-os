import { describe, it, expect } from 'vitest';
import { filterPool } from '../../lib/scoring/pool.js';
import { loadPros } from './fixtures.js';

describe('filterPool', () => {
  const pros = loadPros();

  it('Sydney + BB target + S1 → 10 BB entry-level pros (excludes seniors P004/P005/P006/P009 and legacy EB-MM P015/P016/P017)', () => {
    // 14 BB total - 4 senior BB (P004, P005, P006, P009) = 10
    // Legacy combined-tier pros (P015, P016, P017) are excluded by tier filter (below BB)
    const filtered = filterPool(pros, 'bb', 'sydney', 'S1');
    const ids = filtered.map(p => p.id).sort();
    expect(filtered).toHaveLength(10);
    for (const senior of ['P004', 'P005', 'P006', 'P009', 'P017']) {
      expect(ids).not.toContain(senior);
    }
    for (const ebmm of ['P015', 'P016']) {
      expect(ids).not.toContain(ebmm);
    }
  });

  it('Sydney + Mid-Market target + S1 → 12 entry-level (BB + legacy combined-tier)', () => {
    // BB(7) and the legacy elite_boutique_and_mm tier(5) both rank >= Mid-Market(5); entry-level = 12
    const filtered = filterPool(pros, 'mid_market', 'sydney', 'S1');
    expect(filtered).toHaveLength(12);
  });

  it('Sydney + S5 strict (years > 2 + non-IB before IB) returns the spec-strict lateral cohort', () => {
    const filtered = filterPool(pros, 'any', 'sydney', 'S5');
    const ids = filtered.map(p => p.id).sort();
    // P017 (KPMG audit → KPMG advisory → Jefferies) is the canonical lateral.
    expect(ids).toContain('P017');
    // P009 (Strategy& consulting → PwC M&A → Citi IB).
    expect(ids).toContain('P009');
    // Strict rule excludes P003 — years_to_current_role=2 fails the > 2 gate,
    // even though the brief mentions P003 as a lateral example.
    expect(ids).not.toContain('P003');
  });

  it('Mid-Market target excludes pros below that tier (none below in v7)', () => {
    const filtered = filterPool(pros, 'mid_market', 'sydney', 'S1');
    // BB tier (7) is above Mid-Market (5), so BB pros are included.
    expect(filtered.length).toBeGreaterThan(0);
    for (const p of filtered) {
      expect(['bb', 'elite_boutique_and_mm']).toContain(p.current_firm_tier);
    }
  });

  it('Elite Boutique target excludes the still-unmigrated legacy combined tier', () => {
    // No v7 rows have been relabeled to 'elite_boutique' yet, so only BB
    // (which ranks above it) should show up.
    const filtered = filterPool(pros, 'elite_boutique', 'sydney', 'S1');
    for (const p of filtered) {
      expect(p.current_firm_tier).toBe('bb');
    }
  });

  it('Melbourne target → 0 (all 17 v7 rows are sydney)', () => {
    const filtered = filterPool(pros, 'bb', 'melbourne', 'S1');
    expect(filtered).toHaveLength(0);
  });

  it('Perth/Adelaide/Brisbane targets fall back to the national AU pool (same as Sydney, since all v7 rows are sydney)', () => {
    const sydney = filterPool(pros, 'bb', 'sydney', 'S1');
    for (const city of ['perth', 'adelaide', 'brisbane'] as const) {
      const filtered = filterPool(pros, 'bb', city, 'S1');
      expect(filtered.map(p => p.id).sort()).toEqual(sydney.map(p => p.id).sort());
    }
  });
});
