-- ============================================================
-- 0015_technical_core_foundation.sql
--
-- Interview Preparation Technical Core:
--   * reviewed concept -> family -> version -> instance hierarchy
--   * immutable question, rubric, parameter and attempt evidence
--   * provenance, misconception, review and pilot operations
--   * owner-scoped diagnostics, mastery and disputes
--   * webhook-driven subscriptions and resource entitlements
--
-- Content and answer keys have no client-readable policies. Published
-- prompts are projected through capability-gated server routes only.
-- ============================================================

create table technical_concepts (
  id text primary key check (id ~ '^[AEVFMLCKJ][0-9]{2}$'),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  topic text not null check (topic in (
    'accounting', 'enterprise_value', 'valuation', 'dcf', 'ma', 'lbo',
    'debt_credit', 'capital_markets', 'applied_judgement'
  )),
  name text not null check (char_length(name) between 3 and 200),
  description text not null default '',
  sort_order integer not null check (sort_order between 0 and 1000),
  status text not null default 'active' check (status in ('active', 'retired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table technical_concept_edges (
  concept_id text not null references technical_concepts(id) on delete cascade,
  prerequisite_concept_id text not null references technical_concepts(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (concept_id, prerequisite_concept_id),
  check (concept_id <> prerequisite_concept_id)
);

create table technical_sources (
  id uuid primary key default gen_random_uuid(),
  source_type text not null check (source_type in (
    'authoritative_standard', 'law_regulator', 'public_company', 'public_transaction',
    'licensed_text', 'candidate_report', 'independent_bank_style', 'competitor_concept_research'
  )),
  title text not null check (char_length(title) between 1 and 500),
  publisher text not null check (char_length(publisher) between 1 and 300),
  url text,
  document_date date not null,
  accessed_at timestamptz not null,
  page_or_section text,
  jurisdiction text not null,
  rights_basis text not null check (rights_basis in (
    'fact_reference_only', 'licensed', 'permission', 'candidate_consent', 'public_domain'
  )),
  verbatim_text_used boolean not null default false check (verbatim_text_used = false),
  candidate_consent_recorded boolean not null default false,
  candidate_independence_key text,
  recruiting_cycle text,
  bank_name text,
  confidential_material_attested_absent boolean not null default false,
  notes text not null default '',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (source_type <> 'candidate_report' or (
    rights_basis = 'candidate_consent'
    and candidate_consent_recorded
    and confidential_material_attested_absent
    and candidate_independence_key is not null
  ))
);

create table technical_misconceptions (
  code text primary key check (code ~ '^[AEVFMLCKJ][0-9]{2}\.[A-Z0-9_]+$'),
  concept_id text not null references technical_concepts(id) on delete restrict,
  title text not null,
  explanation text not null,
  severity text not null check (severity in ('minor', 'material', 'fatal')),
  trigger_definition jsonb not null default '{}'::jsonb check (jsonb_typeof(trigger_definition) = 'object'),
  mastery_blocking boolean not null default false,
  retest_rule jsonb not null default '{"required_correct":2,"requires_non_standard":true}'::jsonb,
  status text not null default 'active' check (status in ('active', 'retired')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (split_part(code, '.', 1) = concept_id),
  check (severity <> 'fatal' or mastery_blocking)
);

create table technical_item_families (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  primary_concept_id text not null references technical_concepts(id) on delete restrict,
  topic text not null check (topic in (
    'accounting', 'enterprise_value', 'valuation', 'dcf', 'ma', 'lbo',
    'debt_credit', 'capital_markets', 'applied_judgement'
  )),
  difficulty text not null check (difficulty in ('foundation', 'interview_ready', 'advanced')),
  cognitive_operation text not null check (cognitive_operation in (
    'recall', 'explain', 'calculate', 'reverse', 'diagnose', 'compare', 'apply', 'defend'
  )),
  learning_objectives jsonb not null check (jsonb_typeof(learning_objectives) = 'array'),
  variant_coverage text[] not null default '{}'::text[],
  status text not null default 'draft' check (status in (
    'draft', 'technical_review', 'realism_review', 'pilot', 'published', 'retired'
  )),
  bank_reliability text not null default 'not_applicable' check (bank_reliability in (
    'official_public', 'corroborated_bank_specific', 'candidate_reported', 'bank_style', 'not_applicable'
  )),
  bank_name text,
  independent_report_count integer not null default 0 check (independent_report_count >= 0),
  recruiting_cycle_count integer not null default 0 check (recruiting_cycle_count >= 0),
  last_report_date date,
  author_id uuid references auth.users(id) on delete set null,
  next_review_at timestamptz,
  retired_at timestamptz,
  retirement_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (bank_reliability <> 'corroborated_bank_specific' or (
    bank_name is not null and independent_report_count >= 3
    and recruiting_cycle_count >= 2 and last_report_date is not null
  )),
  check (status <> 'retired' or (retired_at is not null and retirement_reason is not null))
);

create table technical_family_concepts (
  family_id uuid not null references technical_item_families(id) on delete cascade,
  concept_id text not null references technical_concepts(id) on delete restrict,
  relationship text not null check (relationship in ('secondary', 'prerequisite')),
  primary key (family_id, concept_id, relationship)
);

create table technical_question_versions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references technical_item_families(id) on delete restrict,
  version integer not null check (version > 0),
  status text not null default 'draft' check (status in ('draft', 'approved', 'superseded', 'retired')),
  prompt_template text not null check (char_length(prompt_template) between 1 and 8000),
  short_prompt_template text,
  followup_prompt_templates jsonb not null default '[]'::jsonb check (jsonb_typeof(followup_prompt_templates) = 'array'),
  jurisdiction text not null check (jurisdiction in ('AU', 'GLOBAL_IFRS', 'US_GAAP')),
  currency text not null check (currency in ('AUD', 'USD', 'GBP', 'NONE')),
  interview_rounds text[] not null,
  interviewer_levels text[] not null,
  calculator_policy text not null check (calculator_policy in ('not_allowed', 'mental_math', 'allowed')),
  expected_duration_min_seconds integer not null check (expected_duration_min_seconds >= 5),
  expected_duration_target_seconds integer not null check (expected_duration_target_seconds >= expected_duration_min_seconds),
  expected_duration_max_seconds integer not null check (expected_duration_max_seconds >= expected_duration_target_seconds),
  assumptions jsonb not null default '[]'::jsonb check (jsonb_typeof(assumptions) = 'array'),
  effective_from timestamptz not null,
  effective_to timestamptz,
  content_hash text not null check (char_length(content_hash) = 64),
  change_reason text not null,
  authored_by uuid references auth.users(id) on delete set null,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (family_id, version),
  unique (id, family_id),
  check (effective_to is null or effective_to > effective_from),
  check (status <> 'approved' or (approved_by is not null and approved_at is not null and authored_by is distinct from approved_by))
);

create table technical_rubric_versions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references technical_item_families(id) on delete restrict,
  version integer not null check (version > 0),
  status text not null default 'draft' check (status in ('draft', 'approved', 'superseded', 'retired')),
  answer_outline jsonb not null check (jsonb_typeof(answer_outline) = 'array'),
  must_hit_points jsonb not null check (jsonb_typeof(must_hit_points) = 'array'),
  bonus_points jsonb not null default '[]'::jsonb check (jsonb_typeof(bonus_points) = 'array'),
  fatal_errors jsonb not null default '[]'::jsonb check (jsonb_typeof(fatal_errors) = 'array'),
  accepted_variants jsonb not null default '[]'::jsonb check (jsonb_typeof(accepted_variants) = 'array'),
  common_misconceptions jsonb not null default '[]'::jsonb check (jsonb_typeof(common_misconceptions) = 'array'),
  deterministic_checks jsonb not null default '[]'::jsonb check (jsonb_typeof(deterministic_checks) = 'array'),
  followup_tree jsonb not null default '[]'::jsonb check (jsonb_typeof(followup_tree) = 'array'),
  content_hash text not null check (char_length(content_hash) = 64),
  change_reason text not null,
  authored_by uuid references auth.users(id) on delete set null,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (family_id, version),
  unique (id, family_id),
  check (status <> 'approved' or (approved_by is not null and approved_at is not null and authored_by is distinct from approved_by))
);

create table technical_parameter_specs (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references technical_item_families(id) on delete restrict,
  version integer not null check (version > 0),
  seed_version integer not null check (seed_version > 0),
  status text not null default 'draft' check (status in ('draft', 'approved', 'superseded', 'retired')),
  parameters jsonb not null default '[]'::jsonb check (jsonb_typeof(parameters) = 'array'),
  derived_values jsonb not null default '[]'::jsonb check (jsonb_typeof(derived_values) = 'array'),
  constraints jsonb not null default '[]'::jsonb check (jsonb_typeof(constraints) = 'array'),
  transformation_rules jsonb not null default '[]'::jsonb check (jsonb_typeof(transformation_rules) = 'array'),
  validation_instance_count integer not null default 0 check (validation_instance_count >= 0),
  validation_failure_count integer not null default 0 check (validation_failure_count >= 0),
  last_validated_at timestamptz,
  content_hash text not null check (char_length(content_hash) = 64),
  authored_by uuid references auth.users(id) on delete set null,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  unique (family_id, version),
  unique (id, family_id),
  check (validation_failure_count <= validation_instance_count),
  check (status <> 'approved' or (
    approved_by is not null and approved_at is not null
    and authored_by is distinct from approved_by
    and validation_instance_count >= 1000 and validation_failure_count = 0
  ))
);

create table technical_question_source_links (
  question_version_id uuid not null references technical_question_versions(id) on delete restrict,
  source_id uuid not null references technical_sources(id) on delete restrict,
  claim_supported text not null,
  source_location text,
  primary key (question_version_id, source_id, claim_supported)
);

create table technical_remediation_links (
  id uuid primary key default gen_random_uuid(),
  misconception_code text not null references technical_misconceptions(code) on delete restrict,
  sequence_order integer not null check (sequence_order between 1 and 10),
  remediation_type text not null check (remediation_type in (
    'micro_lesson', 'explain_simply', 'standard_drill', 'reversed_numerical_drill', 'spaced_retest'
  )),
  lesson_slug text,
  family_id uuid references technical_item_families(id) on delete restrict,
  delay_hours integer check (delay_hours is null or delay_hours >= 0),
  created_at timestamptz not null default now(),
  unique (misconception_code, sequence_order),
  check (lesson_slug is not null or family_id is not null)
);

create table technical_content_reviews (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references technical_item_families(id) on delete restrict,
  question_version_id uuid references technical_question_versions(id) on delete restrict,
  rubric_version_id uuid references technical_rubric_versions(id) on delete restrict,
  parameter_spec_id uuid references technical_parameter_specs(id) on delete restrict,
  review_type text not null check (review_type in (
    'technical', 'realism', 'accounting', 'numeric_qa', 'provenance', 'copyright', 'pilot_adjudication'
  )),
  reviewer_id uuid not null references auth.users(id) on delete restrict,
  decision text not null check (decision in ('changes_requested', 'approved', 'rejected')),
  blocking_comments jsonb not null default '[]'::jsonb check (jsonb_typeof(blocking_comments) = 'array'),
  non_blocking_comments jsonb not null default '[]'::jsonb check (jsonb_typeof(non_blocking_comments) = 'array'),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  check (decision = 'approved' or jsonb_array_length(blocking_comments) > 0)
);

create table technical_content_audit_events (
  id uuid primary key default gen_random_uuid(),
  family_id uuid references technical_item_families(id) on delete restrict,
  entity_type text not null,
  entity_id text not null,
  action text not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  reason text not null default '',
  before_data jsonb,
  after_data jsonb,
  founder_override boolean not null default false,
  override_expires_at timestamptz,
  created_at timestamptz not null default now(),
  check (not founder_override or (char_length(reason) > 0 and override_expires_at is not null))
);

create table technical_pilot_statistics (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references technical_item_families(id) on delete restrict,
  question_version_id uuid not null references technical_question_versions(id) on delete restrict,
  rubric_version_id uuid not null references technical_rubric_versions(id) on delete restrict,
  period_start date not null,
  period_end date not null,
  unique_students integer not null default 0 check (unique_students >= 0),
  attempt_count integer not null default 0 check (attempt_count >= 0),
  completion_rate numeric(7,6),
  dispute_rate numeric(7,6),
  upheld_content_error_rate numeric(7,6),
  human_agreement numeric(7,6),
  ai_within_one_band_rate numeric(7,6),
  fatal_error_recall numeric(7,6),
  invalid_instance_count integer not null default 0 check (invalid_instance_count >= 0),
  generated_at timestamptz not null default now(),
  unique (family_id, question_version_id, rubric_version_id, period_start, period_end),
  check (period_end >= period_start)
);

create table technical_question_instances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  family_id uuid not null references technical_item_families(id) on delete restrict,
  question_version_id uuid not null references technical_question_versions(id) on delete restrict,
  rubric_version_id uuid not null references technical_rubric_versions(id) on delete restrict,
  parameter_spec_id uuid not null references technical_parameter_specs(id) on delete restrict,
  seed text not null check (char_length(seed) between 1 and 200),
  seed_version integer not null check (seed_version > 0),
  variant text not null check (variant in (
    'standard', 'reversed', 'numerical', 'assumption_changed',
    'applied_company', 'explain_simply', 'followup_chain'
  )),
  resolved_parameters jsonb not null check (jsonb_typeof(resolved_parameters) = 'object'),
  derived_values jsonb not null check (jsonb_typeof(derived_values) = 'object'),
  rendered_prompt text not null,
  question_hash text not null check (char_length(question_hash) = 64),
  session_id uuid not null,
  created_at timestamptz not null default now(),
  unique (user_id, question_hash, session_id)
);

create table technical_attempts (
  id uuid primary key default gen_random_uuid(),
  instance_id uuid not null references technical_question_instances(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete cascade,
  answer_mode text not null check (answer_mode in ('text', 'audio')),
  answer_text text,
  transcript text,
  transcript_model text,
  audio_storage_path text,
  raw_media_consent boolean not null default false,
  raw_media_delete_after timestamptz,
  duration_seconds integer check (duration_seconds is null or duration_seconds between 0 and 7200),
  status text not null default 'submitted' check (status in ('submitted', 'grading', 'graded', 'disputed', 'void')),
  grader_stage text not null default 'deterministic_qualitative' check (grader_stage in (
    'deterministic_qualitative', 'provisional_category', 'validated_readiness'
  )),
  grader_model text,
  grader_prompt_version text,
  submitted_at timestamptz not null default now(),
  graded_at timestamptz,
  check (answer_text is not null or transcript is not null or audio_storage_path is not null),
  check (raw_media_consent or audio_storage_path is null),
  check (audio_storage_path is null or raw_media_delete_after is not null)
);

create table technical_attempt_evidence (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references technical_attempts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  rubric_point_code text not null,
  classification text not null check (classification in ('hit', 'partial', 'missed', 'contradicted', 'not_applicable')),
  confidence numeric(7,6) not null check (confidence between 0 and 1),
  evidence_excerpt text,
  deterministic_observation jsonb,
  human_label text,
  created_at timestamptz not null default now(),
  unique (attempt_id, rubric_point_code)
);

create table technical_attempt_misconceptions (
  attempt_id uuid not null references technical_attempts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  misconception_code text not null references technical_misconceptions(code) on delete restrict,
  confidence numeric(7,6) not null check (confidence between 0 and 1),
  detection_source text not null check (detection_source in ('deterministic', 'ai', 'human', 'repeated_low_confidence')),
  status text not null check (status in ('possible', 'confirmed', 'cleared', 'overturned')),
  detected_at timestamptz not null default now(),
  cleared_at timestamptz,
  primary key (attempt_id, misconception_code)
);

create table technical_diagnostic_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed', 'abandoned')),
  is_free_diagnostic boolean not null default true,
  target_role text,
  recruiting_stage text,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create table technical_diagnostic_results (
  id uuid primary key default gen_random_uuid(),
  diagnostic_run_id uuid not null references technical_diagnostic_runs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  concept_id text not null references technical_concepts(id) on delete restrict,
  mastery_label text not null check (mastery_label in (
    'not_assessed', 'emerging', 'developing', 'interview_ready', 'durable'
  )),
  evidence_confidence text not null check (evidence_confidence in ('low', 'moderate', 'high')),
  useful_attempts integer not null default 0 check (useful_attempts >= 0),
  correct_attempts integer not null default 0 check (correct_attempts >= 0),
  misconception_codes text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  unique (diagnostic_run_id, concept_id)
);

create table technical_concept_mastery (
  user_id uuid not null references auth.users(id) on delete cascade,
  concept_id text not null references technical_concepts(id) on delete restrict,
  mastery_label text not null check (mastery_label in (
    'not_assessed', 'emerging', 'developing', 'interview_ready', 'durable'
  )),
  evidence_confidence text not null check (evidence_confidence in ('low', 'moderate', 'high')),
  useful_attempts integer not null default 0 check (useful_attempts >= 0),
  correct_attempts integer not null default 0 check (correct_attempts >= 0),
  variant_count integer not null default 0 check (variant_count between 0 and 7),
  unresolved_fatal_misconceptions text[] not null default '{}'::text[],
  last_assessed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, concept_id),
  check (mastery_label not in ('interview_ready', 'durable') or cardinality(unresolved_fatal_misconceptions) = 0)
);

create table technical_disputes (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references technical_attempts(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete cascade,
  reason_code text not null check (reason_code in (
    'answer_key', 'accepted_variant', 'ambiguous_wording', 'grading', 'audio_transcription', 'other'
  )),
  description text not null check (char_length(description) between 10 and 4000),
  status text not null default 'open' check (status in ('open', 'reviewing', 'upheld', 'rejected', 'withdrawn')),
  resolution text,
  resolved_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table billing_customers (
  user_id uuid primary key references auth.users(id) on delete cascade,
  provider text not null default 'stripe' check (provider = 'stripe'),
  provider_customer_id text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table billing_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider_subscription_id text not null unique,
  provider_price_id text not null,
  status text not null check (status in (
    'incomplete', 'incomplete_expired', 'trialing', 'active', 'past_due', 'canceled', 'unpaid', 'paused'
  )),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  grace_ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table billing_webhook_receipts (
  provider_event_id text primary key,
  event_type text not null,
  payload_hash text not null check (char_length(payload_hash) = 64),
  status text not null default 'processing' check (status in ('processing', 'processed', 'ignored', 'error')),
  error_message text,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

create table resource_entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  resource_slug text not null,
  capability text not null,
  source text not null check (source in ('subscription', 'admin', 'pilot', 'free_diagnostic')),
  source_reference text,
  status text not null default 'active' check (status in ('active', 'grace', 'expired', 'revoked')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, resource_slug, capability, source),
  check (ends_at is null or ends_at > starts_at)
);

-- Query paths and owner predicates.
create index technical_concepts_topic_idx on technical_concepts (topic, sort_order);
create index technical_edges_prerequisite_idx on technical_concept_edges (prerequisite_concept_id);
create index technical_families_selection_idx on technical_item_families (status, topic, difficulty, primary_concept_id);
create index technical_questions_family_idx on technical_question_versions (family_id, version desc);
create index technical_rubrics_family_idx on technical_rubric_versions (family_id, version desc);
create index technical_parameters_family_idx on technical_parameter_specs (family_id, version desc);
create index technical_reviews_family_idx on technical_content_reviews (family_id, review_type, decision);
create index technical_instances_user_idx on technical_question_instances (user_id, created_at desc);
create index technical_attempts_user_idx on technical_attempts (user_id, submitted_at desc);
create index technical_evidence_attempt_idx on technical_attempt_evidence (attempt_id);
create index technical_misconceptions_user_idx on technical_attempt_misconceptions (user_id, status, detected_at desc);
create index technical_disputes_status_idx on technical_disputes (status, created_at);
create index billing_subscriptions_user_idx on billing_subscriptions (user_id, updated_at desc);
create index resource_entitlements_user_idx on resource_entitlements (user_id, resource_slug, capability, status);

-- Immutable content versions, question instances and submitted answers.
create or replace function technical_reject_mutation()
returns trigger language plpgsql
set search_path = public
as $$
begin
  raise exception '% records are immutable; create a new version instead', tg_table_name;
end;
$$;

create trigger technical_question_versions_immutable
  before update or delete on technical_question_versions
  for each row when (old.status <> 'draft') execute function technical_reject_mutation();
create trigger technical_rubric_versions_immutable
  before update or delete on technical_rubric_versions
  for each row when (old.status <> 'draft') execute function technical_reject_mutation();
create trigger technical_parameter_specs_immutable
  before update or delete on technical_parameter_specs
  for each row when (old.status <> 'draft') execute function technical_reject_mutation();
create trigger technical_question_instances_immutable
  before update or delete on technical_question_instances
  for each row execute function technical_reject_mutation();

create or replace function technical_attempt_immutable_fields()
returns trigger language plpgsql
set search_path = public
as $$
begin
  if new.instance_id <> old.instance_id or new.user_id <> old.user_id
     or new.answer_mode <> old.answer_mode or new.answer_text is distinct from old.answer_text
     or new.transcript is distinct from old.transcript or new.audio_storage_path is distinct from old.audio_storage_path
     or new.submitted_at <> old.submitted_at then
    raise exception 'Submitted attempt content is immutable';
  end if;
  return new;
end;
$$;
create trigger technical_attempts_immutable_content
  before update on technical_attempts for each row execute function technical_attempt_immutable_fields();

-- Publishing is a database-enforced state transition, not an optimistic UI action.
create or replace function technical_validate_family_publish()
returns trigger language plpgsql
set search_path = public
as $$
declare
  v_author uuid;
begin
  if new.status <> 'published' or old.status = 'published' then return new; end if;
  if not exists (select 1 from technical_question_versions q where q.family_id = new.id and q.status = 'approved') then
    raise exception 'PUBLISH_REQUIRES_APPROVED_QUESTION';
  end if;
  if not exists (select 1 from technical_rubric_versions r where r.family_id = new.id and r.status = 'approved') then
    raise exception 'PUBLISH_REQUIRES_APPROVED_RUBRIC';
  end if;
  if not exists (select 1 from technical_parameter_specs p where p.family_id = new.id and p.status = 'approved') then
    raise exception 'PUBLISH_REQUIRES_VALIDATED_PARAMETERS';
  end if;
  if not exists (
    select 1 from technical_question_versions q
    join technical_question_source_links l on l.question_version_id = q.id
    where q.family_id = new.id and q.status = 'approved'
  ) then raise exception 'PUBLISH_REQUIRES_PROVENANCE'; end if;
  if exists (
    select 1 from technical_question_versions q
    join technical_question_source_links l on l.question_version_id = q.id
    join technical_sources s on s.id = l.source_id
    where q.family_id = new.id and q.status = 'approved'
      and s.source_type = 'competitor_concept_research'
  ) then raise exception 'COMPETITOR_RESEARCH_CANNOT_SUPPORT_PUBLISHED_WORDING'; end if;
  if new.bank_reliability = 'corroborated_bank_specific' then
    if new.last_report_date < current_date - interval '24 months' then
      raise exception 'BANK_SPECIFIC_CORROBORATION_IS_STALE';
    end if;
    if not exists (
      select 1
      from technical_question_versions q
      join technical_question_source_links l on l.question_version_id = q.id
      join technical_sources s on s.id = l.source_id
      where q.family_id = new.id and q.status = 'approved'
        and s.source_type = 'candidate_report'
        and s.bank_name = new.bank_name
      group by q.family_id
      having count(distinct s.candidate_independence_key) >= 3
        and count(distinct s.recruiting_cycle) >= 2
        and max(s.document_date) >= current_date - interval '24 months'
    ) then raise exception 'BANK_SPECIFIC_CORROBORATION_SOURCES_INSUFFICIENT'; end if;
  end if;
  if not exists (select 1 from technical_content_reviews where family_id = new.id and review_type = 'technical' and decision = 'approved') then
    raise exception 'PUBLISH_REQUIRES_TECHNICAL_REVIEW';
  end if;
  if not exists (select 1 from technical_content_reviews where family_id = new.id and review_type = 'realism' and decision = 'approved') then
    raise exception 'PUBLISH_REQUIRES_REALISM_REVIEW';
  end if;
  if not exists (select 1 from technical_content_reviews where family_id = new.id and review_type = 'copyright' and decision = 'approved') then
    raise exception 'PUBLISH_REQUIRES_COPYRIGHT_REVIEW';
  end if;
  if exists (select 1 from technical_content_reviews where family_id = new.id and decision = 'changes_requested' and resolved_at is null) then
    raise exception 'PUBLISH_HAS_UNRESOLVED_BLOCKERS';
  end if;
  select author_id into v_author from technical_item_families where id = new.id;
  if exists (select 1 from technical_content_reviews where family_id = new.id and decision = 'approved' and reviewer_id = v_author) then
    raise exception 'AUTHOR_CANNOT_APPROVE_OWN_CONTENT';
  end if;
  if cardinality(new.variant_coverage) = 0 then raise exception 'PUBLISH_REQUIRES_VARIANTS'; end if;
  return new;
end;
$$;
create trigger technical_family_publish_guard
  before update of status on technical_item_families
  for each row execute function technical_validate_family_publish();

-- Update timestamps for mutable operational records.
create trigger technical_concepts_updated_at before update on technical_concepts
  for each row execute function set_updated_at();
create trigger technical_sources_updated_at before update on technical_sources
  for each row execute function set_updated_at();
create trigger technical_misconceptions_updated_at before update on technical_misconceptions
  for each row execute function set_updated_at();
create trigger technical_families_updated_at before update on technical_item_families
  for each row execute function set_updated_at();
create trigger technical_mastery_updated_at before update on technical_concept_mastery
  for each row execute function set_updated_at();
create trigger billing_customers_updated_at before update on billing_customers
  for each row execute function set_updated_at();
create trigger billing_subscriptions_updated_at before update on billing_subscriptions
  for each row execute function set_updated_at();
create trigger resource_entitlements_updated_at before update on resource_entitlements
  for each row execute function set_updated_at();

-- Every public table is RLS protected. Content/answer-key tables deliberately
-- receive no client policies. Only service-role routes may access them.
alter table technical_concepts enable row level security;
alter table technical_concept_edges enable row level security;
alter table technical_sources enable row level security;
alter table technical_misconceptions enable row level security;
alter table technical_item_families enable row level security;
alter table technical_family_concepts enable row level security;
alter table technical_question_versions enable row level security;
alter table technical_rubric_versions enable row level security;
alter table technical_parameter_specs enable row level security;
alter table technical_question_source_links enable row level security;
alter table technical_remediation_links enable row level security;
alter table technical_content_reviews enable row level security;
alter table technical_content_audit_events enable row level security;
alter table technical_pilot_statistics enable row level security;
alter table technical_question_instances enable row level security;
alter table technical_attempts enable row level security;
alter table technical_attempt_evidence enable row level security;
alter table technical_attempt_misconceptions enable row level security;
alter table technical_diagnostic_runs enable row level security;
alter table technical_diagnostic_results enable row level security;
alter table technical_concept_mastery enable row level security;
alter table technical_disputes enable row level security;
alter table billing_customers enable row level security;
alter table billing_subscriptions enable row level security;
alter table billing_webhook_receipts enable row level security;
alter table resource_entitlements enable row level security;

create policy "users read own technical attempts" on technical_attempts
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "users read own technical evidence" on technical_attempt_evidence
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "users read own technical misconceptions" on technical_attempt_misconceptions
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "users read own diagnostic runs" on technical_diagnostic_runs
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "users read own diagnostic results" on technical_diagnostic_results
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "users read own technical mastery" on technical_concept_mastery
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "users read own technical disputes" on technical_disputes
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "users read own billing customer" on billing_customers
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "users read own subscriptions" on billing_subscriptions
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "users read own entitlements" on resource_entitlements
  for select to authenticated using ((select auth.uid()) = user_id);

-- Service routes write student evidence; direct Data API writes stay closed.
revoke all on technical_sources, technical_misconceptions, technical_item_families,
  technical_family_concepts, technical_question_versions, technical_rubric_versions,
  technical_parameter_specs, technical_question_source_links, technical_remediation_links,
  technical_content_reviews, technical_content_audit_events, technical_pilot_statistics,
  billing_webhook_receipts from anon, authenticated;
