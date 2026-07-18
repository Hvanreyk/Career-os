import type { ResumeDocument } from '@trajectoryos/core/resume/document';

// Renderer-agnostic display model shared by the PDF and DOCX exporters so
// both formats stay visually consistent (AU IB style: single page, contact
// header, section rules, org/date rows, tight bullets).

export interface ExportEntry {
  org: string;
  roleTitle: string | null;
  location: string | null;
  dateRange: string | null;
  bullets: string[];
}

export interface ExportSection {
  heading: string;
  entries: ExportEntry[];
  looseBullets: string[];
}

export interface ExportModel {
  name: string;
  contactLine: string;
  sections: ExportSection[];
}

/**
 * Builds the display model for resume export from a structured document.
 */
export function buildExportModel(document: ResumeDocument): ExportModel {
  const { contact } = document;
  const contactBits = [
    contact.email,
    contact.phone,
    contact.linkedin_url,
    contact.location,
  ].filter((value): value is string => Boolean(value));
  return {
    name: contact.full_name?.trim() || 'Your Name',
    contactLine: contactBits.join('  •  '),
    sections: document.sections
      .filter((section) => section.entries.length > 0 || section.loose_bullets.length > 0)
      .map((section) => ({
        heading: section.heading.toUpperCase(),
        entries: section.entries.map((entry) => ({
          org: entry.org,
          roleTitle: entry.role_title,
          location: entry.location,
          dateRange: entry.date_range,
          bullets: entry.bullets,
        })),
        looseBullets: section.loose_bullets,
      })),
  };
}

/**
 * Builds a safe download filename (without extension) for the resume.
 */
export function buildExportFilename(document: ResumeDocument): string {
  const name = (document.contact.full_name ?? '')
    .replace(/[^\p{L}\p{N} '_-]/gu, '')
    .trim();
  return name ? `${name} Resume` : 'Resume';
}
