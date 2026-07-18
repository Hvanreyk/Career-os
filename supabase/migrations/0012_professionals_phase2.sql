-- ============================================================
-- 0012_professionals_phase2.sql
-- Phase 2 normalized professional source of truth.
--
-- Additive only: legacy objects and professional_scoring_input_v1 are
-- intentionally left in place while application code moves to the canonical
-- service-only views below.
-- ============================================================

-- Keep normalization identical across aliases, imports, and uniqueness checks.
create or replace function public.normalize_professional_lookup_key(p_value text)
returns text
language sql
immutable
parallel safe
return nullif(lower(regexp_replace(btrim(p_value), '\s+', ' ', 'g')), '');

revoke all on function public.normalize_professional_lookup_key(text)
  from public, anon, authenticated;
grant execute on function public.normalize_professional_lookup_key(text)
  to service_role;

-- The TypeScript Career Compass taxonomy is the product contract. Release A's
-- normalized constraints predated these accepted values.
alter table public.professional_experiences
  drop constraint if exists professional_experiences_experience_type_compatibility_check,
  drop constraint if exists professional_experiences_experience_type_check,
  drop constraint if exists professional_experiences_firm_tier_compatibility_check,
  drop constraint if exists professional_experiences_firm_tier_check,
  drop constraint if exists professional_experiences_industry_compatibility_check,
  drop constraint if exists professional_experiences_industry_check,
  drop constraint if exists professional_experiences_role_function_check;

alter table public.professional_experiences
  add constraint professional_experiences_experience_type_compatibility_check
    check (experience_type_compatibility in (
      'summer_internship', 'winter_internship', 'penultimate_internship',
      'vacationer', 'cadetship', 'part_time', 'full_time', 'grad_program',
      'internship', 'casual'
    )),
  add constraint professional_experiences_experience_type_check
    check (experience_type in (
      'summer_internship', 'winter_internship', 'penultimate_internship',
      'vacationer', 'cadetship', 'part_time', 'full_time', 'grad_program'
    )),
  add constraint professional_experiences_firm_tier_compatibility_check
    check (firm_tier_compatibility in (
      'bb', 'elite_boutique', 'mid_market', 'boutique', 'aus_big4_bank',
      'mega_fund', 'large_cap', 'global_manager', 'hedge_fund', 'mbb',
      'tier2_consulting', 'big4', 'mid_tier', 'private_equity',
      'top_tier_law', 'mid_tier_law', 'boutique_law', 'asx50', 'asx100',
      'asx200', 'large_private', 'medium_private', 'small_private',
      'corporate', 'startup', 'local_government', 'state_government',
      'federal_government', 'government', 'non_profit', 'other',
      'elite_boutique_and_mm', 'unknown'
    )),
  add constraint professional_experiences_firm_tier_check
    check (firm_tier is null or firm_tier in (
      'bb', 'elite_boutique', 'mid_market', 'boutique', 'aus_big4_bank',
      'mega_fund', 'large_cap', 'global_manager', 'hedge_fund', 'mbb',
      'tier2_consulting', 'big4', 'mid_tier', 'private_equity',
      'top_tier_law', 'mid_tier_law', 'boutique_law', 'asx50', 'asx100',
      'asx200', 'large_private', 'medium_private', 'small_private',
      'corporate', 'startup', 'local_government', 'state_government',
      'federal_government', 'government', 'non_profit', 'other'
    )),
  add constraint professional_experiences_industry_compatibility_check
    check (industry_compatibility in (
      'ib', 'global_markets', 'equity_research', 'private_equity',
      'investment_management_equities', 'investment_management_credit',
      'investment_management_real_estate', 'consulting', 'big4_advisory',
      'big4_business_advisory', 'big4_audit', 'corporate_development',
      'law', 'government', 'other', 'capital_markets', 'operations',
      'corporate', 'non_profit'
    )),
  add constraint professional_experiences_industry_check
    check (industry is null or industry in (
      'ib', 'global_markets', 'equity_research', 'private_equity',
      'investment_management_equities', 'investment_management_credit',
      'investment_management_real_estate', 'consulting', 'big4_advisory',
      'big4_business_advisory', 'big4_audit', 'corporate_development',
      -- Scorer-supported professional-only values; these are not onboarding
      -- options, but retaining them avoids inventing a lossy canonical mapping.
      'law', 'government', 'other', 'operations', 'corporate', 'non_profit'
    )),
  add constraint professional_experiences_role_function_check
    check (role_function in (
      'ib_coverage', 'ib_product', 'equity_research',
      'transaction_services', 'advisory', 'audit', 'corp_finance',
      'sales_trading', 'pe_investment', 'asset_management', 'law',
      'consulting', 'other'
    ));

insert into public.career_compass_signal_registry
  (signal_tag, status, taxonomy_version)
values ('honours', 'selectable', '2026-07-15.1')
on conflict (signal_tag) do nothing;

-- Promote compatibility values that are already canonical in the current
-- Career Compass contract. Unknown and combined tiers remain unresolved.
update public.professional_experiences
set
  firm_tier = firm_tier_compatibility,
  updated_at = now()
