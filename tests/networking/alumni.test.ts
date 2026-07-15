import { describe, expect, it } from 'vitest';
import { computeAlumniIntel, MIN_FIRM_TOTAL, type AlumniProfessionalRow } from '../../lib/networking/alumni.js';

function row(overrides: Partial<AlumniProfessionalRow> = {}): AlumniProfessionalRow {
  return {
    current_firm: 'Macquarie',
    current_firm_tier: 'bb',
    current_role: 'ib_analyst',
    current_geography: 'sydney',
    university: 'UNSW',
    ...overrides,
  };
}

describe('computeAlumniIntel', () => {
  it('counts university matches case- and article-insensitively', () => {
    const rows = [row({ university: 'The University of Sydney' }), row({ university: 'university of sydney' })];
    const intel = computeAlumniIntel(rows, 'University of Sydney');
    expect(intel.universityMatchCount).toBe(2);
  });

  it('hides firms below the minimum total (privacy floor)', () => {
    const rows = [row({ current_firm: 'TinyBoutique' })];
    expect(rows.length).toBeLessThan(MIN_FIRM_TOTAL);
    const intel = computeAlumniIntel(rows, 'UNSW');
    expect(intel.firms.find((f) => f.firm === 'TinyBoutique')).toBeUndefined();
  });

  it('includes a firm once it reaches the minimum total', () => {
    const rows = [row(), row()];
    const intel = computeAlumniIntel(rows, 'UNSW');
    expect(intel.firms).toHaveLength(1);
    expect(intel.firms[0]).toMatchObject({ firm: 'Macquarie', total: 2, alumniCount: 2 });
  });

  it('never exposes individual professional fields, only aggregates', () => {
    const rows = [row(), row()];
    const intel = computeAlumniIntel(rows, 'UNSW');
    const serialized = JSON.stringify(intel);
    // no per-row identity fields (name, linkedin) exist on the input type at all,
    // and the output shape only carries counts/mixes/geographies.
    expect(Object.keys(intel.firms[0]).sort()).toEqual(
      ['alumniCount', 'firm', 'roleMix', 'tier', 'topGeographies', 'total'].sort(),
    );
    expect(serialized).not.toContain('linkedin');
  });

  it('ranks firms by alumni count, then total size', () => {
    const rows = [
      row({ current_firm: 'BigNoAlumni' }), row({ current_firm: 'BigNoAlumni', university: 'Other Uni' }),
      row({ current_firm: 'SmallAlumni' }), row({ current_firm: 'SmallAlumni' }),
    ];
    const intel = computeAlumniIntel(rows, 'UNSW');
    expect(intel.topAlumniFirms[0]).toBe('SmallAlumni');
  });

  it('computes role mix correctly', () => {
    const rows = [
      row({ current_role: 'ib_analyst' }),
      row({ current_role: 'ib_associate' }),
      row({ current_role: 'ib_vp' }),
    ];
    const intel = computeAlumniIntel(rows, 'UNSW');
    expect(intel.firms[0].roleMix).toEqual({ analyst: 1, associate: 1, vp: 1 });
  });
});
