-- ============================================================
-- 0002_student_profiles_and_reports.sql
--
-- Two tables for the Phase 5 onboarding + report flow.
--
-- student_profiles  — one row per user submission (full StudentProfile JSON)
-- reports           — one row per generated report (scoring + LLM output)
--
-- has_access on reports defaults TRUE for MVP (no Stripe).
-- When payment is added: set default false, flip to true on webhook.
-- ============================================================

-- ─── student_profiles ────────────────────────────────────────

create table if not exists student_profiles (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  email       text not null,
  profile     jsonb not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Only the owning user can read/write their profile.
alter table student_profiles enable row level security;

create policy "users manage own profile"
  on student_profiles
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Updated-at trigger
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger student_profiles_updated_at
  before update on student_profiles
  for each row execute function set_updated_at();

-- ─── reports ─────────────────────────────────────────────────

create table if not exists reports (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  profile_id      uuid not null references student_profiles(id) on delete cascade,
  scoring_output  jsonb not null,
  llm_report      jsonb not null,
  -- Payment gate. TRUE = user can see the report.
  -- MVP: defaults true. Stripe phase: set default false,
  --      flip to true in the payment webhook handler.
  has_access      boolean not null default true,
  status          text not null default 'completed'
    check (status in ('pending', 'completed', 'error')),
  error_message   text,
  created_at      timestamptz not null default now()
);

-- Users can only read reports they own and have access to.
alter table reports enable row level security;

create policy "users read own accessible reports"
  on reports
  for select
  using (auth.uid() = user_id and has_access = true);

-- ─── Index for fast report lookup by user ────────────────────

create index if not exists reports_user_id_idx
  on reports (user_id, created_at desc);

create index if not exists student_profiles_user_id_idx
  on student_profiles (user_id);
