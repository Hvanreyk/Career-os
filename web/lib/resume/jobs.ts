import { NextResponse } from 'next/server';
import type { ResumeAiJobKind } from '@trajectoryos/core/resume/document';
import {
  getResumeAiDailyLimit,
  hashResumeAiInput,
  recordResumeEvent,
  type ResumeApiContext,
} from '@/lib/resume/server';

export const RESUME_AI_JOB_COLUMNS =
  'id, kind, status, output, error_message, created_at, updated_at';

interface CreateJobOptions {
  kind: ResumeAiJobKind;
  input: Record<string, unknown>;
  generationVersion: string;
  resumeId?: string | null;
}

/** JSON.stringify with sorted object keys so identical inputs hash identically. */
export function stableStringify(value: unknown): string {
  return JSON.stringify(value, (_key, val: unknown) => {
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      return Object.fromEntries(
        Object.entries(val as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)),
      );
    }
    return val;
  });
}

/**
 * Creates (or idempotently reuses) a resume AI job for the authenticated
 * user: identical live inputs return the existing job; otherwise the per-kind
 * Sydney-day quota is claimed and a pending job row is inserted.
 *
 * @returns `{ response }` with an HTTP error on quota/infrastructure failure,
 * or `{ jobId, reused }` on success.
 */
export async function createResumeAiJob(
  context: ResumeApiContext,
  options: CreateJobOptions,
): Promise<{ jobId: string; reused: boolean; response?: never } | { response: NextResponse; jobId?: never; reused?: never }> {
  const inputHash = hashResumeAiInput(stableStringify(options.input));

  const findExisting = () => context.service.from('resume_ai_jobs')
    .select('id, status')
    .eq('user_id', context.user.id)
    .eq('kind', options.kind)
    .eq('input_hash', inputHash)
    .in('status', ['pending', 'processing', 'completed'])
    .maybeSingle();

  const { data: existing } = await findExisting();
  if (existing) return { jobId: existing.id, reused: true };

  const limit = getResumeAiDailyLimit();
  const { data: quotaRows, error: quotaError } = await context.service.rpc('claim_resume_ai_quota', {
    p_user_id: context.user.id,
    p_kind: options.kind,
    p_limit: limit,
  });
  const quota = Array.isArray(quotaRows) ? quotaRows[0] : null;
  if (quotaError || !quota) {
    return { response: NextResponse.json({ error: 'Could not check AI quota' }, { status: 500 }) };
  }
  if (!quota.allowed) {
    return {
      response: NextResponse.json({
        error: `Daily ${options.kind} limit reached`,
        remaining: 0,
        resetsAt: quota.resets_at,
      }, { status: 429 }),
    };
  }

  const { data: job, error } = await context.service.from('resume_ai_jobs').insert({
    user_id: context.user.id,
    resume_id: options.resumeId ?? null,
    kind: options.kind,
    input: options.input,
    input_hash: inputHash,
    generation_version: options.generationVersion,
  }).select('id').single();

  if (error?.code === '23505') {
    // Lost a creation race — reuse the winner and hand back the claim.
    await context.service.rpc('release_resume_ai_quota', {
      p_user_id: context.user.id, p_kind: options.kind,
    });
    const { data: raced } = await findExisting();
    if (raced) return { jobId: raced.id, reused: true };
  }
  if (error || !job) {
    await context.service.rpc('release_resume_ai_quota', {
      p_user_id: context.user.id, p_kind: options.kind,
    });
    return { response: NextResponse.json({ error: 'Could not create AI job' }, { status: 500 }) };
  }

  await recordResumeEvent(context, 'resume_ai_job_created', { kind: options.kind });
  return { jobId: job.id, reused: false };
}
