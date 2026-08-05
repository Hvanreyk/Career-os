import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sql = readFileSync(new URL('../../supabase/migrations/0015_technical_core_foundation.sql', import.meta.url), 'utf8');
const reviewFixSql = readFileSync(new URL('../../supabase/migrations/0016_technical_core_review_fixes.sql', import.meta.url), 'utf8');
const disputeHardeningSql = readFileSync(new URL('../../supabase/migrations/0017_technical_dispute_hardening.sql', import.meta.url), 'utf8');
const disputeLifetimeSql = readFileSync(new URL('../../supabase/migrations/20260805003127_technical_dispute_lifetime.sql', import.meta.url), 'utf8');
const importGuardSql = readFileSync(new URL('../../supabase/migrations/20260805004517_reviewed_family_import_guards.sql', import.meta.url), 'utf8');

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

describe('technical core review-fix migration', () => {
  it('makes reviewed imports and dispute submission transactional service operations', () => {
    expect(reviewFixSql).toContain('function public.technical_import_reviewed_family');
    expect(reviewFixSql).toContain('function public.technical_submit_dispute');
    expect((reviewFixSql.match(/security invoker/g) ?? [])).toHaveLength(2);
    expect(reviewFixSql).toContain('to service_role');
    expect(reviewFixSql).toContain('SOURCE_ID_CONFLICT');
    expect(reviewFixSql).toContain('MISSING_REVIEWED_FAMILY_SOURCES');
    expect(reviewFixSql).toContain("coalesce((p_family #>> '{review,founderOverride}')::boolean, false)");
    expect(importGuardSql).toContain('MISSING_REVIEWED_FAMILY_SOURCES');
    expect(importGuardSql).toContain("coalesce((p_family #>> '{review,founderOverride}')::boolean, false)");
    expect(importGuardSql).toContain('to service_role');
  });

  it('allows only one lifetime dispute and restricts eligibility', () => {
    expect(disputeHardeningSql).toContain('technical_disputes_one_per_attempt_idx');
    expect(disputeHardeningSql).toContain("and a.status = 'graded'");
    expect(disputeHardeningSql).toContain('DISPUTE_ALREADY_SUBMITTED');
    expect(disputeHardeningSql).toContain('security invoker');
    expect(disputeHardeningSql).toContain('to service_role');
    expect(disputeLifetimeSql).toContain('drop index if exists technical_disputes_one_active_per_attempt_idx');
    expect(disputeLifetimeSql).toContain('DUPLICATE_ATTEMPT_DISPUTES_REQUIRE_ADJUDICATION');
    expect(disputeLifetimeSql).toContain('technical_disputes_one_per_attempt_idx');
    expect(disputeLifetimeSql).toContain('DISPUTE_ALREADY_SUBMITTED');
  });
});
