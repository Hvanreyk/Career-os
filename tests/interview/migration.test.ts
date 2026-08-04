import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(new URL('../../supabase/migrations/0015_technical_core_foundation.sql', import.meta.url), 'utf8');

describe('technical core migration', () => {
  it('creates every content, evidence and commercial table from the plan', () => {
    for (const table of [
      'technical_concepts', 'technical_concept_edges', 'technical_item_families',
      'technical_question_versions', 'technical_rubric_versions', 'technical_parameter_specs',
      'technical_sources', 'technical_question_source_links', 'technical_misconceptions',
      'technical_remediation_links', 'technical_content_reviews', 'technical_content_audit_events',
      'technical_pilot_statistics', 'technical_question_instances', 'technical_attempts',
      'technical_attempt_evidence', 'technical_attempt_misconceptions', 'technical_diagnostic_runs',
      'technical_diagnostic_results', 'technical_concept_mastery', 'technical_disputes',
      'billing_customers', 'billing_subscriptions', 'billing_webhook_receipts', 'resource_entitlements',
    ]) expect(sql).toContain(`create table ${table}`);
  });

  it('enables RLS and keeps content writes service-only', () => {
    expect((sql.match(/enable row level security/g) ?? [])).toHaveLength(26);
    expect(sql).toContain('PUBLISH_REQUIRES_APPROVED_QUESTION');
    expect(sql).toContain('technical_question_instances_immutable');
    expect(sql).toContain('from anon, authenticated');
  });

  it('pins the search path for technical-core trigger functions', () => {
    expect((sql.match(/set search_path = public/g) ?? [])).toHaveLength(3);
  });
});
