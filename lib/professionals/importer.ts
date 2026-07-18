import { z } from 'zod';
import * as XLSX from 'xlsx';

import {
  deriveRelevance,
  deriveRoleFunction,
  deriveTransitionType,
  ProfessionalAcquisitionMethodSchema,
  ProfessionalExperienceTypeSchema,
  ProfessionalFirmTierSchema,
  ProfessionalIndustrySchema,
  toCareerCompassExperienceType,
  toCareerCompassIndustry,
  type ProfessionalAcquisitionMethod,
  type ProfessionalExperienceType,
  type ProfessionalIndustry,
} from '../career-compass/taxonomy';
import {
  ProfessionalImportAchievementSchema,
  ProfessionalImportEducationSchema,
  ProfessionalImportExperienceSchema,
  ProfessionalImportProfileSchema,
  PROFESSIONAL_WORKBOOK_SHEETS,
  type CanonicalWorkbookRows,
  type DatePrecision,
  type ProfessionalImportAchievement,
  type ProfessionalImportBatch,
  type ProfessionalImportEducation,
  type ProfessionalImportExperience,
  type ProfessionalImportIssue,
  type ProfessionalImportParseOptions,
  type ProfessionalImportProfile,
  type ProfessionalImportRecord,
  type ProfessionalImportStagingRow,
  type ProfessionalWorkbookSheet,
  type RawWorkbookRow,
} from './import-types';

interface WorkbookRowsWithHeaders {
  rows: CanonicalWorkbookRows;
  headers: Record<ProfessionalWorkbookSheet, string[]>;
  missingSheets: ProfessionalWorkbookSheet[];
}

interface ParsedRow<T> {
  sourceRow: number;
  value: T;
}

