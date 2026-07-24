import { describe, expect, it } from 'vitest';

import {
  parseLegacyProfessionalRows,
  parseNormalizedProfessionalRows,
  parseProfessionalRowsOrThrow,
  ProfessionalDataError,
} from '../../lib/scoring/professional-adapter';
import { loadPros } from './fixtures';

function legacyRowFromProfessional() {
  const professional = loadPros()[0]!;
  const row: Record<string, unknown> = {
    ...professional,
    full_name_internal: 'Private Test Name',
    linkedin_url_internal: null,
  };
  delete row.experiences;
  professional.experiences.forEach((experience, index) => {
    const sequence = index + 1;
    for (const [key, value] of Object.entries(experience)) {
      row[`exp${sequence}_${key}`] = key === 'converted_to_ft'
        ? value === true ? 'TRUE' : value === false ? 'FALSE' : 'NA'
        : value;
    }
  });
  return { professional, row };
}

describe('professional source adapters', () => {
  it('round-trips a legacy flat row into the exact scorer contract', () => {
    const { professional, row } = legacyRowFromProfessional();
    const result = parseLegacyProfessionalRows([row]);
    expect(result.rejects).toEqual([]);
    // The legacy flat format has no achievements column, so a round-trip
    // necessarily drops them — compare against the professional sans achievements.
    const { achievements: _achievements, ...expectedWithoutAchievements } = professional;
    expect(result.professionals).toEqual([expectedWithoutAchievements]);
    expect(result.professionals[0]).not.toHaveProperty('full_name_internal');
  });

  it('accepts the normalized view shape with explicit versions', () => {
    const professional = loadPros()[0]!;
    const result = parseNormalizedProfessionalRows([{
      ...professional,
      taxonomy_version: '2026-07-15.1',
      derivation_version: '2026-07-15.1',
      feature_version: 'professional-v1',
    }]);
    expect(result.rejects).toEqual([]);
    expect(result.professionals).toEqual([professional]);
  });

  it('rejects the entire normalized source when any scoring field is malformed', () => {
    const professional = loadPros()[0]!;
    const malformed = {
      ...professional,
      experiences: [{ ...professional.experiences[0], role_relevance: 99 }],
      taxonomy_version: '2026-07-15.1',
      derivation_version: '2026-07-15.1',
      feature_version: 'professional-v1',
    };
    expect(() => parseProfessionalRowsOrThrow([malformed], 'normalized'))
      .toThrow(ProfessionalDataError);
  });

  it('does not silently coerce arbitrary database signals', () => {
    const { row } = legacyRowFromProfessional();
    row.signals = ['not_a_career_compass_signal'];
    const result = parseLegacyProfessionalRows([row]);
    expect(result.professionals).toEqual([]);
    expect(result.rejects[0]?.issues.some((issue) => issue.path === 'signals.0')).toBe(true);
  });
});
