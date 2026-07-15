# Professional database redesign and compatibility plan

Status: Release A implemented and applied to production on 2026-07-15. The
normalized schema, deterministic backfill, service-only scoring view, semantic
review gates, and live aggregate parity checks are active. The website remains
on `PROFESSIONALS_SOURCE=legacy`; no scorer semantics or client data contract
has been switched.

## Implementation result

- Shared Career Compass taxonomy and derivation rules now own all selectable
  and auto-derived identifiers used by onboarding, validation, and scoring.
- The canonical scorer boundary no longer carries private professional names.
- Normalized tables, RLS, service-role grants, audit runs, quarantine, and
  rollback-release gates are deployed additively beside `public.professionals`.
- All 100 production professionals and 458 ordered experiences were backfilled.
- `professional_scoring_input_v1` returns 100 rows and has zero field-level
  scorer-input mismatches against the legacy projection.
- The latest normalization run is `complete`; the 297 review/quarantine items
  remain outside canonical scoring changes.
- Production legacy retirement is ineligible: there are zero normalized-source
  releases, so both the two-release and 30-day safeguards remain intact.
- Supabase's migration ledger was already partial (it contains only the prior
  timestamped `professionals_rls` migration). The new SQL was applied through
  the dashboard and must be reconciled with `supabase migration repair` before
  adopting `supabase db push` as the deployment mechanism.

## Executive conclusion

The professional database can be normalized without breaking the scoring
engine or the website, but only if the migration preserves three contracts:

1. **Career Compass owns the vocabulary.** Current onboarding identifiers and
   tags are canonical. Database-only values are legacy inputs to map or review;
   they must not redefine the product taxonomy.
2. **The scoring boundary remains stable during the structural migration.**
   `score(student, professionals)` must continue receiving the same canonical
   `Professional[]` meaning until a separately versioned scoring change is
   deliberately released.
3. **The website switches through a validated server-side adapter.** The site
   must not read new normalized tables directly from client code, and the old
   `public.professionals` table must remain available for rollback until the new
   source has passed production parity checks.

The migration must therefore be additive, dual-readable, reversible, and split
into two releases:

- **Release A: structural parity.** Normalize the existing facts without
  changing their meaning or current scores.
- **Release B: semantic improvement.** Map legacy database values to the Career
  Compass taxonomy, add dated achievements, and deliberately version any score
  changes.

Combining those releases would make score changes impossible to distinguish
from migration bugs.

## Why the current model should change

The live `public.professionals` table is healthy at the identity level: 100
unique IDs, 100 LinkedIn URLs, and no normalized identity duplicates. The
problems appear where the data needs to support computation:

- 458 structured experiences are compressed into five repeated column groups.
- 71% of professionals already use the fifth and final experience slot.
- 54% have additional-experience notes outside those structured slots.
- Seven text fields contain 81,743 characters; 63,571 characters outside
  `path_summary` are largely absent from the canonical scoring model.
- 70% of ATAR bands are `unknown`.
- 55.5% of experience acquisition methods are `unknown`.
- 39 current roles and 84 experiences still use the combined legacy firm tier.
- Manually stored signal tags disagree with equivalent structured facts. The
  `wam_hd` flag alone differs for 19 professionals.
- Signal tags have no effective date, so historical stage reconstruction can
  credit achievements before they actually occurred.

## Non-negotiable source-of-truth hierarchy

When identifiers conflict, use this order:

1. Career Compass onboarding choices and server-side derivation rules.
2. Shared scoring contract in `lib/scoring/types.ts`.
3. Explicit compatibility aliases needed to read previously accepted inputs.
4. Existing professional database values.

The database is evidence to migrate, not the authority for naming new product
identifiers.

### One shared contract module

Before changing the database, create one shared Career Compass contract module
inside `@trajectoryos/core`. It should export:

- canonical identifier arrays and Zod enums;
- labels and grouping metadata used by onboarding;
- `selectable`, `auto_derived`, and `accepted_legacy` status for each value;
- separate schemas for submitted Career Compass values, the canonical
  selectable-plus-derived union, and the wider professional compatibility
  values required by the active scoring version;