where firm_tier is null
  and firm_tier_compatibility in (
    'bb', 'elite_boutique', 'mid_market', 'boutique', 'aus_big4_bank',
    'mega_fund', 'large_cap', 'global_manager', 'hedge_fund', 'mbb',
    'tier2_consulting', 'big4', 'mid_tier', 'private_equity',
    'top_tier_law', 'mid_tier_law', 'boutique_law', 'asx50', 'asx100',
    'asx200', 'large_private', 'medium_private', 'small_private',
    'corporate', 'startup', 'local_government', 'state_government',
    'federal_government', 'government', 'non_profit', 'other'
  );

update public.professional_experiences
set
  industry = case industry_compatibility
    when 'capital_markets' then 'global_markets'
    else industry_compatibility
  end,
  updated_at = now()
where industry is null
  and industry_compatibility in (
    'ib', 'global_markets', 'capital_markets', 'equity_research',
    'private_equity', 'investment_management_equities',
    'investment_management_credit', 'investment_management_real_estate',
    'consulting', 'big4_advisory', 'big4_business_advisory', 'big4_audit',
    'corporate_development', 'law', 'government', 'other',
    'operations', 'corporate', 'non_profit'
  );

update public.professional_experiences
set acquisition_method = 'unknown', updated_at = now()
where acquisition_method is null;

-- Profiles can remain available for correction without reaching the scorer.
alter table public.professional_profiles
  add column lifecycle_status text not null default 'draft',
  add column exclusion_reason text,
  add constraint professional_profiles_lifecycle_status_check
    check (lifecycle_status in ('draft', 'ready', 'excluded')),
  add constraint professional_profiles_exclusion_reason_check
    check (
      lifecycle_status <> 'excluded'
      or nullif(btrim(exclusion_reason), '') is not null
    );

create index professional_profiles_lifecycle_pool_idx
  on public.professional_profiles
    (lifecycle_status, current_geography, professional_id);

-- Multiple degrees are retained; exactly one higher-education row drives the
-- current scorer contract.
alter table public.professional_education
  add column is_primary boolean not null default false;

update public.professional_education education
set is_primary = true
where education.education_level = 'higher_education'
  and education.sequence = (
    select min(candidate.sequence)
    from public.professional_education candidate
    where candidate.professional_id = education.professional_id
      and candidate.education_level = 'higher_education'
  );

create unique index professional_education_one_primary_higher_uidx
  on public.professional_education (professional_id)
  where education_level = 'higher_education' and is_primary;

-- Keep the raw private value while enforcing a normalized identity key.
alter table public.professional_private_identity
  add column linkedin_url_normalized text generated always as (
    nullif(
      lower(
        rtrim(
          split_part(
            split_part(btrim(linkedin_url_internal), '#', 1),
            '?',
            1
          ),
          '/'
        )
      ),
      ''
    )
  ) stored;

create unique index professional_private_identity_linkedin_normalized_uidx
  on public.professional_private_identity (linkedin_url_normalized)
  where linkedin_url_normalized is not null;

-- Canonical names remain small; aliases absorb import spelling/casing changes.
create table public.professional_organization_aliases (
  alias_id          bigint generated always as identity primary key,
  organization_id   bigint not null
    references public.professional_organizations on delete cascade,
  alias_reviewed    text not null check (nullif(btrim(alias_reviewed), '') is not null),
  normalized_alias  text generated always as (
    public.normalize_professional_lookup_key(alias_reviewed)
  ) stored,
  created_at        timestamptz not null default now(),
  unique (normalized_alias)
);

create table public.professional_institution_aliases (
  alias_id          bigint generated always as identity primary key,
  institution_id    bigint not null
    references public.professional_institutions on delete cascade,
  alias_reviewed    text not null check (nullif(btrim(alias_reviewed), '') is not null),
  normalized_alias  text generated always as (
    public.normalize_professional_lookup_key(alias_reviewed)
  ) stored,
  created_at        timestamptz not null default now(),
  unique (normalized_alias)
);

-- A batch and its staged source rows are the only import history retained.
create table public.professional_import_batches (
  batch_id             uuid primary key default gen_random_uuid(),
  source_filename      text not null check (nullif(btrim(source_filename), '') is not null),
  source_hash          text not null check (nullif(btrim(source_hash), '') is not null),
  status               text not null default 'staged'
    check (status in ('staged', 'validated', 'applying', 'complete', 'failed')),
  inserted_count       integer not null default 0 check (inserted_count >= 0),
  updated_count        integer not null default 0 check (updated_count >= 0),
  unchanged_count      integer not null default 0 check (unchanged_count >= 0),
  draft_count          integer not null default 0 check (draft_count >= 0),
  rejected_count       integer not null default 0 check (rejected_count >= 0),
  error_summary        jsonb not null default '[]'::jsonb,
  created_at           timestamptz not null default now(),
  completed_at         timestamptz,
  unique (source_hash)
);

