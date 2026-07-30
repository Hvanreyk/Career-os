-- ============================================================
-- 0009_normalized_professional_schema.sql
-- Additive normalized professional model. The legacy professionals table
-- remains the production source until shadow parity and rollback gates pass.
-- ============================================================

create table public.career_compass_signal_registry (
  signal_tag          text primary key,
  status              text not null
    check (status in ('selectable', 'auto_derived', 'candidate', 'approved_extension', 'retired')),
  taxonomy_version    text not null,
  approved_by         text,
  approved_at         timestamptz,
  review_notes        text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint signal_approval_ck check (
    status <> 'approved_extension' or (approved_by is not null and approved_at is not null)
  )
);

insert into public.career_compass_signal_registry
  (signal_tag, status, taxonomy_version)
values
  ('deans_list', 'selectable', '2026-07-15.1'),
  ('first_in_class', 'selectable', '2026-07-15.1'),
  ('subject_top_10_finance', 'selectable', '2026-07-15.1'),
  ('faculty_prize', 'selectable', '2026-07-15.1'),
  ('university_medal', 'selectable', '2026-07-15.1'),
  ('school_dux', 'selectable', '2026-07-15.1'),
  ('investment_society_member', 'selectable', '2026-07-15.1'),
  ('investment_society_committee', 'selectable', '2026-07-15.1'),
  ('investment_society_president', 'selectable', '2026-07-15.1'),
  ('fin_society_committee', 'selectable', '2026-07-15.1'),
  ('consulting_society_committee', 'selectable', '2026-07-15.1'),
  ('case_comp_winner', 'selectable', '2026-07-15.1'),
  ('case_comp_finalist', 'selectable', '2026-07-15.1'),
  ('stock_pitch_winner', 'selectable', '2026-07-15.1'),
  ('hackathon_winner', 'selectable', '2026-07-15.1'),
  ('cfa_l1', 'selectable', '2026-07-15.1'),
  ('cfa_l2', 'selectable', '2026-07-15.1'),
  ('cfa_l3', 'selectable', '2026-07-15.1'),
  ('modelling_course', 'selectable', '2026-07-15.1'),
  ('virtual_experience', 'selectable', '2026-07-15.1'),
  ('scholarship', 'selectable', '2026-07-15.1'),
  ('women_in_banking_scholarship', 'selectable', '2026-07-15.1'),
  ('exchange_program', 'selectable', '2026-07-15.1'),
  ('sports_rep', 'selectable', '2026-07-15.1'),
  ('school_leadership', 'selectable', '2026-07-15.1'),
  ('industry_award', 'selectable', '2026-07-15.1'),
  ('wam_hd', 'auto_derived', '2026-07-15.1'),
  ('wam_distinction', 'auto_derived', '2026-07-15.1'),
  ('co_op_program', 'auto_derived', '2026-07-15.1'),
  ('atar_99_plus', 'auto_derived', '2026-07-15.1'),
  ('has_pe_internship', 'auto_derived', '2026-07-15.1'),
  ('has_big4_audit', 'auto_derived', '2026-07-15.1'),
  ('has_big4_advisory', 'auto_derived', '2026-07-15.1'),
  ('has_consulting_experience', 'auto_derived', '2026-07-15.1'),
  ('wam_top_10', 'candidate', '2026-07-15.1'),
  ('subject_top_10_law', 'candidate', '2026-07-15.1'),
  ('honours_first_class', 'candidate', '2026-07-15.1'),
  ('hsc_distinguished_achiever', 'candidate', '2026-07-15.1'),
  ('selective_school', 'candidate', '2026-07-15.1'),
  ('consulting_society_member', 'candidate', '2026-07-15.1'),
  ('society_committee', 'candidate', '2026-07-15.1'),
  ('chartered_accountant', 'candidate', '2026-07-15.1'),
  ('has_law_clerkship', 'candidate', '2026-07-15.1'),
  ('sports_volunteer', 'candidate', '2026-07-15.1')
on conflict (signal_tag) do nothing;

create table public.career_compass_taxonomy_reviews (
  review_id            bigint generated always as identity primary key,
  identifier_category  text not null,
  legacy_identifier    text not null,
  proposed_identifier  text,
  status                text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'superseded')),
  evidence              jsonb not null default '{}'::jsonb,
  reviewed_by           text,
  reviewed_at           timestamptz,
  created_at            timestamptz not null default now(),
  unique (identifier_category, legacy_identifier, proposed_identifier)
);

