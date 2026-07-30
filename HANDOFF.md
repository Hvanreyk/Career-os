# TrajectoryOS Resources — Phase 0 Handoff

This replaces the pre-deployment resources handoff. PR #5 is merged,
Investment Banking Guides is live, and Course 1 content has been reviewed.
The next objective is to make the shared shell safe and operable before a
second resource is published.

Read `CLAUDE.md` first for architecture, deployment and admin-role setup.

## Product vision

Resources are not six identical courses. They share a learning layer, but each
becomes a different product surface:

| Resource | Product mode | First interactive product |
| --- | --- | --- |
| Investment Banking Guides | Learning | Diagnostic, tracker and roadmap |
| Resume & Cover Letter | Workspace | Deterministic QC and bullet workshop |
| Networking Strategy | Workspace | Contact CRM and message review |
| Interview Preparation | Practice | Verified question bank and drills |
| Deal Breakdown Templates | Workspace | Sourced M&A breakdown |
| Market Awareness | Briefing | Static learning, then curated briefs |

The course engine owns modules, lessons, quizzes and progress. The resource
catalogue owns which capabilities each product may expose. Domain workspaces
use their own typed data models rather than being forced into course tables.

## Phase 0 scope

Phase 0 is the gate before Resume & Cover Letter begins.

### 1. Capability-aware resource shell

`web/lib/resources/catalog.ts` is the explicit six-resource registry. A new
course cannot inherit the IB diagnostic, bank tracker or roadmap merely by
being published. Page and API routes reject capabilities not declared for the
resource.

Keep the catalogue code-defined while there are six fixed products. Do not
build a generic resource/page-builder CMS.

### 2. Resource Admin UI

`/admin/resources` is available only to users with signed Supabase app metadata
`role: "admin"` (or an `admin` entry in `roles`). It supports:

- initialising a draft course for any registered resource,
- course and module metadata editing,
- lesson block editing and rendered preview,
- quiz question and answer editing,
- draft/publish controls with explicit confirmation,
- review dates and revision notes, and
- recent revision history.

Complex lesson blocks retain a JSON editor in Phase 0; common paragraph,
heading and callout blocks have guided controls. A richer table/knowledge-check
editor can be added when editorial use proves it is a bottleneck.

### 3. Editorial ownership

Files remain bootstrap/import content. Any row edited in Admin becomes
`editorial_source='admin'` and its revision is snapshotted atomically in
`course_content_revisions`. `seed-courses.ts` refuses to overwrite an
admin-owned row unless `--force-admin-overwrite` is deliberately supplied.

This avoids silent database/file drift without requiring every routine content
edit to create a GitHub pull request.

### 4. Data and AI hardening

Migration `0007_resource_shell_hardening.sql`:

- requires the full course → module → lesson publication chain in RLS,
- adds editorial ownership and database-triggered revision history,
- adds a partial unique key for active roadmap inputs,
- atomically claims roadmap jobs with a two-minute recovery lease,
- versions roadmap generation inputs, and
- creates a private server-written product event stream.

### 5. Measurement

The initial shared funnel records:

- resource viewed,
- lesson viewed and completed,
- diagnostic completed,
- quiz completed, and
- roadmap requested and completed.

Course completion is not the only success measure. Later resources each need a
clear activation event: first bullet revised, first follow-up scheduled, first
drill set completed, first sourced deal saved, or first brief converted into an
interview answer.

## Phase 0 deployment checklist

1. Review and apply `supabase/migrations/0007_resource_shell_hardening.sql`.
2. Grant the founder account the Supabase `admin` app-metadata role and sign
   out/in so the JWT refreshes.
3. Open `/admin/resources`; edit a draft lesson and quiz question and confirm a
   revision appears.
4. Preview the lesson, publish deliberately, and confirm public content obeys
   the course/module/lesson parent chain.
5. Authenticated smoke test: resource → diagnostic → lesson → quiz → tracker →
   roadmap, including two simultaneous roadmap process requests.
6. Confirm product events are arriving and contain no sensitive free text.
7. Run `npm test`, `npm run lint`, `npm run typecheck`, and `npm run build`.

## Exit criteria

Phase 0 is complete when:

- all verification commands are green,
- migration 0007 is applied in production,
- only an app-metadata admin can access content reads and mutations,
- an admin can create and manage draft content for every registered resource,
- publishing and revision history work end to end,
- Course 1's authenticated production flow passes,
- duplicate roadmap requests cannot duplicate model spend, and
- the team has inspected real funnel events before choosing Phase 1 details.

## Revised delivery order

1. **Phase 0 — shell and hardening**
2. **Resume & Cover Letter** — lessons, deterministic QC, bullet workshop;
   defer the full document editor and PDF export.
3. **Networking Strategy** — see `PHASE_2_PLAN.md` for the full plan: contact
   CRM, a deterministic coverage/timeline intelligence layer, coffee-chat
   prep/debrief, warm introductions, an AI Message Lab (draft + review), and
   a flag-gated Gmail/Outlook provider scaffold. Networking moves earlier
   because its value compounds.
4. **Interview Preparation** — verified questions, static drills and story
   bank; add LLM grading only after expert-labelled evaluation.
5. **Deal Breakdown Templates** — one sourced M&A template before expanding
   transaction types or adding AI pitch conversion.
6. **Market Awareness** — static learning first. Editorial briefs require a
   named owner and committed cadence; live data is optional supporting context.

## Decisions still required before Phase 1

- Which analytics view will be used operationally: a small Admin dashboard,
  Supabase queries, or a dedicated analytics provider?
- What retention/deletion policy applies to future resumes, behavioural
  stories, networking contacts and AI critique inputs?
- Who is authorised to publish, and should Phase 1 add a second-person approval
  state (`draft → reviewed → published`) before more editors are invited?
- What target cohort and recruiting window should drive Phase 1 prioritisation
  and success criteria?

