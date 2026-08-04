import { NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { getRequestUser } from '@/lib/auth';
import { resourceHasCapability } from '@/lib/resources/catalog';
import { createServiceClient } from '@/lib/supabase/server';
import { calculateConceptMastery } from '@trajectoryos/core/interview/mastery';
import type { VariantType } from '@trajectoryos/core/interview/types';

export const INTERVIEW_RESOURCE_SLUG = 'interview-preparation';
export const TECHNICAL_CAPABILITY = 'question-bank';

type ServiceClient = ReturnType<typeof createServiceClient>;

export interface TechnicalApiContext {
  user: User;
  service: ServiceClient;
  course: { id: string; slug: string };
}

export type TechnicalContextResult =
  | { context: TechnicalApiContext; response?: never }
  | { context?: never; response: NextResponse };

export async function getTechnicalApiContext(): Promise<TechnicalContextResult> {
  const user = await getRequestUser();
  if (!user) return { response: NextResponse.json({ error: 'Unauthorised' }, { status: 401 }) };
  if (!resourceHasCapability(INTERVIEW_RESOURCE_SLUG, TECHNICAL_CAPABILITY)) {
    return { response: NextResponse.json({ error: 'Technical practice is unavailable' }, { status: 404 }) };
  }
  const service = createServiceClient();
  const { data: course } = await service.from('courses')
    .select('id, slug, status').eq('slug', INTERVIEW_RESOURCE_SLUG).maybeSingle();
  if (!course || course.status !== 'published') {
    return { response: NextResponse.json({ error: 'Technical practice is not published' }, { status: 404 }) };
  }
  return { context: { user, service, course: { id: course.id, slug: course.slug } } };
}

export async function hasTechnicalSubscription(context: TechnicalApiContext): Promise<boolean> {
  // Testing is open by default. Billing must be deliberately enabled for a
  // future commercial release; absent/misconfigured billing never blocks QA.
  if (process.env.INTERVIEW_BILLING_ENABLED !== 'true') return true;
  const now = new Date().toISOString();
  const { data } = await context.service.from('resource_entitlements')
    .select('id, status, ends_at')
    .eq('user_id', context.user.id)
    .eq('resource_slug', INTERVIEW_RESOURCE_SLUG)
    .eq('capability', TECHNICAL_CAPABILITY)
    .in('status', ['active', 'grace']);
  return (data ?? []).some((entitlement) => !entitlement.ends_at || entitlement.ends_at > now);
}

export async function recordTechnicalEvent(
  context: TechnicalApiContext,
  eventName: string,
  properties: Record<string, string | number | boolean | null> = {},
) {
  const { error } = await context.service.from('product_events').insert({
    user_id: context.user.id,
    event_name: eventName,
    resource_slug: INTERVIEW_RESOURCE_SLUG,
    properties,
  });
  if (error) console.error(`technical event insert failed (${eventName}):`, error.message);
}

export async function refreshConceptMastery(context: TechnicalApiContext, conceptId: string) {
  const { data: families } = await context.service.from('technical_item_families')
    .select('id, difficulty').eq('primary_concept_id', conceptId);
  const difficultyByFamily = new Map((families ?? []).map((family) => [family.id, family.difficulty]));
  if (!difficultyByFamily.size) return null;
  const { data: instances } = await context.service.from('technical_question_instances')
    .select('id, family_id, variant, session_id, created_at')
    .eq('user_id', context.user.id).in('family_id', [...difficultyByFamily.keys()]);
  const instanceById = new Map((instances ?? []).map((instance) => [instance.id, instance]));
  if (!instanceById.size) return null;
  const { data: attempts } = await context.service.from('technical_attempts')
    .select('id, instance_id, submitted_at, status').eq('user_id', context.user.id)
    .in('instance_id', [...instanceById.keys()]).neq('status', 'void');
  const attemptIds = (attempts ?? []).map((attempt) => attempt.id);
  if (!attemptIds.length) return null;
  const [{ data: evidence }, { data: misconceptions }] = await Promise.all([
    context.service.from('technical_attempt_evidence').select('attempt_id, classification').in('attempt_id', attemptIds),
    context.service.from('technical_attempt_misconceptions').select('attempt_id, misconception_code, status').in('attempt_id', attemptIds),
  ]);
  const evidenceByAttempt = new Map<string, string[]>();
  for (const row of evidence ?? []) evidenceByAttempt.set(row.attempt_id, [...(evidenceByAttempt.get(row.attempt_id) ?? []), row.classification]);
  const fatalByAttempt = new Map<string, string[]>();
  for (const row of misconceptions ?? []) {
    if (!['confirmed', 'possible'].includes(row.status)) continue;
    fatalByAttempt.set(row.attempt_id, [...(fatalByAttempt.get(row.attempt_id) ?? []), row.misconception_code]);
  }
  const mastery = calculateConceptMastery((attempts ?? []).flatMap((attempt) => {
    const instance = instanceById.get(attempt.instance_id);
    if (!instance) return [];
    const labels = evidenceByAttempt.get(attempt.id) ?? [];
    return [{
      attemptedAt: attempt.submitted_at,
      correct: labels.length > 0 && labels.every((label) => label === 'hit'),
      useful: labels.length > 0,
      variant: instance.variant as VariantType,
      difficulty: difficultyByFamily.get(instance.family_id) as 'foundation' | 'interview_ready' | 'advanced',
      sessionId: instance.session_id,
      fatalMisconceptionCodes: fatalByAttempt.get(attempt.id) ?? [],
    }];
  }));
  await context.service.from('technical_concept_mastery').upsert({
    user_id: context.user.id,
    concept_id: conceptId,
    mastery_label: mastery.label,
    evidence_confidence: mastery.confidence,
    useful_attempts: mastery.usefulAttempts,
    correct_attempts: mastery.correctAttempts,
    variant_count: mastery.variantCount,
    unresolved_fatal_misconceptions: mastery.unresolvedFatalMisconceptions,
    last_assessed_at: new Date().toISOString(),
  }, { onConflict: 'user_id,concept_id' });
  return mastery;
}
