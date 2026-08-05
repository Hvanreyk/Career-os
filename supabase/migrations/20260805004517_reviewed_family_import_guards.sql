-- Apply reviewed-family provenance and override guards to databases that
-- already ran the original Technical Core import migration.

create or replace function public.technical_import_reviewed_family(
  p_family jsonb,
  p_actor_user_id uuid,
  p_question_hash text,
  p_rubric_hash text,
  p_parameter_hash text,
  p_validation_instance_count integer
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_family_id uuid := (p_family ->> 'id')::uuid;
  v_question_id uuid;
  v_rubric_id uuid;
  v_parameter_id uuid;
  v_source jsonb;
  v_source_id uuid;
  v_concept_id text;
  v_inserted integer;
begin
  if p_family is null or jsonb_typeof(p_family) <> 'object' then
    raise exception 'INVALID_REVIEWED_FAMILY_BUNDLE';
  end if;
  if p_validation_instance_count < 1000 then
    raise exception 'INSUFFICIENT_GENERATOR_VALIDATION';
  end if;
  if jsonb_typeof(p_family -> 'sources') is distinct from 'array'
    or jsonb_array_length(p_family -> 'sources') = 0 then
    raise exception 'MISSING_REVIEWED_FAMILY_SOURCES';
  end if;

  for v_source in select value from jsonb_array_elements(p_family -> 'sources') loop
    v_source_id := (v_source ->> 'sourceId')::uuid;
    insert into technical_sources (
      id, source_type, title, publisher, url, document_date, accessed_at,
      page_or_section, jurisdiction, rights_basis, verbatim_text_used,
      candidate_consent_recorded, candidate_independence_key, recruiting_cycle,
      bank_name, confidential_material_attested_absent, notes, created_by
    ) values (
      v_source_id,
      v_source ->> 'sourceType',
      v_source ->> 'title',
      v_source ->> 'publisher',
      v_source ->> 'url',
      (v_source ->> 'documentDate')::date,
      (v_source ->> 'accessedAt')::timestamptz,
      v_source ->> 'pageOrSection',
      v_source ->> 'jurisdiction',
      v_source ->> 'rightsBasis',
      false,
      coalesce((v_source ->> 'candidateConsentRecorded')::boolean, false),
      v_source ->> 'candidateIndependenceKey',
      v_source ->> 'recruitingCycle',
      v_source ->> 'bankName',
      coalesce((v_source ->> 'confidentialMaterialAttestedAbsent')::boolean, false),
      'Imported with reviewed family bundle.',
      p_actor_user_id
    ) on conflict (id) do nothing;
    get diagnostics v_inserted = row_count;

    if v_inserted = 0 and not exists (
      select 1
      from technical_sources s
      where s.id = v_source_id
        and s.source_type = v_source ->> 'sourceType'
        and s.title = v_source ->> 'title'
        and s.publisher = v_source ->> 'publisher'
        and s.url is not distinct from (v_source ->> 'url')
        and s.document_date = (v_source ->> 'documentDate')::date
        and s.accessed_at = (v_source ->> 'accessedAt')::timestamptz
        and s.page_or_section is not distinct from (v_source ->> 'pageOrSection')
        and s.jurisdiction = v_source ->> 'jurisdiction'
        and s.rights_basis = v_source ->> 'rightsBasis'
        and s.verbatim_text_used = false
        and s.candidate_consent_recorded = coalesce((v_source ->> 'candidateConsentRecorded')::boolean, false)
        and s.candidate_independence_key is not distinct from (v_source ->> 'candidateIndependenceKey')
        and s.recruiting_cycle is not distinct from (v_source ->> 'recruitingCycle')
        and s.bank_name is not distinct from (v_source ->> 'bankName')
        and s.confidential_material_attested_absent = coalesce((v_source ->> 'confidentialMaterialAttestedAbsent')::boolean, false)
    ) then
      raise exception 'SOURCE_ID_CONFLICT: %', v_source_id;
    end if;
  end loop;

  insert into technical_item_families (
    id, slug, primary_concept_id, topic, difficulty, cognitive_operation,
    learning_objectives, variant_coverage, status, bank_reliability, bank_name,
    independent_report_count, recruiting_cycle_count, last_report_date,
    author_id, next_review_at
  ) values (
    v_family_id,
    p_family ->> 'slug',
    p_family ->> 'primaryConceptId',
    p_family ->> 'topic',
    p_family ->> 'difficulty',
    p_family ->> 'cognitiveOperation',
    p_family -> 'learningObjectives',
    array(select jsonb_array_elements_text(p_family -> 'variantCoverage')),
    'draft',
    p_family #>> '{bankReliability,classification}',
    p_family #>> '{bankReliability,bankName}',
    (p_family #>> '{bankReliability,independentReportCount}')::integer,
    (p_family #>> '{bankReliability,recruitingCycleCount}')::integer,
    (p_family #>> '{bankReliability,lastReportDate}')::date,
    (p_family #>> '{review,authorId}')::uuid,
    (p_family #>> '{review,nextReviewAt}')::timestamptz
  );

  for v_concept_id in select jsonb_array_elements_text(p_family -> 'secondaryConceptIds') loop
    insert into technical_family_concepts (family_id, concept_id, relationship)
    values (v_family_id, v_concept_id, 'secondary');
  end loop;
  for v_concept_id in select jsonb_array_elements_text(p_family -> 'prerequisiteConceptIds') loop
    insert into technical_family_concepts (family_id, concept_id, relationship)
    values (v_family_id, v_concept_id, 'prerequisite');
  end loop;

  insert into technical_question_versions (
    family_id, version, status, prompt_template, short_prompt_template,
    followup_prompt_templates, jurisdiction, currency, interview_rounds,
    interviewer_levels, calculator_policy, expected_duration_min_seconds,
    expected_duration_target_seconds, expected_duration_max_seconds,
    assumptions, effective_from, effective_to, content_hash, change_reason,
    authored_by, approved_by, approved_at
  ) values (
    v_family_id,
    (p_family #>> '{questionVersion,version}')::integer,
    'approved',
    p_family #>> '{questionVersion,promptTemplate}',
    p_family #>> '{questionVersion,shortPromptTemplate}',
    p_family #> '{questionVersion,followupPromptTemplates}',
    p_family #>> '{questionVersion,jurisdiction}',
    p_family #>> '{questionVersion,currency}',
    array(select jsonb_array_elements_text(p_family #> '{questionVersion,interviewRounds}')),
    array(select jsonb_array_elements_text(p_family #> '{questionVersion,interviewerLevels}')),
    p_family #>> '{questionVersion,calculatorPolicy}',
    (p_family #>> '{questionVersion,expectedAnswerDurationSeconds,minimum}')::integer,
    (p_family #>> '{questionVersion,expectedAnswerDurationSeconds,target}')::integer,
    (p_family #>> '{questionVersion,expectedAnswerDurationSeconds,maximum}')::integer,
    p_family #> '{questionVersion,assumptions}',
    (p_family #>> '{questionVersion,effectiveFrom}')::timestamptz,
    (p_family #>> '{questionVersion,effectiveTo}')::timestamptz,
    p_question_hash,
    p_family #>> '{review,changeReason}',
    (p_family #>> '{review,authorId}')::uuid,
    (p_family #>> '{review,approverId}')::uuid,
    (p_family #>> '{review,approvedAt}')::timestamptz
  ) returning id into v_question_id;

  insert into technical_rubric_versions (
    family_id, version, status, answer_outline, must_hit_points, bonus_points,
    fatal_errors, accepted_variants, common_misconceptions,
    deterministic_checks, followup_tree, content_hash, change_reason,
    authored_by, approved_by, approved_at
  ) values (
    v_family_id,
    (p_family #>> '{rubricVersion,version}')::integer,
    'approved',
    p_family #> '{rubricVersion,answerOutline}',
    p_family #> '{rubricVersion,mustHitPoints}',
    p_family #> '{rubricVersion,bonusPoints}',
    p_family #> '{rubricVersion,fatalErrors}',
    p_family #> '{rubricVersion,acceptedVariants}',
    p_family #> '{rubricVersion,commonMisconceptions}',
    p_family #> '{rubricVersion,deterministicChecks}',
    p_family #> '{rubricVersion,followupTree}',
    p_rubric_hash,
    p_family #>> '{review,changeReason}',
    (p_family #>> '{review,authorId}')::uuid,
    (p_family #>> '{review,approverId}')::uuid,
    (p_family #>> '{review,approvedAt}')::timestamptz
  ) returning id into v_rubric_id;

  insert into technical_parameter_specs (
    family_id, version, seed_version, status, parameters, derived_values,
    constraints, transformation_rules, validation_instance_count,
    validation_failure_count, last_validated_at, content_hash,
    authored_by, approved_by, approved_at
  ) values (
    v_family_id,
    (p_family #>> '{parameterSpec,seedVersion}')::integer,
    (p_family #>> '{parameterSpec,seedVersion}')::integer,
    'approved',
    p_family #> '{parameterSpec,parameters}',
    p_family #> '{parameterSpec,derivedValues}',
    p_family #> '{parameterSpec,constraints}',
    p_family #> '{parameterSpec,transformationRules}',
    p_validation_instance_count,
    0,
    now(),
    p_parameter_hash,
    (p_family #>> '{review,authorId}')::uuid,
    (p_family #>> '{review,approverId}')::uuid,
    (p_family #>> '{review,approvedAt}')::timestamptz
  ) returning id into v_parameter_id;

  for v_source in select value from jsonb_array_elements(p_family -> 'sources') loop
    insert into technical_question_source_links (
      question_version_id, source_id, claim_supported, source_location
    ) values (
      v_question_id,
      (v_source ->> 'sourceId')::uuid,
      'Reviewed source support recorded in the family bundle.',
      v_source ->> 'pageOrSection'
    );
  end loop;

  insert into technical_content_reviews (
    family_id, question_version_id, rubric_version_id, parameter_spec_id,
    review_type, reviewer_id, decision, resolved_at
  ) values
    (v_family_id, v_question_id, v_rubric_id, v_parameter_id, 'technical', (p_family #>> '{review,technicalReviewerId}')::uuid, 'approved', (p_family #>> '{review,approvedAt}')::timestamptz),
    (v_family_id, v_question_id, v_rubric_id, v_parameter_id, 'realism', (p_family #>> '{review,realismReviewerId}')::uuid, 'approved', (p_family #>> '{review,approvedAt}')::timestamptz),
    (v_family_id, v_question_id, v_rubric_id, v_parameter_id, 'copyright', (p_family #>> '{review,approverId}')::uuid, 'approved', (p_family #>> '{review,approvedAt}')::timestamptz);

  update technical_item_families set status = 'published' where id = v_family_id;

  insert into technical_content_audit_events (
    family_id, entity_type, entity_id, action, actor_user_id, reason,
    after_data, founder_override, override_expires_at
  ) values (
    v_family_id,
    'family_bundle',
    v_family_id::text,
    'import_and_publish',
    p_actor_user_id,
    p_family #>> '{review,changeReason}',
    jsonb_build_object(
      'questionVersion', (p_family #>> '{questionVersion,version}')::integer,
      'rubricVersion', (p_family #>> '{rubricVersion,version}')::integer,
      'parameterSeedVersion', (p_family #>> '{parameterSpec,seedVersion}')::integer
    ),
    coalesce((p_family #>> '{review,founderOverride}')::boolean, false),
    case when coalesce((p_family #>> '{review,founderOverride}')::boolean, false)
      then now() + interval '30 days' else null end
  );

  return jsonb_build_object(
    'familyId', v_family_id,
    'questionVersionId', v_question_id,
    'rubricVersionId', v_rubric_id,
    'parameterSpecId', v_parameter_id,
    'status', 'published'
  );
end;
$$;


revoke all on function public.technical_import_reviewed_family(jsonb, uuid, text, text, text, integer)
  from public, anon, authenticated;
grant execute on function public.technical_import_reviewed_family(jsonb, uuid, text, text, text, integer)
  to service_role;