- `deriveRoleFunction`, `deriveRelevance`, and auto-signal rules;
- taxonomy and derivation version constants.

The following code must import from that module instead of maintaining copies:

- `web/lib/onboard/types.ts`
- `web/lib/onboard/schema.ts`
- the onboarding pages and their option lists
- `web/app/api/generate-report/route.ts`
- `lib/scoring/types.ts`
- professional import and backfill scripts
- normalized-table constraints and compatibility adapters

The current onboarding `signals` schema accepts arbitrary strings and later
casts them to `SignalTag[]`. That is not a safe source-of-truth boundary. The
request schema must accept only currently selectable Career Compass tags; the
server may then add only registered auto-derived tags. A separate professional
compatibility schema may continue accepting reviewed legacy values during
Release A. Do not use that wider schema for onboarding submissions.

### Selectable versus accepted identifiers

The current UI is narrower than some runtime schemas. Preserve that distinction:

- **Selectable** values may be written by the current Career Compass UI.
- **Auto-derived** values are written only by deterministic server rules.
- **Accepted legacy** values may be read during migration but cannot be written
  by a new onboarding submission.
- **Database-only** values require an explicit mapping or human review. They do
  not silently become product identifiers.

Examples:

- Target tier `any` is a query sentinel. It must never be stored as an actual
  professional or experience tier.
- Experience types `internship` and `casual` are accepted by the runtime schema
  but are not current UI choices. Treat them as compatibility values.
- Industry `capital_markets` is a compatibility alias for the current
  `global_markets` identifier. Do not let the old database spelling win.
- `elite_boutique_and_mm` is database legacy. It is not a new-write option and
  must be reviewed into `elite_boutique` or `mid_market` before Release B.

### Canonical Career Compass signal set

The canonical signal namespace is the union of current selectable onboarding
tags and deterministic onboarding-derived tags.

Current selectable tags:

- `deans_list`, `first_in_class`, `subject_top_10_finance`, `faculty_prize`,
  `university_medal`, `school_dux`
- `investment_society_member`, `investment_society_committee`,
  `investment_society_president`, `fin_society_committee`,
  `consulting_society_committee`
- `case_comp_winner`, `case_comp_finalist`, `stock_pitch_winner`,
  `hackathon_winner`
- `cfa_l1`, `cfa_l2`, `cfa_l3`, `modelling_course`, `virtual_experience`
- `scholarship`, `women_in_banking_scholarship`, `exchange_program`
- `sports_rep`, `school_leadership`, `industry_award`

Current auto-derived tags:

- `wam_hd`, `wam_distinction`, `co_op_program`, `atar_99_plus`
- `has_pe_internship`, `has_big4_audit`, `has_big4_advisory`,
  `has_consulting_experience`
- `fin_society_committee` when the current referral derivation rule applies

Tags present only in the professional database or wider legacy enum must be
classified during migration. Preserve the raw fact, but either map it to a
Career Compass tag with an explicit reviewed rule, store it as a typed
professional-only fact outside the Career Compass tag namespace, or quarantine
it from scoring. Never silently rename or discard it.

Until Release B, the active scorer may still require a compatibility signal
union wider than the canonical Career Compass namespace. Keep that type
explicitly named and versioned. It is an adapter contract for existing
professional rows, not permission for Career Compass to emit those values.

## What the scoring engine actually requires

The original proposal incorrectly made `professional_feature_snapshots` the
matcher's immediate and only source. The current scoring and action layers need
more than a flat feature vector.

### Required professional-level fields

- `id`
- `full_name_internal` only while it remains part of the current compatibility
  type; it is not a scoring feature
- `current_role`
- `current_firm`
- `current_firm_tier`
- `current_geography`
- `current_role_start_year`
- `years_to_current_role`
- `university`, `university_tier`
- `degree`, `degree_type`, `majors`
- `wam_band`, `graduation_year`
- `has_honours`, `has_masters_or_second_degree`
- `high_school`, `high_school_type`, `atar_band`
- `signals`
- `path_summary`
- `data_source`, `data_confidence`

