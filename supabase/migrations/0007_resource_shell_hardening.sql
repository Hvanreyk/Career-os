-- ============================================================
-- 0007_resource_shell_hardening.sql
--
-- Phase 0 foundations for the six-resource shell:
--   * enforce the published parent chain in content RLS
--   * track admin-authored content and immutable revision history
--   * make roadmap generation atomically claimable/idempotent
--   * add a private, server-written product event stream
-- ============================================================

-- ─── Published content hierarchy ───────────────────────────

drop policy if exists "anyone reads published modules" on course_modules;
create policy "anyone reads published modules in published courses"
  on course_modules
  for select
  using (
    status = 'published'
    and exists (
      select 1 from courses
      where courses.id = course_modules.course_id
        and courses.status = 'published'
    )
  );

drop policy if exists "anyone reads published lessons" on lessons;
create policy "anyone reads published lessons in published courses"
  on lessons
  for select
  using (
    status = 'published'
    and exists (
      select 1
      from course_modules
      join courses on courses.id = course_modules.course_id
      where course_modules.id = lessons.module_id
        and course_modules.status = 'published'
        and courses.status = 'published'
    )
  );

-- ─── Editorial ownership + revision history ────────────────
-- File-authored content remains the bootstrap source. Once an admin edits a
-- row, editorial_source='admin' makes that ownership explicit and the seed
-- command refuses to overwrite it unless --force-admin-overwrite is supplied.

alter table courses
  add column if not exists editorial_source text not null default 'file',
  add column if not exists editorial_revision integer not null default 1,
  add column if not exists last_edited_by uuid references auth.users(id) on delete set null;

alter table course_modules
  add column if not exists editorial_source text not null default 'file',
  add column if not exists editorial_revision integer not null default 1,
  add column if not exists last_edited_by uuid references auth.users(id) on delete set null;

alter table lessons
  add column if not exists editorial_source text not null default 'file',
  add column if not exists editorial_revision integer not null default 1,
  add column if not exists last_edited_by uuid references auth.users(id) on delete set null;

