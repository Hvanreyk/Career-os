-- ============================================================
-- 0010_networking.sql
--
-- Phase 2 Networking Strategy workspace:
--   * owner-isolated contact CRM with normalized identity keys
--   * immutable interaction timeline (insert/select/delete, no update)
--   * one-active-next-action follow-ups
--   * events, warm introductions, coffee chats with prep/debrief
--   * Message Lab drafts + immutable AI review history
--   * atomic Sydney-day AI quota (shared by drafting and review)
--   * provider connection / send / sync scaffold (flag-gated in app;
--     tokens are service-role-only and never reach the browser)
-- ============================================================

create extension if not exists pgcrypto;

-- bank_targets (0006) predates composite ownership keys; add one so
-- networking rows can bind to a target AND its owner in one FK.
alter table bank_targets
  add constraint bank_targets_id_user_unique unique (id, user_id);

-- ─── networking_events ──────────────────────────────────────
-- Career fairs / info sessions. Created before contacts so contact
-- rows can reference the event they came from.

create table networking_events (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  name         text not null check (char_length(name) between 1 and 120),
  event_date   date not null,
  related_firm text not null default '' check (char_length(related_firm) <= 120),
  status       text not null default 'upcoming'
    check (status in ('upcoming', 'attended', 'skipped')),
  notes        text not null default '' check (char_length(notes) <= 4000),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (id, user_id)
);

-- ─── networking_contacts ────────────────────────────────────

create table networking_contacts (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  full_name           text not null check (char_length(full_name) between 1 and 120),
  firm                text not null default '' check (char_length(firm) <= 120),
  role_title          text not null default '' check (char_length(role_title) <= 120),
  seniority           text not null default 'other'
    check (seniority in ('student', 'analyst', 'associate', 'vp', 'director', 'md', 'recruiter', 'other')),
  city                text not null default '' check (char_length(city) <= 120),
  email               text not null default '' check (char_length(email) <= 254),
  email_normalized    text check (char_length(email_normalized) <= 254),
  linkedin_url        text not null default '' check (char_length(linkedin_url) <= 300),
  linkedin_normalized text check (char_length(linkedin_normalized) <= 300),
  source              text not null default 'cold'
    check (source in ('alumni', 'cold', 'event', 'introduction', 'existing', 'imported', 'other')),
  stage               text not null default 'prospect'
    check (stage in ('prospect', 'ready_to_contact', 'contacted', 'replied',
                     'conversation_booked', 'connected', 'dormant')),
  priority            integer not null default 2 check (priority between 1 and 3),
  tags                jsonb not null default '[]'::jsonb check (jsonb_typeof(tags) = 'array'),
  notes               text not null default '' check (char_length(notes) <= 4000),
  do_not_contact      boolean not null default false,
  is_alum             boolean not null default false,
  event_id            uuid,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (id, user_id),
  foreign key (event_id, user_id)
    references networking_events(id, user_id) on delete set null (event_id)
);

create unique index networking_contacts_email_unique
  on networking_contacts (user_id, email_normalized)
  where email_normalized is not null;
create unique index networking_contacts_linkedin_unique
  on networking_contacts (user_id, linkedin_normalized)
  where linkedin_normalized is not null;
create index networking_contacts_user_stage_idx
  on networking_contacts (user_id, stage, updated_at desc);

-- ─── networking_contact_targets ─────────────────────────────
-- Owner-bound join to bank_targets. Deleting a bank target removes
-- the link but never the contact; no automatic bank-status changes.

create table networking_contact_targets (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  contact_id     uuid not null,
  bank_target_id uuid not null,
  created_at     timestamptz not null default now(),
  unique (user_id, contact_id, bank_target_id),
  foreign key (contact_id, user_id)
    references networking_contacts(id, user_id) on delete cascade,
  foreign key (bank_target_id, user_id)
    references bank_targets(id, user_id) on delete cascade
);

create index networking_contact_targets_target_idx
  on networking_contact_targets (user_id, bank_target_id);

-- ─── networking_interactions ────────────────────────────────
-- Immutable relationship record: rows are inserted and (with their
-- contact) deleted, never updated. provider_message_id keeps future
-- webhook-driven inserts idempotent.