`graduation_year`, `current_role_start_year`, and `years_to_current_role` are
not optional migration details. Pool filtering and stage reconstruction use
them directly. Their current meaning must be preserved until a separately
specified scoring change defines replacements.

The current `Professional` interface also carries `full_name_internal`, even
though the scorer never reads it. Resolve this in Phase 0 before the database
migration: preferably remove it from the canonical scorer boundary after a
reference scan and score-regression test, while retaining it in the protected
identity model. If that cleanup is deferred, the normalized server adapter must
join and return the real private value temporarily. It must not fabricate a
placeholder, and it must never expose the name to client payloads or parity
logs.

### Required experience-level fields

- `type`
- `firm`
- `firm_tier`
- `industry`
- `role_function`
- `role_relevance`
- `year`
- `duration_months`
- `how_obtained`
- `converted_to_ft`

The engine uses the full ordered experience history to reconstruct a
professional at stages S0-S5. Actions also inspect firm names, transition
methods, and the complete path. A precomputed feature row cannot replace these
facts without rewriting and revalidating the action generator.

### Preserve coarse dates during backfill

Career Compass currently collects `year` and `duration_months`, not exact start
and end dates. The normalized model may add optional `started_on` and `ended_on`,
but backfill must not invent dates. Preserve:

- original `year`;
- original nullable `duration_months`;
- `date_precision` such as `year`, `month`, or `day`;
- source evidence and review status.

For the five missing durations, preserve `null`. The compatibility adapter must
continue producing `null`, which the current engine treats as zero, until a
versioned scoring change introduces explicit knownness handling.

### Structural parity before derived relevance changes

Existing `role_relevance` values affect `experience_count_relevant`, stage
classification, and distance. Release A must backfill the stored value exactly.
Store any new deterministic Career Compass-derived relevance alongside it with
a rule version, but do not substitute it until Release B has passed score-impact
review.

## Revised target data model

### `professional_profiles`

One row per professional containing the current state required by the scorer.

Required compatibility fields:

- `professional_id`
- `current_role`
- `current_organization_id`
- `current_firm_name_reviewed`
- `current_firm_tier`
- `current_geography`
- `current_role_start_year`
- `years_to_current_role`
- `path_summary`
- `data_source`, `data_confidence`
- `taxonomy_version`, `feature_version`
- `created_at`, `updated_at`

Keep names and LinkedIn URLs in `professional_private_identity`, protected by
RLS and service-role-only access. Do not remove the current identity columns
from the legacy table until import, admin, and troubleshooting workflows no
longer depend on them.

### `professional_education`

One row per qualification, while preserving every current scoring input.

- `education_id`, `professional_id`
- `institution_id`, `institution_name_reviewed`, `institution_tier`
- `degree_type`, `degree_name`
- reviewed major identifiers plus optional display text
- `graduation_year`
- optional `started_on`, `completed_on`, `date_precision`
- `wam_band`
- `has_honours`, optional `honours_class`
- `has_masters_or_second_degree`
- `source_observation_id`

Store high-school type and ATAR in a separate optional education record or
profile extension, but the scoring adapter must still return
`high_school_type`, `high_school`, and `atar_band` exactly.

### `professional_experiences`

One row per role, with no fixed maximum.

- `experience_id`, `professional_id`, `sequence`
- `experience_type`
- `organization_id`, `organization_name_reviewed`
- `firm_tier`, `industry`, `role_function`
- original `year`, optional `started_on`, optional `ended_on`, `date_precision`
- original nullable `duration_months`
- canonical `acquisition_method`
- optional `transition_type` for professional-only transitions such as
  lateral move, promotion, or return offer
- `converted_to_full_time`
- `stored_role_relevance`
- `derived_role_relevance`, `relevance_rule_version`
- optional reviewed override and reason
- `source_observation_id`

Release A's adapter must emit the original `how_obtained` and
`role_relevance` semantics. Release B may derive them from canonical
`acquisition_method`, `transition_type`, and the shared Career Compass rules.

### `professional_achievements`

Store typed, dated facts rather than manually duplicating signal strings.

