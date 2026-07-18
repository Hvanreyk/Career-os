import { NextResponse } from 'next/server';
import { z } from 'zod';
import { computeCoverage, type CoverageReport } from '@trajectoryos/core/resume/coverage';
import { TailorOutputSchema } from '@trajectoryos/core/resume/document';
import { getResumeApiContext } from '@/lib/resume/server';
import { RESUME_AI_JOB_COLUMNS } from '@/lib/resume/jobs';

/**
 * Returns the status — and, when completed, the output — of one of the
 * authenticated user's resume AI jobs. For completed tailor jobs the JD
 * coverage report is computed deterministically here (never by the LLM)
 * and attached to the output.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await getResumeApiContext();
  if (result.response) return result.response;
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return NextResponse.json({ error: 'Invalid job' }, { status: 400 });
  const { context } = result;
  const { data: job, error } = await context.service.from('resume_ai_jobs')
    .select(RESUME_AI_JOB_COLUMNS)
    .eq('id', id)
    .eq('user_id', context.user.id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: 'Could not load AI job' }, { status: 500 });
  if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

  let coverage: CoverageReport | null = null;
  if (job.kind === 'tailor' && job.status === 'completed' && job.output) {
    const tailored = TailorOutputSchema.safeParse(job.output);
    if (tailored.success) {
      coverage = computeCoverage(tailored.data.jd_analysis.requirements, tailored.data.matches);
    }
  }
  return NextResponse.json({ job: coverage ? { ...job, output: { ...job.output, coverage } } : job });
}
