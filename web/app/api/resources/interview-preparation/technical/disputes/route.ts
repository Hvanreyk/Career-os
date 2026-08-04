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
  const { data: rows, error } = await context.service.rpc('technical_submit_dispute', {
    p_user_id: context.user.id,
    p_attempt_id: attempt.id,
    p_reason_code: parsed.data.reasonCode,
    p_description: parsed.data.description,
  });
  const dispute = Array.isArray(rows) ? rows[0] : rows;
  if (error || !dispute) return NextResponse.json({ error: 'Could not submit dispute' }, { status: 500 });
  await recordTechnicalEvent(context, 'technical_dispute_submitted', { reason_code: parsed.data.reasonCode });
  return NextResponse.json({ dispute }, { status: 201 });
}