- `achievement_id`, `professional_id`
- `achievement_type`
- `achievement_level`
- optional Career Compass `signal_tag`
- `effective_on`, `ended_on`, `date_precision`
- `issuer_or_organization_id`
- `verification_status`
- `source_observation_id`

The current `signals` array remains an adapter output during Release A. In
Release B it becomes a deterministic projection from reviewed achievements,
education, and experiences using the canonical Career Compass signal registry.

### `source_observations`

Store evidence and field-level confidence instead of relying only on one
confidence label for an entire professional.

- `observation_id`, `professional_id`
- `source_type`, `source_url_internal`
- `observed_at`, `verified_at`
- `raw_text_internal`
- `confidence`
- `review_status`, `reviewed_by`, `reviewed_at`

Raw text remains private. Only reviewed typed facts flow into scoring.

### `professional_feature_snapshots`

This is a versioned QA and performance layer, not the first migration boundary.

- one row per `professional_id`, `career_stage`, and `feature_version`;
- explicit `as_of_date` and derivation version;
- every current `ComputedFields` value;
- knownness flags for inputs that can be missing;
- source hashes for education, experiences, and achievements;
- `computed_at`.

Initially compare these snapshots with `reconstructAtStage()` output. Only make
them the scorer's direct source in a later scoring-engine version that also
provides the full facts needed by gaps, actions, and path narratives.

## Website access contract

### Do not replace `public.professionals` in place

The current website uses a server-side service client and executes:

```ts
serviceClient.from('professionals').select('*')
```

It then assumes the flat exp1-exp5 shape. Renaming the table or replacing it
with a differently shaped view would break report generation immediately.

Create a new service-only read surface instead:

```text
public.professional_scoring_input_v1
```

It should return one row per professional with:

- all required professional-level fields;
- an ordered `experiences` JSON array of unlimited normalized roles;
- `signals` conforming to the active scorer's explicitly versioned
  professional compatibility schema during Release A;
- a separate canonical Career Compass signal projection for Release B review;
- the reviewed `path_summary`;
- taxonomy, derivation, and feature versions.

If `full_name_internal` has not yet been removed from the canonical
`Professional` interface, this service-only surface may include it temporarily
from the protected identity table solely to satisfy the adapter. Remove it from
the surface as soon as the type dependency is retired.

The view or RPC must aggregate experiences in deterministic `sequence` order
and avoid N+1 queries.

### Add a validated server adapter

Add a Zod schema for the new read shape and one adapter:

```text
NormalizedProfessionalRow -> Professional
```

Do not repeat the current mapper's pattern of checking only three fields and
then casting the object to `Professional`. The adapter must validate every
scoring field and report structured reject reasons. Production should fail the
new source closed if any row is rejected; it should not silently score a
different cohort.

### Use a reversible source switch

Add a server-only source selector such as:

```text
PROFESSIONALS_SOURCE=legacy|normalized|shadow
```

- `legacy`: current `public.professionals` path.
- `normalized`: new read surface and validated adapter.
- `shadow`: return the legacy result to users while also building and scoring
  the normalized result for parity logging.

The selector must never be exposed with a `NEXT_PUBLIC_` prefix.

Stored reports do not need rewriting because they contain scoring output, not
live professional rows. New report generation is the only production path that
must switch.

## Security and Supabase access

- Enable RLS on every normalized table.
- Add no anon or authenticated policies for private professional data.
- Revoke direct anon/authenticated access to the scoring read surface.
- Use `security_invoker = true` for views where supported, or expose a narrowly
  scoped server RPC with explicit service-role access.
- Keep all contact identifiers out of scoring views, logs, analytics artifacts,
  and client payloads.
- Continue reading professional data only from server code through
  `createServiceClient()`.
- Test that public and authenticated browser clients cannot read normalized
  professional, identity, observation, or scoring-source rows.

## Import and editorial compatibility

The original proposal omitted the write path. Without a new ingestion contract,
future imports would update only the legacy table and normalized data would
drift immediately.

Create one idempotent server-side ingestion transaction that:

