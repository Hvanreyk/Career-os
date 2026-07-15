# TrajectoryOS Phase 2 — Networking Strategy

This replaces the Phase 2 references in `HANDOFF.md`. Read `CLAUDE.md` first for
architecture, deployment and admin-role setup.

Phase 2 ships the **Networking Strategy** resource as a full product: an
interleaved six-module course, a private networking CRM, a deterministic
intelligence layer (target map, coverage engine, timeline-driven weekly plan),
an AI Message Lab that drafts *and* reviews outreach, coffee-chat prep/debrief,
warm-introduction tracking, and a provider integration scaffold (Gmail/Outlook
sending + reply sync) that stays behind flags until OAuth verification clears.

The student loop:

> build target map → identify contact → research → draft/review outreach →
> send (mailto/copy) or log → detect/record response → prep + hold coffee chat →
> debrief → thank-you + next follow-up → coverage and timeline drive the next move

## Product principles (locked decisions)

1. **Intelligence over plumbing.** The differentiator is *who to contact, what
   to say, when* — computed deterministically from assets no competitor has:
   the professionals database, the scoring layers, `lib/courses/timeline.ts`
   and `bank_targets`. No opaque AI scores, no reply-probability predictions.
2. **Manual-send-first launch.** Day one, sending is `mailto:` / copy-to-
   clipboard plus one-click "log as sent" (the LinkedIn channel needs that UX
   anyway). Google/Microsoft OAuth is **built now but flag-gated**; flags flip
   per provider when app registration + restricted-scope verification clear.
   Google's review (~6 weeks, possible CASA assessment) must never gate GA.
3. **Aggregates only from the professionals DB.** The target map exposes
   patterns (alumni density by firm for the student's university, seniority
   mix, geography) — never individual rows. The dataset contains real names
   and stays service-role-only (see migration 0005).
4. **Course and tool are one product.** Six modules, each ending in a
   workspace checkpoint (module 1 ends with a real target map; module 3 ends
   with a reviewed draft in the Message Lab). Lessons deep-link from the
   workspace at the moment of need.
5. **Truthful AI.** Drafting and review both use only student-supplied facts.
   Student text and contact context are untrusted delimited data. No invented
   affiliation, referral, deal knowledge, deadline or familiarity. Drafting
   from supplied facts is allowed — refusing first drafts protects no one.

## Workspace surfaces

All under `/resources/networking-strategy/network` (login + `contacts`
capability; Message Lab additionally requires `message-review`):

- **Today** — the weekly plan, computed by the pure engine
  (`lib/networking/plan.ts`): missing debriefs and thank-yous first, then
  overdue/due follow-ups, chat prep for the next 48 hours, 7-day silence
  bumps, coverage gaps weighted by recruiting-timeline proximity, stale
  connections. One recommended next action; timeline notices with
  `last_reviewed` visible; weekly outreach targets that coach quality
  (3–8/week) rather than volume.
- **Contacts** — searchable/filterable directory; detail page with identity,
  stage, tags, priority, bank-target links, chronological timeline
  (interactions, chats, follow-ups), quick actions (draft email/LinkedIn, log
  interaction, schedule follow-up, schedule chat). CSV import with preview,
  duplicate classification and row errors; JSON export with formula-safe CSV.
- **Pipeline** — relationship-stage board (`prospect → ready_to_contact →
  contacted → replied → conversation_booked → connected → dormant`, with
  separate `do_not_contact`). Stage moves change the stage only — they never
  manufacture interactions. Needs-attention filters.
- **Target Map** — per-bank-target coverage grid (contacts by seniority band,
  depth, last touch vs. a default coverage goal of 2 junior + 1 senior),
  gaps ranked by application-window proximity, and aggregate alumni
  intelligence for the student's university from the professionals DB.
- **Message Lab** — purposes: cold intro, LinkedIn connection/DM, event
  follow-up, thank-you, conversation follow-up, referral request,
  warm-intro request (forwardable), reply response, re-engagement, custom.
  Deterministic preflight (placeholders, length, missing ask, suspicious
  links) → AI first draft (optional) → AI review (strengths, typed issues,
  revision question, ≤3 faithful rewrites) → explicit save. Editing after
  review invalidates the reviewed state (content-hash bound, signed receipt,
  Sydney-day quota shared with drafting).
