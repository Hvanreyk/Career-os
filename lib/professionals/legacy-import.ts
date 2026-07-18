import {
  AUTO_DERIVED_SIGNAL_VALUES,
} from '../career-compass/taxonomy';
import type {
  CanonicalWorkbookRows,
  ProfessionalImportBatch,
  ProfessionalImportParseOptions,
  RawWorkbookRow,
} from './import-types';
import { parseCanonicalWorkbookRows } from './importer';

function isBlank(value: unknown): boolean {
  return value === null
    || value === undefined
    || (typeof value === 'string' && value.trim() === '');
}

function legacySignals(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map(String).map((item) => item.trim()).filter(Boolean);
  }
  if (isBlank(value)) return [];
  return String(value).split(',').map((item) => item.trim()).filter(Boolean);
}

function hasLegacyExperience(row: RawWorkbookRow, slot: number): boolean {
  return [
    'type',
    'firm',
    'firm_tier',
    'industry',
    'role_function',
    'role_relevance',
    'year',
    'duration_months',
    'how_obtained',
    'converted_to_ft',
  ].some((field) => !isBlank(row[`exp${slot}_${field}`]));
}

/**
 * Converts the temporary exp1-exp5 flat format into the canonical multi-sheet
 * format. This intentionally performs no validation; callers receive the same
 * row/column diagnostics as a native workbook by passing the result to
 * parseCanonicalWorkbookRows.
 */
export function convertLegacyFlatRows(
  legacyRows: readonly RawWorkbookRow[],
): CanonicalWorkbookRows {
  const canonical: CanonicalWorkbookRows = {
    professionals: [],
    education: [],
    experiences: [],
    achievements: [],
  };

  for (const row of legacyRows) {
    const professionalKey = row.id;
    canonical.professionals.push({
      professional_key: professionalKey,
      full_name_internal: row.full_name_internal,
      linkedin_url_internal: row.linkedin_url_internal,
      current_role: row.current_role,
      current_firm: row.current_firm,
      current_firm_tier: row.current_firm_tier,
      current_geography: row.current_geography,
      current_role_start_year: row.current_role_start_year,
      years_to_current_role: row.years_to_current_role,
      path_summary: row.path_summary,
      data_source: row.data_source,
      data_confidence: row.data_confidence,
      lifecycle_status: 'draft',
    });

    canonical.education.push({
      professional_key: professionalKey,
      sequence: 1,
      is_primary: true,
      education_level: 'higher_education',
      institution: row.university,
      institution_tier: row.university_tier,
      degree_type: row.degree_type,
      degree_name: row.degree,
      majors: row.majors,
      graduation_year: row.graduation_year,
      date_precision: isBlank(row.graduation_year) ? 'unknown' : 'year',
      wam_band: row.wam_band,
      has_honours: row.has_honours,
      has_masters_or_second_degree: row.has_masters_or_second_degree,
    });

    const hasHighSchool = !isBlank(row.high_school)
      || (!isBlank(row.high_school_type) && row.high_school_type !== 'unknown')
      || (!isBlank(row.atar_band) && row.atar_band !== 'unknown');
    if (hasHighSchool) {
      canonical.education.push({
        professional_key: professionalKey,
        sequence: 2,
        is_primary: false,
        education_level: 'high_school',
        institution: row.high_school,
        date_precision: 'unknown',
        high_school_type: row.high_school_type,
        atar_band: row.atar_band,
      });
    }

    let experienceSequence = 0;
    for (let slot = 1; slot <= 5; slot += 1) {
      if (!hasLegacyExperience(row, slot)) continue;
      experienceSequence += 1;
      canonical.experiences.push({
        professional_key: professionalKey,
        sequence: experienceSequence,
        experience_type: row[`exp${slot}_type`],
        organization: row[`exp${slot}_firm`],
        firm_tier: row[`exp${slot}_firm_tier`],
        industry: row[`exp${slot}_industry`],
        role_function: row[`exp${slot}_role_function`],
        role_relevance: row[`exp${slot}_role_relevance`],
        year: row[`exp${slot}_year`],
        date_precision: 'year',
        duration_months: row[`exp${slot}_duration_months`],
        acquisition_method: row[`exp${slot}_how_obtained`],
        converted_to_full_time: row[`exp${slot}_converted_to_ft`],
      });
    }

    legacySignals(row.signals).forEach((tag, index) => {
      canonical.achievements.push({
        professional_key: professionalKey,
        sequence: index + 1,
        tag,
        effective_year: null,
        date_precision: 'unknown',
        source: (AUTO_DERIVED_SIGNAL_VALUES as readonly string[]).includes(tag)
          ? 'derived'
          : 'manual',
      });
    });
  }

  return canonical;
}

export function parseLegacyFlatProfessionalRows(
  legacyRows: readonly RawWorkbookRow[],
  options: ProfessionalImportParseOptions = {},
): ProfessionalImportBatch {
  return parseCanonicalWorkbookRows(convertLegacyFlatRows(legacyRows), options);
}
