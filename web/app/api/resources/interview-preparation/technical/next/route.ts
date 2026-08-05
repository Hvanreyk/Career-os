import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { generateQuestionInstance } from '@trajectoryos/core/interview/generator';
import type { GeneratableTechnicalFamily, VariantType } from '@trajectoryos/core/interview/types';
import {
  getTechnicalApiContext,
  hasTechnicalSubscription,
  recordTechnicalEvent,
} from '@/lib/interview/server';

const QuerySchema = z.object({
  mode: z.enum(['diagnostic', 'practice']).default('diagnostic'),
  concept: z.string().regex(/^[AEVFMLCKJ][0-9]{2}$/).optional(),
  topic: z.enum(['accounting', 'enterprise_value', 'valuation', 'dcf', 'ma', 'lbo', 'debt_credit', 'capital_markets', 'applied_judgement']).optional(),
  variant: z.enum(['standard', 'reversed', 'numerical', 'assumption_changed', 'applied_company', 'explain_simply', 'followup_chain']).optional(),
});

function asGeneratableFamily(
  family: Record<string, unknown>,
  question: Record<string, unknown>,
  rubric: Record<string, unknown>,
  parameter: Record<string, unknown>,
): GeneratableTechnicalFamily {
  return {
    id: String(family.id),
    slug: String(family.slug),
    variantCoverage: (family.variant_coverage ?? []) as VariantType[],
    questionVersion: {
      version: Number(question.version),
      promptTemplate: String(question.prompt_template),
      shortPromptTemplate: question.short_prompt_template ? String(question.short_prompt_template) : undefined,
      followupPromptTemplates: (question.followup_prompt_templates ?? []) as string[],
      jurisdiction: question.jurisdiction as 'AU' | 'GLOBAL_IFRS' | 'US_GAAP',
      currency: question.currency as 'AUD' | 'USD' | 'GBP' | 'NONE',
      effectiveFrom: String(question.effective_from),
      effectiveTo: question.effective_to ? String(question.effective_to) : null,
      interviewRounds: question.interview_rounds as GeneratableTechnicalFamily['questionVersion']['interviewRounds'],
      interviewerLevels: question.interviewer_levels as GeneratableTechnicalFamily['questionVersion']['interviewerLevels'],
      calculatorPolicy: question.calculator_policy as GeneratableTechnicalFamily['questionVersion']['calculatorPolicy'],
      expectedAnswerDurationSeconds: {
        minimum: Number(question.expected_duration_min_seconds),
        target: Number(question.expected_duration_target_seconds),
        maximum: Number(question.expected_duration_max_seconds),
      },
      assumptions: (question.assumptions ?? []) as GeneratableTechnicalFamily['questionVersion']['assumptions'],
    },
    parameterSpec: {
      seedVersion: Number(parameter.seed_version),
      parameters: (parameter.parameters ?? []) as GeneratableTechnicalFamily['parameterSpec']['parameters'],
      derivedValues: (parameter.derived_values ?? []) as GeneratableTechnicalFamily['parameterSpec']['derivedValues'],
      constraints: (parameter.constraints ?? []) as GeneratableTechnicalFamily['parameterSpec']['constraints'],
      transformationRules: (parameter.transformation_rules ?? []) as GeneratableTechnicalFamily['parameterSpec']['transformationRules'],
    },
    rubricVersion: {
      version: Number(rubric.version),
      answerOutline: [], mustHitPoints: [], bonusPoints: [], fatalErrors: [], acceptedVariants: [],
      commonMisconceptions: [], deterministicChecks: [], followupTree: [],
    },
  };
}

