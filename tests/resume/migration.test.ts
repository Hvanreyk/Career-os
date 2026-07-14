import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const migration = readFileSync(
  resolve(import.meta.dirname, '../../supabase/migrations/0008_resume_workshop.sql'),
  'utf8',
);

describe('resume workshop migration', () => {
  it('enables RLS on every content-bearing table', () => {
    for (const table of ['resumes', 'resume_sections', 'resume_bullets', 'resume_bullet_revisions']) {
      expect(migration).toContain(`alter table ${table} enable row level security`);
    }
  });

  it('keeps quota and revision writes behind service-role-only functions', () => {
    expect(migration).toContain('claim_resume_critique_quota');
    expect(migration).toContain('save_resume_bullet_revision');
    expect(migration).toContain('grant execute on function claim_resume_critique_quota');
    expect(migration).toContain('grant execute on function save_resume_bullet_revision');
  });

  it('binds child ownership through composite foreign keys', () => {
    expect(migration).toContain('foreign key (resume_id, user_id)');
    expect(migration).toContain('foreign key (section_id, user_id)');
    expect(migration).toContain('foreign key (bullet_id, user_id)');
  });
});