create table public.professional_organizations (
  organization_id      bigint generated always as identity primary key,
  name_reviewed        text not null,
  normalized_name      text generated always as (lower(btrim(name_reviewed))) stored,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (normalized_name)
);

create table public.professional_institutions (
  institution_id       bigint generated always as identity primary key,
  name_reviewed        text not null,
  normalized_name      text generated always as (lower(btrim(name_reviewed))) stored,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (normalized_name)
);

create table public.professional_profiles (
  professional_id                    text primary key
    check (professional_id ~ '^P[0-9]{3,}$'),
  "current_role"                     text not null
    check ("current_role" in ('ib_analyst', 'ib_associate', 'ib_vp')),
  current_organization_id            bigint references public.professional_organizations,
  current_firm_name_reviewed          text not null,
  current_firm_tier_compatibility     text not null
    check (current_firm_tier_compatibility in
      ('bb', 'elite_boutique', 'mid_market', 'elite_boutique_and_mm', 'boutique')),
  current_firm_tier                   text
    check (current_firm_tier is null or current_firm_tier in
      ('bb', 'elite_boutique', 'mid_market', 'boutique')),
  current_geography                   text not null
    check (current_geography in
      ('sydney', 'melbourne', 'perth', 'adelaide', 'brisbane',
       'hk', 'london', 'ny', 'singapore', 'other')),
  current_role_start_year             integer not null
    check (current_role_start_year between 1990 and 2100),
  years_to_current_role               integer not null
    check (years_to_current_role >= 0),
  path_summary                        text,
  signals_compatibility               text[] not null default '{}',
  data_source                         text not null
    check (data_source in ('linkedin', 'interview', 'survey', 'public_bio', 'third_party')),
  data_confidence                     text not null
    check (data_confidence in ('high', 'medium', 'low')),
  taxonomy_version                    text not null default '2026-07-15.1',
  derivation_version                  text not null default '2026-07-15.1',
  feature_version                     text not null default 'professional-v1',
  created_at                          timestamptz not null default now(),
  updated_at                          timestamptz not null default now()
);

