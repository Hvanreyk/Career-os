do $$
declare
  scoring_row record;
  normalized_experience record;
  normalization_status text;
begin
  select * into scoring_row
  from public.professional_scoring_input_v1
  where id = 'P900';

  if scoring_row.id is null then
    raise exception 'normalized scoring view omitted P900';
  end if;
  if scoring_row.current_firm_tier <> 'elite_boutique_and_mm' then
    raise exception 'Release A current tier compatibility was not preserved';
  end if;
  if jsonb_array_length(scoring_row.experiences) <> 1 then
    raise exception 'expected one ordered experience in scoring view';
  end if;
  if scoring_row.experiences->0->>'type' <> 'internship' then
    raise exception 'Release A experience type compatibility was not preserved';
  end if;
  if scoring_row.experiences->0->>'industry' <> 'capital_markets' then
    raise exception 'Release A industry compatibility was not preserved';
  end if;
  if scoring_row.experiences->0->>'converted_to_ft' <> 'true' then
    raise exception 'conversion boolean was not reconstructed';
  end if;

  select * into normalized_experience
  from public.professional_experiences
  where professional_id = 'P900' and sequence = 1;

  if normalized_experience.experience_type <> 'summer_internship' then
    raise exception 'approved generic internship mapping was not applied';
  end if;
  if normalized_experience.industry <> 'global_markets' then
    raise exception 'Career Compass industry mapping was not applied';
  end if;
  if normalized_experience.transition_type <> 'return_offer' then
    raise exception 'professional-only transition was not preserved';
  end if;
  if normalized_experience.duration_months is not null then
    raise exception 'unknown duration must remain null';
  end if;

  if not exists (
    select 1 from public.professional_data_quarantine
    where professional_id = 'P900' and source_field = 'current_firm_tier'
  ) then
    raise exception 'combined tier was not quarantined';
  end if;
  if not exists (
    select 1 from public.professional_data_quarantine
    where professional_id = 'P900' and source_value = 'chartered_accountant'
  ) then
    raise exception 'legacy signal candidate was not queued for review';
  end if;

  select status into normalization_status
  from public.professional_normalization_runs
  order by started_at desc
  limit 1;
  if normalization_status <> 'complete' then
    raise exception 'normalization run did not complete';
  end if;

  if (select semantic_release_ready
      from public.professional_semantic_readiness_v1
      where professional_id = 'P900') then
    raise exception 'fixture should retain semantic review blockers';
  end if;

  perform public.approve_career_compass_signal_extension(
    'chartered_accountant', 'migration-test', 'approved fixture extension'
  );
  if not exists (
    select 1 from public.career_compass_signal_registry
    where signal_tag = 'chartered_accountant' and status = 'approved_extension'
  ) then
    raise exception 'signal extension approval was not recorded';
  end if;
  if not exists (
    select 1 from public.professional_achievements
    where professional_id = 'P900'
      and canonical_signal_tag = 'chartered_accountant'
  ) then
    raise exception 'approved signal extension was not projected to achievements';
  end if;

  if (select eligible_for_separately_approved_retirement
      from public.professional_legacy_retirement_readiness_v1) then
    raise exception 'legacy retirement must remain blocked without a qualifying release';
  end if;
end;
$$;

set role anon;
do $$
begin
  if exists (select 1 from public.professional_profiles) then
    raise exception 'anon role can read normalized professional profiles';
  end if;
exception
  when insufficient_privilege then null;
end;
$$;
reset role;

set role authenticated;
do $$
begin
  if exists (select 1 from public.professional_scoring_input_v1) then
    raise exception 'authenticated role can read service scoring view';
  end if;
exception
  when insufficient_privilege then null;
end;
$$;
reset role;
