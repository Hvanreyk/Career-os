import { z } from 'zod';
import { nameFirmKey, normalizeEmail, normalizeLinkedinUrl } from './normalize';
import {
  CONTACT_FIELD_MAX,
  CONTACT_NAME_MAX,
  CONTACT_NOTES_MAX,
  ContactSenioritySchema,
  IMPORT_MAX_ROWS,
  type ContactSeniority,
} from './types';

// ============================================================
// CSV import — parse, map headers, validate rows, classify
// duplicates against existing contacts. Commit happens in the API
// route; this module only produces a preview a student can trust.
// Pure module — no I/O.
// ============================================================

export interface CsvParseResult {
  headers: string[];
  rows: string[][];
}

/**
 * Parses CSV text into trimmed headers and data rows.
 *
 * @param text - The raw CSV text
 * @returns The first non-empty row as headers and the remaining non-empty rows
 * @throws Error if the file contains no non-empty rows or exceeds the data-row limit
 */
export function parseCsv(text: string): CsvParseResult {
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;
  const pushField = () => { row.push(field); field = ''; };
  const pushRow = () => { pushField(); rows.push(row); row = []; };

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 1; }
        else inQuotes = false;
      } else field += char;
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      pushField();
    } else if (char === '\n') {
      pushRow();
    } else if (char !== '\r') {
      field += char;
    }
  }
  if (field !== '' || row.length > 0) pushRow();

  const nonEmpty = rows.filter((r) => r.some((cell) => cell.trim() !== ''));
  const headerRow = nonEmpty[0];
  if (!headerRow) throw new Error('The file has no rows');
  if (nonEmpty.length - 1 > IMPORT_MAX_ROWS) {
    throw new Error(`Imports are limited to ${IMPORT_MAX_ROWS} rows per file`);
  }
  return { headers: headerRow.map((h) => h.trim()), rows: nonEmpty.slice(1) };
}

export type ImportField =
  | 'full_name' | 'firm' | 'role_title' | 'seniority' | 'city'
  | 'email' | 'linkedin_url' | 'tags' | 'notes' | 'source';

const HEADER_ALIASES: Record<string, ImportField> = {
  'name': 'full_name', 'full name': 'full_name', 'full_name': 'full_name', 'contact': 'full_name', 'contact name': 'full_name',
  'firm': 'firm', 'company': 'firm', 'bank': 'firm', 'organisation': 'firm', 'organization': 'firm', 'employer': 'firm',
  'role': 'role_title', 'title': 'role_title', 'position': 'role_title', 'job title': 'role_title', 'role_title': 'role_title',
  'seniority': 'seniority', 'level': 'seniority',
  'city': 'city', 'location': 'city', 'geography': 'city',
  'email': 'email', 'email address': 'email', 'e-mail': 'email',
  'linkedin': 'linkedin_url', 'linkedin url': 'linkedin_url', 'linkedin_url': 'linkedin_url', 'profile': 'linkedin_url', 'profile url': 'linkedin_url',
  'tags': 'tags', 'labels': 'tags',
  'notes': 'notes', 'comments': 'notes',
  'source': 'source', 'how met': 'source',
};

/** Maps CSV headers to contact fields; unmapped headers are reported, not fatal. */
export function mapHeaders(headers: string[]): {
  mapping: Array<ImportField | null>;
  unmapped: string[];
} {
  const used = new Set<ImportField>();
  const mapping = headers.map((header) => {
    const field = HEADER_ALIASES[header.trim().toLowerCase()] ?? null;
    if (!field || used.has(field)) return null;
    used.add(field);
    return field;
  });
  return {
    mapping,
    unmapped: headers.filter((_, i) => mapping[i] === null),
  };
}

const SENIORITY_ALIASES: Record<string, ContactSeniority> = {
  'an': 'analyst', 'analyst': 'analyst', 'associate': 'associate', 'asso': 'associate',
  'vp': 'vp', 'vice president': 'vp', 'director': 'director', 'ed': 'director',
  'executive director': 'director', 'md': 'md', 'managing director': 'md',
  'recruiter': 'recruiter', 'hr': 'recruiter', 'talent': 'recruiter', 'student': 'student',
};

const ImportRowSchema = z.object({
  full_name: z.string().trim().min(1, 'name is required').max(CONTACT_NAME_MAX),
  firm: z.string().trim().max(CONTACT_FIELD_MAX).default(''),
  role_title: z.string().trim().max(CONTACT_FIELD_MAX).default(''),
  city: z.string().trim().max(CONTACT_FIELD_MAX).default(''),
  email: z.string().trim().max(CONTACT_FIELD_MAX).default(''),
  linkedin_url: z.string().trim().max(300).default(''),
  notes: z.string().max(CONTACT_NOTES_MAX).default(''),
});

export interface ImportCandidate {
  rowNumber: number;
  full_name: string;
  firm: string;
  role_title: string;
  seniority: ContactSeniority;
  city: string;
  email: string;
  email_normalized: string | null;
  linkedin_url: string;
  linkedin_normalized: string | null;
  tags: string[];
  notes: string;
}

export interface ImportRowError {
  rowNumber: number;
  message: string;
}

export type DuplicateMatch = 'email' | 'linkedin' | 'name_firm';

