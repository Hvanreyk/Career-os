import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  resolve(import.meta.dirname, '../../supabase/migrations/0012_professionals_phase2.sql'),
  'utf8',
);

function viewDefinition(name: string): string {
  const start = migration.indexOf(`create or replace view public.${name}`);
  const end = migration.indexOf(
    `revoke all on public.${name}`,
    start,
  );
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return migration.slice(start, end);
}

describe('professional Phase 2 migration', () => {
  it('adds lifecycle, normalized identity, aliases, and import staging', () => {
    expect(migration).toContain('add column lifecycle_status text not null');
    expect(migration).toContain("check (lifecycle_status in ('draft', 'ready', 'excluded'))");
    expect(migration).toContain('add column exclusion_reason text');
    expect(migration).toContain('linkedin_url_normalized text generated always as');
    expect(migration).toContain(
      'create unique index professional_private_identity_linkedin_normalized_uidx',
    );
    expect(migration).toContain('create table public.professional_organization_aliases');
    expect(migration).toContain('create table public.professional_institution_aliases');
    expect(migration).toContain('create table public.professional_import_batches');
    expect(migration).toContain('create table public.professional_import_staging_rows');
    expect(migration).toContain('add column is_primary boolean not null');
    expect(migration).toContain('professional_education_one_primary_higher_uidx');
  });

  it('expands normalized constraints to representative current taxonomy values', () => {
    for (const value of [
      "'vacationer'",
      "'cadetship'",
      "'equity_research'",
      "'big4_business_advisory'",
      "'corporate_development'",
      "'mid_tier_law'",
      "'asx50'",
      "'operations'",
      "'corporate'",
      "'non_profit'",
    ]) {
      expect(migration).toContain(value);
    }
    expect(migration).toContain("values ('honours', 'selectable'");
  });

  it('retains scorer-supported professional-only industries', () => {
    expect(migration).not.toContain("when 'operations' then null");
    expect(migration).not.toContain("when 'corporate' then null");
    expect(migration).not.toContain("when 'non_profit' then null");
    expect(migration).toMatch(
      /professional_experiences_industry_check[\s\S]*?'operations', 'corporate', 'non_profit'/,
    );
  });

  it('keeps readiness explicit and the scoring view ready-only', () => {
    const readiness = viewDefinition('professional_scoring_readiness');
    expect(readiness).toContain('data_blockers');
    expect(readiness).toContain('is_data_complete');
    expect(readiness).toContain("lifecycle_status = 'ready'");
    expect(readiness).toContain('as is_ready');
    expect(readiness).toContain('unresolved_current_firm_tier');
    expect(readiness).toContain('requires_one_primary_higher_education');
    expect(readiness).toContain('and row.is_primary');
    expect(readiness).toContain('unresolved_signal');

    const scoring = viewDefinition('professional_scoring_input');
    expect(scoring).toContain('readiness.is_ready');
    expect(scoring).toContain('jsonb_agg(');
    expect(scoring).toContain('order by experience.sequence');
    expect(scoring).not.toMatch(/limit\s+5/i);
  });

  it('projects the strict scorer contract without private source data', () => {
    const scoring = viewDefinition('professional_scoring_input');
    for (const field of [
      "'type'",
      "'firm_tier'",
      "'industry'",
      "'role_relevance'",
      "'how_obtained'",
      "'converted_to_ft'",
      "'tag'",
      "'effective_year'",
      "'date_precision'",
    ]) {
      expect(scoring).toContain(field);
    }
    expect(scoring).toContain('profile.taxonomy_version');
    expect(scoring).toContain('profile.derivation_version');
    expect(scoring).toContain('profile.feature_version');
    expect(scoring).not.toContain('full_name_internal');
    expect(scoring).not.toContain('linkedin_url_internal');
    expect(scoring).not.toContain('raw_text_internal');
    expect(scoring).not.toContain('source_url_internal');
  });

  it('derives structured signals and preserves transition semantics', () => {
    const scoring = viewDefinition('professional_scoring_input');
    for (const signal of [
      "'honours'",
      "'wam_hd'",
      "'wam_distinction'",
      "'atar_99_plus'",
      "'co_op_program'",
      "'has_pe_internship'",
      "'has_big4_audit'",
      "'has_big4_advisory'",
      "'has_consulting_experience'",
    ]) {
      expect(scoring).toContain(signal);
    }
    expect(scoring).toContain('experience.transition_type');
    expect(scoring).toContain('experience.acquisition_method_compatibility');
  });

  it('makes import application service-only and transactional', () => {
    expect(migration).toContain(
      'create or replace function public.apply_professional_import_batch',
    );
    expect(migration).toContain(
      'contains a child without a staged parent',
    );
    expect(migration).toContain('contains an unapproved achievement signal');
    expect(migration).toContain(
      'perform public.recalculate_professional_scoring_readiness(v_professional_ids)',
    );
    expect(migration).toContain(
      'grant execute on function public.apply_professional_import_batch(uuid)',
    );
    expect(migration).toContain(
      'revoke all on function public.apply_professional_import_batch(uuid)',
    );
  });

  it('keeps all Phase 2 data and views service-only', () => {
    for (const object of [
      'professional_organization_aliases',
      'professional_institution_aliases',
      'professional_import_batches',
      'professional_import_staging_rows',
      'professional_scoring_readiness',
      'professional_scoring_input',
    ]) {
      expect(migration).toMatch(
        new RegExp(`revoke all on public\\.${object}[\\s\\S]*?anon, authenticated`),
      );
    }
    expect(migration).toContain(
      'grant select on public.professional_scoring_input to service_role',
    );
    expect(migration).toContain(
      'grant select on public.professional_scoring_readiness to service_role',
    );
  });
});
