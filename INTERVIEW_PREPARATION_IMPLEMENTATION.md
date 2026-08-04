# Interview Preparation — Technical Core implementation handoff

Status: foundation implemented; expert content production and calibration still required.

This handoff implements the Technical-Question-Bank-First architecture. It deliberately does **not** label generated placeholder content as approved or claim that the Technical Core 120 exists before the human workflow produces it.

## What exists

- A strict `TechnicalItemFamily` contract containing versions, sources, jurisdiction, assumptions, parameters, deterministic checks, must-hit and bonus points, fatal errors, accepted variants, misconceptions, follow-up trees, bank reliability and independent reviewer identities.
- The complete 60-concept investment-banking taxonomy and prerequisite DAG.
- The exact 120-family topic/difficulty allocation target.
- Seeded, fixed-point parameter generation with reproducible SHA-256 question hashes; runtime answer keys never use an LLM or JavaScript floating point.
- Constraint and property validation, including 1,000 generated instances per variant before an admin bundle can publish.
- Concept-level mastery, evidence confidence, fatal misconception blocking and spaced/variant requirements.
- Stage 1 deterministic grading plus structured qualitative rubric-evidence classification. The AI cannot add rubric points, misconception codes or follow-up nodes, and every cited excerpt must occur verbatim in the submitted answer.
- A Supabase migration with the content graph, immutable versions, student evidence, diagnostics, disputes, pilot statistics, dormant billing records, entitlements, RLS and publish guards.
- A signed-in student workspace for diagnostic and adaptive practice, text answers, simulation/coach live audio, transcript review, qualitative feedback and mastery history.
- An admin operations page with Core 120 gates and a reviewed-family importer.
- A course-shell orientation module and seed command.

## Open testing access

Testing has no paywall. `INTERVIEW_BILLING_ENABLED` defaults to `false`, and every signed-in tester receives Technical Core and live-audio access. Checkout and portal handlers stay dormant for a possible later commercial release; they return 404 while billing is disabled.

This means Stripe credentials are not required for development or pilot testing.

## Setup

1. Apply `supabase/migrations/0015_technical_core_foundation.sql`.
2. Seed the taxonomy and primary misconception registry:

   ```bash
   npm run seed:technical-core:dry
   npm run seed:technical-core
   ```

3. Seed the course shell with the existing course command, then publish Interview Preparation through Resource Admin when ready for testers.
4. Configure OpenAI or Netlify AI Gateway for qualitative grading. Set `INTERVIEW_REALTIME_ENABLED=true` only when live audio should be exercised.
5. Keep `INTERVIEW_BILLING_ENABLED=false` throughout product testing.

Netlify AI Gateway supports `gpt-5.6-terra`, which is the default qualitative grader. Realtime uses server-minted ephemeral credentials and defaults to `gpt-realtime-2.1` with `gpt-realtime-whisper` transcription. The standard API key never reaches the browser.

## Content production

The admin importer accepts only a complete reviewed `TechnicalItemFamily` JSON bundle. Before publishing, it verifies:

- the exact schema and deterministic rubric weights;
- reviewer independence and founder-override reasons;
- source provenance and no verbatim source text;
- bank-specific corroboration thresholds;
- all declared variants; and
- 1,000 generated instances per variant with zero constraint failures.

The database then independently requires approved question, rubric and parameter versions, provenance links, technical review, realism review, copyright review, no unresolved blockers and an author-independent approver.

Corrections create new versions. Published versions, generated instances and submitted attempt content cannot be overwritten.

## Honest release boundary

The software foundation is not the Core 120 content asset. The remaining launch-critical work is human:

- recruit and contract the reviewer pool;
- independently author the 120 families;
- complete technical, interviewer-realism, provenance and copyright review;
- run the 40–60 student pilot and collect at least 2,000 attempts;
- human-grade the calibration sample and adjudicate disputes;
- populate `technical_pilot_statistics`; and
- pass the content, disagreement, completion, repeat-practice and accuracy gates.

Do not weaken the importer or set fake review identities to make the Published count reach 120. The admin dashboard must continue to show incomplete gates until the evidence exists.

## Main paths

- Shared domain: `lib/interview/`
- Qualitative grader: `lib/llm/interview-grade.ts`
- Migration: `supabase/migrations/0015_technical_core_foundation.sql`
- Taxonomy seed: `scripts/seed-technical-core.ts`
- Student workspace: `/resources/interview-preparation/practice`
- Admin operations: `/admin/interview-preparation`
- Practice APIs: `/api/resources/interview-preparation/technical/*`
- Realtime secret minting: `/api/resources/interview-preparation/technical/realtime/session`

## Verification

Run:

```bash
npm run typecheck
npx vitest run tests/interview
npm run build
```

The migration has also been applied successfully from a clean state to a disposable PostgreSQL database with Supabase auth-role stubs.
