import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getResumeApiContext } from '@/lib/resume/server';
import { RESUME_AI_JOB_COLUMNS } from '@/lib/resume/jobs';

/**
 * Returns the status — and, when completed, the output — of one of the
 * authenticated user's resume AI jobs.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await getResumeApiContext();
  if (result.response) return result.response;
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return NextResponse.json({ error: 'Invalid job' }, { status: 400 });
  const { context } = result;
  const { data: job } = await context.service.from('resume_ai_jobs')
    .select(RESUME_AI_JOB_COLUMNS)
    .eq('id', id)
    .eq('user_id', context.user.id)
    .maybeSingle();
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
  return NextResponse.json({ job });
}