alter table quiz_questions
  add column if not exists editorial_source text not null default 'file',
  add column if not exists editorial_revision integer not null default 1,
  add column if not exists last_edited_by uuid references auth.users(id) on delete set null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'courses_editorial_source_check') then
    alter table courses add constraint courses_editorial_source_check
      check (editorial_source in ('file', 'admin'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'course_modules_editorial_source_check') then
    alter table course_modules add constraint course_modules_editorial_source_check
      check (editorial_source in ('file', 'admin'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'lessons_editorial_source_check') then
    alter table lessons add constraint lessons_editorial_source_check
      check (editorial_source in ('file', 'admin'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'quiz_questions_editorial_source_check') then
    alter table quiz_questions add constraint quiz_questions_editorial_source_check
      check (editorial_source in ('file', 'admin'));
  end if;
end $$;

create table if not exists course_content_revisions (
  id              uuid primary key default gen_random_uuid(),
  course_id       uuid not null references courses(id) on delete cascade,
  entity_type     text not null
    check (entity_type in ('course', 'module', 'lesson', 'quiz_question')),
  entity_id       uuid not null,
  action          text not null default 'update'
    check (action in ('create', 'update', 'publish', 'unpublish', 'delete')),
  revision        integer not null,
  before_data     jsonb,
  after_data      jsonb,
  note            text not null default '',
  actor_user_id   uuid references auth.users(id) on delete set null,
  created_at      timestamptz not null default now()
);

alter table course_content_revisions enable row level security;
-- No client policies: the Admin UI reads/writes through authenticated,
-- role-checked server code using the service client.

create index if not exists course_content_revisions_course_idx
  on course_content_revisions (course_id, created_at desc);
create index if not exists course_content_revisions_entity_idx
  on course_content_revisions (entity_type, entity_id, created_at desc);

-- Revision creation belongs in the same database transaction as the content
-- mutation. The application may add a human note afterwards, but a failed or
-- interrupted request cannot leave an un-audited admin content change.
create or replace function record_course_content_revision()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_course_id uuid;
  v_entity_type text;
  v_action text;
begin
  if new.editorial_source <> 'admin' then
    return new;
  end if;
  if tg_op = 'UPDATE' and new.editorial_revision = old.editorial_revision then
    return new;
  end if;

  if tg_table_name = 'courses' then
    v_course_id := new.id;
    v_entity_type := 'course';
  elsif tg_table_name = 'course_modules' then
    v_course_id := new.course_id;
    v_entity_type := 'module';
  elsif tg_table_name = 'lessons' then
    select course_id into v_course_id from course_modules where id = new.module_id;
    v_entity_type := 'lesson';
  elsif tg_table_name = 'quiz_questions' then
    select course_id into v_course_id from course_modules where id = new.module_id;
    v_entity_type := 'quiz_question';
  else
    raise exception 'Unsupported content revision table: %', tg_table_name;
  end if;

  if tg_op = 'INSERT' then
    v_action := 'create';
  elsif old.status <> 'published' and new.status = 'published' then
    v_action := 'publish';
  elsif old.status = 'published' and new.status <> 'published' then
    v_action := 'unpublish';
  else
    v_action := 'update';
  end if;

  insert into course_content_revisions (
    course_id, entity_type, entity_id, action, revision,
    before_data, after_data, actor_user_id
  ) values (
    v_course_id, v_entity_type, new.id, v_action, new.editorial_revision,
    case when tg_op = 'INSERT' then null else to_jsonb(old) end,
    to_jsonb(new), new.last_edited_by
  );
  return new;
end;
$$;

drop trigger if exists courses_content_revision on courses;
create trigger courses_content_revision
  after insert or update on courses
  for each row execute function record_course_content_revision();

drop trigger if exists course_modules_content_revision on course_modules;
create trigger course_modules_content_revision
  after insert or update on course_modules
  for each row execute function record_course_content_revision();

drop trigger if exists lessons_content_revision on lessons;
create trigger lessons_content_revision
  after insert or update on lessons
  for each row execute function record_course_content_revision();

drop trigger if exists quiz_questions_content_revision on quiz_questions;
create trigger quiz_questions_content_revision
  after insert or update on quiz_questions
  for each row execute function record_course_content_revision();

-- ─── Roadmap job idempotency + atomic claiming ─────────────

alter table course_roadmaps
  add column if not exists processing_started_at timestamptz,
  add column if not exists generation_version text not null default 'roadmap-v1';

alter table course_roadmaps drop constraint if exists course_roadmaps_status_check;
alter table course_roadmaps add constraint course_roadmaps_status_check
  check (status in ('pending', 'processing', 'completed', 'error'));

update course_roadmaps
set processing_started_at = coalesce(processing_started_at, created_at)
where status = 'processing';

-- Keep the newest active result if an earlier race produced duplicates.
with ranked as (
  select id,
         row_number() over (
           partition by user_id, course_id, input_hash
           order by created_at desc, id desc
         ) as position
  from course_roadmaps
  where status in ('pending', 'processing', 'completed')
)
update course_roadmaps
set status = 'error',
    error_message = 'Superseded during Phase 0 idempotency migration'
where id in (select id from ranked where position > 1);

create unique index if not exists course_roadmaps_active_input_uidx
  on course_roadmaps (user_id, course_id, input_hash)
  where status in ('pending', 'processing', 'completed');

create or replace function claim_course_roadmap(
  p_roadmap_id uuid,
  p_user_id uuid
)
returns setof course_roadmaps
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  update course_roadmaps
  set status = 'processing',
      processing_started_at = now(),
      error_message = null
  where id = p_roadmap_id
    and user_id = p_user_id
    and (
      status in ('pending', 'error')
      or (
        status = 'processing'
        and processing_started_at < now() - interval '2 minutes'
      )
    )
  returning course_roadmaps.*;
end;
$$;

revoke all on function claim_course_roadmap(uuid, uuid) from public, anon, authenticated;
grant execute on function claim_course_roadmap(uuid, uuid) to service_role;

-- ─── Product event stream ──────────────────────────────────

create table if not exists product_events (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references auth.users(id) on delete set null,
  anonymous_id   text,
  event_name     text not null,
  resource_slug  text,
  properties     jsonb not null default '{}',
  occurred_at    timestamptz not null default now(),
  check (char_length(event_name) between 1 and 80),
  check (anonymous_id is null or char_length(anonymous_id) <= 128),
  check (resource_slug is null or char_length(resource_slug) <= 80),
  check (jsonb_typeof(properties) = 'object')
);

alter table product_events enable row level security;
-- No direct client access. A validated Route Handler writes via service role;
-- the Admin UI reads aggregate counts via role-checked server code.

create index if not exists product_events_resource_time_idx
  on product_events (resource_slug, occurred_at desc);
create index if not exists product_events_name_time_idx
  on product_events (event_name, occurred_at desc);