create table public.professional_import_staging_rows (
  staging_row_id       bigint generated always as identity primary key,
  batch_id             uuid not null
    references public.professional_import_batches on delete cascade,
  sheet_name           text not null
    check (sheet_name in ('professionals', 'education', 'experiences', 'achievements')),
  row_number           integer not null check (row_number > 0),
  professional_key     text not null check (professional_key ~ '^P[0-9]{3,}$'),
  stable_key           text check (
    stable_key is null or nullif(btrim(stable_key), '') is not null
  ),
  payload              jsonb not null check (jsonb_typeof(payload) = 'object'),
  validation_status    text not null default 'pending'
    check (validation_status in ('pending', 'valid', 'rejected', 'applied')),
  validation_errors    jsonb not null default '[]'::jsonb,
  created_at           timestamptz not null default now(),
  unique (batch_id, sheet_name, row_number),
  unique (batch_id, sheet_name, stable_key)
);

create index professional_import_staging_parent_idx
  on public.professional_import_staging_rows
    (batch_id, professional_key, sheet_name);

alter table public.professional_organization_aliases enable row level security;
alter table public.professional_institution_aliases enable row level security;
alter table public.professional_import_batches enable row level security;
alter table public.professional_import_staging_rows enable row level security;

revoke all on public.professional_organization_aliases
  from public, anon, authenticated;
revoke all on public.professional_institution_aliases
  from public, anon, authenticated;
revoke all on public.professional_import_batches
  from public, anon, authenticated;
revoke all on public.professional_import_staging_rows
  from public, anon, authenticated;

grant all on public.professional_organization_aliases to service_role;
grant all on public.professional_institution_aliases to service_role;
grant all on public.professional_import_batches to service_role;
grant all on public.professional_import_staging_rows to service_role;
grant usage, select on all sequences in schema public to service_role;

-- Enforce one deterministic sequence regardless of import origin.
create unique index professional_education_sequence_uidx
  on public.professional_education (professional_id, sequence);
create unique index professional_experiences_sequence_uidx
  on public.professional_experiences (professional_id, sequence);
create unique index professional_achievements_sequence_uidx
  on public.professional_achievements (professional_id, sequence);

-- Data completeness is separate from lifecycle intent. This lets the import
-- workflow explain why a draft is not scoreable without making draft rows
-- visible to the scoring cohort.
create or replace view public.professional_scoring_readiness
with (security_invoker = true)
as
with profile_quality as (
  select
    profile.professional_id,
    profile.current_geography,
    profile.lifecycle_status,
    profile.exclusion_reason,
    array_remove(array[
      case when nullif(btrim(profile.current_firm_name_reviewed), '') is null
        then 'missing_current_firm' end,
      case when profile.current_firm_tier is null
          or profile.current_firm_tier_compatibility = 'elite_boutique_and_mm'
        then 'unresolved_current_firm_tier' end,
      case when education.higher_education_count <> 1
        then 'requires_one_primary_higher_education' end,
      case when education.incomplete_higher_education_count > 0
        then 'incomplete_primary_higher_education' end,
      case when child_order.duplicate_education_sequences > 0
        then 'duplicate_education_sequence' end,
      case when child_order.duplicate_experience_sequences > 0
        then 'duplicate_experience_sequence' end,
      case when child_order.duplicate_achievement_sequences > 0
        then 'duplicate_achievement_sequence' end,
      case when experience.unresolved_experience_count > 0
        then 'unresolved_experience_value' end,
      case when achievement.unresolved_signal_count > 0
        then 'unresolved_signal' end,
      case when quarantine.pending_review_count > 0
        then 'pending_data_review' end
    ]::text[], null) as data_blockers
  from public.professional_profiles profile
  cross join lateral (
    select
      count(*) filter (
        where row.education_level = 'higher_education'
          and row.is_primary
      ) as higher_education_count,
      count(*) filter (
        where row.education_level = 'higher_education'
          and row.is_primary
          and (
            nullif(btrim(row.institution_name_reviewed), '') is null
            or row.institution_tier is null
            or row.degree_type is null
            or nullif(btrim(row.degree_name), '') is null
            or row.wam_band is null
            or row.has_honours is null
            or row.has_masters_or_second_degree is null
          )
      ) as incomplete_higher_education_count
    from public.professional_education row
    where row.professional_id = profile.professional_id
  ) education
  cross join lateral (
    select
      coalesce((
        select count(*)
        from (
          select sequence
          from public.professional_education
          where professional_id = profile.professional_id
          group by sequence
          having count(*) > 1
        ) duplicate
      ), 0) as duplicate_education_sequences,
      coalesce((
        select count(*)
        from (
          select sequence
          from public.professional_experiences
          where professional_id = profile.professional_id
          group by sequence
          having count(*) > 1
        ) duplicate
      ), 0) as duplicate_experience_sequences,
      coalesce((
        select count(*)
        from (
          select sequence
          from public.professional_achievements
          where professional_id = profile.professional_id
          group by sequence
          having count(*) > 1
        ) duplicate
      ), 0) as duplicate_achievement_sequences
  ) child_order
  cross join lateral (
    select count(*) filter (
      where row.firm_tier is null
        or row.firm_tier_compatibility in ('elite_boutique_and_mm', 'unknown')
        or row.industry is null
        or nullif(btrim(row.organization_name_reviewed), '') is null
    ) as unresolved_experience_count
    from public.professional_experiences row
    where row.professional_id = profile.professional_id
  ) experience
  cross join lateral (
    select count(*) filter (
      where row.verification_status <> 'rejected'
        and row.compatibility_signal_tag is not null
        and (
          row.canonical_signal_tag is null
          or registry.status in ('candidate', 'retired')
        )
    ) as unresolved_signal_count
    from public.professional_achievements row
    left join public.career_compass_signal_registry registry
      on registry.signal_tag = row.canonical_signal_tag
    where row.professional_id = profile.professional_id
  ) achievement
  cross join lateral (
    select count(*) filter (where row.status = 'pending') as pending_review_count
    from public.professional_data_quarantine row
    where row.professional_id = profile.professional_id
  ) quarantine
)
select
  professional_id,
  current_geography,
  lifecycle_status,
  exclusion_reason,
  data_blockers,
  cardinality(data_blockers) = 0 as is_data_complete,
  lifecycle_status = 'ready'
    and cardinality(data_blockers) = 0 as is_ready
