-- ============================================================
-- 0010_backfill_normalized_professionals.sql
-- Idempotent legacy-authoritative normalization transaction, initial
-- backfill, service-only scoring view, and semantic review queues.
-- ============================================================

create or replace function public.refresh_normalized_professionals_from_legacy(
  p_professional_ids text[] default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_run_id uuid;
  v_source_hash text;
begin
  insert into public.professional_normalization_runs (requested_professional_ids)
  values (p_professional_ids)
  returning run_id into v_run_id;

  begin
    select md5(coalesce(string_agg(to_jsonb(p)::text, '' order by p.id), ''))
      into v_source_hash
    from public.professionals p
    where p_professional_ids is null or p.id = any(p_professional_ids);

    insert into public.professional_organizations (name_reviewed)
    select distinct source_name
    from (
      select p.current_firm as source_name
      from public.professionals p
      where p_professional_ids is null or p.id = any(p_professional_ids)
      union all
      select experience.firm
      from public.professionals p
      cross join lateral (values
        (p.exp1_firm), (p.exp2_firm), (p.exp3_firm), (p.exp4_firm), (p.exp5_firm)
      ) as experience(firm)
      where (p_professional_ids is null or p.id = any(p_professional_ids))
        and experience.firm is not null
    ) names
    where nullif(btrim(source_name), '') is not null
    on conflict (normalized_name) do update
      set name_reviewed = excluded.name_reviewed;

    insert into public.professional_institutions (name_reviewed)
    select distinct source_name
    from (
      select p.university as source_name
      from public.professionals p
      where p_professional_ids is null or p.id = any(p_professional_ids)
      union all
      select p.high_school
      from public.professionals p
      where (p_professional_ids is null or p.id = any(p_professional_ids))
        and p.high_school is not null
    ) names
    where nullif(btrim(source_name), '') is not null
    on conflict (normalized_name) do update
      set name_reviewed = excluded.name_reviewed;

    insert into public.professional_profiles (
      professional_id, "current_role", current_organization_id,
      current_firm_name_reviewed, current_firm_tier_compatibility,
      current_firm_tier, current_geography, current_role_start_year,
      years_to_current_role, path_summary, signals_compatibility,
      data_source, data_confidence, taxonomy_version, derivation_version,
      feature_version
    )
    select
      p.id,
      p."current_role",
      organization.organization_id,
      p.current_firm,
      p.current_firm_tier,
      case when p.current_firm_tier in ('bb', 'elite_boutique', 'mid_market', 'boutique')
        then p.current_firm_tier else null end,
      p.current_geography,
      p.current_role_start_year,
      p.years_to_current_role,
      p.path_summary,
      p.signals,
      p.data_source,
      p.data_confidence,
      '2026-07-15.1',
      '2026-07-15.1',
      'professional-v1'
    from public.professionals p
    left join public.professional_organizations organization
      on organization.normalized_name = lower(btrim(p.current_firm))
    where p_professional_ids is null or p.id = any(p_professional_ids)
    on conflict (professional_id) do update set
      "current_role" = excluded."current_role",
      current_organization_id = excluded.current_organization_id,
      current_firm_name_reviewed = excluded.current_firm_name_reviewed,
      current_firm_tier_compatibility = excluded.current_firm_tier_compatibility,
      current_firm_tier = excluded.current_firm_tier,
      current_geography = excluded.current_geography,
      current_role_start_year = excluded.current_role_start_year,
      years_to_current_role = excluded.years_to_current_role,
      path_summary = excluded.path_summary,
      signals_compatibility = excluded.signals_compatibility,
      data_source = excluded.data_source,
      data_confidence = excluded.data_confidence,
      taxonomy_version = excluded.taxonomy_version,
      derivation_version = excluded.derivation_version,
      feature_version = excluded.feature_version;

    if p_professional_ids is null then
      delete from public.professional_profiles normalized
      where not exists (
        select 1 from public.professionals legacy where legacy.id = normalized.professional_id
      );
    end if;

    insert into public.professional_private_identity (
      professional_id, full_name_internal, linkedin_url_internal
    )
    select p.id, p.full_name_internal, p.linkedin_url_internal
    from public.professionals p
    where p_professional_ids is null or p.id = any(p_professional_ids)
    on conflict (professional_id) do update set
      full_name_internal = excluded.full_name_internal,
      linkedin_url_internal = excluded.linkedin_url_internal;

    insert into public.professional_source_observations (
      professional_id, source_record_key, source_type, source_url_internal,
      observed_at, raw_text_internal, confidence, review_status
    )
    select
      p.id,
      'legacy-professionals',
      p.data_source,
      p.linkedin_url_internal,
      p.date_added::timestamptz,
      jsonb_strip_nulls(jsonb_build_object(
        'secondary_education_notes', p.secondary_education_notes,
        'education_achievements', p.education_achievements,
        'extra_experiences_notes', p.extra_experiences_notes,
        'notes', p.notes
      )),
      p.data_confidence,
      'unreviewed'
    from public.professionals p
    where p_professional_ids is null or p.id = any(p_professional_ids)
    on conflict (professional_id, source_record_key) do update set
      source_type = excluded.source_type,
      source_url_internal = excluded.source_url_internal,
      observed_at = excluded.observed_at,
      raw_text_internal = excluded.raw_text_internal,
      confidence = excluded.confidence;

    insert into public.career_compass_signal_registry
      (signal_tag, status, taxonomy_version)
    select distinct signal.signal_tag, 'candidate', '2026-07-15.1'
    from public.professionals p
    cross join lateral unnest(p.signals) as signal(signal_tag)
    where p_professional_ids is null or p.id = any(p_professional_ids)
    on conflict (signal_tag) do nothing;

    delete from public.professional_education education
    where education.origin = 'legacy_backfill'
      and (p_professional_ids is null or education.professional_id = any(p_professional_ids));

    insert into public.professional_education (
      professional_id, sequence, education_level, institution_id,
      institution_name_reviewed, institution_tier, degree_type, degree_name,
      majors, graduation_year, date_precision, wam_band, has_honours,
      has_masters_or_second_degree, source_observation_id, origin
    )
    select
      p.id,
      1,
      'higher_education',
      institution.institution_id,
      p.university,
      p.university_tier,
      p.degree_type,
      p.degree,
      p.majors,
      p.graduation_year,
      'year',
      p.wam_band,
      p.has_honours,
      p.has_masters_or_second_degree,
      observation.observation_id,
      'legacy_backfill'
    from public.professionals p
    left join public.professional_institutions institution
      on institution.normalized_name = lower(btrim(p.university))
    left join public.professional_source_observations observation
      on observation.professional_id = p.id
     and observation.source_record_key = 'legacy-professionals'
    where p_professional_ids is null or p.id = any(p_professional_ids);

    insert into public.professional_education (
      professional_id, sequence, education_level, institution_id,
      institution_name_reviewed, date_precision, high_school_type, atar_band,
      source_observation_id, origin
    )
    select
      p.id,
      2,
      'high_school',
      institution.institution_id,
      p.high_school,
      'unknown',
      p.high_school_type,
      p.atar_band,
      observation.observation_id,
      'legacy_backfill'
    from public.professionals p
    left join public.professional_institutions institution
      on institution.normalized_name = lower(btrim(p.high_school))
    left join public.professional_source_observations observation
      on observation.professional_id = p.id
     and observation.source_record_key = 'legacy-professionals'
    where p_professional_ids is null or p.id = any(p_professional_ids);

    delete from public.professional_experiences experience
    where experience.origin = 'legacy_backfill'
      and (p_professional_ids is null or experience.professional_id = any(p_professional_ids));

    insert into public.professional_experiences (
      professional_id, sequence, experience_type_compatibility, experience_type,
      organization_id, organization_name_reviewed, firm_tier_compatibility,
      firm_tier, industry_compatibility, industry, role_function, original_year,
      date_precision, duration_months, acquisition_method_compatibility,
      acquisition_method, transition_type, converted_to_full_time,
      converted_to_full_time_compatibility, stored_role_relevance,
      derived_role_relevance, relevance_rule_version, source_observation_id, origin
    )
    select
      p.id,
      experience.sequence,
      experience.experience_type,
      case experience.experience_type
        when 'internship' then 'summer_internship'
        when 'casual' then 'part_time'
        else experience.experience_type
      end,
      organization.organization_id,
      experience.firm,
      experience.firm_tier,
      case when experience.firm_tier in (
        'bb', 'elite_boutique', 'mid_market', 'boutique', 'aus_big4_bank',
        'mega_fund', 'large_cap', 'global_manager', 'hedge_fund', 'mbb',
        'tier2_consulting', 'big4', 'mid_tier', 'top_tier_law', 'corporate',
        'local_government', 'state_government', 'federal_government', 'other'
      ) then experience.firm_tier else null end,
      experience.industry,
      case
        when experience.industry = 'capital_markets' then 'global_markets'
        when experience.industry in (
          'ib', 'global_markets', 'private_equity',
          'investment_management_equities', 'investment_management_credit',
          'investment_management_real_estate', 'consulting', 'big4_advisory',
          'big4_audit', 'corporate', 'law', 'government', 'other'
        ) then experience.industry
        else null
      end,
      experience.role_function,
      experience.experience_year,
      'year',
      experience.duration_months,
      experience.how_obtained,
      case
        when experience.how_obtained in (
          'online_application', 'cold_email', 'ocr', 'society_referral',
          'internal_referral', 'co_op_program', 'unknown'
        ) then experience.how_obtained
        when experience.how_obtained in ('return_offer', 'lateral', 'promotion', 'NA') then 'unknown'
        else null
      end,
      case when experience.how_obtained in ('return_offer', 'lateral', 'promotion')
        then experience.how_obtained else null end,
      case experience.converted_to_ft
        when 'TRUE' then true when 'FALSE' then false else null end,
      experience.converted_to_ft,
      experience.role_relevance,
      case
        when experience.firm_tier = 'bb' and experience.industry = 'ib' then 5
        when experience.firm_tier in ('elite_boutique', 'mid_market') and experience.industry = 'ib' then 5
        when experience.firm_tier = 'boutique' and experience.industry = 'ib' then 4
        when experience.industry in ('global_markets', 'capital_markets')
          and experience.firm_tier in ('bb', 'elite_boutique', 'mid_market') then 5
        when experience.industry in ('global_markets', 'capital_markets')
          and experience.firm_tier in ('boutique', 'aus_big4_bank') then 4
        when experience.industry in ('global_markets', 'capital_markets') then 3
        when experience.industry = 'private_equity'
          and experience.firm_tier in ('mega_fund', 'large_cap') then 5
        when experience.industry = 'private_equity' then 4
        when experience.industry in (
          'investment_management_equities', 'investment_management_credit',
          'investment_management_real_estate'
        ) and experience.firm_tier in ('global_manager', 'hedge_fund') then 4
        when experience.industry in (
          'investment_management_equities', 'investment_management_credit',
          'investment_management_real_estate'
        ) then 3
        when experience.industry = 'consulting' and experience.firm_tier = 'mbb' then 5
        when experience.industry = 'consulting' and experience.firm_tier = 'tier2_consulting' then 4
        when experience.industry = 'consulting' then 3
        when experience.industry in ('big4_advisory', 'big4_audit')
          and experience.firm_tier = 'big4' then 3
        when experience.industry in ('big4_advisory', 'big4_audit')
          and experience.firm_tier = 'mid_tier' then 2
        else 2
      end,
      '2026-07-15.1',
      observation.observation_id,
      'legacy_backfill'
    from public.professionals p
    cross join lateral (values
      (1, p.exp1_type, p.exp1_firm, p.exp1_firm_tier, p.exp1_industry,
       p.exp1_role_function, p.exp1_role_relevance, p.exp1_year,
       p.exp1_duration_months, p.exp1_how_obtained, p.exp1_converted_to_ft),
      (2, p.exp2_type, p.exp2_firm, p.exp2_firm_tier, p.exp2_industry,
       p.exp2_role_function, p.exp2_role_relevance, p.exp2_year,
       p.exp2_duration_months, p.exp2_how_obtained, p.exp2_converted_to_ft),
      (3, p.exp3_type, p.exp3_firm, p.exp3_firm_tier, p.exp3_industry,
       p.exp3_role_function, p.exp3_role_relevance, p.exp3_year,
       p.exp3_duration_months, p.exp3_how_obtained, p.exp3_converted_to_ft),
      (4, p.exp4_type, p.exp4_firm, p.exp4_firm_tier, p.exp4_industry,
       p.exp4_role_function, p.exp4_role_relevance, p.exp4_year,
       p.exp4_duration_months, p.exp4_how_obtained, p.exp4_converted_to_ft),
      (5, p.exp5_type, p.exp5_firm, p.exp5_firm_tier, p.exp5_industry,
       p.exp5_role_function, p.exp5_role_relevance, p.exp5_year,
       p.exp5_duration_months, p.exp5_how_obtained, p.exp5_converted_to_ft)
    ) as experience(
      sequence, experience_type, firm, firm_tier, industry, role_function,
      role_relevance, experience_year, duration_months, how_obtained,
      converted_to_ft
    )
    left join public.professional_organizations organization
      on organization.normalized_name = lower(btrim(experience.firm))
    left join public.professional_source_observations observation
      on observation.professional_id = p.id
     and observation.source_record_key = 'legacy-professionals'
    where (p_professional_ids is null or p.id = any(p_professional_ids))
      and experience.experience_type is not null;

    delete from public.professional_achievements achievement
    where achievement.origin = 'legacy_backfill'
      and (p_professional_ids is null or achievement.professional_id = any(p_professional_ids));

    insert into public.professional_achievements (
      professional_id, sequence, achievement_type, compatibility_signal_tag,
      canonical_signal_tag, date_precision, verification_status,
      source_observation_id, origin
    )
    select
      p.id,
      signal.ordinality::integer,
      'signal',
      signal.signal_tag,
      case when registry.status in ('selectable', 'auto_derived', 'approved_extension')
        then signal.signal_tag else null end,
      'unknown',
      case when registry.status = 'candidate' then 'unverified' else 'reviewed' end,
      observation.observation_id,
      'legacy_backfill'
    from public.professionals p
    cross join lateral unnest(p.signals) with ordinality as signal(signal_tag, ordinality)
    join public.career_compass_signal_registry registry
      on registry.signal_tag = signal.signal_tag
    left join public.professional_source_observations observation
      on observation.professional_id = p.id
     and observation.source_record_key = 'legacy-professionals'
    where p_professional_ids is null or p.id = any(p_professional_ids);

    delete from public.professional_data_quarantine quarantine
    where quarantine.origin = 'legacy_backfill'
      and (p_professional_ids is null or quarantine.professional_id = any(p_professional_ids));

    insert into public.professional_data_quarantine (
      professional_id, source_field, source_value, reason, origin
    )
    select p.id, 'current_firm_tier', p.current_firm_tier,
      'Combined elite boutique and mid-market tier requires evidence review',
      'legacy_backfill'
    from public.professionals p
    where p.current_firm_tier = 'elite_boutique_and_mm'
      and (p_professional_ids is null or p.id = any(p_professional_ids));

    insert into public.professional_data_quarantine (
      professional_id, source_field, source_value, reason, proposed_mapping,
      evidence, origin
    )
    select
      p.id,
      'experience.' || experience.sequence || '.firm_tier',
      experience.firm_tier,
      'Firm tier is not currently selectable in Career Compass',
      null,
      jsonb_build_object('firm', experience.firm, 'industry', experience.industry),
      'legacy_backfill'
    from public.professionals p
    cross join lateral (values
      (1, p.exp1_firm, p.exp1_firm_tier, p.exp1_industry),
      (2, p.exp2_firm, p.exp2_firm_tier, p.exp2_industry),
      (3, p.exp3_firm, p.exp3_firm_tier, p.exp3_industry),
      (4, p.exp4_firm, p.exp4_firm_tier, p.exp4_industry),
      (5, p.exp5_firm, p.exp5_firm_tier, p.exp5_industry)
    ) as experience(sequence, firm, firm_tier, industry)
    where experience.firm_tier is not null
      and experience.firm_tier not in (
        'bb', 'elite_boutique', 'mid_market', 'boutique', 'aus_big4_bank',
        'mega_fund', 'large_cap', 'global_manager', 'hedge_fund', 'mbb',
        'tier2_consulting', 'big4', 'mid_tier', 'top_tier_law', 'corporate',
        'local_government', 'state_government', 'federal_government', 'other'
      )
      and (p_professional_ids is null or p.id = any(p_professional_ids));

    insert into public.professional_data_quarantine (
      professional_id, source_field, source_value, reason, origin
    )
    select p.id, 'extra_experiences_notes', p.extra_experiences_notes,
      'Narrative experience evidence requires human review before scoring',
      'legacy_backfill'
    from public.professionals p
    where nullif(btrim(p.extra_experiences_notes), '') is not null
      and (p_professional_ids is null or p.id = any(p_professional_ids));

    insert into public.professional_data_quarantine (
      professional_id, source_field, source_value, reason, proposed_mapping,
      origin
    )
    select
      p.id,
      'signals[' || signal.ordinality || ']',
      signal.signal_tag,
      'Database signal is a candidate for reviewed Career Compass promotion',
      signal.signal_tag,
      'legacy_backfill'
    from public.professionals p
    cross join lateral unnest(p.signals) with ordinality as signal(signal_tag, ordinality)
    join public.career_compass_signal_registry registry
      on registry.signal_tag = signal.signal_tag
    where registry.status = 'candidate'
      and (p_professional_ids is null or p.id = any(p_professional_ids));

    insert into public.career_compass_taxonomy_reviews (
      identifier_category, legacy_identifier, proposed_identifier, status,
      evidence, reviewed_by, reviewed_at
    ) values
      ('experience_type', 'internship', 'summer_internship', 'approved',
       '{"product_decision":"2B"}'::jsonb, 'product-owner', now()),
      ('experience_type', 'casual', 'part_time', 'approved',
       '{"product_decision":"2B"}'::jsonb, 'product-owner', now()),
      ('industry', 'capital_markets', 'global_markets', 'approved',
       '{"source":"Career Compass onboarding"}'::jsonb, 'product-owner', now())
    on conflict (identifier_category, legacy_identifier, proposed_identifier)
    do update set
      status = excluded.status,
      evidence = excluded.evidence,
      reviewed_by = excluded.reviewed_by,
      reviewed_at = excluded.reviewed_at;

    update public.professional_normalization_runs run
    set
      source_hash = v_source_hash,
      professional_count = (
        select count(*) from public.professional_profiles profile
        where p_professional_ids is null or profile.professional_id = any(p_professional_ids)
      ),
      education_count = (
        select count(*) from public.professional_education education
        where p_professional_ids is null or education.professional_id = any(p_professional_ids)
      ),
      experience_count = (
        select count(*) from public.professional_experiences experience
        where p_professional_ids is null or experience.professional_id = any(p_professional_ids)
      ),
      achievement_count = (
        select count(*) from public.professional_achievements achievement
        where p_professional_ids is null or achievement.professional_id = any(p_professional_ids)
      ),
      quarantine_count = (
        select count(*) from public.professional_data_quarantine quarantine
        where p_professional_ids is null or quarantine.professional_id = any(p_professional_ids)
      ),
      status = 'complete',
      completed_at = now()
    where run.run_id = v_run_id;
  exception when others then
    update public.professional_normalization_runs run
    set status = 'failed', error_message = left(sqlerrm, 500), completed_at = now()
    where run.run_id = v_run_id;
  end;

  return v_run_id;
end;
$$;

revoke all on function public.refresh_normalized_professionals_from_legacy(text[]) from public;
revoke all on function public.refresh_normalized_professionals_from_legacy(text[]) from anon, authenticated;
grant execute on function public.refresh_normalized_professionals_from_legacy(text[]) to service_role;

do $$
declare
  v_run_id uuid;
  v_status text;
  v_error text;
begin
  v_run_id := public.refresh_normalized_professionals_from_legacy(null);
  select status, error_message into v_status, v_error
  from public.professional_normalization_runs
  where run_id = v_run_id;
  if v_status <> 'complete' then
    raise exception 'Initial professional normalization failed: %', coalesce(v_error, 'unknown error');
  end if;
end;
$$;

create or replace view public.professional_scoring_input_v1
as
select
  profile.professional_id as id,
  profile."current_role" as "current_role",
  profile.current_firm_name_reviewed as current_firm,
  profile.current_firm_tier_compatibility as current_firm_tier,
  profile.current_geography,
  profile.current_role_start_year,
  profile.years_to_current_role,
  higher_education.institution_name_reviewed as university,
  higher_education.institution_tier as university_tier,
  higher_education.degree_name as degree,
  higher_education.degree_type,
  higher_education.majors,
  higher_education.wam_band,
  higher_education.graduation_year,
  higher_education.has_honours,
  higher_education.has_masters_or_second_degree,
  high_school.institution_name_reviewed as high_school,
  high_school.high_school_type,
  high_school.atar_band,
  coalesce(experience_rows.experiences, '[]'::jsonb) as experiences,
  profile.signals_compatibility as signals,
  profile.path_summary,
  profile.data_source,
  profile.data_confidence,
  profile.taxonomy_version,
  profile.derivation_version,
  profile.feature_version
from public.professional_profiles profile
join lateral (
  select education.*
  from public.professional_education education
  where education.professional_id = profile.professional_id
    and education.education_level = 'higher_education'
  order by education.sequence
  limit 1
) higher_education on true
join lateral (
  select education.*
  from public.professional_education education
  where education.professional_id = profile.professional_id
    and education.education_level = 'high_school'
  order by education.sequence
  limit 1
) high_school on true
left join lateral (
  select jsonb_agg(
    jsonb_build_object(
      'type', experience.experience_type_compatibility,
      'firm', experience.organization_name_reviewed,
      'firm_tier', experience.firm_tier_compatibility,
      'industry', experience.industry_compatibility,
      'role_function', experience.role_function,
      'role_relevance', experience.stored_role_relevance,
      'year', experience.original_year,
      'duration_months', experience.duration_months,
      'how_obtained', experience.acquisition_method_compatibility,
      'converted_to_ft', case experience.converted_to_full_time_compatibility
        when 'TRUE' then 'true'::jsonb
        when 'FALSE' then 'false'::jsonb
        else to_jsonb('NA'::text)
      end
    ) order by experience.sequence
  ) as experiences
  from public.professional_experiences experience
  where experience.professional_id = profile.professional_id
) experience_rows on true;

revoke all on public.professional_scoring_input_v1 from public;
revoke all on public.professional_scoring_input_v1 from anon, authenticated;
grant select on public.professional_scoring_input_v1 to service_role;