create table networking_interactions (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  contact_id          uuid not null,
  type                text not null
    check (type in ('email_sent', 'email_reply', 'linkedin_sent', 'linkedin_reply',
                    'call', 'coffee_chat', 'event', 'introduction', 'note')),
  direction           text not null default 'none'
    check (direction in ('outbound', 'inbound', 'none')),
  occurred_at         timestamptz not null,
  summary             text not null default '' check (char_length(summary) <= 2000),
  outcome             text not null default '' check (char_length(outcome) <= 2000),
  source              text not null default 'manual' check (source in ('manual', 'synced')),
  provider            text check (provider in ('google', 'microsoft')),
  provider_message_id text check (char_length(provider_message_id) <= 300),
  created_at          timestamptz not null default now(),
  unique (id, user_id),
  foreign key (contact_id, user_id)
    references networking_contacts(id, user_id) on delete cascade
);

create unique index networking_interactions_provider_unique
  on networking_interactions (user_id, provider, provider_message_id)
  where provider_message_id is not null;
create index networking_interactions_contact_idx
  on networking_interactions (contact_id, occurred_at desc);

-- ─── networking_followups ───────────────────────────────────
-- One active next action per contact, enforced by a partial unique
-- index. Rescheduling updates the active task (updated_at audits it).

create table networking_followups (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  contact_id   uuid not null,
  kind         text not null
    check (kind in ('send_outreach', 'follow_up_no_reply', 'thank_you', 'schedule_chat',
                    'prep_chat', 'debrief', 'maintain', 'custom')),
  status       text not null default 'open'
    check (status in ('open', 'snoozed', 'completed', 'cancelled')),
  due_at       timestamptz not null,
  reason       text not null default '' check (char_length(reason) <= 300),
  completed_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (id, user_id),
  foreign key (contact_id, user_id)
    references networking_contacts(id, user_id) on delete cascade
);

create unique index networking_followups_one_active
  on networking_followups (contact_id)
  where status in ('open', 'snoozed');
create index networking_followups_due_idx
  on networking_followups (user_id, status, due_at);

-- ─── networking_coffee_chats ────────────────────────────────

create table networking_coffee_chats (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  contact_id          uuid not null,
  status              text not null default 'scheduled'
    check (status in ('scheduled', 'completed', 'cancelled')),
  scheduled_at        timestamptz not null,
  timezone            text not null check (char_length(timezone) between 1 and 60),
  duration_minutes    integer not null default 30 check (duration_minutes between 10 and 120),
  location            text not null default '' check (char_length(location) <= 120),
  notes               text not null default '' check (char_length(notes) <= 4000),
  prep                jsonb check (prep is null or (jsonb_typeof(prep) = 'object' and octet_length(prep::text) <= 20000)),
  debrief             jsonb check (debrief is null or (jsonb_typeof(debrief) = 'object' and octet_length(debrief::text) <= 20000)),
  provider            text check (provider in ('google', 'microsoft')),
  external_event_id   text check (char_length(external_event_id) <= 300),
  calendar_sync_state text check (char_length(calendar_sync_state) <= 60),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (id, user_id),
  foreign key (contact_id, user_id)
    references networking_contacts(id, user_id) on delete cascade
);

create index networking_coffee_chats_user_idx
  on networking_coffee_chats (user_id, status, scheduled_at);

-- ─── networking_introductions ───────────────────────────────
-- Warm-intro chains: who can introduce you, to whom, and where the
-- request stands. to_contact_id survives deletion of the target row.

create table networking_introductions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  via_contact_id uuid not null,
  to_contact_id  uuid,
  to_name        text not null default '' check (char_length(to_name) <= 120),
  status         text not null default 'planned'
    check (status in ('planned', 'requested', 'made', 'declined')),
  notes          text not null default '' check (char_length(notes) <= 4000),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (id, user_id),
  foreign key (via_contact_id, user_id)
    references networking_contacts(id, user_id) on delete cascade,
  foreign key (to_contact_id, user_id)
    references networking_contacts(id, user_id) on delete set null (to_contact_id)
);

