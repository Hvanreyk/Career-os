/**
 * Loads professionals from Database_v7_clean.xlsx into canonical
 * Professional[] form. Used by unit tests so they don't need a
 * Supabase connection. The production app loads via /lib/db/supabase.ts.
 *
 * Validation reuses the same Zod schema + normalisation rules as the
 * import script — if the spreadsheet is invalid here it would also
 * be rejected at ingest.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as XLSX from 'xlsx';

import {
  ProfessionalRowSchema,
  toCanonicalProfessional,
  type Professional,
  type ProfessionalRow,
} from '../scoring/types';

type RawRow = Record<string, unknown>;

// ----- Cell normalisation (mirrors scripts/import-csv.ts) -----

function isBlank(v: unknown): boolean {
  return v === null || v === undefined || (typeof v === 'string' && v.trim() === '');
}
function asString(v: unknown): string | null {
  if (isBlank(v)) return null;
  return String(v).trim();
}
function asInt(v: unknown): number | null {
  if (isBlank(v)) return null;
  const n = typeof v === 'number' ? v : Number(String(v).trim());
  if (!Number.isFinite(n) || !Number.isInteger(n)) {
    throw new Error(`expected integer, got ${JSON.stringify(v)}`);
  }
  return n;
}
function asBool(v: unknown): boolean {
  if (typeof v === 'boolean') return v;
  if (typeof v === 'string') {
    const s = v.trim().toUpperCase();
    if (s === 'TRUE') return true;
    if (s === 'FALSE') return false;
  }
  throw new Error(`expected TRUE/FALSE, got ${JSON.stringify(v)}`);
}
function asConvertedToFt(v: unknown): boolean | 'NA' {
  if (typeof v === 'string' && v.trim().toUpperCase() === 'NA') return 'NA';
  return asBool(v);
}
function parseSignals(raw: unknown): string[] {
  if (isBlank(raw)) return [];
  return String(raw).split(',').map(s => s.trim()).filter(s => s.length > 0);
}

function buildExpSlot(raw: RawRow, n: 1 | 2 | 3 | 4 | 5) {
  const k = (suffix: string) => raw[`exp${n}_${suffix}`];
  const cells = [
    k('type'), k('firm'), k('firm_tier'), k('industry'),
    k('role_function'), k('role_relevance'), k('year'),
    k('duration_months'), k('how_obtained'), k('converted_to_ft'),
  ];
  const allBlank = cells.every(isBlank);
  if (allBlank) {
    return {
      type: null, firm: null, firm_tier: null, industry: null,
      role_function: null, role_relevance: null, year: null,
      duration_months: null, how_obtained: null, converted_to_ft: null,
    };
  }
  return {
    type: asString(k('type')),
    firm: asString(k('firm')),
    firm_tier: asString(k('firm_tier')),
    industry: asString(k('industry')),
    role_function: asString(k('role_function')),
    role_relevance: asInt(k('role_relevance')),
    year: asInt(k('year')),
    duration_months: asInt(k('duration_months')),
    how_obtained: asString(k('how_obtained')),
    converted_to_ft: isBlank(k('converted_to_ft'))
      ? null
      : asConvertedToFt(k('converted_to_ft')),
  };
}

function normaliseRow(raw: RawRow): unknown {
  return {
    id: asString(raw.id),
    full_name_internal: asString(raw.full_name_internal),
    linkedin_url_internal: asString(raw.linkedin_url_internal),
    current_role: asString(raw.current_role),
    current_firm: asString(raw.current_firm),
    current_firm_tier: asString(raw.current_firm_tier),
    current_geography: asString(raw.current_geography),
    current_role_start_year: asInt(raw.current_role_start_year),
    years_to_current_role: asInt(raw.years_to_current_role),
    university: asString(raw.university),
    university_tier: asString(raw.university_tier),
    degree: asString(raw.degree),
    degree_type: asString(raw.degree_type),
    majors: asString(raw.majors),
    wam_band: asString(raw.wam_band),
    graduation_year: asInt(raw.graduation_year),
    has_honours: asBool(raw.has_honours),
    has_masters_or_second_degree: asBool(raw.has_masters_or_second_degree),
    secondary_education_notes: asString(raw.secondary_education_notes),
    education_achievements: asString(raw.education_achievements),
    high_school: asString(raw.high_school),
    high_school_type: asString(raw.high_school_type),
    atar_band: asString(raw.atar_band),
    exp1: buildExpSlot(raw, 1),
    exp2: buildExpSlot(raw, 2),
    exp3: buildExpSlot(raw, 3),
    exp4: buildExpSlot(raw, 4),
    exp5: buildExpSlot(raw, 5),
    signals: parseSignals(raw.signals),
    extra_experiences_notes: asString(raw.extra_experiences_notes),
    path_summary: asString(raw.path_summary),
    data_source: asString(raw.data_source),
    data_confidence: asString(raw.data_confidence),
    notes: asString(raw.notes),
    date_added: asString(raw.date_added),
  };
}

// ----- Public -----

const DEFAULT_PATH =
  process.env.DATABASE_XLSX_PATH ??
  '/Users/hudsonvanreyk/Downloads/claude codev1/Database_v7_clean.xlsx';

export function loadProfessionalsFromXlsx(path: string = DEFAULT_PATH): Professional[] {
  const buf = readFileSync(resolve(path));
  const wb = XLSX.read(buf, { type: 'buffer' });
  const sheet = wb.Sheets['professionals'];
  if (!sheet) throw new Error(`Sheet 'professionals' not found in ${path}`);

  const rawRows = XLSX.utils.sheet_to_json<RawRow>(sheet, { raw: false, defval: null });
  const validated: ProfessionalRow[] = rawRows.map((raw, i) => {
    const result = ProfessionalRowSchema.safeParse(normaliseRow(raw));
    if (!result.success) {
      const issues = result.error.errors
        .map(e => `${e.path.join('.')}: ${e.message}`)
        .join('; ');
      throw new Error(`Row ${i + 2} (${raw.id}) failed validation: ${issues}`);
    }
    return result.data;
  });

  return validated.map(toCanonicalProfessional);
}
