import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getTechnicalApiContext, recordTechnicalEvent } from '@/lib/interview/server';

const DisputeSchema = z.object({
  attemptId: z.string().uuid(),
  reasonCode: z.enum(['answer_key', 'accepted_variant', 'ambiguous_wording', 'grading', 'audio_transcription', 'other']),
  description: z.string().trim().min(10).max(4000),
});

export async function POST(request: Request) {
  const result = await getTechnicalApiContext();
  if (result.response) return result.response;
  const parsed = DisputeSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid dispute' }, { status: 400 });
  const { context } = result;
  const { data: attempt } = await context.service.from('technical_attempts').select('id')
    .eq('id', parsed.data.attemptId).eq('user_id', context.user.id).maybeSingle();
  if (!attempt) return NextResponse.json({ error: 'Attempt not found' }, { status: 404 });
  const { data, error } = await context.service.from('technical_disputes').insert({
    attempt_id: attempt.id,
    user_id: context.user.id,
    reason_code: parsed.data.reasonCode,
    description: parsed.data.description,
  }).select('id, status, created_at').single();
  if (error || !data) return NextResponse.json({ error: 'Could not submit dispute' }, { status: 500 });
  await context.service.from('technical_attempts').update({ status: 'disputed' }).eq('id', attempt.id);
  await recordTechnicalEvent(context, 'technical_dispute_submitted', { reason_code: parsed.data.reasonCode });
  return NextResponse.json({ dispute: data }, { status: 201 });
}
