# TrajectoryOS Resources — Handoff

This document picks up where PR #5 (`claude/resources-page-planning-rjtelk`) left
off. It covers: what's live, what's built but not deployed, and a detailed build
guide for the five resource sections that still need to go from "coming soon"
card to working product.

Read `CLAUDE.md` first for architecture and conventions — this doc assumes you
know the monorepo layout, the `lib/` purity rule, and the RLS/two-phase-LLM
patterns described there.

---

## 1. Status summary

**Built and committed, not yet deployed:**
- The shared **course engine**: content tables (`courses`, `course_modules`,
  `lessons`, `quiz_questions`), user tables (`course_enrollments`,
  `lesson_progress`, `quiz_attempts`, `bank_targets`, `course_roadmaps`) —
  `supabase/migrations/0006_course_engine.sql`.
- A file-based **content authoring + seed pipeline** — `content/courses/<slug>/`,
  `scripts/seed-courses.ts`, `npm run seed:courses[:dry]`.
- A deterministic **diagnostic → readiness scoring** engine — `lib/courses/{diagnostic,readiness,timeline}.ts`, unit-tested, no LLM.
- The full **course UI**: hub, overview, lesson reader, quiz, diagnostic wizard,
  bank target tracker, and a personalised roadmap generator (two-phase LLM,
  cost-bounded by input hash) — `web/app/resources/**`, `web/components/courses/**`.
- **Course 1: Investment Banking Guides** — 9 modules, 26 lessons, 57 quiz
  questions, fully authored in `content/courses/investment-banking-guides/`.

**Nothing is live yet.** The migration hasn't been applied to Supabase and the
seed script hasn't been run. Until then, `/resources` shows the same six
"coming soon" cards it always did — the code just knows how to render a real
`CourseCard` the moment a course row with a matching slug exists and is
`published`.

**Before you seed to production:** the course content is AI-drafted. It's
structured and fact-checked against public sources where cited, but a human who
knows the AU IB recruiting market should read it end to end — especially
Module 6 (recruiting dates) and any firm names — before real students see it.
Flip any file's `status` to `draft` and reseed to pull it back.

---

## 2. Immediate next steps (deploy what's already built)

1. Read through `content/courses/investment-banking-guides/` — every lesson,
   every quiz question. Edit in place; the files are plain markdown/YAML.
2. Apply `supabase/migrations/0006_course_engine.sql` to the Supabase project
   (same process as prior migrations — see `CLAUDE.md` → Deployment).
3. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in your shell (or `.env`).
4. `npm run seed:courses:dry` first (validates only), then `npm run seed:courses`.
5. Smoke-test the live flow end to end: `/resources` → course card appears →
   overview → diagnostic → a lesson → its quiz → tracker → roadmap generation.
6. Merge PR #5.

---

## 3. Per-resource build guides

Each section below follows the same shape: what's already there for you to
reuse, what's genuinely new, and a staged path — mirroring how Course 1 was
built (A→J phases, each phase committed and tested before the next).

### 3.1 Resume & Cover Letter Tips

**Reuse from the engine as-is:**
- Course/module/lesson/quiz tables for the instructional content (structure,
  bullet-writing framework, tailoring theory) — same pattern as IB Guides.
- The `lib/llm` wrapper pattern (`lib/llm/index.ts`, `lib/llm/roadmap.ts`) for
  the bullet-feedback and cover-letter-feedback generators: system prompt +
  user message → JSON-mode call → shape validation → typed result. Do **not**
  let the model invent achievements — the prompt must only rephrase/critique
  what the student supplies, same constraint already enforced in the roadmap
  prompt (`lib/llm/roadmap-prompt.ts`).
- `web/lib/auth.ts` `requireUser()` for gating the workspace pages.
- The two-phase LLM pattern (`course_roadmaps` table shape) as the template for
  a new `resume_feedback` / `cover_letter_feedback` table if generation needs to
  survive a serverless timeout.

**Net-new:**
- A document model: `resumes` (master + tailored versions) and `cover_letters`
  tables, each versioned, each with a `status` (draft/current), owner-RLS.
- A bullet-workshop UI: student pastes/types a bullet, gets rubric-scored
  feedback inline (reuse `KnowledgeCheck.tsx`'s instant-feedback interaction
  pattern, but backed by a real API call instead of a fixed answer key).