export async function GET(request: Request) {
  const result = await getTechnicalApiContext();
  if (result.response) return result.response;
  const parsed = QuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid question request' }, { status: 400 });
  const { context } = result;
  const fullAccess = await hasTechnicalSubscription(context);
  if (parsed.data.mode === 'practice' && !fullAccess) {
    return NextResponse.json({ error: 'Full Technical Core access is unavailable' }, { status: 403 });
  }

  let diagnosticRunId: string | null = null;
  if (parsed.data.mode === 'diagnostic') {
    const { data: activeRun } = await context.service.from('technical_diagnostic_runs')
      .select('id').eq('user_id', context.user.id).eq('status', 'in_progress')
      .eq('is_free_diagnostic', true).order('started_at', { ascending: false }).limit(1).maybeSingle();
    diagnosticRunId = activeRun?.id ?? null;
    if (!diagnosticRunId) {
      if (!fullAccess) {
        const { data: completedRun, error: completedRunError } = await context.service.from('technical_diagnostic_runs')
          .select('id').eq('user_id', context.user.id).eq('status', 'completed')
          .eq('is_free_diagnostic', true).limit(1).maybeSingle();
        if (completedRunError) return NextResponse.json({ error: 'Could not check diagnostic access' }, { status: 500 });
        if (completedRun) return NextResponse.json({ complete: true, exhausted: true, limit: 12 });
      }
      const { data: created, error } = await context.service.from('technical_diagnostic_runs')
        .insert({ user_id: context.user.id, is_free_diagnostic: true }).select('id').single();
      if (error || !created) return NextResponse.json({ error: 'Could not start diagnostic' }, { status: 500 });
      diagnosticRunId = created.id;
    }
    const { count } = await context.service.from('technical_question_instances')
      .select('id', { count: 'exact', head: true }).eq('user_id', context.user.id).eq('session_id', diagnosticRunId);
    if ((count ?? 0) >= 12) {
      await context.service.from('technical_diagnostic_runs').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', diagnosticRunId);
      const { data: masteryRows } = await context.service.from('technical_concept_mastery')
        .select('concept_id, mastery_label, evidence_confidence, useful_attempts, correct_attempts, unresolved_fatal_misconceptions')
        .eq('user_id', context.user.id);
      if (masteryRows?.length) await context.service.from('technical_diagnostic_results').upsert(
        masteryRows.map((row) => ({
          diagnostic_run_id: diagnosticRunId,
          user_id: context.user.id,
          concept_id: row.concept_id,
          mastery_label: row.mastery_label,
          evidence_confidence: row.evidence_confidence,
          useful_attempts: row.useful_attempts,
          correct_attempts: row.correct_attempts,
          misconception_codes: row.unresolved_fatal_misconceptions,
        })),
        { onConflict: 'diagnostic_run_id,concept_id' },
      );
      return NextResponse.json({ complete: true, limit: 12 });
    }
  }

  let familyQuery = context.service.from('technical_item_families')
    .select('id, slug, primary_concept_id, topic, difficulty, variant_coverage')
    .eq('status', 'published');
  if (parsed.data.concept) familyQuery = familyQuery.eq('primary_concept_id', parsed.data.concept);
  if (parsed.data.topic) familyQuery = familyQuery.eq('topic', parsed.data.topic);
  const { data: families, error: familyError } = await familyQuery.limit(250);
  if (familyError) return NextResponse.json({ error: 'Could not load the question bank' }, { status: 500 });
  const eligible = (families ?? []).filter((family) =>
    !parsed.data.variant || (family.variant_coverage as string[]).includes(parsed.data.variant));
  if (!eligible.length) return NextResponse.json({ error: 'No approved questions match this practice request' }, { status: 404 });

  const conceptIds = [...new Set(eligible.map((family) => family.primary_concept_id))];
  const [{ data: masteryRows }, { data: edges }, { data: recentInstances }] = await Promise.all([
    context.service.from('technical_concept_mastery')
      .select('concept_id, mastery_label, unresolved_fatal_misconceptions')
      .eq('user_id', context.user.id).in('concept_id', conceptIds),
    context.service.from('technical_concept_edges')
      .select('concept_id, prerequisite_concept_id').in('concept_id', conceptIds),
    context.service.from('technical_question_instances')
      .select('family_id, variant').eq('user_id', context.user.id)
      .order('created_at', { ascending: false }).limit(100),
  ]);
  const masteryByConcept = new Map((masteryRows ?? []).map((row) => [row.concept_id, row]));
  const prerequisitesByConcept = new Map<string, string[]>();
  for (const edge of edges ?? []) prerequisitesByConcept.set(edge.concept_id, [
    ...(prerequisitesByConcept.get(edge.concept_id) ?? []), edge.prerequisite_concept_id,
  ]);
  const familyExposure = new Map<string, number>();
  const variantExposure = new Map<string, number>();
  for (const instance of recentInstances ?? []) {
    familyExposure.set(instance.family_id, (familyExposure.get(instance.family_id) ?? 0) + 1);
    variantExposure.set(`${instance.family_id}:${instance.variant}`, (variantExposure.get(`${instance.family_id}:${instance.variant}`) ?? 0) + 1);
  }
  const labelWeight: Record<string, number> = {
    not_assessed: 0, emerging: 1, developing: 2, interview_ready: 4, durable: 6,
  };
  const ranked = eligible.map((candidate) => {
    const own = masteryByConcept.get(candidate.primary_concept_id);
    const weakPrerequisiteCount = (prerequisitesByConcept.get(candidate.primary_concept_id) ?? []).filter((prerequisiteId) => {
      const prerequisite = masteryByConcept.get(prerequisiteId);
      return !prerequisite || ['not_assessed', 'emerging'].includes(prerequisite.mastery_label)
        || (prerequisite.unresolved_fatal_misconceptions as string[]).length > 0;
    }).length;
    return {
      candidate,
      priority: (labelWeight[own?.mastery_label ?? 'not_assessed'] ?? 0) * 10
        + weakPrerequisiteCount * 20
        + (familyExposure.get(candidate.id) ?? 0) * 3,
    };
  }).sort((left, right) => left.priority - right.priority || left.candidate.id.localeCompare(right.candidate.id));
  const family = ranked[0]!.candidate;
  const [{ data: question }, { data: rubric }, { data: parameter }] = await Promise.all([
    context.service.from('technical_question_versions').select('*').eq('family_id', family.id).eq('status', 'approved').order('version', { ascending: false }).limit(1).maybeSingle(),
    context.service.from('technical_rubric_versions').select('*').eq('family_id', family.id).eq('status', 'approved').order('version', { ascending: false }).limit(1).maybeSingle(),
    context.service.from('technical_parameter_specs').select('*').eq('family_id', family.id).eq('status', 'approved').order('version', { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (!question || !rubric || !parameter) return NextResponse.json({ error: 'Approved family is incomplete' }, { status: 409 });

  const variants = family.variant_coverage as VariantType[];
  const variant = parsed.data.variant ?? [...variants].sort((left, right) =>
    (variantExposure.get(`${family.id}:${left}`) ?? 0) - (variantExposure.get(`${family.id}:${right}`) ?? 0)
    || left.localeCompare(right))[0] ?? 'standard';
  const seed = randomUUID();
  let instance;
  try { instance = generateQuestionInstance(asGeneratableFamily(family, question, rubric, parameter), seed, variant); }
  catch (error) {
    console.error('technical generator failed:', error);
    return NextResponse.json({ error: 'Question generation failed validation' }, { status: 500 });
  }
  const sessionId = diagnosticRunId ?? randomUUID();
  const { data: stored, error: insertError } = await context.service.from('technical_question_instances').insert({
    user_id: context.user.id,
    family_id: family.id,
    question_version_id: question.id,
    rubric_version_id: rubric.id,
    parameter_spec_id: parameter.id,
    seed,
    seed_version: instance.seedVersion,
    variant,
    resolved_parameters: instance.parameters,
    derived_values: instance.derivedValues,
    rendered_prompt: instance.prompt,
    question_hash: instance.questionHash,
    session_id: sessionId,
  }).select('id').single();
  if (insertError || !stored) return NextResponse.json({ error: 'Could not create question instance' }, { status: 500 });
  await recordTechnicalEvent(context, 'technical_question_started', {
    family_id: family.id, concept_id: family.primary_concept_id, variant, mode: parsed.data.mode,
  });
  return NextResponse.json({
    instance: {
      id: stored.id,
      conceptId: family.primary_concept_id,
      topic: family.topic,
      difficulty: family.difficulty,
      variant,
      prompt: instance.prompt,
      expectedDurationSeconds: {
        minimum: question.expected_duration_min_seconds,
        target: question.expected_duration_target_seconds,
        maximum: question.expected_duration_max_seconds,
      },
      calculatorPolicy: question.calculator_policy,
      mode: parsed.data.mode,
      diagnosticPosition: parsed.data.mode === 'diagnostic' ? undefined : null,
    },
    access: { fullAccess, billingEnabled: process.env.INTERVIEW_BILLING_ENABLED === 'true', diagnosticLimit: 12 },
  });
}
