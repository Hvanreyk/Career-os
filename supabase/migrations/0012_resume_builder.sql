-- ============================================================
-- 0012_resume_builder.sql
--
-- Resume Builder v2:
--   * contact/header fields on the master resume
--   * entries (org / role / dates / location) between sections and bullets
--   * one leased AI job table for import / compose / improve / tailor
--   * atomic wholesale document replace
--   * Sydney-day quota for the heavy AI generators
--
-- The 0008 critique surface (receipts, revisions, critique quota) is
-- intentionally untouched.
-- ============================================================

-- ─── Resume header / contact fields ─────────────────────────

alter table resumes
  add column full_name    text check (full_name is null or char_length(full_name) between 1 and 120),
  add column email        text check (email is null or char_length(email) between 3 and 254),
  add column phone        text check (phone is null or char_length(phone) between 1 and 40),
  add column linkedin_url text check (linkedin_url is null or char_length(linkedin_url) between 1 and 200),
  add column location     text check (location is null or char_length(location) between 1 and 120);

-- ─── Entries ────────────────────────────────────────────────

create table resume_entries (
  id          uuid primary key default gen_random_uuid(),
  section_id  uuid not null,
  user_id     uuid not null references auth.users(id) on delete cascade,
  org         text not null,
  role_title  text,
  location    text,
  date_range  text, -- display text, e.g. "Nov 2024 – Feb 2025"
  sort_order  integer not null default 0 check (sort_order between 0 and 1000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (id, user_id),
  foreign key (section_id, user_id)
    references resume_sections(id, user_id) on delete cascade,
  check (char_length(org) between 1 and 120),
  check (role_title is null or char_length(role_title) between 1 and 120),
  check (location is null or char_length(location) between 1 and 80),
  check (date_range is null or char_length(date_range) between 1 and 60)
);

create index resume_entries_section_idx
  on resume_entries (section_id, sort_order, created_at);

create trigger resume_entries_updated_at
  before update on resume_entries
  for each row execute function set_updated_at();

alter table resume_entries enable row level security;

create policy "users manage own resume entries"
  on resume_entries for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Bullets may attach to an entry. entry_id stays nullable so existing
-- section-level bullets (and skills/interests lines) remain valid; the
-- critique/revision path keys only on bullet_id and is unaffected.
alter table resume_bullets add column entry_id uuid;
alter table resume_bullets
  add constraint resume_bullets_entry_fk
  foreign key (entry_id, user_id)
    references resume_entries(id, user_id) on delete cascade;

create index resume_bullets_entry_idx
  on resume_bullets (entry_id, sort_order)
  where entry_id is not null;

-- Defense in depth: an entry-attached bullet must live in the same section
-- as its entry. Route handlers enforce this first; this trigger backstops.
create or replace function check_resume_bullet_entry_section()
returns trigger
language plpgsql
as $$
declare
  v_entry_section uuid;
begin
  if new.entry_id is null then
    return new;
  end if;
  select section_id into v_entry_section
  from resume_entries
  where id = new.entry_id and user_id = new.user_id;
  if v_entry_section is null or v_entry_section <> new.section_id then
    raise exception 'ENTRY_SECTION_MISMATCH';
  end if;
  return new;
end;
$$;

create trigger resume_bullets_entry_section
  before insert or update of entry_id, section_id on resume_bullets
  for each row execute function check_resume_bullet_entry_section();

-- ─── AI jobs (import / compose / improve / tailor) ──────────

create table resume_ai_jobs (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users(id) on delete cascade,
  resume_id             uuid,
  kind                  text not null
    check (kind in ('import', 'compose', 'improve', 'tailor')),
  status                text not null default 'pending'
    check (status in ('pending', 'processing', 'completed', 'error')),
  input                 jsonb not null,
  input_hash            text not null check (char_length(input_hash) = 64),
  output                jsonb,
  error_message         text,
  model                 text,
  generation_version    text not null,
  input_tokens          integer not null default 0 check (input_tokens >= 0),
  output_tokens         integer not null default 0 check (output_tokens >= 0),
  processing_started_at timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (id, user_id),
  -- user_id is NOT NULL, so only resume_id may be nulled when the resume
  -- is deleted (PostgreSQL 15+ column-specific ON DELETE SET NULL).
  foreign key (resume_id, user_id)
    references resumes(id, user_id) on delete set null (resume_id),
  check (jsonb_typeof(input) = 'object'),
  check (octet_length(input::text) <= 150000),
  check (output is null or (jsonb_typeof(output) = 'object' and octet_length(output::text) <= 250000)),
  check (model is null or char_length(model) between 1 and 120),
  check (char_length(generation_version) between 1 and 80)
);

-- Identical live requests reuse the same job (mirrors course_roadmaps).
-- generation_version is part of the key so a prompt/model upgrade can never
-- reuse a completed job generated under an older version.
create unique index resume_ai_jobs_active_uidx
  on resume_ai_jobs (user_id, kind, generation_version, input_hash)
  where status in ('pending', 'processing', 'completed');

create index resume_ai_jobs_user_idx
  on resume_ai_jobs (user_id, created_at desc);

create trigger resume_ai_jobs_updated_at
  before update on resume_ai_jobs
  for each row execute function set_updated_at();

alter table resume_ai_jobs enable row level security;

-- Clients may read their own jobs; every write happens through the
-- service role (route handlers + claim RPC below).
create policy "users read own resume ai jobs"
  on resume_ai_jobs for select
  using (auth.uid() = user_id);

-- Atomic claim with a short lease so concurrent process calls never
-- duplicate model spend and interrupted invocations can be resumed.
-- Adapted from claim_course_roadmap (0007).
create or replace function claim_resume_ai_job(
  p_job_id uuid,
  p_user_id uuid
)
returns setof resume_ai_jobs
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Opportunistic retention: jobs are working artifacts, not records.
  delete from resume_ai_jobs
  where updated_at < now() - interval '30 days';

  return query
  update resume_ai_jobs
  set status = 'processing',
      processing_started_at = now(),
      updated_at = now()
  where id = p_job_id
    and user_id = p_user_id
    and (
      status in ('pending', 'error')
      or (status = 'processing'
          and processing_started_at < now() - interval '5 minutes')
    )
  returning *;
end;
$$;

revoke all on function claim_resume_ai_job(uuid, uuid) from public, anon, authenticated;
grant execute on function claim_resume_ai_job(uuid, uuid) to service_role;

-- ─── Atomic wholesale document replace ──────────────────────
--
-- Applies a full ResumeDocument (validated by the route handler against
-- lib/resume/document.ts limits) in one transaction: header fields are
-- updated, then sections/entries/bullets are deleted and reinserted.
-- NOTE: replaced bullets cascade-delete their resume_bullet_revisions
-- history. The UI warns before wholesale replaces (import / auto-create).

create or replace function replace_resume_document(
  p_user_id uuid,
  p_resume_id uuid,
  p_document jsonb
)
returns setof resumes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_resume resumes%rowtype;
  v_section jsonb;
  v_entry jsonb;
  v_bullet jsonb;
  v_section_id uuid;
  v_entry_id uuid;
  v_section_index integer := 0;
  v_entry_index integer;
  v_bullet_index integer;
begin
  select * into v_resume
  from resumes
  where id = p_resume_id and user_id = p_user_id
  for update;

  if not found then
    raise exception 'RESUME_NOT_FOUND';
  end if;
  if jsonb_typeof(p_document) <> 'object'
     or jsonb_typeof(p_document->'sections') <> 'array' then
    raise exception 'INVALID_DOCUMENT';
  end if;
  if jsonb_array_length(p_document->'sections') > 12 then
    raise exception 'TOO_MANY_SECTIONS';
  end if;

  update resumes
  set full_name    = nullif(p_document->'contact'->>'full_name', ''),
      email        = nullif(p_document->'contact'->>'email', ''),
      phone        = nullif(p_document->'contact'->>'phone', ''),
      linkedin_url = nullif(p_document->'contact'->>'linkedin_url', ''),
      location     = nullif(p_document->'contact'->>'location', ''),
      updated_at   = now()
  where id = p_resume_id and user_id = p_user_id;

  delete from resume_sections
  where resume_id = p_resume_id and user_id = p_user_id;

  for v_section in select * from jsonb_array_elements(p_document->'sections')
  loop
    insert into resume_sections (resume_id, user_id, kind, heading, sort_order)
    values (
      p_resume_id,
      p_user_id,
      v_section->>'kind',
      v_section->>'heading',
      v_section_index
    )
    returning id into v_section_id;

    if jsonb_typeof(v_section->'entries') = 'array' then
      if jsonb_array_length(v_section->'entries') > 10 then
        raise exception 'TOO_MANY_ENTRIES';
      end if;
      v_entry_index := 0;
      for v_entry in select * from jsonb_array_elements(v_section->'entries')
      loop
        insert into resume_entries (
          section_id, user_id, org, role_title, location, date_range, sort_order
        ) values (
          v_section_id,
          p_user_id,
          v_entry->>'org',
          nullif(v_entry->>'role_title', ''),
          nullif(v_entry->>'location', ''),
          nullif(v_entry->>'date_range', ''),
          v_entry_index
        )
        returning id into v_entry_id;

        if jsonb_typeof(v_entry->'bullets') = 'array' then
          if jsonb_array_length(v_entry->'bullets') > 12 then
            raise exception 'TOO_MANY_BULLETS';
          end if;
          v_bullet_index := 0;
          for v_bullet in select * from jsonb_array_elements(v_entry->'bullets')
          loop
            insert into resume_bullets (
              section_id, entry_id, user_id, text, status, sort_order
            ) values (
              v_section_id, v_entry_id, p_user_id,
              v_bullet #>> '{}', 'draft', v_bullet_index
            );
            v_bullet_index := v_bullet_index + 1;
          end loop;
        end if;
        v_entry_index := v_entry_index + 1;
      end loop;
    end if;

    if jsonb_typeof(v_section->'loose_bullets') = 'array' then
      if jsonb_array_length(v_section->'loose_bullets') > 12 then
        raise exception 'TOO_MANY_BULLETS';
      end if;
      v_bullet_index := 0;
      for v_bullet in select * from jsonb_array_elements(v_section->'loose_bullets')
      loop
        insert into resume_bullets (
          section_id, user_id, text, status, sort_order
        ) values (
          v_section_id, p_user_id, v_bullet #>> '{}', 'draft', v_bullet_index
        );
        v_bullet_index := v_bullet_index + 1;
      end loop;
    end if;

    v_section_index := v_section_index + 1;
  end loop;

  return query
  select * from resumes where id = p_resume_id and user_id = p_user_id;
end;
$$;

revoke all on function replace_resume_document(uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function replace_resume_document(uuid, uuid, jsonb) to service_role;

-- ─── Heavy-generator quota (per kind, Sydney day) ───────────

create table resume_ai_daily_usage (
  user_id     uuid not null references auth.users(id) on delete cascade,
  usage_date  date not null,
  kind        text not null
    check (kind in ('import', 'compose', 'improve', 'tailor')),
  count       integer not null default 0 check (count >= 0),
  updated_at  timestamptz not null default now(),
  primary key (user_id, usage_date, kind)
);

alter table resume_ai_daily_usage enable row level security;
-- No client policy: the UI receives only counts from route handlers.

create or replace function claim_resume_ai_quota(
  p_user_id uuid,
  p_kind text,
  p_limit integer
)
returns table (
  allowed boolean,
  usage_count integer,
  remaining integer,
  usage_date date,
  resets_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_day date := timezone('Australia/Sydney', now())::date;
  v_count integer;
  v_reset timestamptz := ((timezone('Australia/Sydney', now())::date + 1)::timestamp at time zone 'Australia/Sydney');
begin
  if p_limit < 1 or p_limit > 10000 then
    raise exception 'Invalid AI quota limit';
  end if;
  if p_kind not in ('import', 'compose', 'improve', 'tailor') then
    raise exception 'Invalid AI quota kind';
  end if;

  delete from resume_ai_daily_usage
  where usage_date < v_day - 31;

  insert into resume_ai_daily_usage (user_id, usage_date, kind, count)
  values (p_user_id, v_day, p_kind, 1)
  on conflict (user_id, usage_date, kind) do update
    set count = resume_ai_daily_usage.count + 1,
        updated_at = now()
    where resume_ai_daily_usage.count < p_limit
  returning count into v_count;

  if v_count is null then
    select u.count into v_count
    from resume_ai_daily_usage u
    where u.user_id = p_user_id and u.usage_date = v_day and u.kind = p_kind;
    return query select false, coalesce(v_count, p_limit), 0, v_day, v_reset;
    return;
  end if;

  return query select true, v_count, greatest(p_limit - v_count, 0), v_day, v_reset;
end;
$$;

create or replace function release_resume_ai_quota(
  p_user_id uuid,
  p_kind text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_day date := timezone('Australia/Sydney', now())::date;
begin
  update resume_ai_daily_usage
  set count = greatest(count - 1, 0), updated_at = now()
  where user_id = p_user_id and usage_date = v_day and kind = p_kind;
end;
$$;

revoke all on function claim_resume_ai_quota(uuid, text, integer) from public, anon, authenticated;
revoke all on function release_resume_ai_quota(uuid, text) from public, anon, authenticated;
grant execute on function claim_resume_ai_quota(uuid, text, integer) to service_role;
grant execute on function release_resume_ai_quota(uuid, text) to service_role;