export interface ImportDuplicate {
  rowNumber: number;
  full_name: string;
  matchType: DuplicateMatch;
  existingContactId: string;
}

export interface ExistingContactKey {
  id: string;
  email_normalized: string | null;
  linkedin_normalized: string | null;
  full_name: string;
  firm: string;
}

export interface ImportPreview {
  candidates: ImportCandidate[];
  errors: ImportRowError[];
  duplicates: ImportDuplicate[];
  unmappedHeaders: string[];
  totalRows: number;
}

/**
 * Builds a preview of valid CSV import rows and classifies duplicates.
 *
 * In-file duplicates are collapsed to their first occurrence. Existing contacts
 * are matched by normalized email, normalized LinkedIn URL, then name and firm.
 * Invalid email or LinkedIn values are omitted from the candidate rather than
 * invalidating the row.
 *
 * @param text - The CSV content to preview
 * @param existing - Existing contacts used for duplicate detection
 * @returns Valid candidates, row-level errors, duplicate classifications, unmapped headers, and the total row count
 * @throws Error if the CSV has no rows, exceeds the import row limit, or has no recognized name column
 */
export function buildImportPreview(
  text: string,
  existing: ExistingContactKey[],
): ImportPreview {
  const { headers, rows } = parseCsv(text);
  const { mapping, unmapped } = mapHeaders(headers);
  if (!mapping.includes('full_name')) {
    throw new Error('Could not find a name column (accepted headers include "name" or "full name")');
  }

  const byEmail = new Map<string, string>();
  const byLinkedin = new Map<string, string>();
  const byNameFirm = new Map<string, string>();
  for (const contact of existing) {
    if (contact.email_normalized) byEmail.set(contact.email_normalized, contact.id);
    if (contact.linkedin_normalized) byLinkedin.set(contact.linkedin_normalized, contact.id);
    byNameFirm.set(nameFirmKey(contact.full_name, contact.firm), contact.id);
  }

  const candidates: ImportCandidate[] = [];
  const errors: ImportRowError[] = [];
  const duplicates: ImportDuplicate[] = [];
  const seenInFile = new Set<string>();

  rows.forEach((cells, index) => {
    const rowNumber = index + 2; // 1-based, after the header row
    const raw: Record<string, string> = {};
    let seniorityRaw = '';
    let tagsRaw = '';
    mapping.forEach((field, col) => {
      if (!field) return;
      const value = (cells[col] ?? '').trim();
      if (field === 'seniority') seniorityRaw = value;
      else if (field === 'tags') tagsRaw = value;
      else if (field !== 'source') raw[field] = value;
    });

    const parsed = ImportRowSchema.safeParse(raw);
    if (!parsed.success) {
      errors.push({ rowNumber, message: parsed.error.issues[0]?.message ?? 'Invalid row' });
      return;
    }
    const value = parsed.data;
    const emailNormalized = normalizeEmail(value.email);
    const linkedinNormalized = normalizeLinkedinUrl(value.linkedin_url);
    const seniority = SENIORITY_ALIASES[seniorityRaw.toLowerCase()] ?? 'other';
    const tags = tagsRaw
      .split(/[;,]/)
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 10);

    const fileKey = emailNormalized ?? linkedinNormalized ?? nameFirmKey(value.full_name, value.firm);
    if (seenInFile.has(fileKey)) return;
    seenInFile.add(fileKey);

    const emailMatch = emailNormalized ? byEmail.get(emailNormalized) : undefined;
    const linkedinMatch = linkedinNormalized ? byLinkedin.get(linkedinNormalized) : undefined;
    const nameFirmMatch = byNameFirm.get(nameFirmKey(value.full_name, value.firm));
    const existingContactId = emailMatch ?? linkedinMatch ?? nameFirmMatch;
    if (existingContactId) {
      duplicates.push({
        rowNumber,
        full_name: value.full_name,
        matchType: emailMatch ? 'email' : linkedinMatch ? 'linkedin' : 'name_firm',
        existingContactId,
      });
      return;
    }

    candidates.push({
      rowNumber,
      full_name: value.full_name,
      firm: value.firm,
      role_title: value.role_title,
      seniority,
      city: value.city,
      email: emailNormalized ? value.email.trim() : '',
      email_normalized: emailNormalized,
      linkedin_url: linkedinNormalized ?? '',
      linkedin_normalized: linkedinNormalized,
      tags,
      notes: value.notes,
    });
  });

  return { candidates, errors, duplicates, unmappedHeaders: unmapped, totalRows: rows.length };
}

/**
 * Prepares a cell value for safe CSV export.
 *
 * @returns A CSV-safe value with spreadsheet formula prefixes neutralized and special characters escaped.
 */
export function csvCell(value: string): string {
  let safe = value;
  if (/^[=+\-@\t\r]/.test(safe)) safe = `'${safe}`;
  if (/[",\n\r]/.test(safe)) safe = `"${safe.replace(/"/g, '""')}"`;
  return safe;
}

/**
 * Serializes headers and rows into CSV text with formula-safe, escaped cells.
 *
 * @param headers - The CSV header row
 * @param rows - The CSV data rows
 * @returns CSV text containing the headers followed by the data rows
 */
export function toCsv(headers: string[], rows: string[][]): string {
  return [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\n');
}
