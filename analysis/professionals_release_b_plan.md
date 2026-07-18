# Professional database Phase 2

Status: implementation in progress.

Phase 2 makes the normalized professional model the only application scoring
source. This environment has no customers and the legacy CSV remains the
recovery artifact, so the work prioritises a clean extensible model, scalable
imports, and deterministic scoring over long-lived dual-read or release-history
machinery.

## Outcomes

- `professional_profiles`, education, experiences, achievements, institutions,
  organizations, and private identity are the authoritative records.
- New professionals may remain `draft` while incomplete; only valid `ready`
  professionals appear in the scorer input.
- `professional_scoring_input` is the one service-only scoring surface.
- Experiences and achievements are stored as unlimited ordered child rows.
- Canonical workbook imports support `professionals`, `education`,
  `experiences`, and `achievements` sheets.
- The legacy five-slot workbook remains readable through a conversion adapter,
  but it is no longer the write authority.
- Report generation loads every eligible professional even when the cohort is
  larger than PostgREST's default row limit.
- Scoring weights, distance, pool, fit-band, and action rules do not change in
  this phase.

## Canonical model

### Profiles and readiness

Each profile has lifecycle status `draft`, `ready`, or `excluded`. A draft can
be imported and repaired without reaching scoring. An excluded record carries
a short reason. The service-only `professional_scoring_readiness` view reports
blocking reasons including incomplete education, unresolved canonical values,
invalid experience ordering, and unsupported signals.

`professional_scoring_input` includes only `ready` rows with no blockers. It
returns the strict `Professional` contract, deterministic experience order,
derived and reviewed signals, and achievement timing without identity or source
evidence.

### Missing and derived facts

- Missing dates and durations remain null.
- `unknown` is stored only for domains where it is a supported value.
- `internship`, `casual`, and `capital_markets` map to
  `summer_internship`, `part_time`, and `global_markets`.
- Combined `elite_boutique_and_mm` tiers must be resolved before a record is
  ready.
- WAM, Big 4, private-equity, consulting, and co-op signals derive from
  structured facts.
- Approved professional-only signals never become onboarding options
  implicitly.
- Known achievement dates determine stage visibility. Undated achievements
  retain the existing S1-and-later behaviour.
- Acquisition method and transition type remain separate in storage while the
  scoring projection preserves return-offer, conversion, and lateral signals.

## Import workflow

The canonical workbook has four sheets:

1. `professionals`
2. `education`
3. `experiences`
4. `achievements`

Every child row references a stable professional key. Import processing:

1. parses the whole workbook without writing;
2. normalizes strings, URLs, aliases, and identifiers;
3. validates parents and every child row;
4. detects duplicate identities, sequences, and achievements;
5. returns inserted, updated, unchanged, draft, and rejected counts;
6. commits a valid batch transactionally;
7. recalculates readiness and derived signals;
8. verifies scoring row count and adapter validity.

Rejected batches do not partially write. Re-importing the same workbook is
idempotent. The legacy flat format is converted to the canonical batch before
validation.

## Delivery sequence

### 2.1 Schema and readiness

- Add lifecycle state and exclusion reason.
- Add organization and institution alias tables.
- Normalize and uniquely constrain populated LinkedIn URLs.
- Add lightweight import batch records.
- Add scoring readiness and canonical scoring views.
- Keep normalized/private tables service-only.

Exit: all existing normalized rows classify as ready, draft, or excluded; no
invalid row can reach scoring.

### 2.2 Existing-data cleanup

- Resolve combined firm tiers.
- Reconcile structured facts and duplicated signals.
- Review professional-only signal candidates.
- Convert overflow prose only when it supports a complete experience.
- Preserve unknown acquisition methods and null durations.
- Review relevance derivations and overrides.

Exit: all ready rows pass the strict adapter and a one-time aggregate scoring
comparison explains material changes.

### 2.3 Scalable import

- Add the four-sheet parser and dry-run output.
- Add legacy conversion.
- Add transactional normalized upsert.
- Add identity and alias resolution.
- Recompute readiness after each batch.

Exit: imports support more than five experiences and more than 1,000
professionals without partial writes or duplicates.

### 2.4 Scoring load path

- Read only `professional_scoring_input`.
- Paginate deterministically beyond 1,000 rows.
- Reconcile loaded and ready counts.
- Retain the pure `score(student, professionals)` entry point.
- Fail closed on malformed, duplicate, missing, or truncated results.

Exit: fixtures at 100, 1,001, and 10,000 rows load completely and scoring no
longer reads the legacy table.

### 2.5 Preliminary-environment cutover

- Run migration and canonical import.
- Review data-quality and before/after scoring summaries.
- Run migration, security, scoring, route, typecheck, lint, and production
  build gates.
- Generate representative reports.
- Remove obsolete legacy/shadow application code after verification.

No staged customer rollout is required.

## Verification gates

### Data and database

- Unique professional IDs and normalized LinkedIn URLs.
- Unique child sequences and no orphan rows.
- Valid taxonomy, date ranges, durations, and deterministic ordering.
- No unresolved combined tier or unsupported signal in scoring.
- No duplicated derived signals.
- Private identity absent from scoring surfaces.
- Storage, readiness, and scoring counts reconcile.
- Readiness evaluation and imports are idempotent.

### Import

Tests cover missing sheets/columns, invalid keys, orphan children, duplicate
URLs, aliases and alias conflicts, duplicate experiences, more than five
experiences, missing duration, unknown acquisition, unsupported taxonomy,
dry-run, transaction rollback, unchanged re-import, updates, and cohorts of
1,001 and 10,000 professionals.

### Scoring

Fixtures cover stages S0-S5, every target tier and geography, missing/unknown
education and duration, canonical mappings, split tiers, transitions, dated
and undated achievements, professional-only signals, empty/small/large pools,
and tie-expanded matches.

Outputs must be deterministic for fixed inputs and time, contain no missing or
non-finite values, keep probability counts internally consistent, exclude
draft/excluded profiles, and contain no private identity. Intentional changes
from corrected data are accepted through one aggregate before/after review;
per-row historical versioning is not required.

### Application, security, and scale

- Authenticated report generation succeeds; unauthenticated generation fails.
- Empty or malformed scoring cohorts fail clearly.
- Browser roles cannot query professional or identity data.
- Import errors and logs do not expose private source data.
- Tests, typechecks, lint, and production build exit successfully.
- A 10,000-row load is complete, has no N+1 reads, stays within the serverless
  request budget, and uses less than 256 MB additional memory.

## Assumptions

- The environment contains no customers and may be reset.
- The saved legacy CSV is sufficient recovery.
- Existing test reports may be deleted or regenerated.
- One owner may approve mappings and exclusions.
- Lightweight import metadata is sufficient.
- The normalized model is authoritative for future imports.
- Scoring formulas remain unchanged until the dataset is larger and measured.