- **Coffee chats** — schedule (timezone-aware, UTC storage), role-calibrated
  prep sheet, structured debrief (learned, referral offered, names dropped →
  new prospect contacts with `source='introduction'`, promises made),
  auto-queued thank-you within 24h and next follow-up.
- **Connections** — provider connect/health/disconnect. Absent credentials
  render an honest "not configured" state; no dead ends.

## Domain model (migration `0010_networking.sql`)

Owner-RLS with composite `(id, user_id)` ownership keys throughout, following
`0008_resume_workshop.sql`:

`networking_contacts`, `networking_contact_targets` (join to `bank_targets`;
deleting a target unlinks, never deletes), `networking_interactions`
(insert/select/delete, never update — immutable record), `networking_followups`
(one active per contact via partial unique index; open/snoozed/completed/
cancelled), `networking_events` (career fairs / info sessions with quick
capture), `networking_introductions` (warm-intro chains),
`networking_coffee_chats` (prep + debrief jsonb, calendar link columns),
`networking_messages` (explicit drafts, content hash, state), 
`networking_message_reviews` (immutable review snapshots),
`networking_connections` (AES-256-GCM encrypted refresh tokens, key version,
health, cursors), `networking_send_attempts` (single-use confirmation, unique
client attempt key, draft→reviewed→sending→sent|failed|unknown),
`networking_sync_jobs` + `networking_webhook_receipts` (leased jobs, dedupe,
bounded retention), `networking_review_daily_usage` + atomic
`claim_networking_review_quota` / `release_networking_review_quota`
(service-role-only, Sydney-day, default 25 covering draft + review calls).

## Shared engine (`lib/networking/`, pure, exported via `@trajectoryos/core`)

`types.ts` (enums, zod schemas, bounded lengths), `normalize.ts` (email +
LinkedIn URL normalisation), `stages.ts` (stage order/transitions),
`coverage.ts` (per-target coverage + gap ranking), `plan.ts` (weekly plan from
contacts/follow-ups/chats/coverage/timeline), `import.ts` (CSV parse, header
mapping, duplicate classification, formula-injection sanitisation),
`alumni.ts` (aggregate-only professionals intel), `activation.ts`
(contact + outreach + follow-up = activated).

## AI (`lib/llm/networking.ts`)

One generator module, two entry points sharing constraints:
`generateNetworkingDraft` (first draft from structured, student-supplied facts)
and `generateNetworkingReview` (summary, ≤3 strengths, typed issues —
relevance/specificity/tone/brevity/credibility/ask/timing/pressure — each with
why-it-matters + revision question, ≤3 faithful rewrites). `store:false`,
bounded output, timeout, retries, `OPENAI_NETWORKING_MODEL` override,
prompt-version constant, signed receipts binding user/message/content
hash/critique (HMAC, `CRITIQUE_RECEIPT_SECRET`), quota released on failure.
Raw message/contact text never enters product events or logs.

## Provider scaffold (built now, flags off)

Typed adapter boundary (`web/lib/networking/providers/`): OAuth
authorization-code + PKCE + HMAC-signed state cookie, exact redirect URIs,
token exchange/refresh/revoke, send + tracked-thread metadata sync + calendar
interfaces. Enabled per provider only when env credentials exist
(`NETWORKING_GOOGLE_*`, `NETWORKING_MICROSOFT_*`) **and** the feature flag is
on. Scopes: Gmail send + metadata (restricted — requires Google verification);
Microsoft `Mail.Send, Mail.ReadBasic, Calendars.ReadWrite, User.Read,
offline_access`. Webhooks (`/api/webhooks/networking/{google,microsoft}`)
validate, dedupe into `networking_webhook_receipts`, enqueue and return.
Inbound bodies/previews/attachments are never persisted — headers and thread
status for TrajectoryOS-originated threads only. Disconnect revokes at the
provider and deletes local tokens. Default 25 direct sends per Sydney day when
sending ships.

