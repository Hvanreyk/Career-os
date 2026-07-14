-- ============================================================
-- 0008_resume_workshop.sql
--
-- Phase 1 Resume & Cover Letter workspace:
--   * one structured master resume per student
--   * owner-isolated sections, bullets and explicitly saved revisions
--   * atomic, Sydney-day AI critique quota
--   * atomic revision save bound to the critiqued bullet text
-- ============================================================

create extension if not exists pgcrypto;

-- ─── Master resume ──────────────────────────────────────────

create table resumes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null default 'Master resume',
  status      text not null default 'draft'
    check (status in ('draft', 'current')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id),
  unique (id, user_id),
  check (char_length(title) between 1 and 120)
);

create table resume_sections (
  id          uuid primary key default gen_random_uuid(),
  resume_id   uuid not null,
  user_id     uuid not null references auth.users(id) on delete cascade,
  kind        text not null
    check (kind in ('education', 'experience', 'leadership', 'extracurricular', 'skills', 'other')),
  heading     text not null,
  sort_order  integer not null default 0 check (sort_order between 0 and 1000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (id, user_id),
  foreign key (resume_id, user_id)
    references resumes(id, user_id) on delete cascade,
  check (char_length(heading) between 1 and 80)
);

create table resume_bullets (
  id          uuid primary key default gen_random_uuid(),
  section_id  uuid not null,
  user_id     uuid not null references auth.users(id) on delete cascade,
  text        text not null,
  status      text not null default 'draft'
    check (status in ('draft', 'final')),
  sort_order  integer not null default 0 check (sort_order between 0 and 1000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (id, user_id),
  foreign key (section_id, user_id)
    references resume_sections(id, user_id) on delete cascade,
  check (char_length(text) between 1 and 1000)
);

create table resume_bullet_revisions (
  id              uuid primary key default gen_random_uuid(),
  bullet_id       uuid not null,
  user_id         uuid not null references auth.users(id) on delete cascade,
  original_text   text not null,
  revised_text    text not null,
  critique        jsonb not null,
  input_hash      text not null,
  model           text not null,
  prompt_version  text not null,
  input_tokens    integer not null default 0 check (input_tokens >= 0),
  output_tokens   integer not null default 0 check (output_tokens >= 0),
  created_at      timestamptz not null default now(),
  foreign key (bullet_id, user_id)
    references resume_bullets(id, user_id) on delete cascade,
  check (char_length(original_text) between 1 and 1000),
  check (char_length(revised_text) between 1 and 1000),
  check (char_length(input_hash) = 64),
  check (char_length(model) between 1 and 120),
  check (char_length(prompt_version) between 1 and 80),
  check (jsonb_typeof(critique) = 'object'),
  check (octet_length(critique::text) <= 50000)
);

-- Text-free operational counter. Old rows are pruned opportunistically by
-- claim_resume_critique_quota and are intentionally not deleted with a resume.
create table resume_critique_daily_usage (
  user_id     uuid not null references auth.users(id) on delete cascade,
  usage_date  date not null,
  count       integer not null default 0 check (count >= 0),
  updated_at  timestamptz not null default now(),
  primary key (user_id, usage_date)
);

create index resume_sections_resume_idx
  on resume_sections (resume_id, sort_order, created_at);
create index resume_bullets_section_idx
  on resume_bullets (section_id, sort_order, created_at);
create index resume_bullet_revisions_bullet_idx
  on resume_bullet_revisions (bullet_id, created_at desc);

create trigger resumes_updated_at
  before update on resumes
  for each row execute function set_updated_at();
create trigger resume_sections_updated_at
  before update on resume_sections
  for each row execute function set_updated_at();
create trigger resume_bullets_updated_at
  before update on resume_bullets
  for each row execute function set_updated_at();

-- ─── Owner RLS ──────────────────────────────────────────────

alter table resumes enable row level security;
alter table resume_sections enable row level security;
alter table resume_bullets enable row level security;
alter table resume_bullet_revisions enable row level security;
alter table resume_critique_daily_usage enable row level security;

create policy "users manage own resumes"
  on resumes for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users manage own resume sections"
  on resume_sections for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users manage own resume bullets"
  on resume_bullets for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Revisions are immutable from the browser. They are inserted by the
-- service-role-only save_resume_bullet_revision function after receipt checks.
create policy "users read own resume bullet revisions"
  on resume_bullet_revisions for select
  using (auth.uid() = user_id);

-- No client policy for quota rows. The UI receives only count/remaining values
-- from authenticated route handlers.

-- ─── Atomic quota ───────────────────────────────────────────

create or replace function claim_resume_critique_quota(
  p_user_id uuid,
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
    raise exception 'Invalid critique quota limit';
  end if;

  -- Any critique activity prunes expired, text-free counters globally. This
  -- avoids requiring a scheduler for the pilot while bounding retention.
  delete from resume_critique_daily_usage
  where usage_date < v_day - 31;

  insert into resume_critique_daily_usage (user_id, usage_date, count)
  values (p_user_id, v_day, 1)
  on conflict (user_id, usage_date) do update
    set count = resume_critique_daily_usage.count + 1,
        updated_at = now()
    where resume_critique_daily_usage.count < p_limit
  returning count into v_count;

  if v_count is null then
    select u.count into v_count
    from resume_critique_daily_usage u
    where u.user_id = p_user_id and u.usage_date = v_day;
    return query select false, coalesce(v_count, p_limit), 0, v_day, v_reset;
    return;
  end if;

  return query select true, v_count, greatest(p_limit - v_count, 0), v_day, v_reset;
end;
$$;

create or replace function release_resume_critique_quota(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_day date := timezone('Australia/Sydney', now())::date;
begin
  update resume_critique_daily_usage
  set count = greatest(count - 1, 0), updated_at = now()
  where user_id = p_user_id and usage_date = v_day;
end;
$$;

revoke all on function claim_resume_critique_quota(uuid, integer) from public, anon, authenticated;
revoke all on function release_resume_critique_quota(uuid) from public, anon, authenticated;
grant execute on function claim_resume_critique_quota(uuid, integer) to service_role;
grant execute on function release_resume_critique_quota(uuid) to service_role;

-- ─── Atomic revision save ───────────────────────────────────

create or replace function save_resume_bullet_revision(
  p_user_id uuid,
  p_bullet_id uuid,
  p_input_hash text,
  p_revised_text text,
  p_critique jsonb,
  p_model text,
  p_prompt_version text,
  p_input_tokens integer,
  p_output_tokens integer
)
returns setof resume_bullet_revisions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bullet resume_bullets%rowtype;
  v_revision resume_bullet_revisions%rowtype;
begin
  select * into v_bullet
  from resume_bullets
  where id = p_bullet_id and user_id = p_user_id
  for update;

  if not found then
    raise exception 'BULLET_NOT_FOUND';
  end if;
  if encode(digest(v_bullet.text, 'sha256'), 'hex') <> p_input_hash then
    raise exception 'STALE_CRITIQUE';
  end if;

  insert into resume_bullet_revisions (
    bullet_id, user_id, original_text, revised_text, critique, input_hash,
    model, prompt_version, input_tokens, output_tokens
  ) values (
    p_bullet_id, p_user_id, v_bullet.text, p_revised_text, p_critique,
    p_input_hash, p_model, p_prompt_version, p_input_tokens, p_output_tokens
  ) returning * into v_revision;

  update resume_bullets
  set text = p_revised_text, updated_at = now()
  where id = p_bullet_id and user_id = p_user_id;

  return next v_revision;
end;
$$;

revoke all on function save_resume_bullet_revision(
  uuid, uuid, text, text, jsonb, text, text, integer, integer
) from public, anon, authenticated;
grant execute on function save_resume_bullet_revision(
  uuid, uuid, text, text, jsonb, text, text, integer, integer
) to service_role;
