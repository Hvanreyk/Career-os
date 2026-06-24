# TrajectoryOS — Architecture & Conventions

Career-intelligence platform that helps Australian university students break into
investment banking. A student's profile is scored against a database of real IB
professionals, then an LLM turns the structured result into a personalised report.

## Monorepo layout (npm workspaces)

```
/                      root workspace — scoring/LLM engine, scripts, tests
├── lib/               @trajectoryos/core — the shared engine (NO network/DB)
│   ├── scoring/       8-layer scoring pipeline (pure functions)
│   ├── llm/           OpenAI report generator (scoring output → markdown)
│   └── db/            xlsx loader for the professional database
├── scripts/           CSV/XLSX import + demos (run with tsx)
├── tests/             vitest suites for the scoring engine
├── supabase/          SQL migrations (apply in order)
└── web/               Next.js app (Netlify deploy target)
    ├── app/           routes (App Router)
    ├── components/    UI
    └── lib/           web-only helpers (onboard form, supabase clients)
```

`lib/` is published to the workspace as **`@trajectoryos/core`** (see `lib/package.json`).
- `web/` imports it as `@trajectoryos/core/scoring`, `/scoring/types`, `/llm`, `/llm/types`.
  Next transpiles its TS source via `transpilePackages` in `web/next.config.ts`.
- Root `scripts/` and `tests/` import the same files by **relative path** (`../lib/...`).

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
```

## Deployment (Netlify)

- Build runs from the **repo root** so npm workspaces resolve. See `netlify.toml`.
- Set env vars in the Netlify dashboard (not committed): `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`
  (optionally `OPENAI_MODEL`). See `.env.example`.
- Apply `supabase/migrations/*.sql` in order to the Supabase project.
