# Resume Builder v2 — Master Plan

Upgrade the bullet-critique-only "AI Resume Workshop" (`resume-cover-letter`
resource) into a fully fledged resume builder:

1. **Structured document editor** — contact header + sections + entries
   (org / role / dates / location) + bullets, not just headings and bullets.
2. **PDF/DOCX import** — upload an existing resume; the server extracts text
   (files are parsed then discarded — no storage bucket) and the LLM converts
   it into the structured document.
3. **PDF/DOCX export** — professionally formatted single-page AU IB resume.
4. **Auto-create** — one click drafts a resume from `student_profiles.profile`
   (onboarding data), after an "additional details" screen collects what
   onboarding never asked for (contact info, role titles, date ranges,
   responsibilities, skills, interests, anything-else discovery question).
5. **AI improvement** modelled on
   [varunr89/resume-tailoring-skill](https://github.com/varunr89/resume-tailoring-skill):
   a general improve pass, and **JD tailoring** — paste a job description,
   the LLM extracts requirements, matches them against the resume with
   confidence-scored evidence (`direct` / `stretch` / `gap`), coverage % is
   computed deterministically in code, gaps are reported honestly, and every
   proposed change must cite evidence already in the resume.
   **Hard rule: never fabricate** — reframe truthfully, use the literal
   `[add metric if truthful]` placeholder, present changes as per-item
   accept/reject checkpoints (no silent overwrite).
6. The existing per-bullet critique (quota, signed receipts, immutable
   revisions from migration 0008) survives as an action inside the builder.

## Data model — `supabase/migrations/0012_resume_builder.sql`

- `resumes` gains nullable contact columns: `full_name`, `email`, `phone`,
  `linkedin_url`, `location`. One master resume per user stays (unique user_id).
- New `resume_entries` (org, role_title, location, free-text `date_range`,
  sort_order) child of `resume_sections`, owner RLS + composite FK pattern
  copied from 0008.
- `resume_bullets.entry_id` (nullable — null = section-level bullet, so all
  legacy bullets and the critique/revision infra keep working untouched).
- `resume_ai_jobs` — one leased-job table for all four generators
  (`kind in import|compose|improve|tailor`), status
  `pending|processing|completed|error`, `input`/`output` jsonb, `input_hash`
  with a partial unique index for idempotent reuse (mirrors
  `course_roadmaps_active_input_uidx`), claimed via SECURITY DEFINER RPC
  `claim_resume_ai_job` (2-minute lease, adapted from `claim_course_roadmap`
  in 0007). Owner select-only RLS; writes are service-role.
  Tailor output (JD analysis, matches, gaps, changes) lives in `output` as a
  proposal artifact — applying it writes to the real tables.
- `replace_resume_document(p_user_id, p_resume_id, p_document jsonb)` RPC —
  atomic wholesale document write (import/compose/apply-all), service-role
  only. Replacing bullets cascades away their revision history — the UI warns.
- `resume_ai_daily_usage` + `claim_resume_ai_quota` / `release_resume_ai_quota`
  — Sydney-day quota per kind (clone of the 0008 critique quota), env
  `RESUME_AI_DAILY_LIMIT` (default 10). Critique quota unchanged.

## Engine (`lib/`, pure)

- `lib/resume/document.ts` — the lingua franca schemas (zod v3, `.strict()`,
  `.nullable()` for structured output): `ResumeContactSchema`,
  `ResumeEntryDraftSchema`, `ResumeSectionDraftSchema`, `ResumeDocumentSchema`,
  `ResumeChangeSchema` (index-addressed targets), `JdRequirementSchema`,
  `JdMatchSchema`, `TailorOutputSchema`, `AdditionalDetailsSchema`.
- `lib/resume/serialize.ts` — `serializeResumeForPrompt(doc)`: numbered,
  index-addressed plain text sent to the LLM.
- `lib/resume/apply.ts` — `applyChanges(doc, changes)`: pure merge of accepted
  changes back onto a document (unit-tested).
- `lib/resume/coverage.ts` — `computeCoverage(requirements, matches)`:
  deterministic coverage % (must-haves ×2, direct 1.0, stretch 0.5). The LLM
  never does arithmetic.
- Four generators in `lib/llm/`, all following the `critique.ts` Responses API
  + `zodTextFormat` pattern (model `OPENAI_CRITIQUE_MODEL ?? gpt-5.6`,
  `store:false`, 30s timeout, untrusted text wrapped in delimiter tags,
  never-fabricate prompt rules):
  - `resume-extract.ts` (`resume-extract-v1`): raw text → `ResumeDocument`.
  - `resume-compose.ts` (`resume-compose-v1`): display-safe profile projection
    (`toComposeProfileInput` — **excludes high_school/ATAR**, which are
    never-display) + additional details → `ResumeDocument`.
  - `resume-improve.ts` (`resume-improve-v1`): serialized doc →
    `{summary, changes[], discovery_questions[]}`.
  - `resume-tailor.ts` (`resume-tailor-v1`): serialized doc + JD →
    `TailorOutput` (requirements, evidence-cited matches, honest gaps,
    traceable changes).

## Web

- Libraries (web/ only; all dynamic-imported in route handlers):
  `mammoth` (DOCX text), `unpdf` (PDF text, serverless-safe pdf.js),
  `@react-pdf/renderer` (PDF export), `docx` (DOCX export).
- `web/lib/resume/extract.ts` — file → text (magic-byte sniff, 4.5 MB cap,
  <200 extracted chars → 422 with paste-text fallback).
- `web/lib/resume/export/{template.ts,pdf.tsx,docx.ts}` — shared formatting
  model + both renderers.
- API (all under `web/app/api/resources/resume-cover-letter/`, all through
  `getResumeApiContext()` + zod + `recordResumeEvent`):
  - extended `resume` PATCH (contact fields); new `entries` + `entries/[id]`;
    `bullets` gains optional `entryId`.
  - `document` GET (assemble) / PUT (validate + `replace_resume_document`).
  - `import` POST (multipart or `{text}`), `compose` GET (prefill) / POST,
    `improve` POST, `tailor` POST — each creates a `resume_ai_jobs` row
    (quota-claimed, hash-reused).
  - `ai-jobs/[id]` GET status/output; `ai-jobs/[id]/process` POST — claim via
    RPC, dispatch on kind, guarded completion (the roadmap process route is
    the reference).
  - `export` GET `?format=pdf|docx[&jobId=…]` — render saved document, or a
    completed job's proposal (export a tailored version without overwriting
    the master).