from profile_quality;

revoke all on public.professional_scoring_readiness
  from public, anon, authenticated;
grant select on public.professional_scoring_readiness to service_role;

create or replace function public.recalculate_professional_scoring_readiness(
  p_professional_ids text[] default null
)
returns table (
  professional_id text,
  lifecycle_status text,
  data_blockers text[]
)
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.professional_profiles profile
  set
    lifecycle_status = case
      when profile.lifecycle_status = 'excluded' then 'excluded'
      when readiness.is_data_complete then 'ready'
      else 'draft'
    end,
    exclusion_reason = case
      when profile.lifecycle_status = 'excluded' then profile.exclusion_reason
      else null
    end
  from public.professional_scoring_readiness readiness
  where readiness.professional_id = profile.professional_id
    and (
      p_professional_ids is null
      or profile.professional_id = any(p_professional_ids)
    );

  return query
  select
    readiness.professional_id,
    readiness.lifecycle_status,
    readiness.data_blockers
  from public.professional_scoring_readiness readiness
  where p_professional_ids is null
    or readiness.professional_id = any(p_professional_ids)
  order by readiness.professional_id;
end;
$$;

revoke all on function public.recalculate_professional_scoring_readiness(text[])
  from public, anon, authenticated;
grant execute on function public.recalculate_professional_scoring_readiness(text[])
  to service_role;

-- One service-only scoring surface. This view deliberately contains no private
-- identity, URL, source observation, review evidence, or narrative source text.
create or replace view public.professional_scoring_input
with (security_invoker = true)
as
select
  profile.professional_id as id,
  profile."current_role" as "current_role",
  profile.current_firm_name_reviewed as current_firm,
  profile.current_firm_tier,
  profile.current_geography,
  profile.current_role_start_year,
  profile.years_to_current_role,
  higher_education.institution_name_reviewed as university,
  higher_education.institution_tier as university_tier,
  higher_education.degree_name as degree,
  higher_education.degree_type,
  higher_education.majors,
  higher_education.wam_band,
  higher_education.graduation_year,
  higher_education.has_honours,
  higher_education.has_masters_or_second_degree,
  high_school.institution_name_reviewed as high_school,
  coalesce(high_school.high_school_type, 'unknown') as high_school_type,
  coalesce(high_school.atar_band, 'unknown') as atar_band,
  coalesce(experience_rows.experiences, '[]'::jsonb) as experiences,
  coalesce(signal_rows.signals, '{}'::text[]) as signals,
  coalesce(achievement_rows.achievements, '[]'::jsonb) as achievements,
  profile.path_summary,
  profile.data_source,
  profile.data_confidence,
  profile.taxonomy_version,
  profile.derivation_version,
  profile.feature_version
from public.professional_profiles profile
join public.professional_scoring_readiness readiness
  on readiness.professional_id = profile.professional_id
 and readiness.is_ready
