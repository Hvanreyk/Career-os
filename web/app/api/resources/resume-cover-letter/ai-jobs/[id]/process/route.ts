import { NextResponse } from 'next/server';
import { z } from 'zod';
import { generateResumeExtract } from '@trajectoryos/core/llm/resume-extract';
import type { ResumeAiJobKind } from '@trajectoryos/core/resume/document';
import { getResumeApiContext, recordResumeEvent } from '@/lib/resume/server';

// Phase 2 of every resume AI flow (import / compose / improve / tailor):
// atomically claim the stored job via the leased claim RPC, run the matching
// generator, then flip processing → completed/error. The short lease means
// concurrent calls never duplicate model spend and an interrupted invocation
// can be resumed (same shape as /api/roadmaps/[id]/process).

interface GeneratorOutcome {
  output: Record<string, unknown>;
  model: string;
  usage: { input_tokens: number; output_tokens: number };
}

async function runGenerator(kind: ResumeAiJobKind, input: Record<string, unknown>): Promise<GeneratorOutcome> {
  switch (kind) {
    case 'import': {
      const result = await generateResumeExtract(String(input.text ?? ''));
      return { output: { document: result.document }, model: result.model, usage: result.usage };
    }
    case 'compose': {
      const { generateResumeCompose } = await import('@trajectoryos/core/llm/resume-compose');
      const result = await generateResumeCompose(input as never);
      return { output: { document: result.document }, model: result.model, usage: result.usage };
    }
    case 'improve': {
      const { generateResumeImprove } = await import('@trajectoryos/core/llm/resume-improve');
      const result = await generateResumeImprove(input as never);
      return { output: { ...result.improvement }, model: result.model, usage: result.usage };
    }
    case 'tailor': {
      const { generateResumeTailor } = await import('@trajectoryos/core/llm/resume-tailor');
      const result = await generateResumeTailor(input as never);
      return { output: { ...result.tailored }, model: result.model, usage: result.usage };
    }
  }
}

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await getResumeApiContext();
  if (result.response) return result.response;
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return NextResponse.json({ error: 'Invalid job' }, { status: 400 });
  const { context } = result;

  const { data: job, error: claimError } = await context.service
    .rpc('claim_resume_ai_job', { p_job_id: id, p_user_id: context.user.id })
    .maybeSingle();
  if (claimError) {
    console.error('resume ai job claim failed:', claimError);
    return NextResponse.json({ error: 'Failed to claim AI job' }, { status: 500 });
  }
  if (!job) {
    const { data: current } = await context.service.from('resume_ai_jobs')
      .select('status').eq('id', id).eq('user_id', context.user.id).maybeSingle();
    if (!current) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    if (current.status === 'completed') return NextResponse.json({ status: 'completed' });
    return NextResponse.json({ status: current.status }, { status: 202 });
  }

  const claimed = job as {
    id: string;
    kind: ResumeAiJobKind;
    input: Record<string, unknown>;
    processing_started_at: string;
  };
  // Gate the final write on this exact lease (status AND the claimed
  // timestamp), not just status='processing'. If the lease expired mid-call
  // and a second worker reclaimed the job, its processing_started_at will
  // differ, so this stale worker's update matches zero rows instead of
  // clobbering the newer attempt.
  try {
    const outcome = await runGenerator(claimed.kind, claimed.input);
    const { error: updateError } = await context.service.from('resume_ai_jobs')
      .update({
        output: outcome.output,
        model: outcome.model,
        input_tokens: outcome.usage.input_tokens,
        output_tokens: outcome.usage.output_tokens,
        status: 'completed',
        error_message: null,
      })
      .eq('id', id)
      .eq('user_id', context.user.id)
      .eq('status', 'processing')
      .eq('processing_started_at', claimed.processing_started_at);
    if (updateError) {
      console.error('Failed to save completed resume AI job:', updateError);
      return NextResponse.json({ error: 'Failed to save AI result' }, { status: 500 });
    }
    await recordResumeEvent(context, 'resume_ai_job_completed', {
      kind: claimed.kind, model: outcome.model,
    });
    return NextResponse.json({ status: 'completed' });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'AI generation failed';
    console.error('resume ai job error:', message);
    await context.service.from('resume_ai_jobs')
      .update({ status: 'error', error_message: message })
      .eq('id', id)
      .eq('user_id', context.user.id)
      .eq('status', 'processing')
      .eq('processing_started_at', claimed.processing_started_at);
    // Quota is NOT refunded here. The claim RPC allows reclaiming a job
    // already in 'error' status (so an interrupted/failed attempt can be
    // retried for free) — if a failure also refunded the quota, retrying
    // the same job to a later success would net a generation for $0, an
    // unlimited bypass of the daily limit. One created job always costs
    // exactly one quota unit, whatever its outcome; only a genuinely new
    // job (new input) claims quota again.
    await recordResumeEvent(context, 'resume_ai_job_failed', { kind: claimed.kind });
    return NextResponse.json({ error: 'AI generation failed', status: 'error' }, { status: 502 });
  }
}
