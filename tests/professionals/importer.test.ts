import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';

import {
  convertLegacyFlatRows,
  normalizeLinkedInUrl,
  parseCanonicalWorkbookRows,
  parseLegacyFlatProfessionalRows,
  parseProfessionalWorkbook,
  type CanonicalWorkbookRows,
  type RawWorkbookRow,
} from '../../lib/professionals/index.js';

function profile(
  professionalKey: string,
  overrides: RawWorkbookRow = {},
): RawWorkbookRow {
  return {
    professional_key: professionalKey,
    full_name_internal: `Person ${professionalKey}`,
    linkedin_url_internal: `linkedin.com/in/${professionalKey}`,
    current_role: 'ib_analyst',
    current_firm: 'Example Bank',
    current_firm_tier: 'bb',
    current_geography: 'sydney',
    current_role_start_year: 2025,
    years_to_current_role: 3,
    path_summary: 'A path',
    data_source: 'linkedin',
    data_confidence: 'high',
    ...overrides,
  };
}

function primaryEducation(professionalKey: string): RawWorkbookRow {
  return {
    professional_key: professionalKey,
    sequence: 1,
    is_primary: true,
    education_level: 'higher_education',
    institution: 'University of Sydney',
    institution_tier: 'go8_top',
    degree_type: 'bachelor',
    degree_name: 'Bachelor of Commerce',
    majors: 'Finance',
    graduation_year: 2023,
    date_precision: 'year',
    wam_band: 'd',
    has_honours: false,
    has_masters_or_second_degree: false,
  };
}

function experience(
  professionalKey: string,
  sequence: number,
  overrides: RawWorkbookRow = {},
): RawWorkbookRow {
  return {
    professional_key: professionalKey,
    sequence,
    experience_type: 'summer_internship',
    organization: `Firm ${sequence}`,
    firm_tier: 'bb',
    industry: 'ib',
    year: 2020 + sequence,
    duration_months: sequence === 2 ? null : 3,
    acquisition_method: sequence === 3 ? 'return_offer' : 'online_application',
    converted_to_full_time: sequence === 3 ? true : false,
    ...overrides,
  };
}

function achievement(professionalKey: string): RawWorkbookRow {
  return {
    professional_key: professionalKey,
    sequence: 1,
    tag: 'deans_list',
    effective_year: 2021,
    date_precision: 'year',
    source: 'manual',
  };
}

function validRows(experienceCount = 1): CanonicalWorkbookRows {
  return {
    professionals: [profile('P100')],
    education: [primaryEducation('P100')],
    experiences: Array.from(
      { length: experienceCount },
      (_, index) => experience('P100', index + 1),
    ),
    achievements: [achievement('P100')],
  };
}

function workbookFromRows(
  rows: CanonicalWorkbookRows,
  omittedSheet?: keyof CanonicalWorkbookRows,
): XLSX.WorkBook {
  const workbook = XLSX.utils.book_new();
  for (const sheet of ['professionals', 'education', 'experiences', 'achievements'] as const) {
    if (sheet === omittedSheet) continue;
    const sheetRows = rows[sheet];
    const fallbackHeaders: Record<typeof sheet, string[]> = {
      professionals: [
        'professional_key',
        'full_name_internal',
        'current_role',
        'current_firm',
        'current_firm_tier',
        'current_geography',
        'current_role_start_year',
        'years_to_current_role',
        'data_source',
        'data_confidence',
      ],
      education: ['professional_key', 'sequence', 'is_primary', 'education_level'],
      experiences: [
        'professional_key',
        'sequence',
        'experience_type',
        'organization',
        'firm_tier',
        'industry',
        'year',
        'acquisition_method',
      ],
      achievements: ['professional_key', 'sequence', 'tag'],
    };
    const worksheet = XLSX.utils.json_to_sheet(sheetRows, {
      header: sheetRows.length > 0 ? Object.keys(sheetRows[0]!) : fallbackHeaders[sheet],
    });
    XLSX.utils.book_append_sheet(workbook, worksheet, sheet);
  }
  return workbook;
}

