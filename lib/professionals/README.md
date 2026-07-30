# Canonical professional workbook

`parseProfessionalWorkbook` accepts XLSX bytes or a SheetJS workbook and returns
a `ProfessionalImportBatch`. It does not read files, use the network, or write
to the database.

The workbook contains exactly these sheets:

- `professionals`
- `education`
- `experiences`
- `achievements`

Headers are normalized to lower snake case. Text is trimmed and internal
whitespace is collapsed. Controlled identifiers are lower snake case.
LinkedIn URLs are normalized to `https://www.linkedin.com/<profile-path>` with
tracking parameters removed.

## Columns

Required `professionals` columns:

`professional_key`, `full_name_internal`, `current_role`, `current_firm`,
`current_firm_tier`, `current_geography`, `current_role_start_year`,
`years_to_current_role`, `data_source`, `data_confidence`

Optional profile columns:

`linkedin_url_internal`, `path_summary`, `lifecycle_status`,
`exclusion_reason`

Required `education` columns:

`professional_key`, `sequence`, `is_primary`, `education_level`

Higher-education rows also require `institution`, `institution_tier`,
`degree_type`, `degree_name`, `wam_band`, `has_honours`, and
`has_masters_or_second_degree`. High-school rows require `high_school_type` and
`atar_band`. Optional shared facts are `majors`, `graduation_year`,
`started_on`, `completed_on`, and `date_precision`.

Required `experiences` columns:

`professional_key`, `sequence`, `experience_type`, `organization`,
`firm_tier`, `industry`, `year`, `acquisition_method`

Optional experience facts are `role_function`, `role_relevance`, `started_on`,
`ended_on`, `date_precision`, `duration_months`, `transition_type`, and
`converted_to_full_time`. Role function and relevance use the shared Career
Compass derivation when blank. Null duration remains null. Legacy identifiers
`internship`, `casual`, and `capital_markets` are converted to their canonical
identifiers.

Required `achievements` columns:

`professional_key`, `sequence`, `tag`

Optional achievement facts are `effective_year`, `date_precision`, and
`source` (`manual` or `derived`). The canonical scoring contract is:

```ts
{
  tag: ProfessionalCompatibilitySignalTag;
  effective_year: number | null;
  date_precision: 'unknown' | 'year' | 'month' | 'day';
}
```

An unknown achievement year stays null. A known year is staged as
`effective_year`; the database represents it as January 1 only as an internal
year-precision value.

## Applying a batch

`batch.can_apply` is true only when the complete workbook has no errors and at
least one accepted professional. `batch.staging_rows` maps directly to
`professional_import_staging_rows`:

```ts
{
  sheet_name: 'professionals' | 'education' | 'experiences' | 'achievements';
  source_row: number;
  professional_key: string;
  payload: Record<string, unknown>;
}
```

Each payload uses the keys expected by
`apply_professional_import_batch(uuid)`. Insert `source_row` as the staging
table's `row_number`. The CLI may create its own stable key from the
professional key plus child sequence.

Without `existing_records`, the dry-run summary uses
`comparison_basis: 'assume_new'` and classifies accepted professionals as
inserts. Pass existing canonical records to obtain exact
inserted/updated/unchanged classifications.

`parseLegacyFlatProfessionalRows` is the temporary exp1-exp5 adapter. It
converts the flat rows first, then uses the same canonical validation and
diagnostic path.