1. validates Career Compass identifiers against the shared registry;
2. stores database-only identifiers only in explicit legacy/source fields;
3. upserts profile, education, experiences, achievements, and observations;
4. records taxonomy and derivation versions;
5. regenerates compatibility outputs and feature snapshots;
6. writes an audit record with source hash and row counts;
7. rolls back the entire professional on any child-row failure.

During Release A, either dual-write both models transactionally or treat the
legacy table as authoritative and regenerate normalized rows deterministically.
Do not permit independent manual edits to both representations.

## Phased migration

### Phase 0 — Lock the contracts

1. Create the shared Career Compass taxonomy and derivation module.
2. Make onboarding schema, UI options, server derivation, scoring types, and
   import validation consume it.
3. Type `signals` as the canonical enum rather than arbitrary strings.
4. Remove the unused `full_name_internal` field from the canonical scorer
   boundary, or explicitly retain the private server-side compatibility join.
5. Snapshot all 100 post-contract-lock canonical `Professional` objects and
   their source row hashes.
6. Build a scoring fixture matrix covering every stage, target tier, target
   geography, unknown band, and major experience category.

No database restructuring begins until these contracts are green.

### Phase 1 — Add normalized storage

1. Create normalized tables, constraints, indexes, RLS, and audit tables.
2. Keep `public.professionals` and all current website code unchanged.
3. Add taxonomy, derivation, and scoring version columns.
4. Add quarantine tables for unmapped database-only identifiers and narrative
   extraction candidates.

### Phase 2 — Backfill structural parity

1. Backfill all 100 profiles and 458 occupied experience slots.
2. Preserve original identifiers and values exactly in compatibility fields.
3. Preserve original `year`, nullable duration, relevance, signal array, and
   path summary.
4. Put the 54 overflow-note profiles into a human review queue; do not convert
   prose into production facts automatically.
5. Verify a lossless legacy-to-normalized-to-`Professional` round trip.

### Phase 3 — Build the website read surface

1. Create `professional_scoring_input_v1`.
2. Add the strict normalized-row Zod schema and adapter.
3. Add `legacy`, `normalized`, and `shadow` source modes.
4. Add route-level tests for authentication, empty sources, malformed rows,
   row rejection, and successful report generation.

### Phase 4 — Shadow score in production

For every eligible report request in shadow mode:

1. read both sources;
2. compare canonical professional hashes by ID;
3. run both through the same scoring version;
4. compare pool membership, distances, tied top matches, fit band, probability
   counts, gaps, actions, and top paths;
5. return only the legacy result;
6. log aggregate parity results without personal data.

Do not switch while unexplained differences remain.

### Phase 5 — Canonical Career Compass remapping

This is a separately reviewed semantic release.

1. Split `elite_boutique_and_mm` through evidence review.
2. Map `capital_markets` to `global_markets`.
3. Map professional-only transition values into canonical acquisition and
   transition fields without losing current `has_conversion` or `has_lateral`
   behavior.
4. Classify database-only signal tags as mapped, typed extension, or quarantined.
5. Resolve structured-versus-signal mismatches by deriving tags from facts.
6. Add achievement dates where evidence supports them.
7. compute a new derivation and feature version.

Score differences are expected here, but every difference must be attributable
to an approved rule and measured before release.

### Phase 6 — Switch the website

1. Set the server source to `normalized`.
2. Monitor report error rate, source row count, adapter rejects, pool sizes,
   scoring latency, and output distribution.
3. Keep the legacy source and one-step environment rollback for at least two
   stable production releases.
4. Keep shadow sampling active during the rollback window.

### Phase 7 — Move ingestion and administration

1. Make normalized ingestion the only write path.
2. Regenerate any legacy compatibility output from normalized facts.
3. Move admin/review tooling to normalized records and review queues.
4. Prove backup restoration and re-import idempotency.

### Phase 8 — Retire the legacy table

Retire repeated exp1-exp5 columns only after:

- the rollback window has elapsed;
- the website has no legacy reads;
- import and admin paths have no legacy writes;
- stored and new report flows pass production smoke tests;
- backups and restore procedures cover normalized child tables;
- an explicit destructive migration is separately approved.

## Parity and release gates

### Data parity

