import type { ResumeChange, ResumeDocument } from './document';

export interface ApplyChangesResult {
  document: ResumeDocument;
  applied: ResumeChange[];
  // Changes whose target no longer resolves, or whose current value no
  // longer matches `original` (the document moved on since the model saw
  // it) — the user edited it since the snapshot, or the model addressed a
  // bad index.
  skipped: ResumeChange[];
}

/**
 * Applies accepted improve/tailor changes onto a resume document.
 *
 * Pure: returns a new document; the input is never mutated. A change is
 * applied only when its index target resolves AND the current value still
 * matches `original` (so a stale proposal never silently overwrites content
 * the user has since edited); anything else is reported in `skipped` so the
 * UI can tell the user instead of silently dropping it.
 */
export function applyChanges(
  document: ResumeDocument,
  changes: ResumeChange[],
): ApplyChangesResult {
  const next: ResumeDocument = structuredClone(document);
  const applied: ResumeChange[] = [];
  const skipped: ResumeChange[] = [];

  for (const change of changes) {
    if (applyOne(next, change)) applied.push(change);
    else skipped.push(change);
  }

  return { document: next, applied, skipped };
}

function applyOne(document: ResumeDocument, change: ResumeChange): boolean {
  const { target, original, proposed } = change;
  const section = document.sections[target.section_index];
  if (!section) return false;

  if (target.field === 'heading') {
    if (target.entry_index !== null || target.bullet_index !== null) return false;
    if (section.heading !== original) return false;
    section.heading = proposed.slice(0, 80);
    return true;
  }

  if (target.field === 'bullet') {
    if (target.bullet_index === null) return false;
    if (target.entry_index === null) {
      if (section.loose_bullets[target.bullet_index] === undefined) return false;
      if (section.loose_bullets[target.bullet_index] !== original) return false;
      section.loose_bullets[target.bullet_index] = proposed;
      return true;
    }
    const entry = section.entries[target.entry_index];
    if (!entry || entry.bullets[target.bullet_index] === undefined) return false;
    if (entry.bullets[target.bullet_index] !== original) return false;
    entry.bullets[target.bullet_index] = proposed;
    return true;
  }

  // Entry-level fields: org / role_title / location / date_range.
  if (target.entry_index === null || target.bullet_index !== null) return false;
  const entry = section.entries[target.entry_index];
  if (!entry) return false;
  switch (target.field) {
    case 'org':
      if (entry.org !== original) return false;
      entry.org = proposed.slice(0, 120);
      return true;
    case 'role_title':
      if ((entry.role_title ?? '') !== original) return false;
      entry.role_title = proposed.slice(0, 120);
      return true;
    case 'location':
      if ((entry.location ?? '') !== original) return false;
      entry.location = proposed.slice(0, 80);
      return true;
    case 'date_range':
      if ((entry.date_range ?? '') !== original) return false;
      entry.date_range = proposed.slice(0, 60);
      return true;
    default:
      return false;
  }
}
