import { NextResponse } from 'next/server';
import type { ResumeAiJobKind } from '@trajectoryos/core/resume/document';
import {
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
 * user: identical live inputs return the existing job; otherwise a pending
 * job row is inserted.
 *
 * @returns `{ response }` with an HTTP error on infrastructure failure, or
 * `{ jobId, reused }` on success.
 */
export async function createResumeAiJob(
  context: ResumeApiContext,
  options: CreateJobOptions,
): Promise<{ jobId: string; reused: boolean; response?: never } | { response: NextResponse; jobId?: never; reused?: never }> {
  // generationVersion is folded into the hash (and stored alongside it in
  // the DB unique index) so a prompt/model upgrade never reuses a job
  // completed under an older generator version.
  const inputHash = hashResumeAiInput(stableStringify({
    generationVersion: options.generationVersion,
    input: options.input,
  }));

  const findExisting = () => context.service.from('resume_ai_jobs')
    .select('id, status')
    .eq('user_id', context.user.id)
    .eq('kind', options.kind)
    .eq('generation_version', options.generationVersion)
    .eq('input_hash', inputHash)
    .in('status', ['pending', 'processing', 'completed'])
    .maybeSingle();

  const { data: existing } = await findExisting();
  if (existing) return { jobId: existing.id, reused: true };

  const { data: job, error } = await context.service.from('resume_ai_jobs').insert({
    user_id: context.user.id,
    resume_id: options.resumeId ?? null,
    kind: options.kind,
    input: options.input,
    input_hash: inputHash,
    generation_version: options.generationVersion,
  }).select('id').single();

  if (error?.code === '23505') {
    // Lost a creation race — reuse the winner.
    const { data: raced } = await findExisting();
    if (raced) return { jobId: raced.id, reused: true };
    return { response: NextResponse.json({ error: 'Could not create AI job' }, { status: 500 }) };
  }
  if (error || !job) {
    return { response: NextResponse.json({ error: 'Could not create AI job' }, { status: 500 }) };
  }

  await recordResumeEvent(context, 'resume_ai_job_created', { kind: options.kind });
  return { jobId: job.id, reused: false };
}
