-- ============================================================
-- 0009_fix_degree_type_constraint.sql
--
-- professionals.degree_type was missing 'combined_degree' from its
-- CHECK constraint, even though it's a valid value in the DegreeType
-- Zod enum (lib/scoring/types.ts) and is offered as an onboarding
-- option (web/app/onboard/university/page.tsx). Bring the DB
-- constraint back in sync with the app-level schema.
-- ============================================================

-- degree_type: inline CHECK on 0001 — default constraint name.
alter table professionals
  drop constraint if exists professionals_degree_type_check;

alter table professionals
  add constraint professionals_degree_type_check
  check (degree_type in
    ('bachelor','honours','masters','mba','double_degree','combined_degree','phd'));
