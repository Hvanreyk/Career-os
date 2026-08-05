import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import {
  TECHNICAL_CONCEPTS,
  validateConceptTaxonomy,
} from '../lib/interview/taxonomy.js';
import {
  TECHNICAL_CORE_120_DRAFTS,
  TECHNICAL_CORE_RESEARCH_SECTIONS,
  TECHNICAL_CORE_RESEARCH_SOURCES,
  validateTechnicalCore120Drafts,
} from '../lib/interview/technical-core-120.js';

const dryRun = process.argv.includes('--dry-run');
const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

const taxonomyErrors = validateConceptTaxonomy();
if (taxonomyErrors.length) throw new Error(`Invalid technical taxonomy:\n${taxonomyErrors.join('\n')}`);
const draftErrors = validateTechnicalCore120Drafts();
if (draftErrors.length) throw new Error(`Invalid Technical Core 120 drafts:\n${draftErrors.join('\n')}`);

const conceptRows = TECHNICAL_CONCEPTS.map((concept) => ({
  id: concept.id,
  slug: concept.slug,
  topic: concept.topic,
  name: concept.name,
  sort_order: concept.sortOrder,
  status: 'active',
}));
const edgeRows = TECHNICAL_CONCEPTS.flatMap((concept) => concept.prerequisiteIds.map((prerequisite) => ({
  concept_id: concept.id,
  prerequisite_concept_id: prerequisite,
})));
const misconceptionRows = TECHNICAL_CONCEPTS.map((concept) => ({
  code: concept.primaryMisconceptionCode,
  concept_id: concept.id,
  title: concept.primaryMisconceptionCode.split('.')[1]!.toLowerCase().replaceAll('_', ' '),
  explanation: `Primary reviewed misconception definition for ${concept.name}. Complete the content review before publishing families that use this code.`,
  severity: 'fatal',
  trigger_definition: { status: 'requires_expert_definition' },
  mastery_blocking: true,
  status: 'active',
}));