join lateral (
  select education.*
  from public.professional_education education
  where education.professional_id = profile.professional_id
    and education.education_level = 'higher_education'
    and education.is_primary
  order by education.sequence
  limit 1
) higher_education on true
left join lateral (
  select education.*
  from public.professional_education education
  where education.professional_id = profile.professional_id
    and education.education_level = 'high_school'
  order by education.sequence
  limit 1
) high_school on true
left join lateral (
  select jsonb_agg(
    jsonb_build_object(
      'type', experience.experience_type,
      'firm', experience.organization_name_reviewed,
      'firm_tier', experience.firm_tier,
      'industry', experience.industry,
      'role_function', experience.role_function,
      'role_relevance', coalesce(
        experience.relevance_override,
        experience.derived_role_relevance,
        experience.stored_role_relevance
      ),
      'year', experience.original_year,
      'duration_months', experience.duration_months,
      'how_obtained', coalesce(
        experience.transition_type,
        experience.acquisition_method_compatibility,
        experience.acquisition_method,
        'unknown'
      ),
      'converted_to_ft', case
        when experience.converted_to_full_time is true then 'true'::jsonb
        when experience.converted_to_full_time is false then 'false'::jsonb
        else to_jsonb('NA'::text)
      end
    )
    order by experience.sequence
  ) as experiences
  from public.professional_experiences experience
  where experience.professional_id = profile.professional_id
) experience_rows on true
left join lateral (
  select coalesce(array_agg(signal.tag order by signal.tag), '{}'::text[]) as signals
  from (
    select achievement.canonical_signal_tag as tag
    from public.professional_achievements achievement
    join public.career_compass_signal_registry registry
      on registry.signal_tag = achievement.canonical_signal_tag
     and registry.status in ('selectable', 'auto_derived', 'approved_extension')
    where achievement.professional_id = profile.professional_id
      and achievement.verification_status <> 'rejected'
      and achievement.canonical_signal_tag is not null
    union
    select 'honours'
    where higher_education.has_honours
    union
    select 'wam_hd'
    where higher_education.wam_band = 'hd'
    union
    select 'wam_distinction'
    where higher_education.wam_band = 'd'
    union
    select 'atar_99_plus'
    where high_school.atar_band = '99_plus'
    union
    select 'co_op_program'
    where exists (
      select 1
      from public.professional_experiences row
      where row.professional_id = profile.professional_id
        and (
          row.acquisition_method = 'co_op_program'
          or row.acquisition_method_compatibility = 'co_op_program'
        )
    )
    union
    select 'has_pe_internship'
    where exists (
      select 1 from public.professional_experiences row
      where row.professional_id = profile.professional_id
        and row.industry = 'private_equity'
    )
    union
    select 'has_big4_audit'
    where exists (
      select 1 from public.professional_experiences row
      where row.professional_id = profile.professional_id
        and row.industry = 'big4_audit'
    )
    union
    select 'has_big4_advisory'
    where exists (
      select 1 from public.professional_experiences row
      where row.professional_id = profile.professional_id
        and row.industry in ('big4_advisory', 'big4_business_advisory')
    )
    union
    select 'has_consulting_experience'
    where exists (
      select 1 from public.professional_experiences row
      where row.professional_id = profile.professional_id
        and row.industry = 'consulting'
    )
    union
    select 'fin_society_committee'
    where exists (
      select 1 from public.professional_experiences row
      where row.professional_id = profile.professional_id
        and row.acquisition_method = 'society_referral'
    )
  ) signal
) signal_rows on true
left join lateral (
  select jsonb_agg(
    jsonb_build_object(
      'tag', achievement.canonical_signal_tag,
      'effective_year', case
        when achievement.effective_on is null then null
        else extract(year from achievement.effective_on)::integer
      end,
      'date_precision', achievement.date_precision
    )
    order by achievement.sequence
  ) as achievements
  from public.professional_achievements achievement
  join public.career_compass_signal_registry registry
    on registry.signal_tag = achievement.canonical_signal_tag
   and registry.status in ('selectable', 'auto_derived', 'approved_extension')
  where achievement.professional_id = profile.professional_id
    and achievement.verification_status <> 'rejected'
    and achievement.canonical_signal_tag is not null
) achievement_rows on true;

revoke all on public.professional_scoring_input
  from public, anon, authenticated;
grant select on public.professional_scoring_input to service_role;

comment on view public.professional_scoring_readiness is
  'Service-only Phase 2 lifecycle and scorer eligibility summary.';
comment on view public.professional_scoring_input is
  'Canonical service-only scoring rows for ready normalized professionals.';

