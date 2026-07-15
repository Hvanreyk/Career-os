-- ============================================================
-- 0011_professional_semantic_review.sql
-- Review tooling for the separately versioned semantic release. None of these
-- objects changes the Release A scoring view.
-- ============================================================

create or replace function public.approve_career_compass_signal_extension(
  p_signal_tag text,
  p_approved_by text,
  p_review_notes text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if nullif(btrim(p_approved_by), '') is null then
    raise exception 'approved_by is required';
  end if;

  update public.career_compass_signal_registry registry
  set
    status = 'approved_extension',
    approved_by = p_approved_by,
    approved_at = now(),
    review_notes = p_review_notes,
    taxonomy_version = '2026-07-15.1'
  where registry.signal_tag = p_signal_tag
    and registry.status = 'candidate';

  if not found then
    raise exception 'Signal tag is not a pending candidate';
  end if;

  update public.professional_achievements achievement
  set
    canonical_signal_tag = achievement.compatibility_signal_tag,
    verification_status = 'reviewed'
  where achievement.compatibility_signal_tag = p_signal_tag
    and achievement.canonical_signal_tag is null;

  insert into public.career_compass_taxonomy_reviews (
    identifier_category, legacy_identifier, proposed_identifier, status,
    evidence, reviewed_by, reviewed_at
  ) values (
    'signal', p_signal_tag, p_signal_tag, 'approved',
    jsonb_build_object('review_notes', p_review_notes),
    p_approved_by, now()
  )
  on conflict (identifier_category, legacy_identifier, proposed_identifier)
  do update set
    status = excluded.status,
    evidence = excluded.evidence,
    reviewed_by = excluded.reviewed_by,
    reviewed_at = excluded.reviewed_at;
end;
$$;

revoke all on function public.approve_career_compass_signal_extension(text, text, text)
  from public, anon, authenticated;
grant execute on function public.approve_career_compass_signal_extension(text, text, text)
  to service_role;

create or replace view public.professional_semantic_readiness_v1 as
select
  profile.professional_id,
  (profile.current_firm_tier is null)::integer as unresolved_current_tier_count,
  coalesce(experience.unresolved_firm_tier_count, 0) as unresolved_experience_firm_tier_count,
  coalesce(experience.unresolved_industry_count, 0) as unresolved_industry_count,
  coalesce(experience.unresolved_acquisition_count, 0) as unresolved_acquisition_count,
  coalesce(achievement.pending_signal_count, 0) as pending_signal_count,
  coalesce(quarantine.pending_review_count, 0) as pending_review_count,
  profile.current_firm_tier is not null
    and coalesce(experience.unresolved_firm_tier_count, 0) = 0
    and coalesce(experience.unresolved_industry_count, 0) = 0
    and coalesce(experience.unresolved_acquisition_count, 0) = 0
    and coalesce(achievement.pending_signal_count, 0) = 0
    and coalesce(quarantine.pending_review_count, 0) = 0
    as semantic_release_ready
from public.professional_profiles profile
left join lateral (
  select
    count(*) filter (where row.firm_tier is null) as unresolved_firm_tier_count,
    count(*) filter (where row.industry is null) as unresolved_industry_count,
    count(*) filter (where row.acquisition_method is null) as unresolved_acquisition_count
  from public.professional_experiences row
  where row.professional_id = profile.professional_id
) experience on true
left join lateral (
  select count(*) filter (where registry.status = 'candidate') as pending_signal_count
  from public.professional_achievements row
  join public.career_compass_signal_registry registry
    on registry.signal_tag = row.compatibility_signal_tag
  where row.professional_id = profile.professional_id
) achievement on true
left join lateral (
  select count(*) filter (where row.status = 'pending') as pending_review_count
  from public.professional_data_quarantine row
  where row.professional_id = profile.professional_id
) quarantine on true;

create or replace view public.professional_legacy_retirement_readiness_v1 as
with latest_normalized_release as (
  select release.*
  from public.professional_source_releases release
  where release.source_mode = 'normalized'
  order by release.deployed_at desc
  limit 1
)
select
  release.release_id,
  release.deployed_at,
  release.stable_release_count,
  release.rollback_not_before,
  coalesce(release.stable_release_count >= 2, false) as stable_release_gate_passed,
  coalesce(now() >= release.rollback_not_before, false) as rollback_time_gate_passed,
  coalesce(release.stable_release_count >= 2 and now() >= release.rollback_not_before, false)
    as eligible_for_separately_approved_retirement
from (select 1) singleton
left join latest_normalized_release release on true;

revoke all on public.professional_semantic_readiness_v1 from public, anon, authenticated;
revoke all on public.professional_legacy_retirement_readiness_v1 from public, anon, authenticated;
grant select on public.professional_semantic_readiness_v1 to service_role;
grant select on public.professional_legacy_retirement_readiness_v1 to service_role;

comment on view public.professional_scoring_input_v1 is
  'Release A compatibility view. Service-role only; preserves active scoring semantics.';
comment on view public.professional_semantic_readiness_v1 is
  'Service-role review queue summary. Does not alter Release A scoring.';
