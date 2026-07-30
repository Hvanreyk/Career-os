-- ============================================================
-- 0006_course_engine.sql
--
-- Shared course engine powering the Resources section. Content
-- tables hold seeded course material (written by scripts/seed-courses.ts
-- via the service role); user tables hold per-student state.
--
-- Content tables:
--   courses          — one row per course (e.g. investment-banking-guides)
--   course_modules   — ordered modules within a course
--   lessons          — ordered lessons within a module (content = block JSON)
--   quiz_questions   — end-of-module quiz questions (answers server-only)
--
-- User tables:
--   course_enrollments — diagnostic answers + readiness scores per course
--   lesson_progress    — lesson completion marks
--   quiz_attempts      — server-graded module quiz attempts
--   bank_targets       — Module 8 bank/role target tracker workspace
--   course_roadmaps    — personalised recruiting roadmaps (two-phase LLM)
--
-- RLS posture:
--   * Published content is publicly readable (course overviews are
--     public marketing surface). Draft content is invisible to clients.
--   * quiz_questions has RLS enabled with NO policies (same posture as
--     professionals, 0005): correct answers must never reach the client.
--     The quiz page + grading route read via the service role and strip
--     answers before responding.
--   * User tables are owner-only. quiz_attempts and course_roadmaps are
--     select-only for owners — rows are written server-side to keep
--     grading and generation trustworthy.
-- ============================================================

-- ─── courses ─────────────────────────────────────────────────

create table if not exists courses (
  id                uuid primary key default gen_random_uuid(),
  slug              text not null unique,
  title             text not null,
  description       text not null,
  icon              text not null default 'book-open',   -- lucide icon name
  tag               text not null default '',
  region            text not null default 'au'
    check (region in ('au', 'uk', 'us', 'global')),
  status            text not null default 'draft'
    check (status in ('draft', 'published')),
  est_minutes       integer not null default 0,          -- recomputed by seed script
  sort_order        integer not null default 0,
  last_reviewed_at  date,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

alter table courses enable row level security;

create policy "anyone reads published courses"
  on courses
  for select
  using (status = 'published');

create trigger courses_updated_at
  before update on courses
  for each row execute function set_updated_at();

-- ─── course_modules ──────────────────────────────────────────

create table if not exists course_modules (
  id                uuid primary key default gen_random_uuid(),
  course_id         uuid not null references courses(id) on delete cascade,
  slug              text not null,
  title             text not null,
  summary           text not null default '',
  status            text not null default 'draft'
    check (status in ('draft', 'published')),
  sort_order        integer not null default 0,
  last_reviewed_at  date,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (course_id, slug)
);

alter table course_modules enable row level security;

create policy "anyone reads published modules"
  on course_modules
  for select
  using (status = 'published');

create trigger course_modules_updated_at
  before update on course_modules
  for each row execute function set_updated_at();

create index if not exists course_modules_course_idx
  on course_modules (course_id, sort_order);

-- ─── lessons ─────────────────────────────────────────────────

create table if not exists lessons (
  id                uuid primary key default gen_random_uuid(),
  module_id         uuid not null references course_modules(id) on delete cascade,
  slug              text not null,
  title             text not null,
  est_minutes       integer not null default 7,
  region            text not null default 'au'
    check (region in ('au', 'uk', 'us', 'global')),
  -- Ordered array of content blocks (paragraph/heading/callout/table/
  -- profile_example/knowledge_check) validated by lib/courses/content.ts.
  -- Inline knowledge-check answers ride along here; they are formative
  -- (ungraded), so client visibility is accepted.
  content           jsonb not null,
  sources           jsonb not null default '[]',          -- [{label, url?}]
  status            text not null default 'draft'
    check (status in ('draft', 'published')),
  sort_order        integer not null default 0,
  last_reviewed_at  date,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (module_id, slug)
);

alter table lessons enable row level security;

create policy "anyone reads published lessons"
  on lessons
  for select
  using (status = 'published');

create trigger lessons_updated_at
  before update on lessons
  for each row execute function set_updated_at();

create index if not exists lessons_module_idx
  on lessons (module_id, sort_order);

-- ─── quiz_questions ──────────────────────────────────────────
-- End-of-module quizzes are scored, so correct_option_id/explanation
-- must not be readable with the anon key. RLS on, no policies: only
-- the service role can read (quiz page + grading route strip answers
-- before sending questions to the client).

create table if not exists quiz_questions (
  id                 uuid primary key default gen_random_uuid(),
  module_id          uuid not null references course_modules(id) on delete cascade,
  slug               text not null,                        -- stable upsert key, e.g. 'q1'
  prompt             text not null,
  options            jsonb not null,                       -- [{id, text}]
  correct_option_id  text not null,
  explanation        text not null default '',
  status             text not null default 'draft'
    check (status in ('draft', 'published')),
  sort_order         integer not null default 0,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (module_id, slug)
);

alter table quiz_questions enable row level security;

create trigger quiz_questions_updated_at
  before update on quiz_questions
  for each row execute function set_updated_at();

create index if not exists quiz_questions_module_idx
  on quiz_questions (module_id, sort_order);

-- ─── course_enrollments ──────────────────────────────────────

create table if not exists course_enrollments (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  course_id           uuid not null references courses(id) on delete cascade,
  diagnostic_answers  jsonb,
  -- {score, dimensions, module_priorities, computed_at}
  readiness           jsonb,
  final_readiness     jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (user_id, course_id)
);

alter table course_enrollments enable row level security;

create policy "users manage own enrollments"
  on course_enrollments
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create trigger course_enrollments_updated_at
  before update on course_enrollments
  for each row execute function set_updated_at();

-- ─── lesson_progress ─────────────────────────────────────────

create table if not exists lesson_progress (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  lesson_id     uuid not null references lessons(id) on delete cascade,
  -- Denormalised so course-level progress is one indexed query.
  course_id     uuid not null references courses(id) on delete cascade,
  completed_at  timestamptz not null default now(),
  unique (user_id, lesson_id)
);

alter table lesson_progress enable row level security;

create policy "users manage own lesson progress"
  on lesson_progress
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists lesson_progress_user_course_idx
  on lesson_progress (user_id, course_id);

-- ─── quiz_attempts ───────────────────────────────────────────
-- Owner can read; inserts happen server-side (service role) after
-- grading, so scores can't be forged from the browser.

create table if not exists quiz_attempts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  module_id   uuid not null references course_modules(id) on delete cascade,
  course_id   uuid not null references courses(id) on delete cascade,
  answers     jsonb not null,      -- {questionId: optionId}
  score       integer not null,
  total       integer not null,
  created_at  timestamptz not null default now()
);