create table public.professional_private_identity (
  professional_id       text primary key references public.professional_profiles on delete cascade,
  full_name_internal    text not null,
  linkedin_url_internal text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create table public.professional_source_observations (
  observation_id        bigint generated always as identity primary key,
  professional_id       text not null references public.professional_profiles on delete cascade,
  source_record_key     text not null,
  source_type           text not null,
  source_url_internal   text,
  observed_at           timestamptz,
  verified_at           timestamptz,
  raw_text_internal     jsonb not null default '{}'::jsonb,
  confidence            text not null check (confidence in ('high', 'medium', 'low')),
  review_status         text not null default 'unreviewed'
    check (review_status in ('unreviewed', 'reviewed', 'rejected')),
  reviewed_by           text,
  reviewed_at           timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (professional_id, source_record_key)
);

create table public.professional_education (
  education_id                         bigint generated always as identity primary key,
  professional_id                      text not null references public.professional_profiles on delete cascade,
  sequence                             integer not null check (sequence > 0),
  education_level                      text not null
    check (education_level in ('higher_education', 'high_school')),
  institution_id                       bigint references public.professional_institutions,
  institution_name_reviewed            text,
  institution_tier                     text
    check (institution_tier is null or institution_tier in
      ('go8_top', 'go8_other', 'atn', 'other_au', 'top_global',
       'international_top', 'other_global')),
  degree_type                          text
    check (degree_type is null or degree_type in
      ('bachelor', 'honours', 'masters', 'mba', 'double_degree',
       'combined_degree', 'phd')),
  degree_name                          text,
  majors                               text,
  graduation_year                      integer check (graduation_year is null or graduation_year between 1990 and 2100),
  started_on                           date,
  completed_on                         date,
  date_precision                       text not null default 'year'
    check (date_precision in ('unknown', 'year', 'month', 'day')),
  wam_band                             text
    check (wam_band is null or wam_band in ('hd', 'd', 'c', 'p', 'unknown')),
  has_honours                          boolean,
  has_masters_or_second_degree         boolean,
  high_school_type                     text
    check (high_school_type is null or high_school_type in
      ('gps', 'cas', 'aps', 'selective', 'public_comprehensive', 'catholic',
       'independent_other', 'international', 'unknown')),
  atar_band                            text
    check (atar_band is null or atar_band in
      ('99_plus', '98_99', '95_98', '90_95', '85_90', 'below_85', 'unknown')),
  source_observation_id                bigint references public.professional_source_observations,
  origin                               text not null default 'legacy_backfill',
  created_at                           timestamptz not null default now(),
  updated_at                           timestamptz not null default now(),
  unique (professional_id, sequence, origin),
  constraint higher_education_fields_ck check (
    education_level <> 'higher_education' or
    (institution_name_reviewed is not null and institution_tier is not null and
     degree_type is not null and degree_name is not null and wam_band is not null and
     has_honours is not null and has_masters_or_second_degree is not null)
  ),
  constraint high_school_fields_ck check (
    education_level <> 'high_school' or (high_school_type is not null and atar_band is not null)
  )
);

create table public.professional_experiences (
  experience_id                        bigint generated always as identity primary key,
  professional_id                      text not null references public.professional_profiles on delete cascade,
  sequence                             integer not null check (sequence > 0),
  experience_type_compatibility        text not null
    check (experience_type_compatibility in
      ('summer_internship', 'winter_internship', 'penultimate_internship',
       'internship', 'part_time', 'full_time', 'casual', 'grad_program')),
  experience_type                      text not null
    check (experience_type in
      ('summer_internship', 'winter_internship', 'penultimate_internship',
       'part_time', 'full_time', 'grad_program')),
  organization_id                      bigint references public.professional_organizations,
  organization_name_reviewed           text not null,
  firm_tier_compatibility              text not null
    check (firm_tier_compatibility in
      ('bb', 'elite_boutique', 'mid_market', 'boutique', 'aus_big4_bank',
       'mega_fund', 'large_cap', 'global_manager', 'hedge_fund', 'mbb',
       'tier2_consulting', 'big4', 'mid_tier', 'top_tier_law', 'corporate',
       'local_government', 'state_government', 'federal_government', 'other',
       'elite_boutique_and_mm', 'private_equity', 'startup', 'government',
       'non_profit', 'unknown')),
  firm_tier                            text
    check (firm_tier is null or firm_tier in
      ('bb', 'elite_boutique', 'mid_market', 'boutique', 'aus_big4_bank',
       'mega_fund', 'large_cap', 'global_manager', 'hedge_fund', 'mbb',
       'tier2_consulting', 'big4', 'mid_tier', 'top_tier_law', 'corporate',
       'local_government', 'state_government', 'federal_government', 'other')),
  industry_compatibility               text not null
    check (industry_compatibility in
      ('ib', 'global_markets', 'private_equity',
       'investment_management_equities', 'investment_management_credit',
       'investment_management_real_estate', 'consulting', 'big4_advisory',
       'big4_audit', 'corporate', 'law', 'government', 'other',
       'capital_markets', 'non_profit')),
  industry                             text
    check (industry is null or industry in
      ('ib', 'global_markets', 'private_equity',
       'investment_management_equities', 'investment_management_credit',
       'investment_management_real_estate', 'consulting', 'big4_advisory',
       'big4_audit', 'corporate', 'law', 'government', 'other')),
  role_function                        text not null
    check (role_function in
      ('ib_coverage', 'ib_product', 'transaction_services', 'advisory', 'audit',
       'corp_finance', 'sales_trading', 'pe_investment', 'asset_management',
       'law', 'consulting', 'other')),
  original_year                        integer not null check (original_year between 1990 and 2100),
  started_on                           date,
  ended_on                             date,
  date_precision                       text not null default 'year'
    check (date_precision in ('unknown', 'year', 'month', 'day')),
  duration_months                      integer check (duration_months is null or duration_months >= 0),
  acquisition_method_compatibility     text not null
    check (acquisition_method_compatibility in
      ('online_application', 'cold_email', 'ocr', 'society_referral',
       'internal_referral', 'co_op_program', 'unknown', 'networking_event',
       'alumni_network', 'family_connection', 'recruiter', 'scholarship',
       'graduate_program', 'conversion', 'return_offer', 'lateral',
       'promotion', 'NA')),
  acquisition_method                   text
    check (acquisition_method is null or acquisition_method in
      ('online_application', 'cold_email', 'ocr', 'society_referral',
       'internal_referral', 'co_op_program', 'unknown')),
  transition_type                      text
    check (transition_type is null or transition_type in ('return_offer', 'lateral', 'promotion')),
  converted_to_full_time               boolean,
  converted_to_full_time_compatibility text not null
    check (converted_to_full_time_compatibility in ('TRUE', 'FALSE', 'NA')),
  stored_role_relevance                integer not null check (stored_role_relevance between 1 and 5),
  derived_role_relevance               integer check (derived_role_relevance between 1 and 5),
  relevance_rule_version               text,
  relevance_override                   integer check (relevance_override between 1 and 5),
  relevance_override_reason            text,
  source_observation_id                bigint references public.professional_source_observations,
  origin                               text not null default 'legacy_backfill',
  created_at                           timestamptz not null default now(),
  updated_at                           timestamptz not null default now(),
  unique (professional_id, sequence, origin)
);

create table public.professional_achievements (
  achievement_id              bigint generated always as identity primary key,
  professional_id             text not null references public.professional_profiles on delete cascade,
  sequence                    integer not null check (sequence > 0),
  achievement_type            text not null default 'signal',
  achievement_level           text,
  compatibility_signal_tag    text references public.career_compass_signal_registry(signal_tag),
  canonical_signal_tag        text references public.career_compass_signal_registry(signal_tag),
  effective_on                date,
  ended_on                    date,
  date_precision              text not null default 'unknown'
    check (date_precision in ('unknown', 'year', 'month', 'day')),
  issuer_or_organization_id   bigint references public.professional_organizations,
  verification_status         text not null default 'unverified'
    check (verification_status in ('unverified', 'reviewed', 'verified', 'rejected')),
  source_observation_id       bigint references public.professional_source_observations,
  origin                      text not null default 'legacy_backfill',
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),
  unique (professional_id, sequence, origin)
);