const REQUIRED_COLUMNS: Record<ProfessionalWorkbookSheet, readonly string[]> = {
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

class ImportCellError extends Error {
  constructor(
    readonly column: string,
    message: string,
  ) {
    super(message);
  }
}

function isBlank(value: unknown): boolean {
  return value === null
    || value === undefined
    || (typeof value === 'string' && value.trim() === '');
}

function normalizeHeader(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function normalizeProfessionalText(value: unknown): string | null {
  if (isBlank(value)) return null;
  return String(value).trim().replace(/\s+/g, ' ');
}

export function normalizeControlledIdentifier(value: unknown): string | null {
  const text = normalizeProfessionalText(value);
  if (text === null) return null;
  return text
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function normalizeLinkedInUrl(value: unknown): string | null {
  const text = normalizeProfessionalText(value);
  if (text === null) return null;

  let parsed: URL;
  try {
    parsed = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
  } catch {
    throw new ImportCellError('linkedin_url_internal', 'must be a valid LinkedIn URL');
  }

  const hostname = parsed.hostname.toLowerCase().replace(/^(?:www|m)\./, '');
  if (hostname !== 'linkedin.com') {
    throw new ImportCellError('linkedin_url_internal', 'must use the linkedin.com domain');
  }

  const pathname = parsed.pathname
    .replace(/\/+/g, '/')
    .replace(/\/$/, '')
    .toLowerCase();
  if (!pathname || pathname === '/') {
    throw new ImportCellError('linkedin_url_internal', 'must include a LinkedIn profile path');
  }

  return `https://www.linkedin.com${pathname}`;
}

function requiredText(row: RawWorkbookRow, column: string): string {
  const value = normalizeProfessionalText(row[column]);
  if (value === null) throw new ImportCellError(column, 'is required');
  return value;
}

function optionalText(row: RawWorkbookRow, column: string): string | null {
  return normalizeProfessionalText(row[column]);
}

function requiredIdentifier(row: RawWorkbookRow, column: string): string {
  const value = normalizeControlledIdentifier(row[column]);
  if (value === null) throw new ImportCellError(column, 'is required');
  return value;
}

function optionalIdentifier(row: RawWorkbookRow, column: string): string | null {
  return normalizeControlledIdentifier(row[column]);
}

function taxonomyIdentifier<T>(
  row: RawWorkbookRow,
  column: string,
  schema: z.ZodType<T>,
): T {
  const value = requiredIdentifier(row, column);
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw new ImportCellError(
      column,
      `unsupported identifier ${JSON.stringify(value)}; ${parsed.error.issues[0]?.message ?? 'invalid value'}`,
    );
  }
  return parsed.data;
}

function integerCell(
  row: RawWorkbookRow,
  column: string,
  options: { nullable?: boolean } = {},
): number | null {
  const raw = row[column];
  if (isBlank(raw)) {
    if (options.nullable) return null;
    throw new ImportCellError(column, 'is required');
  }
  const value = typeof raw === 'number' ? raw : Number(String(raw).trim());
  if (!Number.isInteger(value)) {
    throw new ImportCellError(column, `must be an integer; received ${JSON.stringify(raw)}`);
  }
  return value;
}

function booleanCell(
  row: RawWorkbookRow,
  column: string,
  options: { nullable?: boolean } = {},
): boolean | null {
  const raw = row[column];
  if (isBlank(raw)) {
    if (options.nullable) return null;
    throw new ImportCellError(column, 'is required');
  }
  if (typeof raw === 'boolean') return raw;
  const value = String(raw).trim().toLowerCase();
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new ImportCellError(column, 'must be TRUE or FALSE');
}

function convertedCell(row: RawWorkbookRow, column: string): boolean | null {
  const raw = row[column];
  if (isBlank(raw) || String(raw).trim().toUpperCase() === 'NA') return null;
  return booleanCell(row, column, { nullable: true });
}

function dateCell(row: RawWorkbookRow, column: string): string | null {
  const raw = row[column];
  if (isBlank(raw)) return null;
  if (raw instanceof Date && !Number.isNaN(raw.valueOf())) {
    return raw.toISOString().slice(0, 10);
  }
  const value = String(raw).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
    throw new ImportCellError(column, 'must be an ISO date in YYYY-MM-DD format');
  }
  return value;
}

function datePrecision(
  row: RawWorkbookRow,
  hasDate: boolean,
  defaultWhenKnown: DatePrecision,
): string {
  const value = optionalIdentifier(row, 'date_precision');
  return value ?? (hasDate ? defaultWhenKnown : 'unknown');
}

function normalizeAcquisitionMethod(row: RawWorkbookRow): string {
  const raw = requiredText(row, 'acquisition_method');
  if (raw.toUpperCase() === 'NA') return 'NA';
  return normalizeControlledIdentifier(raw) ?? 'unknown';
}

function rowKey(row: RawWorkbookRow): string | null {
  return normalizeProfessionalText(row.professional_key)?.toUpperCase() ?? null;
}

function profileInput(row: RawWorkbookRow): unknown {
  return {
    professional_key: requiredText(row, 'professional_key').toUpperCase(),
    full_name_internal: requiredText(row, 'full_name_internal'),
    linkedin_url_internal: normalizeLinkedInUrl(row.linkedin_url_internal),
    current_role: requiredIdentifier(row, 'current_role'),
    current_firm: requiredText(row, 'current_firm'),
    current_firm_tier: requiredIdentifier(row, 'current_firm_tier'),
    current_geography: requiredIdentifier(row, 'current_geography'),
    current_role_start_year: integerCell(row, 'current_role_start_year'),
    years_to_current_role: integerCell(row, 'years_to_current_role'),
    path_summary: optionalText(row, 'path_summary'),
    data_source: requiredIdentifier(row, 'data_source'),
    data_confidence: requiredIdentifier(row, 'data_confidence'),
    requested_lifecycle_status: optionalIdentifier(row, 'lifecycle_status') ?? 'draft',
    exclusion_reason: optionalText(row, 'exclusion_reason'),
  };
}

function educationInput(row: RawWorkbookRow): unknown {
  const startedOn = dateCell(row, 'started_on');
  const completedOn = dateCell(row, 'completed_on');
  return {
    professional_key: requiredText(row, 'professional_key').toUpperCase(),
    sequence: integerCell(row, 'sequence'),
    is_primary: booleanCell(row, 'is_primary'),
    education_level: requiredIdentifier(row, 'education_level'),
    institution: optionalText(row, 'institution'),
    institution_tier: optionalIdentifier(row, 'institution_tier'),
    degree_type: optionalIdentifier(row, 'degree_type'),
    degree_name: optionalText(row, 'degree_name'),
    majors: optionalText(row, 'majors'),
    graduation_year: integerCell(row, 'graduation_year', { nullable: true }),
    started_on: startedOn,
    completed_on: completedOn,
    date_precision: datePrecision(row, Boolean(startedOn || completedOn), 'day'),
    wam_band: optionalIdentifier(row, 'wam_band'),
    has_honours: booleanCell(row, 'has_honours', { nullable: true }),
    has_masters_or_second_degree: booleanCell(
      row,
      'has_masters_or_second_degree',
      { nullable: true },
    ),
    high_school_type: optionalIdentifier(row, 'high_school_type'),
    atar_band: optionalIdentifier(row, 'atar_band'),
  };
}

function experienceInput(row: RawWorkbookRow): unknown {
  const rawType = taxonomyIdentifier(
    row,
    'experience_type',
    ProfessionalExperienceTypeSchema,
  ) as ProfessionalExperienceType;
  const rawIndustry = taxonomyIdentifier(
    row,
    'industry',
    ProfessionalIndustrySchema,
  ) as ProfessionalIndustry;
  const canonicalIndustry = toCareerCompassIndustry(rawIndustry) ?? rawIndustry;
  const firmTier = taxonomyIdentifier(row, 'firm_tier', ProfessionalFirmTierSchema);
  const acquisitionMethodRaw = normalizeAcquisitionMethod(row);
  const acquisitionResult = ProfessionalAcquisitionMethodSchema.safeParse(acquisitionMethodRaw);
  if (!acquisitionResult.success) {
    throw new ImportCellError(
      'acquisition_method',
      `unsupported identifier ${JSON.stringify(acquisitionMethodRaw)}`,
    );
  }
  const acquisitionMethod = acquisitionResult.data as ProfessionalAcquisitionMethod;
  const startedOn = dateCell(row, 'started_on');
  const endedOn = dateCell(row, 'ended_on');
  const explicitTransition = optionalIdentifier(row, 'transition_type');

  return {
    professional_key: requiredText(row, 'professional_key').toUpperCase(),
    sequence: integerCell(row, 'sequence'),
    experience_type: toCareerCompassExperienceType(rawType),
    organization: requiredText(row, 'organization'),
    firm_tier: firmTier,
    industry: canonicalIndustry,
    role_function: optionalIdentifier(row, 'role_function')
      ?? deriveRoleFunction(canonicalIndustry),
    role_relevance: integerCell(row, 'role_relevance', { nullable: true })
      ?? deriveRelevance(
        firmTier,
        canonicalIndustry,
      ),
    year: integerCell(row, 'year'),
    started_on: startedOn,
    ended_on: endedOn,
    date_precision: datePrecision(row, Boolean(startedOn || endedOn), 'day'),
    duration_months: integerCell(row, 'duration_months', { nullable: true }),
    acquisition_method: acquisitionMethod,
    transition_type: explicitTransition ?? deriveTransitionType(acquisitionMethod),
    converted_to_full_time: convertedCell(row, 'converted_to_full_time'),
  };
}

function achievementInput(row: RawWorkbookRow): unknown {
  const effectiveYear = integerCell(row, 'effective_year', { nullable: true });
  return {
    professional_key: requiredText(row, 'professional_key').toUpperCase(),
    sequence: integerCell(row, 'sequence'),
    tag: requiredIdentifier(row, 'tag'),
    effective_year: effectiveYear,
    date_precision: datePrecision(row, effectiveYear !== null, 'year'),
    source: optionalIdentifier(row, 'source') ?? 'manual',
  };
}

function addIssue(
  issues: ProfessionalImportIssue[],
  issue: ProfessionalImportIssue,
): void {
  issues.push(issue);
}

function parseSheetRows<T>(
  sheet: ProfessionalWorkbookSheet,
  rows: readonly RawWorkbookRow[],
  schema: z.ZodType<T>,
  normalize: (row: RawWorkbookRow) => unknown,
  issues: ProfessionalImportIssue[],
  rejectedKeys: Set<string>,
): ParsedRow<T>[] {
  const parsed: ParsedRow<T>[] = [];
  rows.forEach((row, index) => {
    const sourceRow = typeof row.__source_row === 'number'
      && Number.isInteger(row.__source_row)
      ? row.__source_row
      : index + 2;
    const professionalKey = rowKey(row);
    try {
      const result = schema.safeParse(normalize(row));
      if (!result.success) {
        for (const problem of result.error.issues) {
          addIssue(issues, {
            severity: 'error',
            code: 'invalid_cell',
            sheet,
            row: sourceRow,
            column: problem.path.length > 0 ? String(problem.path[0]) : null,
            professional_key: professionalKey,
            message: problem.message,
          });
        }
        if (professionalKey) rejectedKeys.add(professionalKey);
        return;
      }
      parsed.push({ sourceRow, value: result.data });
    } catch (error) {
      const cellError = error instanceof ImportCellError ? error : null;
      addIssue(issues, {
        severity: 'error',
        code: 'invalid_cell',
        sheet,
        row: sourceRow,
        column: cellError?.column ?? null,
        professional_key: professionalKey,
        message: error instanceof Error ? error.message : String(error),
      });
      if (professionalKey) rejectedKeys.add(professionalKey);
    }
  });
  return parsed;
}

function checkDuplicateSequences<T extends { professional_key: string; sequence: number }>(
  sheet: 'education' | 'experiences' | 'achievements',
  rows: readonly ParsedRow<T>[],
  issues: ProfessionalImportIssue[],
  rejectedKeys: Set<string>,
): void {
  const seen = new Map<string, number>();
  for (const row of rows) {
    const key = `${row.value.professional_key}\u0000${row.value.sequence}`;
    const previous = seen.get(key);
    if (previous !== undefined) {
      addIssue(issues, {
        severity: 'error',
        code: 'duplicate_sequence',
        sheet,
        row: row.sourceRow,
        column: 'sequence',
        professional_key: row.value.professional_key,
        message: `duplicates sequence ${row.value.sequence} from row ${previous}`,
      });
      rejectedKeys.add(row.value.professional_key);
    } else {
      seen.set(key, row.sourceRow);
    }
  }
}

function checkDuplicateAchievements(
  rows: readonly ParsedRow<ProfessionalImportAchievement>[],
  issues: ProfessionalImportIssue[],
  rejectedKeys: Set<string>,
): void {
  const seen = new Map<string, number>();
  for (const row of rows) {
    const key = [
      row.value.professional_key,
      row.value.tag,
      row.value.effective_year ?? 'unknown',
    ].join('\u0000');
    const previous = seen.get(key);
    if (previous !== undefined) {
      addIssue(issues, {
        severity: 'error',
        code: 'duplicate_achievement',
        sheet: 'achievements',
        row: row.sourceRow,
        column: 'tag',
        professional_key: row.value.professional_key,
        message: `duplicates the same tag/effective year from row ${previous}`,
      });
      rejectedKeys.add(row.value.professional_key);
    } else {
      seen.set(key, row.sourceRow);
    }
  }
}

function groupRowsByProfessional<T extends { professional_key: string }>(
  rows: readonly ParsedRow<T>[],
): Map<string, ParsedRow<T>[]> {
  const grouped = new Map<string, ParsedRow<T>[]>();
  for (const row of rows) {
    const existing = grouped.get(row.value.professional_key);
    if (existing) existing.push(row);
    else grouped.set(row.value.professional_key, [row]);
  }
  return grouped;
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, child]) => `${JSON.stringify(key)}:${stableJson(child)}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

export function professionalImportFingerprint(record: ProfessionalImportRecord): string {
  return stableJson(record);
}

function buildReadiness(
  profile: ProfessionalImportProfile,
  education: readonly ProfessionalImportEducation[],
  experiences: readonly ProfessionalImportExperience[],
): Pick<ProfessionalImportRecord, 'lifecycle_status' | 'readiness_blockers'> {
  if (profile.requested_lifecycle_status === 'excluded') {
    return { lifecycle_status: 'excluded', readiness_blockers: [] };
  }

  const blockers: string[] = [];
  const primaryHigherEducation = education.filter(
    (row) => row.education_level === 'higher_education' && row.is_primary,
  );
  if (primaryHigherEducation.length !== 1) {
    blockers.push(
      `expected exactly one primary higher-education row; found ${primaryHigherEducation.length}`,
    );
  }
  if (profile.current_firm_tier === 'elite_boutique_and_mm') {
    blockers.push('current firm tier elite_boutique_and_mm must be resolved');
  }
  const unresolvedExperienceSequences = experiences
    .filter((row) => row.firm_tier === 'elite_boutique_and_mm')
    .map((row) => row.sequence);
  if (unresolvedExperienceSequences.length > 0) {
    blockers.push(
      `experience firm tier elite_boutique_and_mm must be resolved at sequences ${unresolvedExperienceSequences.join(', ')}`,
    );
  }

  return {
    lifecycle_status: blockers.length === 0 ? 'ready' : 'draft',
    readiness_blockers: blockers,
  };
}

function stagingRowsForRecord(
  record: ProfessionalImportRecord,
  sourceRows: {
    profile: number;
    education: ReadonlyMap<number, number>;
    experiences: ReadonlyMap<number, number>;
    achievements: ReadonlyMap<number, number>;
  },
): ProfessionalImportStagingRow[] {
  const professionalId = record.profile.professional_key;
  const rows: ProfessionalImportStagingRow[] = [{
    sheet_name: 'professionals',
    source_row: sourceRows.profile,
    professional_key: professionalId,
    payload: {
      professional_id: professionalId,
      current_role: record.profile.current_role,
      current_firm: record.profile.current_firm,
      current_firm_tier: record.profile.current_firm_tier,
      current_geography: record.profile.current_geography,
      current_role_start_year: record.profile.current_role_start_year,
      years_to_current_role: record.profile.years_to_current_role,
      path_summary: record.profile.path_summary,
      data_source: record.profile.data_source,
      data_confidence: record.profile.data_confidence,
      full_name_internal: record.profile.full_name_internal,
      linkedin_url_internal: record.profile.linkedin_url_internal,
      requested_lifecycle_status: record.profile.requested_lifecycle_status,
      exclusion_reason: record.profile.exclusion_reason,
    },
  }];

  for (const education of record.education) {
    rows.push({
      sheet_name: 'education',
      source_row: sourceRows.education.get(education.sequence) ?? 0,
      professional_key: professionalId,
      payload: {
        professional_id: professionalId,
        sequence: education.sequence,
        is_primary: education.is_primary,
        education_level: education.education_level,
        institution_name: education.institution,
        institution_tier: education.institution_tier,
        degree_type: education.degree_type,
        degree: education.degree_name,
        majors: education.majors,
        graduation_year: education.graduation_year,
        started_on: education.started_on,
        completed_on: education.completed_on,
        date_precision: education.date_precision,
        wam_band: education.wam_band,
        has_honours: education.has_honours,
        has_masters_or_second_degree: education.has_masters_or_second_degree,
        high_school_type: education.high_school_type,
        atar_band: education.atar_band,
      },
    });
  }

  for (const experience of record.experiences) {
    rows.push({
      sheet_name: 'experiences',
      source_row: sourceRows.experiences.get(experience.sequence) ?? 0,
      professional_key: professionalId,
      payload: {
        professional_id: professionalId,
        sequence: experience.sequence,
        type: experience.experience_type,
        firm: experience.organization,
        firm_tier: experience.firm_tier,
        industry: experience.industry,
        role_function: experience.role_function,
        role_relevance: experience.role_relevance,
        year: experience.year,
        started_on: experience.started_on,
        ended_on: experience.ended_on,
        date_precision: experience.date_precision,
        duration_months: experience.duration_months,
        how_obtained: experience.acquisition_method,
        transition_type: experience.transition_type,
        converted_to_ft: experience.converted_to_full_time,
      },
    });
  }

  for (const achievement of record.achievements) {
    rows.push({
      sheet_name: 'achievements',
      source_row: sourceRows.achievements.get(achievement.sequence) ?? 0,
      professional_key: professionalId,
      payload: {
        professional_id: professionalId,
        sequence: achievement.sequence,
        tag: achievement.tag,
        achievement_type: achievement.source === 'derived' ? 'derived_signal' : 'signal',
        effective_year: achievement.effective_year,
        date_precision: achievement.date_precision,
      },
    });
  }

  return rows;
}

function headerIssues(
  headers: Record<ProfessionalWorkbookSheet, string[]>,
  missingSheets: readonly ProfessionalWorkbookSheet[],
): ProfessionalImportIssue[] {
  const issues: ProfessionalImportIssue[] = missingSheets.map((sheet) => ({
    severity: 'error',
    code: 'missing_sheet',
    sheet,
    row: null,
    column: null,
    professional_key: null,
    message: `required sheet '${sheet}' is missing`,
  }));

  for (const sheet of PROFESSIONAL_WORKBOOK_SHEETS) {
    if (missingSheets.includes(sheet)) continue;
    const present = new Set(headers[sheet]);
    for (const column of REQUIRED_COLUMNS[sheet]) {
      if (!present.has(column)) {
        issues.push({
          severity: 'error',
          code: 'missing_column',
          sheet,
          row: 1,
          column,
          professional_key: null,
          message: `required column '${column}' is missing from sheet '${sheet}'`,
        });
      }
    }
  }
  return issues;
}

function derivedHeaders(rows: CanonicalWorkbookRows): Record<ProfessionalWorkbookSheet, string[]> {
  return Object.fromEntries(PROFESSIONAL_WORKBOOK_SHEETS.map((sheet) => [
    sheet,
    rows[sheet].length === 0
      ? [...REQUIRED_COLUMNS[sheet]]
      : [...new Set(rows[sheet].flatMap((row) => Object.keys(row).map(normalizeHeader)))],
  ])) as Record<ProfessionalWorkbookSheet, string[]>;
}

export function parseCanonicalWorkbookRows(
  rawRows: CanonicalWorkbookRows,
  options: ProfessionalImportParseOptions = {},
  workbookMetadata?: Pick<WorkbookRowsWithHeaders, 'headers' | 'missingSheets'>,
): ProfessionalImportBatch {
  const rows = Object.fromEntries(PROFESSIONAL_WORKBOOK_SHEETS.map((sheet) => [
    sheet,
    rawRows[sheet].map((raw) => Object.fromEntries(
      Object.entries(raw).map(([key, value]) => [normalizeHeader(key), value]),
    )),
  ])) as unknown as CanonicalWorkbookRows;
  const headers = workbookMetadata?.headers ?? derivedHeaders(rawRows);
  const missingSheets = workbookMetadata?.missingSheets ?? [];
  const issues = headerIssues(headers, missingSheets);
  const rejectedKeys = new Set<string>();

  const profiles = parseSheetRows(
    'professionals',
    rows.professionals,
    ProfessionalImportProfileSchema,
    profileInput,
    issues,
    rejectedKeys,
  );
  const education = parseSheetRows(
    'education',
    rows.education,
    ProfessionalImportEducationSchema,
    educationInput,
    issues,
    rejectedKeys,
  );
  const experiences = parseSheetRows(
    'experiences',
    rows.experiences,
    ProfessionalImportExperienceSchema,
    experienceInput,
    issues,
    rejectedKeys,
  );
  const achievements = parseSheetRows(
    'achievements',
    rows.achievements,
    ProfessionalImportAchievementSchema,
    achievementInput,
    issues,
    rejectedKeys,
  );

  const profileByKey = new Map<string, ParsedRow<ProfessionalImportProfile>>();
  for (const profile of profiles) {
    const previous = profileByKey.get(profile.value.professional_key);
    if (previous) {
      addIssue(issues, {
        severity: 'error',
        code: 'duplicate_professional',
        sheet: 'professionals',
        row: profile.sourceRow,
        column: 'professional_key',
        professional_key: profile.value.professional_key,
        message: `duplicates professional_key from row ${previous.sourceRow}`,
      });
      rejectedKeys.add(profile.value.professional_key);
    } else {
      profileByKey.set(profile.value.professional_key, profile);
    }
  }

  const linkedinByUrl = new Map<string, ParsedRow<ProfessionalImportProfile>>();
  for (const profile of profiles) {
    const url = profile.value.linkedin_url_internal;
    if (!url) continue;
    const previous = linkedinByUrl.get(url);
    if (previous && previous.value.professional_key !== profile.value.professional_key) {
      addIssue(issues, {
        severity: 'error',
        code: 'duplicate_linkedin',
        sheet: 'professionals',
        row: profile.sourceRow,
        column: 'linkedin_url_internal',
        professional_key: profile.value.professional_key,
        message: `duplicates normalized LinkedIn URL from row ${previous.sourceRow}`,
      });
      rejectedKeys.add(profile.value.professional_key);
      rejectedKeys.add(previous.value.professional_key);
    } else {
      linkedinByUrl.set(url, profile);
    }
  }

  checkDuplicateSequences('education', education, issues, rejectedKeys);
  checkDuplicateSequences('experiences', experiences, issues, rejectedKeys);
  checkDuplicateSequences('achievements', achievements, issues, rejectedKeys);
  checkDuplicateAchievements(achievements, issues, rejectedKeys);

  for (const [sheet, childRows] of [
    ['education', education],
    ['experiences', experiences],
    ['achievements', achievements],
  ] as const) {
    for (const child of childRows) {
      if (!profileByKey.has(child.value.professional_key)) {
        addIssue(issues, {
          severity: 'error',
          code: 'orphan_child',
          sheet,
          row: child.sourceRow,
          column: 'professional_key',
          professional_key: child.value.professional_key,
          message: 'references a professional_key that is not present in the professionals sheet',
        });
      }
    }
  }

  const educationByProfessional = groupRowsByProfessional(education);
  const experiencesByProfessional = groupRowsByProfessional(experiences);
  const achievementsByProfessional = groupRowsByProfessional(achievements);
  const records: ProfessionalImportRecord[] = [];
  const stagingRows: ProfessionalImportStagingRow[] = [];
  for (const [key, profile] of [...profileByKey].sort(([a], [b]) => a.localeCompare(b))) {
    if (rejectedKeys.has(key)) continue;
    const professionalEducation = [...(educationByProfessional.get(key) ?? [])]
      .sort((a, b) => a.value.sequence - b.value.sequence);
    const professionalExperiences = [...(experiencesByProfessional.get(key) ?? [])]
      .sort((a, b) => a.value.sequence - b.value.sequence);
    const professionalAchievements = [...(achievementsByProfessional.get(key) ?? [])]
      .sort((a, b) => a.value.sequence - b.value.sequence);
    const readiness = buildReadiness(
      profile.value,
      professionalEducation.map((row) => row.value),
      professionalExperiences.map((row) => row.value),
    );
    const record: ProfessionalImportRecord = {
      profile: profile.value,
      education: professionalEducation.map((row) => row.value),
      experiences: professionalExperiences.map((row) => row.value),
      achievements: professionalAchievements.map((row) => row.value),
      ...readiness,
    };
    records.push(record);
    stagingRows.push(...stagingRowsForRecord(record, {
      profile: profile.sourceRow,
      education: new Map(professionalEducation.map((row) => [row.value.sequence, row.sourceRow])),
      experiences: new Map(professionalExperiences.map((row) => [row.value.sequence, row.sourceRow])),
      achievements: new Map(
        professionalAchievements.map((row) => [row.value.sequence, row.sourceRow]),
      ),
    }));
  }

  if (rows.professionals.length === 0) {
    addIssue(issues, {
      severity: 'error',
      code: 'empty_batch',
      sheet: 'professionals',
      row: null,
      column: null,
      professional_key: null,
      message: 'the workbook contains no professional rows',
    });
  }

  const existingByKey = new Map(
    (options.existing_records ?? []).map((record) => [
      record.profile.professional_key,
      professionalImportFingerprint(record),
    ]),
  );
  let inserted = 0;
  let updated = 0;
  let unchanged = 0;
  for (const record of records) {
    const previous = existingByKey.get(record.profile.professional_key);
    if (previous === undefined) inserted += 1;
    else if (previous === professionalImportFingerprint(record)) unchanged += 1;
    else updated += 1;
  }

  const acceptedBySheet = Object.fromEntries(PROFESSIONAL_WORKBOOK_SHEETS.map((sheet) => [
    sheet,
    stagingRows.filter((row) => row.sheet_name === sheet).length,
  ])) as Record<ProfessionalWorkbookSheet, number>;
  const receivedBySheet: Record<ProfessionalWorkbookSheet, number> = {
    professionals: rows.professionals.length,
    education: rows.education.length,
    experiences: rows.experiences.length,
    achievements: rows.achievements.length,
  };
  const errorCount = issues.filter((issue) => issue.severity === 'error').length;
  const warningCount = issues.length - errorCount;

  return {
    records,
    staging_rows: stagingRows,
    issues,
    summary: {
      comparison_basis: options.existing_records === undefined
        ? 'assume_new'
        : 'existing_records',
      professionals: {
        received: rows.professionals.length,
        accepted: records.length,
        rejected: rows.professionals.length - records.length,
        inserted,
        updated,
        unchanged,
        ready: records.filter((record) => record.lifecycle_status === 'ready').length,
        draft: records.filter((record) => record.lifecycle_status === 'draft').length,
        excluded: records.filter((record) => record.lifecycle_status === 'excluded').length,
      },
      sheets: Object.fromEntries(PROFESSIONAL_WORKBOOK_SHEETS.map((sheet) => [
        sheet,
        {
          received: receivedBySheet[sheet],
          accepted: acceptedBySheet[sheet],
          rejected: receivedBySheet[sheet] - acceptedBySheet[sheet],
        },
      ])) as ProfessionalImportBatch['summary']['sheets'],
      errors: errorCount,
      warnings: warningCount,
    },
    can_apply: errorCount === 0 && records.length > 0,
  };
}

function workbookRows(input: XLSX.WorkBook | ArrayBuffer | Uint8Array): WorkbookRowsWithHeaders {
  const workbook = 'SheetNames' in input
    ? input
    : XLSX.read(input, { type: 'array', cellDates: false });
  const missingSheets: ProfessionalWorkbookSheet[] = [];
  const rows: CanonicalWorkbookRows = {
    professionals: [],
    education: [],
    experiences: [],
    achievements: [],
  };
  const headers: Record<ProfessionalWorkbookSheet, string[]> = {
    professionals: [],
    education: [],
    experiences: [],
    achievements: [],
  };

  for (const sheetName of PROFESSIONAL_WORKBOOK_SHEETS) {
    const actualName = workbook.SheetNames.find(
      (name) => normalizeHeader(name) === sheetName,
    );
    if (!actualName) {
      missingSheets.push(sheetName);
      continue;
    }
    const sheet = workbook.Sheets[actualName];
    if (!sheet) {
      missingSheets.push(sheetName);
      continue;
    }
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      raw: false,
      defval: null,
      blankrows: true,
    });
    const rawHeaders = matrix[0] ?? [];
    headers[sheetName] = rawHeaders.map(normalizeHeader);
    rows[sheetName] = matrix.slice(1)
      .map((values, index) => ({ values, sourceRow: index + 2 }))
      .filter(({ values }) => values.some((value) => !isBlank(value)))
      .map(({ values, sourceRow }) => ({
        ...Object.fromEntries(
          headers[sheetName].map((header, index) => [header, values[index] ?? null]),
        ),
        __source_row: sourceRow,
      }));
  }

  return { rows, headers, missingSheets };
}

export function parseProfessionalWorkbook(
  input: XLSX.WorkBook | ArrayBuffer | Uint8Array,
  options: ProfessionalImportParseOptions = {},
): ProfessionalImportBatch {
  const workbook = workbookRows(input);
  return parseCanonicalWorkbookRows(workbook.rows, options, workbook);
}
