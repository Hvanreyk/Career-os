-- Aggregate-only production verification. This query deliberately returns no
-- professional identifiers or private identity fields.
with legacy_projection as (
  select
    professional.id,
    jsonb_build_object(
      'id', professional.id,
      'current_role', professional."current_role",
      'current_firm', professional.current_firm,
      'current_firm_tier', professional.current_firm_tier,
      'current_geography', professional.current_geography,
      'current_role_start_year', professional.current_role_start_year,
      'years_to_current_role', professional.years_to_current_role,
      'university', professional.university,
      'university_tier', professional.university_tier,
      'degree', professional.degree,
      'degree_type', professional.degree_type,
      'majors', professional.majors,
      'wam_band', professional.wam_band,
      'graduation_year', professional.graduation_year,
      'has_honours', professional.has_honours,
      'has_masters_or_second_degree', professional.has_masters_or_second_degree,
      'high_school', professional.high_school,
      'high_school_type', professional.high_school_type,
      'atar_band', professional.atar_band,
      'experiences', coalesce(experience_rows.experiences, '[]'::jsonb),
      'signals', to_jsonb(professional.signals),
      'path_summary', professional.path_summary,
      'data_source', professional.data_source,
      'data_confidence', professional.data_confidence
    ) as payload
  from public.professionals professional
  left join lateral (
    select jsonb_agg(
      jsonb_build_object(
        'type', slot.experience_type,
        'firm', slot.firm,
        'firm_tier', slot.firm_tier,
        'industry', slot.industry,
        'role_function', slot.role_function,
        'role_relevance', slot.role_relevance,
        'year', slot.experience_year,
        'duration_months', slot.duration_months,
        'how_obtained', slot.how_obtained,
        'converted_to_ft', case slot.converted_to_full_time
          when 'TRUE' then 'true'::jsonb
          when 'FALSE' then 'false'::jsonb
          else to_jsonb(slot.converted_to_full_time)
        end
      ) order by slot.sequence
    ) as experiences
    from (
      values
        (1, professional.exp1_type, professional.exp1_firm,
         professional.exp1_firm_tier, professional.exp1_industry,
         professional.exp1_role_function, professional.exp1_role_relevance,
         professional.exp1_year, professional.exp1_duration_months,
         professional.exp1_how_obtained, professional.exp1_converted_to_ft),
        (2, professional.exp2_type, professional.exp2_firm,
         professional.exp2_firm_tier, professional.exp2_industry,
         professional.exp2_role_function, professional.exp2_role_relevance,
         professional.exp2_year, professional.exp2_duration_months,
         professional.exp2_how_obtained, professional.exp2_converted_to_ft),
        (3, professional.exp3_type, professional.exp3_firm,
         professional.exp3_firm_tier, professional.exp3_industry,
         professional.exp3_role_function, professional.exp3_role_relevance,
         professional.exp3_year, professional.exp3_duration_months,
         professional.exp3_how_obtained, professional.exp3_converted_to_ft),
        (4, professional.exp4_type, professional.exp4_firm,
         professional.exp4_firm_tier, professional.exp4_industry,
         professional.exp4_role_function, professional.exp4_role_relevance,
         professional.exp4_year, professional.exp4_duration_months,
         professional.exp4_how_obtained, professional.exp4_converted_to_ft),
        (5, professional.exp5_type, professional.exp5_firm,
         professional.exp5_firm_tier, professional.exp5_industry,
         professional.exp5_role_function, professional.exp5_role_relevance,
         professional.exp5_year, professional.exp5_duration_months,
         professional.exp5_how_obtained, professional.exp5_converted_to_ft)
    ) as slot(
      sequence, experience_type, firm, firm_tier, industry, role_function,
      role_relevance, experience_year, duration_months, how_obtained,
      converted_to_full_time
    )
    where slot.experience_type is not null
  ) experience_rows on true
), normalized_projection as (
  select
    normalized.id,
    to_jsonb(normalized)
      - 'taxonomy_version'
      - 'derivation_version'
      - 'feature_version' as payload
  from public.professional_scoring_input_v1 normalized
), parity as (
  select
    count(*) filter (
      where legacy.id is null or normalized.id is null
         or legacy.payload is distinct from normalized.payload
    ) as mismatched_professional_count
  from legacy_projection legacy
  full join normalized_projection normalized using (id)
), latest_run as (
  select *
  from public.professional_normalization_runs
  order by started_at desc
  limit 1
)
select
  (select count(*) from public.professionals) as legacy_professional_count,
  (select count(*) from public.professional_profiles) as normalized_professional_count,
  (select count(*) from public.professional_scoring_input_v1) as scoring_view_count,
  (select mismatched_professional_count from parity) as mismatched_professional_count,
  (select count(*) from public.professional_experiences) as normalized_experience_count,
  (select count(*) from public.professional_education) as normalized_education_count,
  (select count(*) from public.professional_private_identity) as private_identity_count,
  (select count(*) from public.professional_data_quarantine) as quarantine_item_count,
  (select count(*) from public.career_compass_signal_registry
   where status = 'candidate') as candidate_signal_type_count,
  (select status from latest_run) as latest_normalization_status,
  (select professional_count from latest_run) as latest_run_professional_count,
  (select experience_count from latest_run) as latest_run_experience_count,
  (select eligible_for_separately_approved_retirement
   from public.professional_legacy_retirement_readiness_v1) as legacy_retirement_eligible;
