import { NextResponse } from 'next/server';
import { z } from 'zod';
import { gradeDeterministicAnswer } from '@trajectoryos/core/interview/grading';
import type { TechnicalItemFamily } from '@trajectoryos/core/interview/types';
import {
  generateInterviewGrade,
  INTERVIEW_GRADER_VERSION,
  type InterviewQualitativeGrade,
} from '@trajectoryos/core/llm/interview-grade';
import {
  getTechnicalApiContext,
  recordTechnicalEvent,
  refreshConceptMastery,
} from '@/lib/interview/server';

const AttemptSchema = z.object({
  instanceId: z.string().uuid(),
  answerMode: z.enum(['text', 'audio']),
  answerText: z.string().trim().min(1).max(20_000).optional(),
  transcript: z.string().trim().min(1).max(20_000).optional(),
  transcriptModel: z.string().trim().max(120).optional(),
  durationSeconds: z.number().int().min(0).max(7200).optional(),
}).refine((answer) => Boolean(answer.answerText || answer.transcript), {
  message: 'An answer or transcript is required',
});

export async function POST(request: Request) {
  const result = await getTechnicalApiContext();
  if (result.response) return result.response;
  const parsed = AttemptSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid attempt', issues: parsed.error.flatten() }, { status: 400 });
  const { context } = result;
  const { data: instance } = await context.service.from('technical_question_instances')
    .select('id, family_id, question_version_id, rubric_version_id, resolved_parameters, derived_values, rendered_prompt, variant, session_id')
    .eq('id', parsed.data.instanceId).eq('user_id', context.user.id).maybeSingle();
  if (!instance) return NextResponse.json({ error: 'Question instance not found' }, { status: 404 });
  const [{ data: family }, { data: rubric }, { data: questionVersion }] = await Promise.all([
    context.service.from('technical_item_families').select('primary_concept_id, difficulty').eq('id', instance.family_id).maybeSingle(),
    context.service.from('technical_rubric_versions').select('must_hit_points, bonus_points, fatal_errors, accepted_variants, common_misconceptions, deterministic_checks, followup_tree').eq('id', instance.rubric_version_id).maybeSingle(),
    context.service.from('technical_question_versions').select('expected_duration_min_seconds, expected_duration_target_seconds, expected_duration_max_seconds').eq('id', instance.question_version_id).maybeSingle(),
  ]);
  if (!family || !rubric || !questionVersion) return NextResponse.json({ error: 'Question grading configuration is unavailable' }, { status: 409 });

  const answer = parsed.data.transcript ?? parsed.data.answerText ?? '';
  const deterministic = gradeDeterministicAnswer(
    answer,
    { ...(instance.resolved_parameters as Record<string, string>), ...(instance.derived_values as Record<string, string>) },
    (rubric.deterministic_checks ?? []) as TechnicalItemFamily['rubricVersion']['deterministicChecks'],
    (rubric.fatal_errors ?? []) as TechnicalItemFamily['rubricVersion']['fatalErrors'],
  );
  const isDeterministicallyGraded = deterministic.classification !== 'not_deterministic';
  const { data: attempt, error: attemptError } = await context.service.from('technical_attempts').insert({
    instance_id: instance.id,
    user_id: context.user.id,
    answer_mode: parsed.data.answerMode,
    answer_text: parsed.data.answerText,
    transcript: parsed.data.transcript,
    transcript_model: parsed.data.transcriptModel,
    duration_seconds: parsed.data.durationSeconds,
    status: 'grading',
    grader_stage: 'deterministic_qualitative',
    grader_prompt_version: INTERVIEW_GRADER_VERSION,
  }).select('id').single();
  if (attemptError || !attempt) return NextResponse.json({ error: 'Could not save attempt' }, { status: 500 });

  if (deterministic.checks.length) {
    await context.service.from('technical_attempt_evidence').insert(deterministic.checks.map((check) => ({
      attempt_id: attempt.id,
      user_id: context.user.id,
      rubric_point_code: `deterministic:${check.code}`,
      classification: check.status === 'pass' ? 'hit' : check.status === 'fail' ? 'missed' : 'not_applicable',
      confidence: 1,
      deterministic_observation: { observed: check.observed, unit: check.expectedUnit },
    })));
  }
  if (deterministic.misconceptionCodes.length) {
    await context.service.from('technical_attempt_misconceptions').insert(deterministic.misconceptionCodes.map((code) => ({
      attempt_id: attempt.id,
      user_id: context.user.id,
      misconception_code: code,
      confidence: 1,
      detection_source: 'deterministic',
      status: 'confirmed',
    })));
  }
  let qualitative: InterviewQualitativeGrade | null = null;
  let qualitativeModel: string | null = null;
  try {
    const generated = await generateInterviewGrade({
      questionPrompt: instance.rendered_prompt,
      answer,
      durationSeconds: parsed.data.durationSeconds ?? null,
      expectedDurationSeconds: {
        minimum: questionVersion.expected_duration_min_seconds,
        target: questionVersion.expected_duration_target_seconds,
        maximum: questionVersion.expected_duration_max_seconds,
      },
      mustHitPoints: (rubric.must_hit_points ?? []) as TechnicalItemFamily['rubricVersion']['mustHitPoints'],
      bonusPoints: (rubric.bonus_points ?? []) as TechnicalItemFamily['rubricVersion']['bonusPoints'],
      fatalErrors: (rubric.fatal_errors ?? []) as TechnicalItemFamily['rubricVersion']['fatalErrors'],
      acceptedVariants: (rubric.accepted_variants ?? []) as TechnicalItemFamily['rubricVersion']['acceptedVariants'],
      commonMisconceptions: (rubric.common_misconceptions ?? []) as TechnicalItemFamily['rubricVersion']['commonMisconceptions'],
      followupTree: (rubric.followup_tree ?? []) as TechnicalItemFamily['rubricVersion']['followupTree'],
    });
    qualitative = generated.grade;
    qualitativeModel = generated.model;
    if (qualitative.evidence.length) await context.service.from('technical_attempt_evidence').insert(
      qualitative.evidence.map((evidence) => ({
        attempt_id: attempt.id,
        user_id: context.user.id,
        rubric_point_code: evidence.rubricPointCode,
        classification: evidence.classification,
        confidence: evidence.confidence,
        evidence_excerpt: evidence.evidenceExcerpt,
      })),
    );
    const deterministicCodes = new Set(deterministic.misconceptionCodes);
    const qualitativeMisconceptions = qualitative.misconceptions.filter((entry) => !deterministicCodes.has(entry.misconceptionCode));
    if (qualitativeMisconceptions.length) await context.service.from('technical_attempt_misconceptions').insert(
      qualitativeMisconceptions.map((misconception) => ({
        attempt_id: attempt.id,
        user_id: context.user.id,
        misconception_code: misconception.misconceptionCode,
        confidence: misconception.confidence,
        detection_source: 'ai',
        status: misconception.confidence >= 0.85 ? 'confirmed' : 'possible',
      })),
    );
  } catch (error) {
    console.error('technical qualitative grading failed:', error instanceof Error ? error.message : error);
  }
  await context.service.from('technical_attempts').update({
    status: qualitative || isDeterministicallyGraded ? 'graded' : 'submitted',
    grader_model: qualitativeModel,
    graded_at: qualitative || isDeterministicallyGraded ? new Date().toISOString() : null,
  }).eq('id', attempt.id);
  const mastery = await refreshConceptMastery(context, family.primary_concept_id);
  await recordTechnicalEvent(context, 'technical_attempt_submitted', {
    family_id: instance.family_id,
    concept_id: family.primary_concept_id,
    variant: instance.variant,
    answer_mode: parsed.data.answerMode,
    deterministic_classification: deterministic.classification,
  });
  return NextResponse.json({
    attemptId: attempt.id,
    feedback: {
      stage: 'deterministic_qualitative',
      deterministic,
      qualitative,
      qualitativeStatus: qualitative ? 'completed' : isDeterministicallyGraded ? 'numeric_result_available' : 'awaiting_rubric_classification',
      mastery,
      disclaimer: 'This is evidence-linked practice feedback, not a percentile or recruiting outcome prediction.',
    },
  }, { status: 201 });
}
