import type { ResumeDocument, ResumeSectionDraft } from './document';
import type {
  ResumeBulletRow,
  ResumeEntryRow,
  ResumeRow,
  ResumeSectionRow,
} from './types';

const bySortOrder = <T extends { sort_order: number; created_at: string }>(a: T, b: T) =>
  a.sort_order - b.sort_order || a.created_at.localeCompare(b.created_at);

/**
 * Assembles workspace rows into the structured ResumeDocument used by the
 * LLM generators, the export renderers, and the wholesale-replace RPC.
 */
export function toResumeDocument(
  resume: ResumeRow,
  sections: ResumeSectionRow[],
  entries: ResumeEntryRow[],
  bullets: ResumeBulletRow[],
): ResumeDocument {
  const orderedSections = [...sections].sort(bySortOrder);
  return {
    contact: {
      full_name: resume.full_name,
      email: resume.email,
      phone: resume.phone,
      linkedin_url: resume.linkedin_url,
      location: resume.location,
    },
    sections: orderedSections.map((section): ResumeSectionDraft => {
      const sectionEntries = entries
        .filter((entry) => entry.section_id === section.id)
        .sort(bySortOrder);
      return {
        kind: section.kind,
        heading: section.heading,
        entries: sectionEntries.map((entry) => ({
          org: entry.org,
          role_title: entry.role_title,
          location: entry.location,
          date_range: entry.date_range,
          bullets: bullets
            .filter((bullet) => bullet.entry_id === entry.id)
            .sort(bySortOrder)
            .map((bullet) => bullet.text),
        })),
        loose_bullets: bullets
          .filter((bullet) => bullet.section_id === section.id && bullet.entry_id === null)
          .sort(bySortOrder)
          .map((bullet) => bullet.text),
      };
    }),
  };
}
