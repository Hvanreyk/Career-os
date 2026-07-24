-- 0013_unlock_professional_cohort.sql
--
-- Promotes the remaining 89 draft professionals into the scoring cohort so the
-- Career Compass matches against the full ~100, not the 11 that were previously
-- `is_ready`. The other 89 sat at lifecycle_status='draft' with data_blockers
-- from three sources (see the professional_scoring_readiness view in
-- 0012_professionals_phase2.sql):
--
--   1. unresolved_signal          -> 10 seeded "candidate" signals never approved
--   2. unresolved_*firm_tier      -> legacy elite_boutique_and_mm / unknown tiers
--   3. pending_data_review        -> quarantine rows still status='pending'
--
-- Steps below clear all three, then recalculate readiness to flip draft->ready.
-- The elite_boutique / mid_market / boutique firm classification was reviewed
-- and approved by the founder.

-- 1. Signals -------------------------------------------------------------------
-- Approve the 10 seeded candidate signals. approve_career_compass_signal_extension
-- (migration 0011) flips the registry row candidate -> approved_extension AND
-- back-fills canonical_signal_tag on the achievements, clearing unresolved_signal
-- and letting the tags flow into professional_scoring_input. Guarded so re-runs
-- are a no-op.
do $$
declare
  v_tag text;
  v_tags text[] := array[
    'honours_first_class', 'society_committee', 'chartered_accountant',
    'selective_school', 'sports_volunteer', 'hsc_distinguished_achiever',
    'consulting_society_member', 'wam_top_10', 'subject_top_10_law', 'has_law_clerkship'
  ];
begin
  foreach v_tag in array v_tags loop
    if exists (
      select 1 from public.career_compass_signal_registry
      where signal_tag = v_tag and status = 'candidate'
    ) then
      perform public.approve_career_compass_signal_extension(
        v_tag,
        'career_compass_cohort_unlock',
        'Bulk promotion of seeded candidate signals to unlock the full professional cohort.'
      );
    end if;
  end loop;
end $$;

-- 2. Firm tiers ----------------------------------------------------------------
-- Resolve the legacy combined tier. Both the strict (*_firm_tier) and legacy
-- (*_firm_tier_compatibility) columns must leave 'elite_boutique_and_mm' /
-- 'unknown' for the readiness gate to clear. Keyed on the reviewed firm name so
-- re-runs are no-ops (the WHERE no longer matches once resolved).

-- 2a. Elite boutiques (pure advisory).
update public.professional_profiles
set current_firm_tier = 'elite_boutique',
    current_firm_tier_compatibility = 'elite_boutique'
where current_firm_tier_compatibility = 'elite_boutique_and_mm'
  and current_firm_name_reviewed in (
    'Greenhill & Co.', 'Mizuho Greenhill', 'Moelis & Company', 'Moelis Australia',
    'Lazard', 'Rothschild & Co', 'Evercore', 'Luminis Partners',
    'Latimer Partners', 'Highbury Partnership'
  );
update public.professional_experiences
set firm_tier = 'elite_boutique',
    firm_tier_compatibility = 'elite_boutique'
where firm_tier_compatibility = 'elite_boutique_and_mm'
  and organization_name_reviewed in (
    'Greenhill & Co.', 'Mizuho Greenhill', 'Moelis & Company', 'Moelis Australia',
    'Lazard', 'Rothschild & Co', 'Evercore', 'Luminis Partners',
    'Latimer Partners', 'Highbury Partnership'
  );

-- 2b. Mid-market (platforms / bank-owned / full-service independents).
update public.professional_profiles
set current_firm_tier = 'mid_market',
    current_firm_tier_compatibility = 'mid_market'
where current_firm_tier_compatibility = 'elite_boutique_and_mm'
  and current_firm_name_reviewed in (
    'Nomura', 'RBC Capital Markets', 'MA Financial Group', 'Jefferies',
    'Houlihan Lokey', 'Jarden', 'BNP Paribas', 'Raymond James'
  );
update public.professional_experiences
set firm_tier = 'mid_market',
    firm_tier_compatibility = 'mid_market'
where firm_tier_compatibility = 'elite_boutique_and_mm'
  and organization_name_reviewed in (
    'Nomura', 'RBC Capital Markets', 'MA Financial Group', 'Jefferies',
    'Houlihan Lokey', 'Jarden', 'BNP Paribas', 'Raymond James'
  );

-- 2c. Unknown-tier small independents -> boutique.
update public.professional_experiences
set firm_tier = 'boutique',
    firm_tier_compatibility = 'boutique'
where firm_tier_compatibility = 'unknown'
  and organization_name_reviewed in (
    'Argonaut', 'Airavat Capital', 'Australian Agricultural Growth Partners',
    'Emerge Capital', 'OBH Partners', 'Berkshire Global Advisors'
  );

-- 3. Quarantine ----------------------------------------------------------------
-- Clear pending review rows (the combined-tier, candidate-signal and
-- extra_experiences_notes rows) so pending_data_review resolves. Scoped to
-- origin='legacy_backfill' — the same scoping apply_professional_import_batch
-- uses (0012:1072-1079) — so this only touches rows this migration actually
-- reviewed, not any unrelated pending row a future import might add.
update public.professional_data_quarantine
set status = 'resolved',
    reviewed_by = 'career_compass_cohort_unlock',
    reviewed_at = now()
where status = 'pending'
  and origin = 'legacy_backfill';

-- 4. Promote -------------------------------------------------------------------
-- Recalculate readiness for the whole cohort: flips every now data-complete
-- draft to lifecycle_status='ready' (data fixes alone do not promote).
select public.recalculate_professional_scoring_readiness(null);
