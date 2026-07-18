import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  JOB_DESCRIPTION_MAX_LENGTH,
  RESUME_TAILOR_GENERATION_VERSION,
} from '@trajectoryos/core/llm/resume-tailor';
import { toResumeDocument } from '@trajectoryos/core/resume/assemble';
import { hasResumeContent } from '@trajectoryos/core/resume/document';
import { getResumeApiContext, recordResumeEvent } from '@/lib/resume/server';
import { createResumeAiJob } from '@/lib/resume/jobs';
import { loadResumeWorkspace } from '@/lib/resume/workspace';

const BodySchema = z.object({
  jobDescription: z.string().trim()
    .min(100, 'Paste the full job description (at least 100 characters)')
    .max(JOB_DESCRIPTION_MAX_LENGTH),
});

/**
 * Starts a JD-tailoring job: the pasted job description is analysed into
 * requirements, matched against a snapshot of the current resume with
 * evidence-cited confidence levels, and turned into honest gaps plus
 * traceable change proposals.
 */
export async function POST(request: Request) {
  const result = await getResumeApiContext();
  if (result.response) return result.response;
  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid job description' }, { status: 400 });
  }
  const { context } = result;

  const workspace = await loadResumeWorkspace(context);
  if (!workspace) return NextResponse.json({ error: 'Resume not found' }, { status: 404 });
  const document = toResumeDocument(
    workspace.resume, workspace.sections, workspace.entries, workspace.bullets,
  );
  if (!hasResumeContent(document)) {
    return NextResponse.json({ error: 'Add some resume content before tailoring' }, { status: 422 });
  }

  const created = await createResumeAiJob(context, {
    kind: 'tailor',
    input: { document, job_description: parsed.data.jobDescription },
    generationVersion: RESUME_TAILOR_GENERATION_VERSION,
    resumeId: workspace.resume.id,
  });
  if (created.response) return created.response;

  await recordResumeEvent(context, 'resume_tailor_started', { reused: created.reused });
  return NextResponse.json({ jobId: created.jobId, reused: created.reused }, { status: created.reused ? 200 : 201 });
}
