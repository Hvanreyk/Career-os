import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { validateGeneratedFamily } from '@trajectoryos/core/interview/generator';
import { TechnicalItemFamilySchema, type TechnicalItemFamily } from '@trajectoryos/core/interview/types';
import { getRequestUser, isAdminUser } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';

function hash(value: unknown) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

export async function POST(request: Request) {
  const user = await getRequestUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  if (!isAdminUser(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = await request.json().catch(() => null) as { action?: unknown; family?: unknown } | null;
  if (body?.action !== 'import_reviewed_bundle') {
    return NextResponse.json({ error: 'Invalid technical-core action' }, { status: 400 });
  }
  const familyResult = TechnicalItemFamilySchema.safeParse(body.family);
  if (!familyResult.success) return NextResponse.json({ error: 'Invalid reviewed family bundle', issues: familyResult.error.flatten() }, { status: 400 });
  const family = familyResult.data as TechnicalItemFamily;
  const generatorErrors = validateGeneratedFamily(family, 1000);
  if (generatorErrors.length) return NextResponse.json({ error: 'Generator property tests failed', generatorErrors }, { status: 422 });
  const service = createServiceClient();
  const { data: concept } = await service.from('technical_concepts').select('id, topic').eq('id', family.primaryConceptId).maybeSingle();
  if (!concept || concept.topic !== family.topic) return NextResponse.json({ error: 'Primary concept/topic mismatch' }, { status: 422 });
  const { data: existing } = await service.from('technical_item_families').select('id, status').eq('slug', family.slug).maybeSingle();
  if (existing) return NextResponse.json({ error: `Family already exists with status ${existing.status}; create a new immutable version through adjudication.` }, { status: 409 });

  const sourceRows = family.sources.map((source) => ({
    id: source.sourceId,
    source_type: source.sourceType,
    title: source.title,
    publisher: source.publisher,
    url: source.url,
    document_date: source.documentDate,
    accessed_at: source.accessedAt,
    page_or_section: source.pageOrSection,
    jurisdiction: source.jurisdiction,
    rights_basis: source.rightsBasis,
    verbatim_text_used: false,
    candidate_consent_recorded: source.candidateConsentRecorded,
    candidate_independence_key: source.candidateIndependenceKey,
    recruiting_cycle: source.recruitingCycle,
    bank_name: source.bankName,
    confidential_material_attested_absent: source.confidentialMaterialAttestedAbsent,
    notes: 'Imported with reviewed family bundle.',
    created_by: user.id,
  }));
  const { error: sourceError } = await service.from('technical_sources').upsert(sourceRows, { onConflict: 'id' });
  if (sourceError) return NextResponse.json({ error: `Source import failed: ${sourceError.message}` }, { status: 422 });
  const { data: created, error: familyError } = await service.from('technical_item_families').insert({
    id: family.id,
    slug: family.slug,
    primary_concept_id: family.primaryConceptId,
    topic: family.topic,
    difficulty: family.difficulty,
    cognitive_operation: family.cognitiveOperation,
    learning_objectives: family.learningObjectives,
    variant_coverage: family.variantCoverage,
    status: 'draft',
    bank_reliability: family.bankReliability.classification,
    bank_name: family.bankReliability.bankName,
    independent_report_count: family.bankReliability.independentReportCount,
    recruiting_cycle_count: family.bankReliability.recruitingCycleCount,
    last_report_date: family.bankReliability.lastReportDate,
    author_id: family.review.authorId,
    next_review_at: family.review.nextReviewAt,
  }).select('id').single();
  if (familyError || !created) return NextResponse.json({ error: familyError?.message ?? 'Family creation failed' }, { status: 422 });

  const conceptLinks = [
    ...family.secondaryConceptIds.map((conceptId) => ({ family_id: family.id, concept_id: conceptId, relationship: 'secondary' })),
    ...family.prerequisiteConceptIds.map((conceptId) => ({ family_id: family.id, concept_id: conceptId, relationship: 'prerequisite' })),
  ];
  if (conceptLinks.length) await service.from('technical_family_concepts').insert(conceptLinks);
  const { data: question, error: questionError } = await service.from('technical_question_versions').insert({
    family_id: family.id,
    version: family.questionVersion.version,
    status: 'approved',
    prompt_template: family.questionVersion.promptTemplate,
    short_prompt_template: family.questionVersion.shortPromptTemplate,
    followup_prompt_templates: family.questionVersion.followupPromptTemplates,
    jurisdiction: family.questionVersion.jurisdiction,
    currency: family.questionVersion.currency,
    interview_rounds: family.questionVersion.interviewRounds,
    interviewer_levels: family.questionVersion.interviewerLevels,
    calculator_policy: family.questionVersion.calculatorPolicy,
    expected_duration_min_seconds: family.questionVersion.expectedAnswerDurationSeconds.minimum,
    expected_duration_target_seconds: family.questionVersion.expectedAnswerDurationSeconds.target,
    expected_duration_max_seconds: family.questionVersion.expectedAnswerDurationSeconds.maximum,
    assumptions: family.questionVersion.assumptions,
    effective_from: family.questionVersion.effectiveFrom,
    effective_to: family.questionVersion.effectiveTo,
    content_hash: hash(family.questionVersion),
    change_reason: family.review.changeReason,
    authored_by: family.review.authorId,
    approved_by: family.review.approverId,
    approved_at: family.review.approvedAt,
  }).select('id').single();
  if (questionError || !question) return NextResponse.json({ error: questionError?.message ?? 'Question version import failed', familyId: family.id }, { status: 422 });
  const { data: rubric, error: rubricError } = await service.from('technical_rubric_versions').insert({
    family_id: family.id,
    version: family.rubricVersion.version,
    status: 'approved',
    answer_outline: family.rubricVersion.answerOutline,
    must_hit_points: family.rubricVersion.mustHitPoints,
    bonus_points: family.rubricVersion.bonusPoints,
    fatal_errors: family.rubricVersion.fatalErrors,
    accepted_variants: family.rubricVersion.acceptedVariants,
    common_misconceptions: family.rubricVersion.commonMisconceptions,
    deterministic_checks: family.rubricVersion.deterministicChecks,
    followup_tree: family.rubricVersion.followupTree,
    content_hash: hash(family.rubricVersion),
    change_reason: family.review.changeReason,
    authored_by: family.review.authorId,
    approved_by: family.review.approverId,
    approved_at: family.review.approvedAt,
  }).select('id').single();
  if (rubricError || !rubric) return NextResponse.json({ error: rubricError?.message ?? 'Rubric version import failed', familyId: family.id }, { status: 422 });
  const { data: parameters, error: parameterError } = await service.from('technical_parameter_specs').insert({
    family_id: family.id,
    version: family.parameterSpec.seedVersion,
    seed_version: family.parameterSpec.seedVersion,
    status: 'approved',
    parameters: family.parameterSpec.parameters,
    derived_values: family.parameterSpec.derivedValues,
    constraints: family.parameterSpec.constraints,
    transformation_rules: family.parameterSpec.transformationRules,
    validation_instance_count: 1000 * family.variantCoverage.length,
    validation_failure_count: 0,
    last_validated_at: new Date().toISOString(),
    content_hash: hash(family.parameterSpec),
    authored_by: family.review.authorId,
    approved_by: family.review.approverId,
    approved_at: family.review.approvedAt,
  }).select('id').single();
  if (parameterError || !parameters) return NextResponse.json({ error: parameterError?.message ?? 'Parameter spec import failed', familyId: family.id }, { status: 422 });

  await service.from('technical_question_source_links').insert(family.sources.map((source) => ({
    question_version_id: question.id,
    source_id: source.sourceId,
    claim_supported: 'Reviewed source support recorded in the family bundle.',
    source_location: source.pageOrSection,
  })));
  const reviews = [
    { review_type: 'technical', reviewer_id: family.review.technicalReviewerId },
    { review_type: 'realism', reviewer_id: family.review.realismReviewerId },
    { review_type: 'copyright', reviewer_id: family.review.approverId },
  ].map((review) => ({
    family_id: family.id,
    question_version_id: question.id,
    rubric_version_id: rubric.id,
    parameter_spec_id: parameters.id,
    ...review,
    decision: 'approved',
    resolved_at: family.review.approvedAt,
  }));
  const { error: reviewError } = await service.from('technical_content_reviews').insert(reviews);
  if (reviewError) return NextResponse.json({ error: `Review import failed: ${reviewError.message}`, familyId: family.id }, { status: 422 });
  const { error: publishError } = await service.from('technical_item_families').update({ status: 'published' }).eq('id', family.id);
  if (publishError) return NextResponse.json({ error: `Publish guard rejected the family: ${publishError.message}`, familyId: family.id }, { status: 422 });
  await service.from('technical_content_audit_events').insert({
    family_id: family.id,
    entity_type: 'family_bundle',
    entity_id: family.id,
    action: 'import_and_publish',
    actor_user_id: user.id,
    reason: family.review.changeReason,
    after_data: { questionVersion: family.questionVersion.version, rubricVersion: family.rubricVersion.version, parameterSeedVersion: family.parameterSpec.seedVersion },
    founder_override: family.review.founderOverride,
    override_expires_at: family.review.founderOverride ? new Date(Date.now() + 30 * 86_400_000).toISOString() : null,
  });
  return NextResponse.json({ familyId: family.id, status: 'published', generatedInstancesValidated: 1000 * family.variantCoverage.length }, { status: 201 });
}