alter table quiz_attempts enable row level security;

create policy "users read own quiz attempts"
  on quiz_attempts
  for select
  using (auth.uid() = user_id);

create index if not exists quiz_attempts_user_module_idx
  on quiz_attempts (user_id, module_id, created_at desc);

-- ─── bank_targets ────────────────────────────────────────────
-- Module 8 workspace. Full owner CRUD: the tracker UI talks to this
-- table directly through the browser client + RLS (no API route).

create table if not exists bank_targets (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  bank_name   text not null,
  division    text not null default '',
  tier        text
    check (tier in ('bb', 'elite_boutique', 'mid_market', 'boutique')),
  priority    integer not null default 2
    check (priority between 1 and 3),
  apps_open   date,
  apps_close  date,
  status      text not null default 'researching'
    check (status in ('researching', 'networking', 'applied',
                      'interviewing', 'offer', 'rejected', 'closed')),
  notes       text not null default '',
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table bank_targets enable row level security;

create policy "users manage own bank targets"
  on bank_targets
  for all
  using  (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create trigger bank_targets_updated_at
  before update on bank_targets
  for each row execute function set_updated_at();

create index if not exists bank_targets_user_idx
  on bank_targets (user_id, sort_order);

-- ─── course_roadmaps ─────────────────────────────────────────
-- Two-phase generation like reports (0003): a 'processing' row is
-- created with the deterministic input snapshot, then the LLM phase
-- flips it to completed/error. input_hash bounds cost: identical
-- inputs reuse the stored roadmap instead of calling the LLM again.

create table if not exists course_roadmaps (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  course_id      uuid not null references courses(id) on delete cascade,
  input          jsonb not null,
  input_hash     text not null,
  roadmap        jsonb,
  status         text not null default 'processing'
    check (status in ('processing', 'completed', 'error')),
  error_message  text,
  created_at     timestamptz not null default now()
);

alter table course_roadmaps enable row level security;

create policy "users read own roadmaps"
  on course_roadmaps
  for select
  using (auth.uid() = user_id);

create index if not exists course_roadmaps_user_course_idx
  on course_roadmaps (user_id, course_id, created_at desc);