-- ─── networking_messages ────────────────────────────────────
-- Explicitly saved drafts. Editing a reviewed message resets its
-- state in the route layer; reviewed_hash makes staleness checkable.

create table networking_messages (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  contact_id    uuid not null,
  channel       text not null check (channel in ('email', 'linkedin')),
  purpose       text not null
    check (purpose in ('cold_intro', 'linkedin_connection', 'event_followup', 'thank_you',
                       'conversation_followup', 'referral_request', 'intro_request',
                       'reply_response', 'reengagement', 'custom')),
  subject       text not null default '' check (char_length(subject) <= 200),
  body          text not null default '' check (char_length(body) <= 4000),
  context       jsonb not null default '{}'::jsonb
    check (jsonb_typeof(context) = 'object' and octet_length(context::text) <= 10000),
  state         text not null default 'draft'
    check (state in ('draft', 'reviewed', 'sending', 'sent', 'failed', 'unknown')),
  reviewed_hash text check (char_length(reviewed_hash) = 64),
  send_channel  text check (send_channel in ('manual', 'provider')),
  sent_at       timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (id, user_id),
  foreign key (contact_id, user_id)
    references networking_contacts(id, user_id) on delete cascade
);

create index networking_messages_user_idx
  on networking_messages (user_id, updated_at desc);
create index networking_messages_contact_idx
  on networking_messages (contact_id, updated_at desc);

-- ─── networking_message_reviews ─────────────────────────────
-- Immutable AI review history. Written only by the service role via
-- save_networking_message_review after the input-hash check.

create table networking_message_reviews (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  message_id     uuid not null,
  input_hash     text not null check (char_length(input_hash) = 64),
  review         jsonb not null
    check (jsonb_typeof(review) = 'object' and octet_length(review::text) <= 50000),
  model          text not null check (char_length(model) between 1 and 120),
  prompt_version text not null check (char_length(prompt_version) between 1 and 80),
  input_tokens   integer not null default 0 check (input_tokens >= 0),
  output_tokens  integer not null default 0 check (output_tokens >= 0),
  created_at     timestamptz not null default now(),
  foreign key (message_id, user_id)
    references networking_messages(id, user_id) on delete cascade
);

create index networking_message_reviews_message_idx
  on networking_message_reviews (message_id, created_at desc);

-- ─── Provider connection / send / sync scaffold ─────────────
-- These tables ship now so the flag-gated provider work has a stable
-- contract. Refresh tokens are AES-256-GCM ciphertext produced in the
-- server runtime; no RLS policies exist on purpose (service role only).

create table networking_connections (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid not null references auth.users(id) on delete cascade,
  provider                 text not null check (provider in ('google', 'microsoft')),
  account_email            text not null check (char_length(account_email) <= 254),
  scopes                   jsonb not null default '[]'::jsonb check (jsonb_typeof(scopes) = 'array'),
  refresh_token_ciphertext text not null,
  key_version              integer not null default 1 check (key_version >= 1),
  health                   text not null default 'connected'
    check (health in ('connected', 'reauthorisation_required', 'error')),
  history_cursor           text check (char_length(history_cursor) <= 500),
  subscription_id          text check (char_length(subscription_id) <= 300),
  subscription_expires_at  timestamptz,
  last_synced_at           timestamptz,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now(),
  unique (user_id, provider),
  unique (id, user_id)
);

create table networking_send_attempts (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  message_id          uuid not null,
  attempt_key         text not null check (char_length(attempt_key) between 1 and 120),
  confirmation_hash   text not null check (char_length(confirmation_hash) = 64),
  provider            text not null check (provider in ('google', 'microsoft')),
  correlation_id      text not null check (char_length(correlation_id) <= 120),
  provider_message_id text check (char_length(provider_message_id) <= 300),
  provider_thread_id  text check (char_length(provider_thread_id) <= 300),
  state               text not null default 'reserved'
    check (state in ('reserved', 'sending', 'sent', 'failed', 'unknown')),
  error_code          text check (char_length(error_code) <= 120),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (user_id, attempt_key),
  foreign key (message_id, user_id)
    references networking_messages(id, user_id) on delete cascade
);

