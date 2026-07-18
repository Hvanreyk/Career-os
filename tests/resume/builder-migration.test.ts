import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const migration = readFileSync(
  resolve(import.meta.dirname, '../../supabase/migrations/0012_resume_builder.sql'),
  'utf8',
);

describe('resume builder migration (0012)', () => {
  it('enables RLS on every new table', () => {
    for (const table of ['resume_entries', 'resume_ai_jobs', 'resume_ai_daily_usage']) {
      expect(migration).toContain(`alter table ${table} enable row level security`);
    }
  });

  it('keeps AI jobs owner-read-only with service-role-only writes', () => {
    expect(migration).toContain('on resume_ai_jobs for select');
    expect(migration).not.toContain('on resume_ai_jobs for all');
    expect(migration).toContain('grant execute on function claim_resume_ai_job');
    expect(migration).toContain(
      'revoke all on function claim_resume_ai_job(uuid, uuid) from public, anon, authenticated',
    );
  });

  it('keeps the document replace and quota RPCs service-role-only', () => {
    for (const fn of ['replace_resume_document', 'claim_resume_ai_quota', 'release_resume_ai_quota']) {
      expect(migration).toContain(`grant execute on function ${fn}`);
      expect(migration).toMatch(new RegExp(`revoke all on function ${fn}\\([^)]*\\) from public, anon, authenticated`));
    }
  });

  it('binds new child rows through composite foreign keys', () => {
    expect(migration).toContain(
      'foreign key (section_id, user_id)\n    references resume_sections(id, user_id) on delete cascade',
    );
    expect(migration).toContain(
      'foreign key (entry_id, user_id)\n    references resume_entries(id, user_id) on delete cascade',
    );
  });

  it('enforces idempotent job reuse with a partial unique index and a lease claim', () => {
    expect(migration).toContain('resume_ai_jobs_active_uidx');
    expect(migration).toContain("where status in ('pending', 'processing', 'completed')");
    expect(migration).toContain("processing_started_at < now() - interval '2 minutes'");
  });

  it('leaves legacy bullets valid: entry_id is nullable', () => {
    expect(migration).toContain('alter table resume_bullets add column entry_id uuid;');
    expect(migration).not.toContain('entry_id uuid not null');
  });
});