create table public.professional_data_quarantine (
  quarantine_id         bigint generated always as identity primary key,
  professional_id       text not null references public.professional_profiles on delete cascade,
  source_field          text not null,
  source_value          text,
  reason                text not null,
  proposed_mapping      text,
  evidence              jsonb not null default '{}'::jsonb,
  status                text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'resolved')),
  origin                text not null default 'legacy_backfill',
  reviewed_by           text,
  reviewed_at           timestamptz,
  created_at            timestamptz not null default now()
);

create table public.professional_feature_snapshots (
  snapshot_id           bigint generated always as identity primary key,
  professional_id       text not null references public.professional_profiles on delete cascade,
  career_stage          text not null check (career_stage in ('S0', 'S1', 'S2', 'S3', 'S4', 'S5')),
  feature_version       text not null,
  derivation_version    text not null,
  as_of_date            date not null,
  computed_fields       jsonb not null,
  knownness             jsonb not null default '{}'::jsonb,
  education_source_hash text not null,
  experience_source_hash text not null,
  achievement_source_hash text not null,
  computed_at           timestamptz not null default now(),
  unique (professional_id, career_stage, feature_version, as_of_date)
);

create table public.professional_normalization_runs (
  run_id                   uuid primary key default gen_random_uuid(),
  source                   text not null default 'legacy_professionals',
  source_hash              text,
  requested_professional_ids text[],
  professional_count       integer not null default 0,
  education_count          integer not null default 0,
  experience_count         integer not null default 0,
  achievement_count        integer not null default 0,
  quarantine_count         integer not null default 0,
  taxonomy_version         text not null default '2026-07-15.1',
  derivation_version       text not null default '2026-07-15.1',
  status                   text not null default 'running'
    check (status in ('running', 'complete', 'failed')),
  error_message            text,
  started_at               timestamptz not null default now(),
  completed_at             timestamptz
);

