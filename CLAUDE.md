# TrajectoryOS — Architecture & Conventions

Career-intelligence platform that helps Australian university students break into
investment banking. A student's profile is scored against a database of real IB
professionals, then an LLM turns the structured result into a personalised report.

## Monorepo layout (npm workspaces)

```
/                      root workspace — scoring/LLM engine, scripts, tests
├── lib/               @trajectoryos/core — the shared engine (NO network/DB/file I/O)
│   ├── scoring/       8-layer scoring pipeline (pure functions)
│   ├── llm/           OpenAI generators (report + recruiting roadmap)
│   ├── courses/       course engine: content-block schemas, diagnostic,
│   │                  readiness scoring, AU recruiting timeline (all pure)
│   └── db/            xlsx loader for the professional database
├── content/           authored course content (human-editable YAML + markdown)
│   └── courses/<slug>/  course.yaml + modules/NN-slug/{module.yaml,quiz.yaml,*.md}
├── scripts/           CSV/XLSX import + course seeding + demos (run with tsx)
├── tests/             vitest suites (scoring engine + course engine/content lint)
├── supabase/          SQL migrations (apply in order)
└── web/               Next.js app (Netlify deploy target)
    ├── app/           routes (App Router) incl. /resources course pages + /api/courses
    ├── components/    UI (incl. components/courses/)
    └── lib/           web-only helpers (onboard, supabase clients, courses/ queries)
```

`lib/` is published to the workspace as **`@trajectoryos/core`** (see `lib/package.json`).
- `web/` imports it as `@trajectoryos/core/scoring`, `/scoring/types`, `/llm`, `/llm/types`,
  `/llm/roadmap`, and `/courses/*` (`content`, `diagnostic`, `readiness`, `timeline`).
  Next transpiles its TS source via `transpilePackages` in `web/next.config.ts`.
- Root `scripts/` and `tests/` import the same files by **relative path** (`../lib/...`).
- **Import extensions:** files *inside* `lib/` import each other **extensionless**
  (`./prompt`, `../courses/readiness`) — Turbopack won't resolve `.js` specifiers here.
  External importers in `scripts/`/`tests/` use `.js` (e.g. `../../lib/courses/readiness.js`).

> History: web used to reach `lib/` through symlinks (`web/lib/scoring → ../../lib/scoring`).
> Those break on Netlify/Vercel (target is outside the deploy root). The workspace
> package replaces them. Do **not** reintroduce cross-root symlinks.

## Request flow (report generation)

Onboarding wizard (`web/app/onboard/*`) collects a form into `localStorage`, then:

1. **Magic-link auth** (`signup` → `/auth/callback?next=/report/loading`).
2. **`/report/loading`** reads the form and drives two requests:
   - `POST /api/generate-report` — validates input, builds a `StudentProfile`,
     scores it against the professionals table, inserts a report row with
     `status='processing'` (scoring done, `llm_report` still null). Fast.
   - `POST /api/reports/[id]/process` — runs the LLM, flips status to
     `completed`/`error`. Isolated so neither request risks a serverless timeout.
3. **`/report/[id]`** renders the report, or `ReportPending` if it isn't
   `completed` (auto-resumes processing; supports retry).

## Courses (the Resources section)

The `/resources` hub lists **courses** built on a shared engine. Course 1,
`investment-banking-guides`, ships on it; the other five sections stay
"coming soon" placeholders until published.

- **Content is authored as files** under `content/courses/<slug>/` (YAML +
  markdown with fenced YAML directives: ```knowledge_check / callout / table /
  profile_example). `scripts/lib/parse-course.ts` parses + strictly validates
  against `lib/courses/content.ts`; `scripts/seed-courses.ts` idempotently
  upserts into Supabase on natural keys (slugs). `status: draft|published` and
  `last_reviewed` live in the files; publishing = flip to `published` + reseed.
- **DB (migration 0006):** content tables (`courses`, `course_modules`,
  `lessons`, `quiz_questions`) are published-only public read — EXCEPT
  `quiz_questions`, which has RLS enabled with NO policies (answers are
  service-role-only; the quiz page + grading route strip them). User tables
  (`course_enrollments`, `lesson_progress`, `quiz_attempts`, `bank_targets`,
  `course_roadmaps`) are owner-RLS; `quiz_attempts`/`course_roadmaps` are
  owner-select-only and written server-side.
- **Diagnostic → readiness** is deterministic (`lib/courses/{diagnostic,readiness}.ts`,
  unit-tested), NOT LLM. The **roadmap** reuses the report two-phase pattern:
  `POST /api/courses/[slug]/roadmap` (assembles a hashed input snapshot; reuses
  an existing roadmap on identical hash) → `POST /api/roadmaps/[id]/process`
  (LLM via `lib/llm/roadmap.ts`).
- **Gating:** course overview + hub are public; lessons/quiz/diagnostic/tracker/
  roadmap require login via `requireUser()` (`web/lib/auth.ts`), since the proxy's
  prefix list can't express public/gated within one subtree.

## Conventions

- **Trust boundaries are validated with zod.** The onboarding payload is parsed by
  `web/lib/onboard/schema.ts` (`OnboardDataSchema`); professional DB rows are mapped
  defensively (malformed rows are skipped, not fatal). The engine's own schemas live
  in `lib/scoring/types.ts` (`StudentProfileSchema`, `ProfessionalRowSchema`).
- **The engine is pure.** Nothing in `lib/scoring` touches the network or DB. Keep it
  that way so it stays unit-testable — see `tests/scoring/`.
- **Server-only secrets** (`SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`) are read
  from `process.env` at runtime only. Never put them in `next.config` `env` (that
  inlines them into the build) or expose them with a `NEXT_PUBLIC_` prefix.
- **Supabase clients**: use `createClient()` (RLS, user cookies) for user-scoped
  reads/writes and `createServiceClient()` (bypasses RLS) for trusted server work —
  both from `web/lib/supabase/server.ts`.
- **Next.js version is non-standard** — read `web/AGENTS.md`. Check
  `web/node_modules/next/dist/docs/` before relying on config/API behaviour.

## Common commands

```bash
npm install            # install all workspaces (creates node_modules/@trajectoryos/core)
npm test               # run scoring engine tests (vitest)
npm run typecheck      # type-check engine+scripts and the web app
npm run dev            # next dev (web)
npm run build          # next build (web)
npm run import:dry     # dry-run the professional DB import
npm run seed:courses:dry  # validate all authored course content (no DB writes)
npm run seed:courses      # upsert course content to Supabase (needs SUPABASE_* env)
```

## Deployment (Netlify)

- Build runs from the **repo root** so npm workspaces resolve. See `netlify.toml`.
- Set env vars in the Netlify dashboard (not committed): `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`
  (optionally `OPENAI_MODEL`). See `.env.example`.
- Apply `supabase/migrations/*.sql` in order to the Supabase project.
