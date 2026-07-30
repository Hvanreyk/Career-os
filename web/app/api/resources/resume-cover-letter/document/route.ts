import { NextResponse } from 'next/server';
import { toResumeDocument } from '@trajectoryos/core/resume/assemble';
import { ResumeDocumentSchema } from '@trajectoryos/core/resume/document';
import { getResumeApiContext, recordResumeEvent } from '@/lib/resume/server';
import { loadResumeWorkspace } from '@/lib/resume/workspace';

/**
 * Returns the authenticated user's resume as a structured document.
 */
export async function GET() {
  const result = await getResumeApiContext();
  if (result.response) return result.response;
  const workspace = await loadResumeWorkspace(result.context);
  if (!workspace) return NextResponse.json({ error: 'Resume not found' }, { status: 404 });
  const document = toResumeDocument(
    workspace.resume, workspace.sections, workspace.entries, workspace.bullets,
  );
  return NextResponse.json({ document });
}

/**
 * Atomically replaces the authenticated user's entire resume document
 * (header, sections, entries, bullets) via the replace_resume_document RPC.
 * Used to apply import/auto-create proposals and accepted AI change sets.
 * Replacing bullets discards their per-bullet critique revision history —
 * the UI warns before calling this.
 */
export async function PUT(request: Request) {
  const result = await getResumeApiContext();
  if (result.response) return result.response;
  const parsed = ResumeDocumentSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid resume document' }, { status: 400 });
  const { context } = result;

  const { data: resume } = await context.service.from('resumes')
    .select('id').eq('user_id', context.user.id).maybeSingle();
  if (!resume) return NextResponse.json({ error: 'Resume not found' }, { status: 404 });

  const { error } = await context.service.rpc('replace_resume_document', {
    p_user_id: context.user.id,
    p_resume_id: resume.id,
    p_document: parsed.data,
  });
  if (error) {
    console.error('replace_resume_document failed:', error.message);
    return NextResponse.json({ error: 'Could not save resume document' }, { status: 500 });
  }

  await recordResumeEvent(context, 'resume_updated', {
    operation: 'document_replaced',
    section_count: parsed.data.sections.length,
  });
  const workspace = await loadResumeWorkspace(context);
  return NextResponse.json({ workspace });
}
