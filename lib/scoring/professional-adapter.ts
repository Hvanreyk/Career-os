import { z } from 'zod';

import {
  ProfessionalSchema,
  type Professional,
} from './types';

const UnknownRecordSchema = z.record(z.unknown());

export interface ProfessionalRowReject {
  rowIndex: number;
  issues: readonly {
    path: string;
    message: string;
  }[];
}

export interface ProfessionalParseResult {
  professionals: Professional[];
  rejects: ProfessionalRowReject[];
}

export class ProfessionalDataError extends Error {
  constructor(
    public readonly source: 'legacy' | 'normalized',
    public readonly rejects: ProfessionalRowReject[],
  ) {
    super(`${source} professional source rejected ${rejects.length} row(s)`);
    this.name = 'ProfessionalDataError';
  }
}

function formatIssues(error: z.ZodError): ProfessionalRowReject['issues'] {
  return error.issues.map((issue) => ({
    path: issue.path.join('.') || '<root>',
    message: issue.message,
  }));
}

function parseSignals(value: unknown): unknown {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}

function parseConvertedToFullTime(value: unknown): unknown {
  if (value === true || value === 'TRUE') return true;
  if (value === false || value === 'FALSE') return false;
  return value;
}

function buildLegacyCandidate(input: unknown): unknown {
  const record = UnknownRecordSchema.parse(input);
  const experiences: Record<string, unknown>[] = [];

  for (const sequence of [1, 2, 3, 4, 5] as const) {
    const type = record[`exp${sequence}_type`];
    if (type === null || type === undefined || type === '') continue;
    experiences.push({
      type,
      firm: record[`exp${sequence}_firm`],
      firm_tier: record[`exp${sequence}_firm_tier`],
      industry: record[`exp${sequence}_industry`],
      role_function: record[`exp${sequence}_role_function`],
      role_relevance: record[`exp${sequence}_role_relevance`],
      year: record[`exp${sequence}_year`],
      duration_months: record[`exp${sequence}_duration_months`],
      how_obtained: record[`exp${sequence}_how_obtained`],
      converted_to_ft: parseConvertedToFullTime(record[`exp${sequence}_converted_to_ft`]),
    });
  }

  return {
    id: record.id,
    current_role: record.current_role,
    current_firm: record.current_firm,
    current_firm_tier: record.current_firm_tier,
    current_geography: record.current_geography,
    current_role_start_year: record.current_role_start_year,
    years_to_current_role: record.years_to_current_role,
    university: record.university,
    university_tier: record.university_tier,
    degree: record.degree,
    degree_type: record.degree_type,
    majors: record.majors,
    wam_band: record.wam_band,
    graduation_year: record.graduation_year,
    has_honours: record.has_honours,
    has_masters_or_second_degree: record.has_masters_or_second_degree,
    high_school: record.high_school,
    high_school_type: record.high_school_type,
    atar_band: record.atar_band,
    experiences,
    signals: parseSignals(record.signals),
    path_summary: record.path_summary,
    data_source: record.data_source,
    data_confidence: record.data_confidence,
  };
}

export const NormalizedProfessionalRowSchema = ProfessionalSchema.extend({
  taxonomy_version: z.string().min(1),
  derivation_version: z.string().min(1),
  feature_version: z.string().min(1),
});
export type NormalizedProfessionalRow = z.infer<typeof NormalizedProfessionalRowSchema>;

function parseRows(
  rows: readonly unknown[],
  source: 'legacy' | 'normalized',
): ProfessionalParseResult {
  const professionals: Professional[] = [];
  const rejects: ProfessionalRowReject[] = [];

  rows.forEach((row, rowIndex) => {
    try {
      const parsed = source === 'legacy'
        ? ProfessionalSchema.safeParse(buildLegacyCandidate(row))
        : NormalizedProfessionalRowSchema.safeParse(row);
      if (!parsed.success) {
        rejects.push({ rowIndex, issues: formatIssues(parsed.error) });
        return;
      }

      const { taxonomy_version: _taxonomy, derivation_version: _derivation,
        feature_version: _feature, ...professional } = source === 'normalized'
        ? parsed.data as NormalizedProfessionalRow
        : { ...parsed.data, taxonomy_version: '', derivation_version: '', feature_version: '' };
      professionals.push(ProfessionalSchema.parse(professional));
    } catch (error) {
      rejects.push({
        rowIndex,
        issues: error instanceof z.ZodError
          ? formatIssues(error)
          : [{ path: '<root>', message: error instanceof Error ? error.message : 'Unknown parse error' }],
      });
    }
  });

  return { professionals, rejects };
}

export function parseLegacyProfessionalRows(rows: readonly unknown[]): ProfessionalParseResult {
  return parseRows(rows, 'legacy');
}

export function parseNormalizedProfessionalRows(rows: readonly unknown[]): ProfessionalParseResult {
  return parseRows(rows, 'normalized');
}

export function parseProfessionalRowsOrThrow(
  rows: readonly unknown[],
  source: 'legacy' | 'normalized',
): Professional[] {
  const result = source === 'legacy'
    ? parseLegacyProfessionalRows(rows)
    : parseNormalizedProfessionalRows(rows);
  if (result.rejects.length > 0) {
    throw new ProfessionalDataError(source, result.rejects);
  }
  if (result.professionals.length === 0) {
    throw new Error(`${source} professional source is empty`);
  }
  return result.professionals;
}
