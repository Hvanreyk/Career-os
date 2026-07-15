# Professional source rollout runbook

## Current production state

- Structural migrations `0009`-`0011` were applied to project
  `aeqgtvkdfxzyimkpmgoz` on 2026-07-15 through the Supabase SQL Editor.
- `public.professionals` remains authoritative.
- `PROFESSIONALS_SOURCE` must remain `legacy` until shadow evidence and a
  separate source-switch approval are complete.
- The deployed objects are additive. Do not delete or rename legacy columns.
- Supabase's migration ledger contains only the pre-existing timestamped
  `professionals_rls` migration. Reconcile the existing project with
  `supabase migration repair` before introducing `supabase db push`; do not
  replay the local numbered migrations against this project.

## Verified production baseline

Run `tests/fixtures/professional_live_parity.sql` with the `postgres` role. The
2026-07-15 result was:

| Check | Result |
| --- | ---: |
| Legacy professionals | 100 |
| Normalized profiles | 100 |
| Scoring-view rows | 100 |
| Mismatched scorer inputs | 0 |
| Ordered experiences | 458 |
| Education rows | 200 |
| Private identity rows | 100 |
| Review/quarantine items | 297 |
| Candidate signal types | 10 |
| Latest normalization status | `complete` |
| Normalized source releases | 0 |
| Legacy retirement eligible | `false` |

The query is aggregate-only and returns no identifiers or private fields.

## Import or legacy-row update

1. Validate the complete import before writing anything.
2. Upsert the authoritative legacy rows.
3. Call `refresh_normalized_professionals_from_legacy(ids)` in the same
   controlled server workflow.
4. Require the returned normalization run to have `status = complete`.
5. Run the aggregate live parity query. A nonzero mismatch count is a stop gate.
6. Regenerate feature snapshots only as QA/cache output; do not use them as the
   scoring source.

The updated `scripts/import-csv.ts` follows this contract and aborts all writes
when validation rejects any row.

## Shadow rollout

1. Deploy the application code with `PROFESSIONALS_SOURCE=legacy`.
2. Confirm authenticated report generation and stored report rendering.
3. Set the server-only variable to `shadow` for a controlled production sample.
4. Monitor aggregate source parity, scoring parity, adapter rejects, cohort
   size, latency, and report errors. Shadow mode must continue returning the
   legacy result to users.
5. Keep shadow mode until there are zero unexplained differences and a stable
   observation window has been reviewed.
6. Obtain explicit product approval before setting `normalized`.

Never expose `PROFESSIONALS_SOURCE` through a `NEXT_PUBLIC_` variable and never
log professional IDs, names, LinkedIn URLs, raw observations, or row payloads.

## Normalized-source release and rollback

For each approved normalized production release, insert a release record with
the deployed scoring, taxonomy, derivation, and feature versions. The database
constraint requires `rollback_available_until` to be at least 30 days after
deployment.

Rollback is a one-step server configuration change back to `legacy`. Keep the
legacy source, shadow comparison, and ingestion refresh available until both:

- at least two stable normalized-source production releases exist; and
- at least 30 days have elapsed since the first qualifying release.

The readiness view must still return
`eligible_for_separately_approved_retirement = true`, and retirement itself
requires a separate destructive-migration approval.

## Release B review queue

Do not automatically promote the 297 review/quarantine items. Review them by
category and source evidence:

1. split combined `elite_boutique_and_mm` tiers;
2. structure overflow experience notes only when evidence supports a complete
   role record;
3. approve or reject the 10 candidate signal types;
4. reconcile signals against structured WAM and experience facts;
5. retain unknown acquisition methods and durations when evidence is absent.

Approved signal extensions must use
`approve_career_compass_signal_extension(...)` so the registry and achievement
projection remain auditable. Release A's compatibility view is not changed by
these reviews.
