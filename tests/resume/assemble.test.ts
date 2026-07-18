import { describe, expect, it } from 'vitest';
import { toResumeDocument } from '../../lib/resume/assemble.js';
import type {
  ResumeBulletRow,
  ResumeEntryRow,
  ResumeRow,
  ResumeSectionRow,
} from '../../lib/resume/types.js';

const at = '2026-01-01T00:00:00Z';
const resume: ResumeRow = {
  id: 'r1', title: 'Master resume', status: 'draft',
  full_name: 'Alex Nguyen', email: 'alex@uni.edu.au', phone: null, linkedin_url: null, location: 'Sydney',
  created_at: at, updated_at: at,
};
const sections: ResumeSectionRow[] = [
  { id: 's2', resume_id: 'r1', kind: 'experience', heading: 'Experience', sort_order: 1, created_at: at, updated_at: at },
  { id: 's1', resume_id: 'r1', kind: 'education', heading: 'Education', sort_order: 0, created_at: at, updated_at: at },
];
const entries: ResumeEntryRow[] = [
  { id: 'e2', section_id: 's2', org: 'Second Corp', role_title: null, location: null, date_range: null, sort_order: 1, created_at: at, updated_at: at },
  { id: 'e1', section_id: 's2', org: 'First Corp', role_title: 'Analyst', location: 'Sydney', date_range: '2024', sort_order: 0, created_at: at, updated_at: at },
];
const bullets: ResumeBulletRow[] = [
  { id: 'b2', section_id: 's2', entry_id: 'e1', text: 'second bullet', status: 'draft', sort_order: 1, created_at: at, updated_at: at },
  { id: 'b1', section_id: 's2', entry_id: 'e1', text: 'first bullet', status: 'draft', sort_order: 0, created_at: at, updated_at: at },
  { id: 'b3', section_id: 's2', entry_id: null, text: 'loose bullet', status: 'draft', sort_order: 0, created_at: at, updated_at: at },
];

describe('toResumeDocument', () => {
  const document = toResumeDocument(resume, sections, entries, bullets);

  it('orders sections, entries and bullets by sort_order', () => {
    expect(document.sections.map((section) => section.heading)).toEqual(['Education', 'Experience']);
    expect(document.sections[1]!.entries.map((entry) => entry.org)).toEqual(['First Corp', 'Second Corp']);
    expect(document.sections[1]!.entries[0]!.bullets).toEqual(['first bullet', 'second bullet']);
  });

  it('separates entry bullets from section-level loose bullets', () => {
    expect(document.sections[1]!.loose_bullets).toEqual(['loose bullet']);
    expect(document.sections[1]!.entries[1]!.bullets).toEqual([]);
  });

  it('maps resume header columns onto contact', () => {
    expect(document.contact.full_name).toBe('Alex Nguyen');
    expect(document.contact.phone).toBeNull();
  });
});