describe('canonical professional workbook importer', () => {
  it('parses unlimited experiences, canonicalizes aliases, and emits RPC-ready staging rows', () => {
    const rows = validRows(7);
    rows.experiences[0]!.experience_type = 'internship';
    rows.experiences[0]!.industry = 'capital_markets';
    delete rows.experiences[0]!.role_function;
    delete rows.experiences[0]!.role_relevance;

    const result = parseCanonicalWorkbookRows(rows);

    expect(result.can_apply).toBe(true);
    expect(result.summary.professionals).toMatchObject({
      received: 1,
      accepted: 1,
      inserted: 1,
      ready: 1,
      rejected: 0,
    });
    expect(result.records[0]!.experiences).toHaveLength(7);
    expect(result.records[0]!.experiences[0]).toMatchObject({
      experience_type: 'summer_internship',
      industry: 'global_markets',
      role_function: 'sales_trading',
      role_relevance: 5,
    });
    expect(result.records[0]!.experiences[1]!.duration_months).toBeNull();
    expect(result.records[0]!.experiences[2]!.transition_type).toBe('return_offer');
    expect(result.records[0]!.achievements[0]).toMatchObject({
      tag: 'deans_list',
      effective_year: 2021,
      date_precision: 'year',
    });
    expect(result.staging_rows).toHaveLength(10);
    expect(result.staging_rows.find((row) => row.sheet_name === 'achievements')?.payload)
      .toMatchObject({
        professional_id: 'P100',
        tag: 'deans_list',
        effective_year: 2021,
      });
  });

  it('normalizes LinkedIn URLs before detecting duplicates and rejects both records atomically', () => {
    const rows = validRows();
    rows.professionals.push(profile('P101', {
      linkedin_url_internal: 'HTTPS://WWW.LINKEDIN.COM/in/P100/?trk=source',
    }));
    rows.education.push(primaryEducation('P101'));

    const result = parseCanonicalWorkbookRows(rows);

    expect(normalizeLinkedInUrl('linkedin.com/in/Some-One/?trk=abc'))
      .toBe('https://www.linkedin.com/in/some-one');
    expect(result.can_apply).toBe(false);
    expect(result.records).toHaveLength(0);
    expect(result.issues).toContainEqual(expect.objectContaining({
      code: 'duplicate_linkedin',
      professional_key: 'P101',
      column: 'linkedin_url_internal',
    }));
  });

  it('keeps unresolved combined tiers as drafts with readable readiness blockers', () => {
    const rows = validRows();
    rows.professionals[0]!.current_firm_tier = 'elite_boutique_and_mm';
    rows.experiences[0]!.firm_tier = 'elite_boutique_and_mm';

    const result = parseCanonicalWorkbookRows(rows);

    expect(result.can_apply).toBe(true);
    expect(result.records[0]).toMatchObject({ lifecycle_status: 'draft' });
    expect(result.records[0]!.readiness_blockers).toEqual([
      'current firm tier elite_boutique_and_mm must be resolved',
      'experience firm tier elite_boutique_and_mm must be resolved at sequences 1',
    ]);
  });

  it('reports duplicate sequences, orphan children, and precise invalid cells', () => {
    const rows = validRows();
    rows.experiences.push(experience('P100', 1));
    rows.education.push({ ...primaryEducation('P404'), professional_key: 'P404' });
    rows.achievements[0]!.effective_year = 'not-a-year';

    const result = parseCanonicalWorkbookRows(rows);

    expect(result.can_apply).toBe(false);
    expect(result.records).toHaveLength(0);
    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: 'duplicate_sequence',
        sheet: 'experiences',
        row: 3,
        column: 'sequence',
      }),
      expect.objectContaining({
        code: 'orphan_child',
        sheet: 'education',
        professional_key: 'P404',
      }),
      expect.objectContaining({
        code: 'invalid_cell',
        sheet: 'achievements',
        row: 2,
        column: 'effective_year',
      }),
    ]));
  });

  it('parses real XLSX sheets and identifies missing sheets before application', () => {
    const workbook = workbookFromRows(validRows(), 'achievements');
    const bytes = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });

    const result = parseProfessionalWorkbook(bytes);

    expect(result.can_apply).toBe(false);
    expect(result.issues).toContainEqual(expect.objectContaining({
      code: 'missing_sheet',
      sheet: 'achievements',
    }));
  });

  it('reports missing canonical columns from the workbook header', () => {
    const rows = validRows();
    delete rows.professionals[0]!.current_role;
    const workbook = workbookFromRows(rows);

    const result = parseProfessionalWorkbook(workbook);

    expect(result.can_apply).toBe(false);
    expect(result.issues).toContainEqual(expect.objectContaining({
      code: 'missing_column',
      sheet: 'professionals',
      row: 1,
      column: 'current_role',
    }));
  });

  it('detects semantic duplicate achievements even when their sequences differ', () => {
    const rows = validRows();
    rows.achievements.push({ ...achievement('P100'), sequence: 2 });

    const result = parseCanonicalWorkbookRows(rows);

    expect(result.can_apply).toBe(false);
    expect(result.records).toHaveLength(0);
    expect(result.issues).toContainEqual(expect.objectContaining({
      code: 'duplicate_achievement',
      sheet: 'achievements',
      row: 3,
      professional_key: 'P100',
    }));
  });

  it('rejects an invalid professional group without dropping unrelated valid groups', () => {
    const rows = validRows();
    rows.professionals.push(profile('P101'));
    rows.education.push(primaryEducation('P101'));
    rows.experiences.push(experience('P101', 1, { industry: 'not_a_real_industry' }));

    const result = parseCanonicalWorkbookRows(rows);

    expect(result.can_apply).toBe(false);
    expect(result.records.map((record) => record.profile.professional_key)).toEqual(['P100']);
    expect(result.summary.professionals).toMatchObject({
      received: 2,
      accepted: 1,
      rejected: 1,
    });
    expect(result.issues).toContainEqual(expect.objectContaining({
      code: 'invalid_cell',
      sheet: 'experiences',
      column: 'industry',
      professional_key: 'P101',
    }));
  });

  it('classifies unchanged and updated records when an existing dry-run baseline is supplied', () => {
    const first = parseCanonicalWorkbookRows(validRows());
    const unchanged = parseCanonicalWorkbookRows(validRows(), {
      existing_records: first.records,
    });
    const changedRows = validRows();
    changedRows.professionals[0]!.path_summary = 'Changed';
    const updated = parseCanonicalWorkbookRows(changedRows, {
      existing_records: first.records,
    });

    expect(unchanged.summary.professionals).toMatchObject({
      inserted: 0,
      updated: 0,
      unchanged: 1,
    });
    expect(updated.summary.professionals).toMatchObject({
      inserted: 0,
      updated: 1,
      unchanged: 0,
    });
  });

  it('does not truncate a 10,000-professional canonical batch', () => {
    const count = 10_000;
    const professionals = Array.from({ length: count }, (_, index) => {
      const key = `P${index + 100}`;
      return profile(key);
    });
    const education = professionals.map((row) => primaryEducation(String(row.professional_key)));

    const result = parseCanonicalWorkbookRows({
      professionals,
      education,
      experiences: [],
      achievements: [],
    });

    expect(result.can_apply).toBe(true);
    expect(result.records).toHaveLength(count);
    expect(result.staging_rows).toHaveLength(count * 2);
    expect(result.summary.professionals).toMatchObject({
      received: count,
      accepted: count,
      inserted: count,
      ready: count,
    });
  }, 10_000);
});

