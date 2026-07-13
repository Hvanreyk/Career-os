# TrajectoryOS — Phase 1: Resume & Cover Letter Workshop

Phase 0 (resource shell, admin CMS, migration 0007) is merged. This document
is the build plan for the next resource, **Resume & Cover Letter**, and the
record of the planning decisions that were still open at the end of Phase 0.

Read `CLAUDE.md` first for architecture and conventions, and `HANDOFF.md`
for the per-resource product vision. Delivery order after this phase is
unchanged: Networking Strategy → Interview Preparation → Deal Breakdown
Templates → Market Awareness.

---

## 1. Decisions record (was: "Decisions still required before Phase 1")

These were the open questions at the end of Phase 0, now decided:

1. **Publishing authority** — stays founder-only. The `draft → reviewed →
   published` approval state is deferred until a second editor is actually
   invited. No code change in Phase 1.

2. **Retention & deletion policy** (defined here for the first time, because
   the Resume workshop is the first feature that stores student-authored
   content):
   - **Workspace content** (resumes, sections, bullets, later cover letters /
     stories / contacts) is the student's working document. It is retained
     for as long as the account is active — deleting it on a timer would
     destroy their work mid-recruiting-cycle. Students can hard-delete any
     document from the UI at any time (revisions included).
   - **On account deletion**, all workspace content and critique history is
     hard-deleted within 30 days (cascade from the auth user).
   - **AI critique results** shown to the student persist with the bullet
     they belong to — they are workspace content, not logs.
   - **Raw LLM request/response logs**, if we keep any beyond the stored
     critique row, are transient debugging artifacts: retained **max 30
     days**, then deleted. This is the layer a short (days-scale) retention
     window applies to — not the student's documents.
   - **Analytics never contain resume free text.** `product_events` rows may
     carry IDs, counts, rubric scores, and version strings only.
   - **Export**: students can always read/copy their full content in the UI;
     file/PDF export ships in Phase 2 with the document editor.

3. **Analytics** — remain inside Supabase on the private `product_events`
   stream from migration 0007. Operational view is SQL queries first; build
   a small read-only admin dashboard card only if the founder finds himself
   running the same queries weekly. No external provider.

4. **Target cohort & recruiting window** — see §3. Phase 1 targets
   **penultimate-year AU students preparing for the February–April 2027
   summer-internship application window** (programs run Nov 2027–Feb 2028).

5. **AI critique quotas** — yes, from the first pilot:
   - server-enforced **daily per-user quota** on critique generations
     (pilot default: 25/day, configurable without a deploy),
   - every critique row stamped with `model` and `prompt_version`
     (same pattern as `ROADMAP_GENERATION_VERSION` in `lib/llm/roadmap.ts`),
   - input-hash reuse so re-submitting an unchanged bullet costs nothing
     (same cost-bounding idea as `course_roadmaps`),
   - no sensitive free text in analytics events.
   - **Freemium seam**: much of the product will eventually sit behind a
     paywall with a free tier. Phase 1 does **not** build billing, but quota
     limits must be resolved through a single server-side entitlement helper
     (e.g. `getCritiqueQuota(userId)`) so a paid tier later just returns
     bigger numbers — quota logic must never be hard-coded at call sites.

---

## 2. Strategy change from the handoff: LLM-first, not heuristics-first

The handoff's original Resume staging shipped a deterministic QC scorecard and
"code-based" checks as the interactive product, with the LLM layer added
later. **Phase 1 inverts that: the AI bullet workshop is the product from day
one.** Reasons:

- The end product *is* an AI-powered workshop. A heuristics-only placeholder
  creates UX we would throw away, and trains early users on the wrong thing.
- The LLM plumbing is not risky new ground — `lib/llm/roadmap.ts` already
  proves the pattern (JSON mode, retries, shape validation, versioning,
  hash-bounded cost). The critique generator is a variation, not an
  experiment.
- The genuinely new risk in this phase is the **document data model** and the
  **quota/cost controls**, and those are needed under either strategy.

The deterministic checks are **not deleted — they are demoted**. A small pure
function in `lib/` (missing metrics, weak/repeated verbs, first-person
pronouns, length bounds, empty claims) runs instantly in the UI before any
LLM call. It acts as a guardrail and a cost-saver (obvious mechanical issues
get flagged for free), not as a milestone or a separate scorecard surface.

Still deferred to Phase 2 (unchanged from the handoff): the full document
editor with formatting, per-firm tailored versions, the cover-letter
workshop, and PDF export.

---

## 3. Cohort, activation, and deadline

**Cohort.** Students currently in second year who become penultimate-year in
2027. Per `lib/courses/timeline.ts`, AU summer-internship applications
typically open **February–March 2027** and close **March–April**, often
assessed rolling. Winter programs share roughly the same window. Resume
preparation realistically happens across the summer break — **November 2026
to January 2027** — before applications open.

**Launch deadline.** The workshop must be in production by
**1 December 2026** to catch the prep season, with a hard stop of
**late January 2027** — after that, the cohort's window is closing and the
phase has missed its cycle.

