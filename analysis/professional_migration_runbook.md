# Normalized professional data runbook

The Phase 2 implementation plan is
[`professionals_release_b_plan.md`](./professionals_release_b_plan.md).

## Operating model

- Normalized professional tables are authoritative.
- `professional_scoring_input` is the only application scoring surface.
- Only profiles whose lifecycle status is `ready` and whose readiness row has
  no blockers are scored.
- `draft` rows may be incomplete and remain outside scoring.
- `excluded` rows require an exclusion reason and remain outside scoring.
- Private identity and import staging are service-role-only.
- The saved legacy CSV is the recovery artifact for this preliminary
  environment; the website does not dual-read it.

## Import

Prefer the canonical four-sheet workbook:

- `professionals`
- `education`
- `experiences`
- `achievements`

Run a dry-run first. Fix every error before applying the batch. Warnings may
leave a professional as `draft`, but an invalid batch never partially updates
canonical data.

The legacy exp1-exp5 workbook is accepted only through the conversion adapter.
It is converted to the same canonical batch and validation rules before any
write.

After an applied batch, verify:

1. the import batch is `complete`;
2. inserted, updated, draft, ready, excluded, and rejected counts are expected;
3. ready counts match `professional_scoring_input`;
4. every scoring row passes the strict adapter;
5. no populated LinkedIn URL is duplicated;
6. no unresolved combined tier or unsupported signal appears in scoring.

## Data repair

- Correct canonical normalized rows, not the legacy table.
- Keep unknown durations and dates null; do not invent values.
- Keep unsupported or unresolved records as `draft`.
- Resolve `elite_boutique_and_mm` before promotion to `ready`.
- Use organization and institution aliases to consolidate spelling variants.
- Structured facts own deterministic signals. Manual achievements are used
  only for facts that cannot be derived.
- An achievement with a known effective year is visible only at stages at or
  after that year; undated achievements retain S1-and-later behavior.

## Scoring verification

Run the aggregate impact report when current data cleanup is expected to change
scores. It compares the Release A view with the canonical view without
returning professional identifiers.

At minimum run:

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

Do not treat a command that hangs or only starts as a passing check.

For larger imports, verify ordered pagination at 1,001 and 10,000 rows. The
loader fails closed when its loaded count differs from the readiness count, a
page repeats an identifier, or any scoring row is malformed.

## Recovery

This environment has no customers. If a destructive test import is unusable:

1. fix or reset the normalized tables;
2. re-import the saved legacy CSV through the conversion adapter;
3. rerun readiness and scoring checks;
4. regenerate test reports as needed.