- A resume QC scorecard (deterministic, in `lib/`, pure — check for missing
  dates, repeated verbs, empty claims via regex/heuristics; this does NOT need
  an LLM and shouldn't use one for the mechanical checks).
- PDF export (new dependency — evaluate `@react-pdf/renderer` or a
  print-stylesheet + browser print approach before reaching for a heavier lib).

**Build stages:**
1. **Structure + content** — modules on resume structure, bullet framework,
   region-specific rules (AU/UK/US), as lessons. Ship this alone first; it's
   valuable even before the interactive tools exist.
2. **Bullet workshop** — the paste-a-bullet, get-rubric-feedback loop. This is
   the single highest-value interactive piece; get it right before anything else.
3. **Master + tailored resume storage** — versioned documents, "why this firm"
   tailoring workspace (reuses `bank_targets` research the student already did
   in the IB Guides tracker, if they took that course).
4. **Cover letter workshop** — paragraph-by-paragraph guided drafting with the
   same anti-fabrication LLM constraint.
5. **QC scorecard + PDF export** — last, because it depends on the document
   model being stable.

### 3.2 Interview Preparation

**Reuse from the engine:**
- Course/module/lesson tables for the technical-foundations lessons (this can
  literally deep-link to `lib/courses` content already written for IB Guides
  Module 5 rather than duplicating it — consider a "prerequisite" pointer
  instead of re-authoring).
- `ReadinessGauge.tsx` + the readiness-scoring pattern (`lib/courses/readiness.ts`)
  for the interview-readiness dashboard — same dimension/score/gauge shape,
  different dimension set (technical, behavioural, market, communication).
- The `lib/llm` wrapper pattern for grading written mock-interview answers.

**Net-new — this is the biggest lift of the five:**
- A **question bank schema**: category, subcategory, difficulty, division,
  country, model answer, key concepts, common mistakes, follow-ups, source
  type, **verification status** (unverified / reported-once / reported-multiple
  / reviewed / retired), `last_reviewed`. This is structurally different from
  `quiz_questions` (which is multiple-choice with one correct answer) — build
  it as its own table (`interview_questions`), not a variant of the quiz table.
- Drill modes: flashcard, timed written response, rapid-fire, mixed. Each mode
  is a different UI over the same question table.
- A **story bank**: student's own behavioural stories (STAR format), each
  taggable to multiple competencies. Owner-RLS table, no LLM needed to store it
  — LLM only for feedback on a drafted story.
- Written-answer grading: student types an answer, LLM scores against the
  question's model answer + key concepts, returns structured feedback
  (correctness, structure, concision, concepts missed). This is the same
  request shape as the bullet workshop above — consider sharing the prompt
  utility.

**Build stages:**
1. **Question bank seed format + verification workflow** — get the schema and
   the authoring file format right first; this table is reused by Networking
   Strategy's coffee-chat questions later, so don't paint it into an
   IB-interview-only corner.
2. **Static drill modes** (flashcard, filtered browse) — no LLM, proves the
   question bank UI before adding grading cost.
3. **Story bank** — STAR-structured, competency-tagged, student-authored.
4. **LLM-graded written mock** — single question at a time, written response,
   structured feedback. Explicitly out of scope per the earlier scoping
   decision: audio/video recording. Keep it written-only.
5. **Interview readiness dashboard** — aggregates drill accuracy + mock scores
   + story-bank completeness into the gauge.

### 3.3 Deal Breakdown Templates

**Reuse from the engine:**
- `bank_targets`-style CRUD pattern (`BankTrackerTable.tsx`) as the template for
  the deal portfolio — optimistic browser-client CRUD through owner RLS, no API
  route needed for basic save/edit/delete.
- `lib/llm` pattern if you want an LLM "interview pitch" converter (turns the
  student's filled-in template into a 30s/90s/3min spoken answer) — optional,
  the guided form itself doesn't need any LLM.
- `web/lib/auth.ts` gating.

**Net-new:**
- Five template-specific schemas (M&A, IPO, follow-on, debt, LBO) — each is a
  structured form, not free text. Model as one `deal_breakdowns` table with a
  `template_type` discriminator and a `fields jsonb` column validated against a
  per-type zod schema in `lib/`, rather than five separate tables — keeps the
  portfolio/list view simple.
- A `deal_sources` child table: source title, publisher, date, URL, document
  type, notes — every factual field in the main record should be traceable to
  one of these.
- A deal scorecard (source quality, completeness, risk-analysis presence) —
  deterministic in `lib/`, no LLM.
- PDF export (same tooling decision as Resume & Cover Letter — resolve once,
  reuse for both).

**Build stages:**
1. **M&A template only** — get the guided-form UX and the fields/sources
   split right on the one transaction type students ask about most.
2. **Source discipline** — the fact vs. interpretation labeling UI; this is
   the feature that keeps the tool honest, build and test it before scaling to
   more templates.
3. **Remaining four templates** (IPO, follow-on, debt, LBO) — now that the
   pattern is proven, these are mostly schema + form variations.
4. **Interview-pitch conversion** — 30s/90s/3min structured outputs, optional
   LLM assist.
5. **Portfolio view + scorecard + export** — last, ties everything together.

### 3.4 Market Awareness

**Flag up front:** this resource needs an **ongoing human editorial loop**, not
just code — "Today's Brief" requires someone writing daily summaries. Don't
build the full vision before that staffing question is answered; ship the
static/course parts first and treat the live-data dashboard as a distinct,
later decision.

**Reuse from the engine:**
- Course/module/lesson tables for Modules 1–7 of the original spec (how markets
  connect to IB, equity/credit/macro basics, sector primers) — this content can
  ship as a normal course with zero new infrastructure.
- `lib/llm` pattern for grading written "turn this news into an interview
  answer" practice responses (same shape as Interview Prep's written grading —
  share the prompt utility if both exist).
- `bank_targets`/tracker CRUD pattern for the watchlist (companies/sectors/
  themes the student follows).

**Net-new:**
- An **editorial content model**, distinct from lesson content: a `market_briefs`
  table (headline, what-happened, why, IB-relevance, interview-takeaway,
  sources, `published_at`, `pinned`) — human-authored, not seeded from files
  the way lessons are; needs its own light admin surface eventually.
- Third-party data integration: TradingView embeddable widgets are the fastest
  path for prices/charts (no API key, client-side embed) — start there before
  touching a paid market-data API. Layer in FRED (free, US macro) before
  anything paid.
- Explicit "live / delayed / end-of-day" labeling on every data widget — do not
  present delayed data as real-time (this was a hard requirement in the
  original spec).

**Build stages:**
1. **Course content only** — Modules 1–7, no live data, no editorial ops. This
   alone delivers real value and needs nothing new.
2. **Editorial brief schema, manually inserted** — no automation yet, just the
   table + a hand-written brief or two, rendered on a `/resources/market-awareness/brief`
   page. Proves the content model before any admin UI investment.
3. **One TradingView widget live** (e.g. market overview) — no data pipeline,
   just the embed, correctly labeled.
4. **Watchlist** — reuse the tracker CRUD pattern.
5. **Interview-practice tie-in** — "turn this into an interview answer" written
   response + LLM feedback, linking briefs to the practice loop.

### 3.5 Networking Strategy

**Reuse from the engine — this resource reuses the most:**
- `bank_targets` table and `BankTrackerTable.tsx` is *directly* the shape of a
  networking CRM (name, firm, division, status, notes, follow-up) — consider
  whether this should literally be a `contacts` table with the same component
  pattern rather than a new design.
- Course/module/lesson tables for the instructional content (what networking
  is/isn't, mapping your network, positioning, coffee chats, referrals).
- `lib/llm` pattern for the message-review tool (flags generic openers, missing
  call-to-action, excessive length) — same "critique, don't fabricate" prompt
  discipline as the bullet workshop.
- The **question bank schema from Interview Prep** (§3.2) for the coffee-chat
  question groups — build the schema once there, reuse it here with a
  different category set rather than building a second question-bank table.
- The roadmap two-phase LLM pattern (`lib/llm/roadmap.ts`) as the template for
  the 30-day networking plan generator — same input-hash cost-bounding idea.

**Net-new:**
- The `contacts` CRM table itself (if not literally reusing `bank_targets`):
  relationship strength, last interaction, next follow-up, advice received,
  application connection.
- Message templates as authored content (purpose, personalization fields,
  good/bad examples) — this can be lesson content, not a new schema.
- A message-review tool UI (paste a draft, get flagged issues) — same
  interaction pattern as the bullet workshop.

**Build stages:**
1. **Contact CRM** — reusing the tracker pattern is the fastest path; this is
   close to a copy-paste of `BankTrackerTable.tsx` with different fields.
2. **Outreach templates + review tool** — content as lessons, then the paste-and-flag
   critique tool.
3. **Coffee-chat prep** — question groups (depends on Interview Prep's
   question-bank schema existing).
4. **Follow-up tracking** — mostly a view/filter over the existing CRM table
   (status = "follow-up due").
5. **30-day plan generator** — LLM roadmap pattern, reusing
   `lib/llm/roadmap.ts` as the template almost directly.

---

## 4. Cross-cutting infrastructure not yet built

- **Admin/CMS UI** — deliberately deferred for v1 (content ships via files +
  `seed-courses.ts`). Revisit once 3+ courses are live and direct-file editing
  becomes the bottleneck, not before — building it earlier is premature scope.
- **Question-bank schema + verification workflow** — needed by both Interview
  Prep and Networking Strategy. Build it once, in Interview Prep (§3.2 stage 1),
  and have Networking Strategy's coffee-chat questions reuse the same table
  with a different `category`.
- **PDF export** — needed by both Resume & Cover Letter and Deal Breakdown
  Templates. Resolve the library/approach once, share it.
- **Written-answer LLM grading** — needed by Resume (bullets), Interview Prep
  (mock answers), Market Awareness (interview-answer practice), and Networking
  (message review). Strong candidate for a single shared `lib/llm/critique.ts`
  utility (system-prompt builder + JSON-mode call + shape guard) rather than
  four separate near-identical implementations.
- **UK/US region expansion** — `region` column already exists on every content
  table (`au | uk | us | global`); no UK/US content exists yet for any course.
  Treat as a content project, not a schema project, when it comes up.

---

## 5. Recommended sequencing

Unchanged from the original plan: **Resume & Cover Letter → Interview
Preparation → Deal Breakdown Templates → Market Awareness → Networking
Strategy.** Resume and Interview Prep reuse the most existing engine
infrastructure and create the most immediate value with the least net-new
work. Deal Breakdown and Market Awareness then produce material students need
for interviews. Networking Strategy is most useful once students already
understand the industry and can speak about it credibly — and it reuses
almost every pattern built for the resources before it, so it should be both
the last one built and the fastest.