**Activation criterion.** One measurable event that proves a student got real
value (this is what "activation" means — not sign-ups, not page views):

> **`bullet_revised`** — the student received an AI critique and saved a
> revised version of that bullet.

This is the event Phase 1 success is judged on, and it slots into the
existing shared funnel (resource viewed → lesson viewed/completed →
critique requested → **bullet revised**).

---

## 4. Data model (migration `0008_resume_workshop.sql`)

All user tables owner-RLS, following the 0006/0007 patterns. Critique rows
are **owner-select-only and written server-side** (same posture as
`quiz_attempts` / `course_roadmaps`).

- `resumes` — id, user_id, title, status (`draft`/`current`), timestamps.
  One master resume per student in Phase 1; the unique constraint can relax
  when tailored versions arrive in Phase 2.
- `resume_sections` — resume_id, kind (`education` / `experience` /
  `leadership` / `skills` / `other`), heading, sort order.
- `resume_bullets` — section_id, text, sort order, status. The unit the
  workshop operates on.
- `bullet_critiques` — bullet_id (nullable: paste-mode critiques exist
  before a saved resume), user_id, `input_text`, `input_hash`,
  rubric `jsonb` (per-dimension scores: impact, specificity, action verb,
  quantification, concision), suggested rewrites, `model`, `prompt_version`,
  token usage, created_at. Partial unique key on active
  (user_id, input_hash, prompt_version) for cost reuse, mirroring 0007's
  roadmap-input key.
- `ai_usage` — per-user daily counter ledger: (user_id, feature, day,
  count) with a unique key; incremented atomically server-side before each
  generation. Generic on purpose — Interview Prep and Networking will meter
  through the same table.

---

## 5. Shared critique utility: `lib/llm/critique.ts`

Built once in this phase, reused by Interview Prep (mock answers),
Networking (message review), and Market Awareness (interview-answer
practice) later — the handoff already flags this as the shared piece.

- Same contract as `lib/llm/roadmap.ts`: env-driven model, JSON mode,
  retries/timeout, strict shape validation, usage capture, exported
  `CRITIQUE_GENERATION_VERSION`.
- **Anti-fabrication is the core prompt constraint**: the model may
  critique, score, and *rephrase* only what the student supplied. It must
  never invent achievements, metrics, firms, or outcomes. Suggested
  rewrites that introduce a number the student didn't provide use an
  explicit `[add metric]` placeholder instead.
- Pure with respect to I/O other than the OpenAI call — no DB access
  (`lib/` purity rule).

---

## 6. Build stages

Each stage is committed, tested, and verified before the next — same
discipline as Course 1's A→J.

1. **Migration 0008 + zod schemas** — tables above, RLS policies, and the
   document-model schemas in `lib/` (validated at the trust boundary like
   `OnboardDataSchema`). Unit tests for the deterministic pre-check
   function land here too.
2. **`lib/llm/critique.ts` + API route** — `POST
   /api/resources/resume-cover-letter/critique`: `requireUser()` → capability
   check via the resource catalog → quota check/increment → input-hash
   reuse → LLM → store critique → return. Bullet-sized inputs complete well
   inside a serverless timeout, so this is single-phase; if real latency
   says otherwise, fall back to the two-phase pattern already proven for
   roadmaps.
3. **Bullet workshop UI (paste mode)** — `/resources/resume-cover-letter/workshop`,
   login-gated. Paste or type a bullet → instant deterministic pre-checks →
   request AI critique → rubric scores + rewrites rendered → edit → save
   revision (fires `bullet_revised`). This is the activation loop, live
   end-to-end.
4. **Master resume workspace** — sections + bullets CRUD (tracker-style
   optimistic CRUD through owner RLS), workshop attached to real bullets in
   the document instead of one-off pastes. Bullet status (`draft`/`final`)
   gives students a sense of progress across the whole resume.
5. **Course content** — `content/courses/resume-cover-letter/`: modules on
   resume structure, the bullet framework, AU-specific rules, tailoring
   theory. Authored in files, seeded as draft, published through the Admin
   UI. This runs in parallel with stages 1–4; it is an editorial task, not
   a code dependency.
6. **Measurement + pilot hardening** — funnel events wired
   (`resource_viewed`, `critique_requested`, `bullet_revised`,
   `resume_updated`), quota limits tuned from real usage, prompt iteration
   informed by stored rubric distributions (possible because every critique
   carries `prompt_version`).

---

## 7. Exit criteria

Phase 1 is complete when:

- migration 0008 is applied in production and all verification commands
  (`npm test`, `npm run lint`, `npm run typecheck`, `npm run build`) are green,
- the resume course is published and visible on `/resources`,
- a signed-in student can go lesson → workshop → critique → **saved revised
  bullet** in production,
- an over-quota critique request is rejected server-side with a clear
  message, and an unchanged resubmission reuses the stored critique instead
  of spending tokens,
- every stored critique carries `model` and `prompt_version`,
- `product_events` shows the activation funnel with **zero resume free text**
  in any event payload, and
- the launch date beats the 1 December 2026 target (hard stop: late
  January 2027).