describe('legacy flat-row converter', () => {
  const legacyRow: RawWorkbookRow = {
    id: 'P100',
    full_name_internal: 'Legacy Person',
    linkedin_url_internal: 'linkedin.com/in/legacy-person',
    current_role: 'ib_analyst',
    current_firm: 'Bank',
    current_firm_tier: 'bb',
    current_geography: 'sydney',
    current_role_start_year: 2024,
    years_to_current_role: 2,
    university: 'UNSW',
    university_tier: 'go8_top',
    degree: 'Bachelor of Commerce',
    degree_type: 'bachelor',
    majors: 'Finance',
    wam_band: 'hd',
    graduation_year: 2022,
    has_honours: false,
    has_masters_or_second_degree: false,
    high_school: null,
    high_school_type: 'unknown',
    atar_band: 'unknown',
    exp1_type: 'internship',
    exp1_firm: 'Bank',
    exp1_firm_tier: 'bb',
    exp1_industry: 'capital_markets',
    exp1_role_function: 'sales_trading',
    exp1_role_relevance: 5,
    exp1_year: 2021,
    exp1_duration_months: null,
    exp1_how_obtained: 'online_application',
    exp1_converted_to_ft: 'NA',
    exp5_type: 'part_time',
    exp5_firm: 'Small Firm',
    exp5_firm_tier: 'other',
    exp5_industry: 'other',
    exp5_role_function: 'other',
    exp5_role_relevance: 2,
    exp5_year: 2020,
    exp5_duration_months: 6,
    exp5_how_obtained: 'cold_email',
    exp5_converted_to_ft: false,
    signals: 'deans_list, wam_hd',
    path_summary: null,
    data_source: 'linkedin',
    data_confidence: 'medium',
  };

  it('expands populated exp1-exp5 slots and retains null unknown facts', () => {
    const converted = convertLegacyFlatRows([legacyRow]);
    expect(converted.experiences).toHaveLength(2);
    expect(converted.experiences.map((row) => row.sequence)).toEqual([1, 2]);

    const result = parseLegacyFlatProfessionalRows([legacyRow]);

    expect(result.can_apply).toBe(true);
    expect(result.records[0]!.experiences[0]).toMatchObject({
      experience_type: 'summer_internship',
      industry: 'global_markets',
      duration_months: null,
      converted_to_full_time: null,
    });
    expect(result.records[0]!.achievements).toEqual([
      expect.objectContaining({ tag: 'deans_list', source: 'manual' }),
      expect.objectContaining({ tag: 'wam_hd', source: 'derived' }),
    ]);
  });
});