- UI (`web/components/resume/`): `ResumeBuilder` shell + toolbar
  (Auto-create / Import / Improve / Tailor / Export), `builder/*`
  (ContactHeader, SectionList, EntryCard, BulletRow), `CritiquePanel`
  (extracted from the old ResumeWorkshop), `ai/*` (AutoCreateDialog,
  ImportDialog, ProposalReview with per-change accept toggles + amber
  placeholder highlighting, TailorPanel, CoverageReport), `ExportMenu`,
  `useResumeAiJob` (create → process → poll).

## Sequencing

| Phase | Scope |
|---|---|
| 1 | Migration 0012, document schemas/serialize/apply, entries + document routes, rebuilt editor UI |
| 2 | PDF/DOCX export |
| 3 | AI job rail + import (upload → extract → structured proposal) |
| 4 | Auto-create (additional-details screen → compose) |
| 5 | Improve + JD tailoring + coverage |
| 6 | Tests, analytics events, env docs, verification |

Each phase ends with `npm test`, `npm run typecheck`, `npm run build` green.

## Risks

- Non-standard Next 16: verify `request.formData()` and binary responses
  against `web/node_modules/next/dist/docs/` before writing those routes.
- Netlify bundle size (react-pdf): dynamic imports; fallback is client-side
  PDF rendering (template is renderer-agnostic).
- Wholesale replace destroys bullet revision history (cascade) — warned in UI.
- Truthfulness is prompt-enforced: mitigated by evidence refs, code-computed
  coverage, placeholders, and per-change user checkpoints.
- Scanned PDFs: no OCR in v1 — paste-text fallback is a visible tab.
