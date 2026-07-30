import type { ResumeDocument } from './document';

// Serializes a ResumeDocument into the numbered plain-text snapshot the
// improve/tailor prompts operate on. Index tags are the contract between
// the model's ResumeChangeTarget output and applyChanges (apply.ts):
//   [S2]       section 2 heading line
//   [S2.E1]    entry 1 within section 2 (org / role / location / dates)
//   [S2.E1.B0] bullet 0 within that entry
//   [S2.B0]    loose bullet 0 (section-level, no entry)

export function serializeResumeForPrompt(document: ResumeDocument): string {
  const lines: string[] = [];
  const { contact } = document;
  const contactBits = [
    contact.full_name && `name: ${contact.full_name}`,
    contact.email && `email: ${contact.email}`,
    contact.phone && `phone: ${contact.phone}`,
    contact.linkedin_url && `linkedin: ${contact.linkedin_url}`,
    contact.location && `location: ${contact.location}`,
  ].filter(Boolean);
  lines.push(`CONTACT — ${contactBits.length > 0 ? contactBits.join(' | ') : '(none provided)'}`);
  lines.push('');

  document.sections.forEach((section, s) => {
    lines.push(`[S${s}] ${section.kind.toUpperCase()} — "${section.heading}"`);
    section.entries.forEach((entry, e) => {
      const meta = [entry.role_title, entry.location, entry.date_range]
        .filter(Boolean)
        .join(' · ');
      lines.push(`  [S${s}.E${e}] ${entry.org}${meta ? ` — ${meta}` : ''}`);
      entry.bullets.forEach((bullet, b) => {
        lines.push(`    [S${s}.E${e}.B${b}] ${bullet}`);
      });
    });
    section.loose_bullets.forEach((bullet, b) => {
      lines.push(`  [S${s}.B${b}] ${bullet}`);
    });
    lines.push('');
  });

  return lines.join('\n').trim();
}