- Exactly 100 professional IDs in both sources at the initial snapshot.
- Zero normalized adapter rejects.
- Exact equality for every post-Phase-0 canonical `Professional` field during
  Release A.
- Exact ordered equality for all 458 structured experiences.
- Exact signal arrays as sets and exact path summaries.
- No unmapped value enters a canonical Career Compass column.

### Scoring parity

For the fixture matrix and production shadow sample:

- identical stage classification;
- identical eligible pool IDs;
- identical computed fields;
- identical distances within a documented floating-point tolerance;
- identical tie-expanded top-match IDs;
- identical fit band and probability counts;
- identical gaps, actions, and top paths;
- identical low-data and boutique warnings.

Release A requires exact parity. Release B requires explained, approved deltas.

### Website parity

- Authenticated report generation succeeds through both sources.
- Unauthenticated requests remain rejected.
- No browser client can access professional source data.
- Existing stored reports still render unchanged.
- New reports have the same response and persisted scoring-output shape.
- Normalized read plus scoring latency stays within the serverless budget and is
  no worse than the agreed regression threshold.
- Zero personal names, LinkedIn URLs, or raw observations reach client payloads
  or logs.

### Verification commands

At each code-bearing phase run at minimum:

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

Add migration-specific integration tests against an isolated Supabase project
or local database before production application.

## Priority remediation queue

Apply these only in Release B, after structural parity:

1. Split the 39 current-role and 84 experience legacy combined firm tiers.
2. Review the 54 overflow-note profiles for missing sixth-or-later roles.
3. Resolve the 19 WAM-HD signal mismatches, then consulting, Big 4 advisory,
   and private-equity mismatches.
4. Review 254 experiences with unknown acquisition method. Preserve unknown
   when evidence does not exist; do not infer it from prose without review.
5. Preserve the five missing durations as unknown and add knownness-aware
   scoring only in a versioned scoring release.

## Automated quality checks

- Unique professional, child-row, and source identifiers.
- Required experience fields whenever an experience exists.
- Canonical values constrained to the shared Career Compass registry.
- Legacy values allowed only in explicit compatibility or quarantine columns.
- Monitored `unknown`, `other`, and legacy rates.
- Valid dates, date precision, and non-negative durations.
- No achievements or experiences visible before their effective date in an
  as-of feature snapshot.
- Derived signals agree with structured facts by construction.
- Every scored fact has a derivation version and source lineage.
- No direct contact identifiers in scoring or report datasets.
- Match-output regression tests for every scoring and feature version.
- View/RPC row count and adapter-reject monitors.

## Quantitative conversion rules

- Prefer enums, booleans, counts, dates, durations, and ordered bands.
- Store missingness separately from a negative value.
- Do not invent exact dates from year-only Career Compass inputs.
- Do not replace existing scoring semantics during a structural migration.
- Version taxonomy, derivation, features, and scoring independently.
- Keep source confidence per fact rather than only per person.
- Require human review for facts extracted from narrative text.
- Preserve original text and extraction provenance for auditability.

## Approved product decisions

The product owner approved the following on 2026-07-15:

- **1B:** Database-only professional facts may become Career Compass tags only
  through the explicit review/approval workflow. They remain candidates or
  typed professional facts until approved; the database cannot silently extend
  onboarding vocabulary.
- **2B:** Generic legacy identifiers map to current onboarding identifiers in
  canonical normalized columns: `internship -> summer_internship`,
  `casual -> part_time`, and `capital_markets -> global_markets`. Release A's
  compatibility view still emits the legacy values to preserve scores.
- **3A:** Unknown duration/transition inputs retain current false/zero scoring
  behavior. Normalized facts preserve null/knownness so a later scoring version
  can change this deliberately.
- **4A:** Feature snapshots remain a versioned QA/cache layer; live stage
  reconstruction remains the primary scorer path.
- **5A:** Legacy rollback remains available for at least two stable production
  releases and at least 30 days. Both conditions are required.

No further product decision blocks Release A. Release B's row-level semantic
review results and the later `shadow -> normalized` production source switch
remain explicit go/no-go approvals after evidence is available.