create table networking_sync_jobs (
  id               uuid primary key default gen_random_uuid(),
  connection_id    uuid not null references networking_connections(id) on delete cascade,
  kind             text not null check (char_length(kind) between 1 and 60),
  payload          jsonb not null default '{}'::jsonb
    check (jsonb_typeof(payload) = 'object' and octet_length(payload::text) <= 10000),
  status           text not null default 'queued'
    check (status in ('queued', 'leased', 'completed', 'failed')),
  attempts         integer not null default 0 check (attempts >= 0),
  lease_expires_at timestamptz,
  next_attempt_at  timestamptz not null default now(),
  last_error       text check (char_length(last_error) <= 500),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index networking_sync_jobs_due_idx
  on networking_sync_jobs (status, next_attempt_at);

create table networking_webhook_receipts (
  id          uuid primary key default gen_random_uuid(),
  provider    text not null check (provider in ('google', 'microsoft')),
  dedupe_key  text not null check (char_length(dedupe_key) <= 300),
  received_at timestamptz not null default now(),
  unique (provider, dedupe_key)
);

-- Text-free operational counter shared by AI drafting and review.
create table networking_review_daily_usage (
  user_id    uuid not null references auth.users(id) on delete cascade,
  usage_date date not null,
  count      integer not null default 0 check (count >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, usage_date)
);

-- ─── updated_at triggers ────────────────────────────────────

create trigger networking_events_updated_at
  before update on networking_events
  for each row execute function set_updated_at();
create trigger networking_contacts_updated_at
  before update on networking_contacts
  for each row execute function set_updated_at();
create trigger networking_followups_updated_at
  before update on networking_followups
  for each row execute function set_updated_at();
create trigger networking_coffee_chats_updated_at
  before update on networking_coffee_chats
  for each row execute function set_updated_at();
create trigger networking_introductions_updated_at
  before update on networking_introductions
  for each row execute function set_updated_at();
create trigger networking_messages_updated_at
  before update on networking_messages
  for each row execute function set_updated_at();
create trigger networking_connections_updated_at
  before update on networking_connections
  for each row execute function set_updated_at();
create trigger networking_send_attempts_updated_at
  before update on networking_send_attempts
  for each row execute function set_updated_at();
create trigger networking_sync_jobs_updated_at
  before update on networking_sync_jobs
  for each row execute function set_updated_at();

-- ─── Owner RLS ──────────────────────────────────────────────

alter table networking_events enable row level security;
alter table networking_contacts enable row level security;
alter table networking_contact_targets enable row level security;
alter table networking_interactions enable row level security;
alter table networking_followups enable row level security;
alter table networking_coffee_chats enable row level security;
alter table networking_introductions enable row level security;
alter table networking_messages enable row level security;
alter table networking_message_reviews enable row level security;
alter table networking_connections enable row level security;
alter table networking_send_attempts enable row level security;
alter table networking_sync_jobs enable row level security;
alter table networking_webhook_receipts enable row level security;
alter table networking_review_daily_usage enable row level security;

create policy "users manage own networking events"
  on networking_events for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users manage own networking contacts"
  on networking_contacts for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users manage own networking contact targets"
  on networking_contact_targets for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Interactions are immutable: insert, read and delete — no update policy.
create policy "users read own networking interactions"
  on networking_interactions for select
  using (auth.uid() = user_id);
create policy "users insert own networking interactions"
  on networking_interactions for insert
  with check (auth.uid() = user_id);
create policy "users delete own networking interactions"
  on networking_interactions for delete
  using (auth.uid() = user_id);

create policy "users manage own networking followups"
  on networking_followups for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users manage own networking coffee chats"
  on networking_coffee_chats for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users manage own networking introductions"
  on networking_introductions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users manage own networking messages"
  on networking_messages for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Review history is immutable from the browser; rows arrive via the
-- service-role save function only.
create policy "users read own networking message reviews"
  on networking_message_reviews for select
  using (auth.uid() = user_id);

-- Send attempts are readable for status display; written server-side.
create policy "users read own networking send attempts"
  on networking_send_attempts for select
  using (auth.uid() = user_id);

-- No policies at all (service-role only): networking_connections
-- (token ciphertext), networking_sync_jobs, networking_webhook_receipts,
-- networking_review_daily_usage.

-- ─── Atomic AI quota (shared: drafts + reviews) ─────────────

create or replace function claim_networking_review_quota(
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
    raise exception 'Invalid networking quota limit';
  end if;

  -- Expired-row pruning lives in cleanup_networking_operational_rows(),
  -- not here: this table's primary key leads with user_id, so a
  -- usage_date-only delete can't use it and would scan every user's
  -- rows on every single draft/review request.

  insert into networking_review_daily_usage (user_id, usage_date, count)
  values (p_user_id, v_day, 1)
  on conflict (user_id, usage_date) do update
    set count = networking_review_daily_usage.count + 1,
        updated_at = now()
    where networking_review_daily_usage.count < p_limit
  returning count into v_count;

  if v_count is null then
    select u.count into v_count
    from networking_review_daily_usage u
    where u.user_id = p_user_id and u.usage_date = v_day;
    return query select false, coalesce(v_count, p_limit), 0, v_day, v_reset;
    return;
  end if;

  return query select true, v_count, greatest(p_limit - v_count, 0), v_day, v_reset;
end;
$$;

create or replace function release_networking_review_quota(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_day date := timezone('Australia/Sydney', now())::date;
begin
  update networking_review_daily_usage
  set count = greatest(count - 1, 0), updated_at = now()
  where user_id = p_user_id and usage_date = v_day;
end;
$$;

revoke all on function claim_networking_review_quota(uuid, integer) from public, anon, authenticated;
revoke all on function release_networking_review_quota(uuid) from public, anon, authenticated;
grant execute on function claim_networking_review_quota(uuid, integer) to service_role;
grant execute on function release_networking_review_quota(uuid) to service_role;

-- ─── Atomic review save ─────────────────────────────────────
-- Locks the message, verifies the reviewed content is still current,
-- records the immutable review and flips the message to 'reviewed'.

create or replace function save_networking_message_review(
  p_user_id uuid,
  p_message_id uuid,
  p_input_hash text,
  p_review jsonb,
  p_model text,
  p_prompt_version text,
  p_input_tokens integer,
  p_output_tokens integer
)
returns setof networking_message_reviews
language plpgsql
security definer
set search_path = public
as $$
declare
  v_message networking_messages%rowtype;
  v_review networking_message_reviews%rowtype;
begin
  select * into v_message
  from networking_messages
  where id = p_message_id and user_id = p_user_id
  for update;

  if not found then
    raise exception 'MESSAGE_NOT_FOUND';
  end if;
  if encode(digest(coalesce(v_message.subject, '') || E'\n' || v_message.body, 'sha256'), 'hex') <> p_input_hash then
    raise exception 'STALE_REVIEW';
  end if;

  insert into networking_message_reviews (
    message_id, user_id, input_hash, review, model, prompt_version,
    input_tokens, output_tokens
  ) values (
    p_message_id, p_user_id, p_input_hash, p_review, p_model, p_prompt_version,
    p_input_tokens, p_output_tokens
  ) returning * into v_review;

  update networking_messages
  set state = 'reviewed', reviewed_hash = p_input_hash, updated_at = now()
  where id = p_message_id and user_id = p_user_id;

  return next v_review;
end;
$$;

revoke all on function save_networking_message_review(
  uuid, uuid, text, jsonb, text, text, integer, integer
) from public, anon, authenticated;
grant execute on function save_networking_message_review(
  uuid, uuid, text, jsonb, text, text, integer, integer
) to service_role;

-- ─── Bounded operational retention ──────────────────────────

create or replace function cleanup_networking_operational_rows()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from networking_webhook_receipts where received_at < now() - interval '7 days';
  delete from networking_sync_jobs
  where status in ('completed', 'failed') and updated_at < now() - interval '30 days';
  delete from networking_review_daily_usage
  where usage_date < (timezone('Australia/Sydney', now())::date - 31);
end;
$$;

revoke all on function cleanup_networking_operational_rows() from public, anon, authenticated;
grant execute on function cleanup_networking_operational_rows() to service_role;