async function main() {
  if (dryRun) {
    console.log(JSON.stringify({
      concepts: conceptRows.length,
      prerequisiteEdges: edgeRows.length,
      primaryMisconceptions: misconceptionRows.length,
      draftFamilies: TECHNICAL_CORE_120_DRAFTS.length,
      researchSources: TECHNICAL_CORE_RESEARCH_SOURCES.length,
      renderedVariants: TECHNICAL_CORE_120_DRAFTS.reduce((sum, family) => sum + family.variantCoverage.length, 0),
    }, null, 2));
    return;
  }

  if (!url || !key) throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { error: conceptError } = await supabase.from('technical_concepts').upsert(conceptRows, { onConflict: 'id' });
  if (conceptError) throw new Error(`Could not seed concepts: ${conceptError.message}`);
  const { error: edgeError } = await supabase.from('technical_concept_edges').upsert(edgeRows, {
    onConflict: 'concept_id,prerequisite_concept_id',
  });
  if (edgeError) throw new Error(`Could not seed prerequisite edges: ${edgeError.message}`);
  const { error: misconceptionError } = await supabase.from('technical_misconceptions').upsert(misconceptionRows, { onConflict: 'code' });
  if (misconceptionError) throw new Error(`Could not seed misconceptions: ${misconceptionError.message}`);

  const accessedAt = '2026-08-04T23:20:00.000Z';
  const sourceRows = TECHNICAL_CORE_RESEARCH_SOURCES.map((source) => ({
    id: source.id,
    source_type: source.sourceType,
    title: source.title,
    publisher: source.publisher,
    url: null,
    document_date: source.documentDate,
    accessed_at: accessedAt,
    page_or_section: null,
    jurisdiction: source.jurisdiction,
    rights_basis: source.rightsBasis,
    verbatim_text_used: false,
    notes: source.notes,
  }));
  const { error: sourceError } = await supabase.from('technical_sources').upsert(sourceRows, { onConflict: 'id' });
  if (sourceError) throw new Error(`Could not seed Technical Core research sources: ${sourceError.message}`);

  const slugs = TECHNICAL_CORE_120_DRAFTS.map((family) => family.slug);
  const ids = TECHNICAL_CORE_120_DRAFTS.map((family) => family.id);
  const [bySlugResult, byIdResult] = await Promise.all([
    supabase.from('technical_item_families').select('id, slug, status').in('slug', slugs),
    supabase.from('technical_item_families').select('id, slug, status').in('id', ids),
  ]);
  if (bySlugResult.error) throw new Error(`Could not inspect existing Technical Core family slugs: ${bySlugResult.error.message}`);
  if (byIdResult.error) throw new Error(`Could not inspect existing Technical Core family IDs: ${byIdResult.error.message}`);
  const existingFamilies = [...new Map(
    [...(bySlugResult.data ?? []), ...(byIdResult.data ?? [])].map((family) => [family.id, family]),
  ).values()];
  const expectedIdBySlug = new Map(TECHNICAL_CORE_120_DRAFTS.map((family) => [family.slug, family.id]));
  const expectedSlugById = new Map(TECHNICAL_CORE_120_DRAFTS.map((family) => [family.id, family.slug]));
  const idConflicts = existingFamilies.filter((family) =>
    (expectedIdBySlug.has(family.slug) && expectedIdBySlug.get(family.slug) !== family.id)
    || (expectedSlugById.has(family.id) && expectedSlugById.get(family.id) !== family.slug));
  if (idConflicts.length) {
    throw new Error(`Draft seed ID/slug conflict for: ${idConflicts.map((family) => `${family.id}:${family.slug}`).join(', ')}`);
  }
  const mutableSlugs = new Set(existingFamilies
    .filter((family) => family.status === 'draft')
    .map((family) => family.slug));
  const mutableFamilyIds = new Set(existingFamilies
    .filter((family) => family.status === 'draft')
    .map((family) => family.id));
  const protectedSlugs = new Set(existingFamilies
    .filter((family) => family.status !== 'draft')
    .map((family) => family.slug));
  const draftFamilies = TECHNICAL_CORE_120_DRAFTS.filter((family) => !protectedSlugs.has(family.slug));

  const familyRows = draftFamilies.map((family) => ({
    id: family.id,
    slug: family.slug,
    primary_concept_id: family.primaryConceptId,
    topic: family.topic,
    difficulty: family.difficulty,
    cognitive_operation: family.cognitiveOperation,
    learning_objectives: family.learningObjectives,
    variant_coverage: family.variantCoverage,
    status: 'draft',
    bank_reliability: 'bank_style',
    bank_name: null,
    independent_report_count: 0,
    recruiting_cycle_count: 0,
    last_report_date: null,
    author_id: null,
  }));
  const { error: familyError } = await supabase.from('technical_item_families').upsert(familyRows, { onConflict: 'id' });
  if (familyError) throw new Error(`Could not seed draft item families: ${familyError.message}`);

  const refreshedFamilyIds = draftFamilies.filter((family) => mutableFamilyIds.has(family.id)).map((family) => family.id);
  if (refreshedFamilyIds.length) {
    const { error: staleRelationshipError } = await supabase.from('technical_family_concepts')
      .delete().in('family_id', refreshedFamilyIds).eq('relationship', 'prerequisite');
    if (staleRelationshipError) throw new Error(`Could not remove stale family prerequisites: ${staleRelationshipError.message}`);
  }

  const relationshipRows = draftFamilies.flatMap((family) => family.prerequisiteConceptIds.map((conceptId) => ({
    family_id: family.id,
    concept_id: conceptId,
    relationship: 'prerequisite',
  })));
  if (relationshipRows.length) {
    const { error: relationshipError } = await supabase.from('technical_family_concepts').upsert(relationshipRows, {
      onConflict: 'family_id,concept_id,relationship',
    });
    if (relationshipError) throw new Error(`Could not seed family prerequisites: ${relationshipError.message}`);
  }

  const questionRows = draftFamilies.map((family) => ({
    id: family.questionVersion.id,
    family_id: family.id,
    version: family.questionVersion.version,
    status: 'draft',
    prompt_template: family.questionVersion.promptTemplate,
    short_prompt_template: null,
    followup_prompt_templates: family.questionVersion.followupPromptTemplates,
    jurisdiction: family.questionVersion.jurisdiction,
    currency: family.questionVersion.currency,
    interview_rounds: ['first_round', 'superday'],
    interviewer_levels: ['analyst', 'associate', 'vp'],
    calculator_policy: family.questionVersion.calculatorPolicy,
    expected_duration_min_seconds: family.questionVersion.expectedAnswerDurationSeconds.minimum,
    expected_duration_target_seconds: family.questionVersion.expectedAnswerDurationSeconds.target,
    expected_duration_max_seconds: family.questionVersion.expectedAnswerDurationSeconds.maximum,
    assumptions: family.questionVersion.assumptions,
    effective_from: accessedAt,
    effective_to: null,
    content_hash: family.questionVersion.contentHash,
    change_reason: 'Initial independently authored Technical Core 120 draft; requires technical, realism, provenance, and copyright review before publication.',
    authored_by: null,
    approved_by: null,
    approved_at: null,
  }));
  const { error: questionError } = await supabase.from('technical_question_versions').upsert(questionRows, { onConflict: 'id' });
  if (questionError) throw new Error(`Could not seed draft question versions: ${questionError.message}`);

  const rubricRows = draftFamilies.map((family) => ({
    id: family.rubricVersion.id,
    family_id: family.id,
    version: family.rubricVersion.version,
    status: 'draft',
    answer_outline: family.rubricVersion.answerOutline,
    must_hit_points: family.rubricVersion.mustHitPoints,
    bonus_points: family.rubricVersion.bonusPoints,
    fatal_errors: family.rubricVersion.fatalErrors,
    accepted_variants: family.rubricVersion.acceptedVariants,
    common_misconceptions: family.rubricVersion.commonMisconceptions,
    deterministic_checks: family.rubricVersion.deterministicChecks,
    followup_tree: family.rubricVersion.followupTree,
    content_hash: family.rubricVersion.contentHash,
    change_reason: 'Initial independently authored answer rubric; expert calibration required.',
    authored_by: null,
    approved_by: null,
    approved_at: null,
  }));
  const { error: rubricError } = await supabase.from('technical_rubric_versions').upsert(rubricRows, { onConflict: 'id' });
  if (rubricError) throw new Error(`Could not seed draft rubric versions: ${rubricError.message}`);

  const parameterRows = draftFamilies.map((family) => ({
    id: family.parameterSpec.id,
    family_id: family.id,
    version: family.parameterSpec.version,
    seed_version: family.parameterSpec.seedVersion,
    status: 'draft',
    parameters: family.parameterSpec.parameters,
    derived_values: family.parameterSpec.derivedValues,
    constraints: family.parameterSpec.constraints,
    transformation_rules: family.parameterSpec.transformationRules,
    validation_instance_count: 0,
    validation_failure_count: 0,
    last_validated_at: null,
    content_hash: family.parameterSpec.contentHash,
    authored_by: null,
    approved_by: null,
    approved_at: null,
  }));
  const { error: parameterError } = await supabase.from('technical_parameter_specs').upsert(parameterRows, { onConflict: 'id' });
  if (parameterError) throw new Error(`Could not seed draft parameter specs: ${parameterError.message}`);

  const sourceLinkRows = draftFamilies.flatMap((family) => TECHNICAL_CORE_RESEARCH_SOURCES.map((source, sourceIndex) => ({
    question_version_id: family.questionVersion.id,
    source_id: source.id,
    claim_supported: 'Coverage research only; this source does not support published wording or answer content.',
    source_location: TECHNICAL_CORE_RESEARCH_SECTIONS[family.topic][sourceIndex],
  })));
  const refreshedQuestionIds = draftFamilies
    .filter((family) => mutableFamilyIds.has(family.id))
    .map((family) => family.questionVersion.id);
  if (refreshedQuestionIds.length) {
    const { error: staleSourceLinkError } = await supabase.from('technical_question_source_links')
      .delete().in('question_version_id', refreshedQuestionIds);
    if (staleSourceLinkError) throw new Error(`Could not remove stale draft source links: ${staleSourceLinkError.message}`);
  }
  const { error: sourceLinkError } = await supabase.from('technical_question_source_links').upsert(sourceLinkRows, {
    onConflict: 'question_version_id,source_id,claim_supported',
  });
  if (sourceLinkError) throw new Error(`Could not seed draft source links: ${sourceLinkError.message}`);

  console.log(`Seeded ${conceptRows.length} concepts, ${edgeRows.length} prerequisite edges, ${misconceptionRows.length} misconceptions, and ${draftFamilies.length} Technical Core question-and-answer drafts.`);
  if (protectedSlugs.size) console.log(`Skipped ${protectedSlugs.size} non-draft families to preserve reviewed content.`);
  if (mutableSlugs.size) console.log(`Refreshed ${mutableSlugs.size} existing draft families.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
