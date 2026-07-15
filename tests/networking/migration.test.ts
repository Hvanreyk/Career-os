import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const migration = readFileSync(
  resolve(import.meta.dirname, '../../supabase/migrations/0010_networking.sql'),
  'utf8',
);

describe('networking migration', () => {
  it('enables RLS on every content-bearing table', () => {
    for (const table of [
      'networking_events', 'networking_contacts', 'networking_contact_targets',
      'networking_interactions', 'networking_followups', 'networking_coffee_chats',
      'networking_introductions', 'networking_messages', 'networking_message_reviews',
      'networking_connections', 'networking_send_attempts', 'networking_sync_jobs',
      'networking_webhook_receipts', 'networking_review_daily_usage',
    ]) {
      expect(migration).toContain(`alter table ${table} enable row level security`);
    }
  });

  it('binds child ownership through composite foreign keys', () => {
    for (const fk of [
      'foreign key (contact_id, user_id)',
      'foreign key (bank_target_id, user_id)',
      'foreign key (message_id, user_id)',
      'foreign key (via_contact_id, user_id)',
    ]) {
      expect(migration).toContain(fk);
    }
  });

  it('enforces exactly one active follow-up per contact', () => {
    expect(migration).toContain('create unique index networking_followups_one_active');
    expect(migration).toContain("where status in ('open', 'snoozed')");
  });

  it('makes interactions insert/select/delete only — no update policy', () => {
    expect(migration).toContain('users insert own networking interactions');
    expect(migration).toContain('users read own networking interactions');
    expect(migration).toContain('users delete own networking interactions');
    expect(migration).not.toMatch(/networking_interactions\s+for update/i);
  });

  it('keeps quota and review-save writes behind service-role-only functions', () => {
    expect(migration).toContain('claim_networking_review_quota');
    expect(migration).toContain('save_networking_message_review');
    expect(migration).toContain('grant execute on function claim_networking_review_quota');
    expect(migration).toContain('grant execute on function save_networking_message_review');
    expect(migration).toContain("revoke all on function claim_networking_review_quota(uuid, integer) from public, anon, authenticated");
  });

  it('leaves connection tokens and operational tables with no client RLS policy', () => {
    expect(migration).not.toContain('on networking_connections for');
    expect(migration).not.toContain('on networking_sync_jobs for');
    expect(migration).not.toContain('on networking_webhook_receipts for');
    expect(migration).not.toContain('on networking_review_daily_usage for');
  });

  it('never stores refresh tokens in plaintext-named columns', () => {
    expect(migration).toContain('refresh_token_ciphertext');
    expect(migration).not.toContain('refresh_token text');
  });

  it('deduplicates provider interactions and webhook receipts', () => {
    expect(migration).toContain('networking_interactions_provider_unique');
    expect(migration).toContain('unique (provider, dedupe_key)');
  });
});