## Measurement

Allow-listed, text-free events: `networking_workspace_opened`,
`networking_contact_created`, `networking_contacts_imported`,
`networking_interaction_logged`, `networking_message_drafted`,
`networking_message_reviewed`, `networking_message_sent` (channel: manual/
provider), `networking_linkedin_copy_used`, `networking_reply_detected`,
`networking_followup_scheduled/completed`, `networking_coffee_chat_scheduled/
completed`, `networking_introduction_recorded`, `networking_calendar_event_created`,
`networking_provider_connected/disconnected`, `networking_sync_failed`,
`networking_activation_completed`, `networking_data_deleted`.

Activation = contact created **and** outreach sent/logged **and** next
follow-up scheduled. Outcome metrics (the ones that matter): coffee chats
completed, referrals/introductions earned, and — via `bank_targets` status —
interview rates at covered vs. uncovered target firms.

## Delivery status (this branch)

Implemented now: engine + tests, migration 0010, LLM draft/review, all
workspace surfaces with manual send, CSV import/export, target map with
aggregate alumni intel, coffee-chat prep/debrief, warm intros, events quick
capture, OAuth scaffold (flag-gated), six-module course authored as `draft`.

Remaining before GA: apply migration 0010; editorial review + publish of the
course via Admin; register Google Cloud / Microsoft Entra apps and submit
Google restricted-scope verification (long-lead, outside engineering);
provider send/sync workers behind flags once credentials exist; privacy
policy + deletion disclosures updated for provider data.

Known hardening follow-ups (reviewed, deliberately deferred — none block
GA since the affected paths are either pre-launch or already flag-gated
inert):
- `bank_targets` composite unique constraint (migration 0010) takes an
  ACCESS EXCLUSIVE lock while building its backing index. Harmless
  pre-launch (table has no production traffic yet); switch to
  `CREATE UNIQUE INDEX CONCURRENTLY` + `ADD CONSTRAINT ... USING INDEX`
  before this table sees real concurrent writes.
- Provider webhooks (`/api/webhooks/networking/[provider]`) check bearer
  presence / configured clientState rather than fully verifying Google's
  OIDC signature/issuer/audience or parsing Microsoft's clientState
  strictly. Both endpoints 404 until `NETWORKING_PROVIDERS_ENABLED` and
  real credentials are set — this is exactly the hardening the P2.5
  security review (see delivery roadmap) is scoped to close before either
  flag goes on.
- `web/lib/networking/queries.ts` (workspace loader) and a few page
  components fall back to an empty list on a Supabase read error rather
  than surfacing a loading-error state. This degrades to a confusing but
  harmless empty UI, not data loss; fixing it well means deciding how
  error states should look across the workspace, which is a small design
  task rather than a bug fix.
- Broader defensive Zod-validation of every internal Supabase read
  (`queries.ts` rows, the client `networkingApi` fetch helper, page-level
  row casts) was reviewed and intentionally not applied: those rows are
  written by our own Zod-validated insert paths, not external input, so
  CLAUDE.md's trust-boundary convention doesn't reach them. (The one
  place this pattern *does* apply — `lib/networking/alumni.ts` reading
  the externally-imported `professionals` table — already validates
  defensively, matching the existing professional-DB convention.)
- `contacts/[id]` PATCH commits field edits and target-link replacement
  (`replace_networking_contact_targets`) as two separate operations, not
  one transaction — narrower than it sounds: target replacement is
  already atomic on its own (fixed in the RPC batch), so the residual
  risk is only "field edits land but a same-request target change
  doesn't" on a rare mid-request failure, not corrupted data. Fusing
  both into one RPC (mirroring `create_networking_contact_with_targets`)
  is straightforward but non-trivial given PATCH's partial-update
  semantics (distinguishing "field omitted" from "field cleared" through
  a SQL parameter list); deferred rather than rushed.

Rollback: disable provider/product flags, unpublish the course. Never destroy
user data during rollback.
