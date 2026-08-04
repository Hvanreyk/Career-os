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
  const { data: attempt, error: attemptError } = await context.service.from('technical_attempts').select('id, status')
    .eq('id', parsed.data.attemptId).eq('user_id', context.user.id).maybeSingle();
  if (attemptError) return NextResponse.json({ error: 'Could not load attempt' }, { status: 500 });
  if (!attempt) return NextResponse.json({ error: 'Attempt not found' }, { status: 404 });
  if (attempt.status !== 'graded') {
    return NextResponse.json({ error: 'Only graded attempts can be disputed' }, { status: 409 });
  }
  const { data: activeDispute, error: activeDisputeError } = await context.service.from('technical_disputes')
    .select('id').eq('attempt_id', attempt.id).eq('user_id', context.user.id)
    .in('status', ['open', 'reviewing']).limit(1).maybeSingle();
  if (activeDisputeError) return NextResponse.json({ error: 'Could not check dispute status' }, { status: 500 });
  if (activeDispute) return NextResponse.json({ error: 'A dispute is already open for this attempt' }, { status: 409 });
  const { data: rows, error } = await context.service.rpc('technical_submit_dispute', {
    p_user_id: context.user.id,
    p_attempt_id: attempt.id,
    p_reason_code: parsed.data.reasonCode,
    p_description: parsed.data.description,
  });
  const dispute = Array.isArray(rows) ? rows[0] : rows;
  if (error?.code === '23505' || error?.message.includes('DISPUTE_ALREADY_OPEN') || error?.message.includes('ATTEMPT_NOT_ELIGIBLE')) {
    return NextResponse.json({ error: 'A dispute is already open or the attempt is no longer eligible' }, { status: 409 });
  }
  if (error || !dispute) return NextResponse.json({ error: 'Could not submit dispute' }, { status: 500 });
  await recordTechnicalEvent(context, 'technical_dispute_submitted', { reason_code: parsed.data.reasonCode });
  return NextResponse.json({ dispute }, { status: 201 });
}