-- Validate and apply one fully staged workbook transactionally. Any exception
-- rolls back all profile and child writes. The caller can fix staging rows and
-- retry the same batch without producing duplicates.
create or replace function public.apply_professional_import_batch(
  p_batch_id uuid
)
returns table (
  professional_id text,
  lifecycle_status text,
  data_blockers text[]
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_batch_status text;
  v_professional_ids text[];
  v_existing_count integer;
begin
  select batch.status
    into v_batch_status
  from public.professional_import_batches batch
  where batch.batch_id = p_batch_id
  for update;

  if not found then
    raise exception 'Unknown professional import batch: %', p_batch_id;
  end if;
  if v_batch_status not in ('staged', 'validated', 'failed') then
    raise exception 'Professional import batch % cannot be applied from status %',
      p_batch_id, v_batch_status;
  end if;
  if exists (
    select 1
    from public.professional_import_staging_rows row
    where row.batch_id = p_batch_id
      and row.validation_status in ('pending', 'rejected')
  ) then
    raise exception 'Professional import batch % contains pending or rejected rows',
      p_batch_id;
  end if;
  if not exists (
    select 1
    from public.professional_import_staging_rows row
    where row.batch_id = p_batch_id
      and row.sheet_name = 'professionals'
      and row.validation_status = 'valid'
  ) then
    raise exception 'Professional import batch % has no valid professionals', p_batch_id;
  end if;
  if exists (
    select 1
    from public.professional_import_staging_rows child
    where child.batch_id = p_batch_id
      and child.sheet_name <> 'professionals'
      and child.validation_status = 'valid'
      and not exists (
        select 1
        from public.professional_import_staging_rows parent
        where parent.batch_id = child.batch_id
          and parent.sheet_name = 'professionals'
          and parent.validation_status = 'valid'
          and parent.professional_key = child.professional_key
      )
  ) then
    raise exception 'Professional import batch % contains a child without a staged parent',
      p_batch_id;
  end if;
  if exists (
    select 1
    from public.professional_import_staging_rows row
    left join public.career_compass_signal_registry registry
      on registry.signal_tag = row.payload->>'tag'
     and registry.status in ('selectable', 'auto_derived', 'approved_extension')
    where row.batch_id = p_batch_id
      and row.sheet_name = 'achievements'
      and row.validation_status = 'valid'
      and registry.signal_tag is null
  ) then
    raise exception 'Professional import batch % contains an unapproved achievement signal',
      p_batch_id;
  end if;

  select array_agg(row.professional_key order by row.professional_key)
    into v_professional_ids
  from public.professional_import_staging_rows row
  where row.batch_id = p_batch_id
    and row.sheet_name = 'professionals'
    and row.validation_status = 'valid';

  select count(*) into v_existing_count
  from public.professional_profiles profile
  where profile.professional_id = any(v_professional_ids);

  update public.professional_import_batches
  set status = 'applying', error_summary = '[]'::jsonb
  where batch_id = p_batch_id;

  insert into public.professional_organizations (name_reviewed)
  select distinct source.name_reviewed
  from (
    select row.payload->>'current_firm' as name_reviewed
    from public.professional_import_staging_rows row
    where row.batch_id = p_batch_id
      and row.sheet_name = 'professionals'
      and row.validation_status = 'valid'
    union
    select row.payload->>'firm'
    from public.professional_import_staging_rows row
    where row.batch_id = p_batch_id
      and row.sheet_name = 'experiences'
      and row.validation_status = 'valid'
  ) source
  where public.normalize_professional_lookup_key(source.name_reviewed) is not null
    and not exists (
      select 1
      from public.professional_organization_aliases alias
      where alias.normalized_alias =
        public.normalize_professional_lookup_key(source.name_reviewed)
    )
  on conflict (normalized_name) do nothing;

  insert into public.professional_institutions (name_reviewed)
  select distinct row.payload->>'institution_name'
  from public.professional_import_staging_rows row
  where row.batch_id = p_batch_id
    and row.sheet_name = 'education'
    and row.validation_status = 'valid'
    and public.normalize_professional_lookup_key(
      row.payload->>'institution_name'
    ) is not null
    and not exists (
      select 1
      from public.professional_institution_aliases alias
      where alias.normalized_alias = public.normalize_professional_lookup_key(
        row.payload->>'institution_name'
      )
    )
  on conflict (normalized_name) do nothing;

  insert into public.professional_profiles (
    professional_id, "current_role", current_organization_id,
    current_firm_name_reviewed, current_firm_tier_compatibility,
    current_firm_tier, current_geography, current_role_start_year,
    years_to_current_role, path_summary, signals_compatibility,
    data_source, data_confidence, lifecycle_status, exclusion_reason
  )
  select
    row.professional_key,
    row.payload->>'current_role',
    organization.organization_id,
    organization.name_reviewed,
    row.payload->>'current_firm_tier',
    case when row.payload->>'current_firm_tier' = 'elite_boutique_and_mm'
      then null else row.payload->>'current_firm_tier' end,
    row.payload->>'current_geography',
    (row.payload->>'current_role_start_year')::integer,
    (row.payload->>'years_to_current_role')::integer,
    nullif(row.payload->>'path_summary', ''),
    '{}'::text[],
    row.payload->>'data_source',
    row.payload->>'data_confidence',
    case when row.payload->>'requested_lifecycle_status' = 'excluded'
      then 'excluded' else 'draft' end,
    case when row.payload->>'requested_lifecycle_status' = 'excluded'
      then nullif(row.payload->>'exclusion_reason', '') else null end
  from public.professional_import_staging_rows row
  join lateral (
    select candidate.organization_id, candidate.name_reviewed
    from (
      select organization.organization_id, organization.name_reviewed, 1 as priority
      from public.professional_organization_aliases alias
      join public.professional_organizations organization
        on organization.organization_id = alias.organization_id
      where alias.normalized_alias =
        public.normalize_professional_lookup_key(row.payload->>'current_firm')
      union all
      select organization.organization_id, organization.name_reviewed, 2
      from public.professional_organizations organization
      where organization.normalized_name =
        lower(btrim(row.payload->>'current_firm'))
    ) candidate
    order by candidate.priority
    limit 1
  ) organization on true
  where row.batch_id = p_batch_id
    and row.sheet_name = 'professionals'
    and row.validation_status = 'valid'
  on conflict on constraint professional_profiles_pkey do update set
    "current_role" = excluded."current_role",
    current_organization_id = excluded.current_organization_id,
    current_firm_name_reviewed = excluded.current_firm_name_reviewed,
    current_firm_tier_compatibility = excluded.current_firm_tier_compatibility,
    current_firm_tier = excluded.current_firm_tier,
    current_geography = excluded.current_geography,
    current_role_start_year = excluded.current_role_start_year,
    years_to_current_role = excluded.years_to_current_role,
    path_summary = excluded.path_summary,
    data_source = excluded.data_source,
    data_confidence = excluded.data_confidence,
    lifecycle_status = excluded.lifecycle_status,
    exclusion_reason = excluded.exclusion_reason;

  insert into public.professional_private_identity (
    professional_id, full_name_internal, linkedin_url_internal
  )
  select
    row.professional_key,
    row.payload->>'full_name_internal',
    nullif(row.payload->>'linkedin_url_internal', '')
  from public.professional_import_staging_rows row
  where row.batch_id = p_batch_id
    and row.sheet_name = 'professionals'
    and row.validation_status = 'valid'
  on conflict on constraint professional_private_identity_pkey do update set
    full_name_internal = excluded.full_name_internal,
    linkedin_url_internal = excluded.linkedin_url_internal;

  delete from public.professional_education child
  where child.professional_id = any(v_professional_ids);
  delete from public.professional_experiences child
  where child.professional_id = any(v_professional_ids);
  delete from public.professional_achievements child
  where child.professional_id = any(v_professional_ids);

  insert into public.professional_education (
    professional_id, sequence, education_level, is_primary, institution_id,
    institution_name_reviewed, institution_tier, degree_type, degree_name,
    majors, graduation_year, started_on, completed_on, date_precision,
    wam_band, has_honours, has_masters_or_second_degree, high_school_type,
    atar_band, origin
  )
  select
    row.professional_key,
    (row.payload->>'sequence')::integer,
    row.payload->>'education_level',
    coalesce(nullif(row.payload->>'is_primary', '')::boolean, false),
    institution.institution_id,
    coalesce(institution.name_reviewed, nullif(row.payload->>'institution_name', '')),
    nullif(row.payload->>'institution_tier', ''),
    nullif(row.payload->>'degree_type', ''),
    nullif(row.payload->>'degree', ''),
    nullif(row.payload->>'majors', ''),
    nullif(row.payload->>'graduation_year', '')::integer,
    nullif(row.payload->>'started_on', '')::date,
    nullif(row.payload->>'completed_on', '')::date,
    coalesce(nullif(row.payload->>'date_precision', ''), 'unknown'),
    nullif(row.payload->>'wam_band', ''),
    nullif(row.payload->>'has_honours', '')::boolean,
    nullif(row.payload->>'has_masters_or_second_degree', '')::boolean,
    nullif(row.payload->>'high_school_type', ''),
    nullif(row.payload->>'atar_band', ''),
    'workbook_import'
  from public.professional_import_staging_rows row
  left join lateral (
    select candidate.institution_id, candidate.name_reviewed
    from (
      select institution.institution_id, institution.name_reviewed, 1 as priority
      from public.professional_institution_aliases alias
      join public.professional_institutions institution
        on institution.institution_id = alias.institution_id
      where alias.normalized_alias =
        public.normalize_professional_lookup_key(row.payload->>'institution_name')
      union all
      select institution.institution_id, institution.name_reviewed, 2
      from public.professional_institutions institution
      where institution.normalized_name =
        lower(btrim(row.payload->>'institution_name'))
    ) candidate
    order by candidate.priority
    limit 1
  ) institution on true
  where row.batch_id = p_batch_id
    and row.sheet_name = 'education'
    and row.validation_status = 'valid';

  insert into public.professional_experiences (
    professional_id, sequence, experience_type_compatibility,
    experience_type, organization_id, organization_name_reviewed,
    firm_tier_compatibility, firm_tier, industry_compatibility, industry,
    role_function, original_year, started_on, ended_on, date_precision,
    duration_months, acquisition_method_compatibility, acquisition_method,
    transition_type, converted_to_full_time,
    converted_to_full_time_compatibility, stored_role_relevance,
    derived_role_relevance, relevance_rule_version, origin
  )
  select
    row.professional_key,
    (row.payload->>'sequence')::integer,
    row.payload->>'type',
    case row.payload->>'type'
      when 'internship' then 'summer_internship'
      when 'casual' then 'part_time'
      else row.payload->>'type'
    end,
    organization.organization_id,
    organization.name_reviewed,
    row.payload->>'firm_tier',
    case when row.payload->>'firm_tier' in ('elite_boutique_and_mm', 'unknown')
      then null else row.payload->>'firm_tier' end,
    row.payload->>'industry',
    case row.payload->>'industry'
      when 'capital_markets' then 'global_markets'
      else row.payload->>'industry'
    end,
    row.payload->>'role_function',
    (row.payload->>'year')::integer,
    nullif(row.payload->>'started_on', '')::date,
    nullif(row.payload->>'ended_on', '')::date,
    coalesce(nullif(row.payload->>'date_precision', ''), 'year'),
    nullif(row.payload->>'duration_months', '')::integer,
    row.payload->>'how_obtained',
    case
      when row.payload->>'how_obtained' in (
        'online_application', 'cold_email', 'ocr', 'society_referral',
        'internal_referral', 'co_op_program', 'unknown'
      ) then row.payload->>'how_obtained'
      else 'unknown'
    end,
    case
      when row.payload->>'transition_type' in ('return_offer', 'lateral', 'promotion')
        then row.payload->>'transition_type'
      when row.payload->>'how_obtained' in ('return_offer', 'lateral', 'promotion')
        then row.payload->>'how_obtained'
      else null
    end,
    case lower(row.payload->>'converted_to_ft')
      when 'true' then true
      when 'false' then false
      else null
    end,
    case lower(row.payload->>'converted_to_ft')
      when 'true' then 'TRUE'
      when 'false' then 'FALSE'
      else 'NA'
    end,
    (row.payload->>'role_relevance')::integer,
    (row.payload->>'role_relevance')::integer,
    '2026-07-15.1',
    'workbook_import'
  from public.professional_import_staging_rows row
  join lateral (
    select candidate.organization_id, candidate.name_reviewed
    from (
      select organization.organization_id, organization.name_reviewed, 1 as priority
      from public.professional_organization_aliases alias
      join public.professional_organizations organization
        on organization.organization_id = alias.organization_id
      where alias.normalized_alias =
        public.normalize_professional_lookup_key(row.payload->>'firm')
      union all
      select organization.organization_id, organization.name_reviewed, 2
      from public.professional_organizations organization
      where organization.normalized_name = lower(btrim(row.payload->>'firm'))
    ) candidate
    order by candidate.priority
    limit 1
  ) organization on true
  where row.batch_id = p_batch_id
    and row.sheet_name = 'experiences'
    and row.validation_status = 'valid';

  insert into public.professional_achievements (
    professional_id, sequence, achievement_type, achievement_level,
    compatibility_signal_tag, canonical_signal_tag, effective_on, ended_on,
    date_precision, verification_status, origin
  )
  select
    row.professional_key,
    (row.payload->>'sequence')::integer,
    coalesce(nullif(row.payload->>'achievement_type', ''), 'signal'),
    nullif(row.payload->>'achievement_level', ''),
    row.payload->>'tag',
    row.payload->>'tag',
    case
      when nullif(row.payload->>'effective_year', '') is not null
        then make_date((row.payload->>'effective_year')::integer, 1, 1)
      else nullif(row.payload->>'effective_on', '')::date
    end,
    nullif(row.payload->>'ended_on', '')::date,
    coalesce(
      nullif(row.payload->>'date_precision', ''),
      case when nullif(row.payload->>'effective_year', '') is not null
        then 'year' else 'unknown' end
    ),
    coalesce(nullif(row.payload->>'verification_status', ''), 'reviewed'),
    'workbook_import'
  from public.professional_import_staging_rows row
  where row.batch_id = p_batch_id
    and row.sheet_name = 'achievements'
    and row.validation_status = 'valid';

  update public.professional_data_quarantine quarantine
  set
    status = 'resolved',
    reviewed_by = 'import_batch:' || p_batch_id::text,
    reviewed_at = now()
  where quarantine.professional_id = any(v_professional_ids)
    and quarantine.origin = 'legacy_backfill'
    and quarantine.status = 'pending';

  perform public.recalculate_professional_scoring_readiness(v_professional_ids);

  update public.professional_import_staging_rows
  set validation_status = 'applied'
  where batch_id = p_batch_id
    and validation_status = 'valid';

  update public.professional_import_batches batch
  set
    status = 'complete',
    inserted_count = cardinality(v_professional_ids) - v_existing_count,
    updated_count = v_existing_count,
    unchanged_count = 0,
    draft_count = (
      select count(*)
      from public.professional_profiles profile
      where profile.professional_id = any(v_professional_ids)
        and profile.lifecycle_status = 'draft'
    ),
    rejected_count = (
      select count(*)
      from public.professional_import_staging_rows row
      where row.batch_id = p_batch_id
        and row.validation_status = 'rejected'
    ),
    completed_at = now()
  where batch.batch_id = p_batch_id;

  return query
  select
    readiness.professional_id,
    readiness.lifecycle_status,
    readiness.data_blockers
  from public.professional_scoring_readiness readiness
  where readiness.professional_id = any(v_professional_ids)
  order by readiness.professional_id;
end;
$$;

revoke all on function public.apply_professional_import_batch(uuid)
  from public, anon, authenticated;
grant execute on function public.apply_professional_import_batch(uuid)
  to service_role;

-- Classify the current normalized cohort immediately. Combined tiers and other
-- unresolved semantic values remain drafts with readable blockers.
select public.recalculate_professional_scoring_readiness(null);
