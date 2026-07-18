import { NextResponse } from 'next/server';
import { RESUME_IMPROVE_GENERATION_VERSION } from '@trajectoryos/core/llm/resume-improve';
import { toResumeDocument } from '@trajectoryos/core/resume/assemble';
import { getResumeApiContext, recordResumeEvent } from '@/lib/resume/server';
import { createResumeAiJob } from '@/lib/resume/jobs';
import { loadResumeWorkspace } from '@/lib/resume/workspace';

/**
 * Starts a whole-resume improvement job over a snapshot of the current
 * document. The result is a set of index-addressed change proposals the
 * user reviews item by item.
 */
export async function POST() {
  const result = await getResumeApiContext();
  if (result.response) return result.response;
  const { context } = result;

  const workspace = await loadResumeWorkspace(context);
  if (!workspace) return NextResponse.json({ error: 'Resume not found' }, { status: 404 });
  const document = toResumeDocument(
    workspace.resume, workspace.sections, workspace.entries, workspace.bullets,
  );
  if (document.sections.length === 0) {
    return NextResponse.json({ error: 'Add some resume content before requesting improvements' }, { status: 422 });
  }

  const created = await createResumeAiJob(context, {
    kind: 'improve',
    input: { document },
    generationVersion: RESUME_IMPROVE_GENERATION_VERSION,
    resumeId: workspace.resume.id,
  });
  if (created.response) return created.response;

  await recordResumeEvent(context, 'resume_improve_started', { reused: created.reused });
  return NextResponse.json({ jobId: created.jobId, reused: created.reused }, { status: created.reused ? 200 : 201 });
}