create table public.professional_source_releases (
  release_id              bigint generated always as identity primary key,
  source_mode             text not null check (source_mode in ('legacy', 'shadow', 'normalized')),
  scoring_version         text not null,
  taxonomy_version        text not null,
  deployed_at             timestamptz not null default now(),
  stable_release_count    integer not null default 0 check (stable_release_count >= 0),
  rollback_not_before     timestamptz not null default (now() + interval '30 days'),
  parity_summary          jsonb not null default '{}'::jsonb,
  approved_by             text,
  constraint normalized_release_gate_ck check (
    source_mode <> 'normalized' or rollback_not_before >= deployed_at + interval '30 days'
  )
);

create index professional_profiles_pool_idx
  on public.professional_profiles (current_geography, current_firm_tier_compatibility);
create index professional_profiles_years_idx
  on public.professional_profiles (years_to_current_role);
create index professional_experiences_order_idx
  on public.professional_experiences (professional_id, sequence);
create index professional_education_order_idx
  on public.professional_education (professional_id, sequence);
create index professional_achievements_order_idx
  on public.professional_achievements (professional_id, sequence);
create index professional_quarantine_status_idx
  on public.professional_data_quarantine (status, source_field);

create trigger career_compass_signal_registry_updated_at
  before update on public.career_compass_signal_registry
  for each row execute function public.set_updated_at();
create trigger professional_organizations_updated_at
  before update on public.professional_organizations
  for each row execute function public.set_updated_at();
create trigger professional_institutions_updated_at
  before update on public.professional_institutions
  for each row execute function public.set_updated_at();
create trigger professional_profiles_updated_at
  before update on public.professional_profiles
  for each row execute function public.set_updated_at();
create trigger professional_private_identity_updated_at
  before update on public.professional_private_identity
  for each row execute function public.set_updated_at();
create trigger professional_source_observations_updated_at
  before update on public.professional_source_observations
  for each row execute function public.set_updated_at();
create trigger professional_education_updated_at
  before update on public.professional_education
  for each row execute function public.set_updated_at();
create trigger professional_experiences_updated_at
  before update on public.professional_experiences
  for each row execute function public.set_updated_at();
create trigger professional_achievements_updated_at
  before update on public.professional_achievements
  for each row execute function public.set_updated_at();

alter table public.career_compass_signal_registry enable row level security;
alter table public.career_compass_taxonomy_reviews enable row level security;
alter table public.professional_organizations enable row level security;
alter table public.professional_institutions enable row level security;
alter table public.professional_profiles enable row level security;
alter table public.professional_private_identity enable row level security;
alter table public.professional_source_observations enable row level security;
alter table public.professional_education enable row level security;
alter table public.professional_experiences enable row level security;
alter table public.professional_achievements enable row level security;
alter table public.professional_data_quarantine enable row level security;
alter table public.professional_feature_snapshots enable row level security;
alter table public.professional_normalization_runs enable row level security;
alter table public.professional_source_releases enable row level security;

revoke all on public.career_compass_signal_registry from anon, authenticated;
revoke all on public.career_compass_taxonomy_reviews from anon, authenticated;
revoke all on public.professional_organizations from anon, authenticated;
revoke all on public.professional_institutions from anon, authenticated;
revoke all on public.professional_profiles from anon, authenticated;
revoke all on public.professional_private_identity from anon, authenticated;
revoke all on public.professional_source_observations from anon, authenticated;
revoke all on public.professional_education from anon, authenticated;
revoke all on public.professional_experiences from anon, authenticated;
revoke all on public.professional_achievements from anon, authenticated;
revoke all on public.professional_data_quarantine from anon, authenticated;
revoke all on public.professional_feature_snapshots from anon, authenticated;
revoke all on public.professional_normalization_runs from anon, authenticated;
revoke all on public.professional_source_releases from anon, authenticated;

grant all on public.career_compass_signal_registry to service_role;
grant all on public.career_compass_taxonomy_reviews to service_role;
grant all on public.professional_organizations to service_role;
grant all on public.professional_institutions to service_role;
grant all on public.professional_profiles to service_role;
grant all on public.professional_private_identity to service_role;
grant all on public.professional_source_observations to service_role;
grant all on public.professional_education to service_role;
grant all on public.professional_experiences to service_role;
grant all on public.professional_achievements to service_role;
grant all on public.professional_data_quarantine to service_role;
grant all on public.professional_feature_snapshots to service_role;
grant all on public.professional_normalization_runs to service_role;
grant all on public.professional_source_releases to service_role;

grant usage, select on all sequences in schema public to service_role;
