import { NextResponse } from 'next/server';
import { z } from 'zod';
import { applyChanges } from '@trajectoryos/core/resume/apply';
import { toResumeDocument } from '@trajectoryos/core/resume/assemble';
import {
  hasResumeContent,
  ResumeChangeListSchema,
  ResumeDocumentSchema,
} from '@trajectoryos/core/resume/document';
import { getResumeApiContext, recordResumeEvent } from '@/lib/resume/server';
import { loadResumeWorkspace } from '@/lib/resume/workspace';
import { buildContentDispositionFilename, buildExportFilename } from '@/lib/resume/export/template';

const QuerySchema = z.object({
  format: z.enum(['pdf', 'docx']),
  jobId: z.uuid().optional(),
});

/**
 * Exports the authenticated user's resume as a formatted PDF or DOCX file.
 *
 * Without `jobId` the saved master document is rendered. With `jobId`, the
 * completed AI job's proposal is rendered instead — a full proposed document
 * (import/compose) or the master document with the job's proposed changes
 * applied (improve/tailor) — so users can download a tailored version
 * without overwriting their master resume.
 */
export async function GET(request: Request) {
  const result = await getResumeApiContext();
  if (result.response) return result.response;
  const { context } = result;
  const url = new URL(request.url);
  const parsed = QuerySchema.safeParse({
    format: url.searchParams.get('format'),
    jobId: url.searchParams.get('jobId') ?? undefined,
  });
  if (!parsed.success) return NextResponse.json({ error: 'Invalid export request' }, { status: 400 });

  const workspace = await loadResumeWorkspace(context);
  if (!workspace) return NextResponse.json({ error: 'Resume not found' }, { status: 404 });
  let document = toResumeDocument(
    workspace.resume, workspace.sections, workspace.entries, workspace.bullets,
  );

  if (parsed.data.jobId) {
    const { data: job } = await context.service.from('resume_ai_jobs')
      .select('id, kind, status, output')
      .eq('id', parsed.data.jobId)
      .eq('user_id', context.user.id)
      .maybeSingle();
    if (!job || job.status !== 'completed' || !job.output) {
      return NextResponse.json({ error: 'Job not found or not completed' }, { status: 404 });
    }
    const output = job.output as Record<string, unknown>;
    const proposal = ResumeDocumentSchema.safeParse(output.document);
    const changes = ResumeChangeListSchema.safeParse(output.changes);
    if (proposal.success) {
      document = proposal.data;
    } else if (changes.success) {
      document = applyChanges(document, changes.data).document;
    } else {
      return NextResponse.json({ error: 'Job output cannot be exported' }, { status: 422 });
    }
  }

  if (!hasResumeContent(document)) {
    return NextResponse.json({ error: 'Add some resume content before exporting' }, { status: 422 });
  }

  const filename = buildExportFilename(document);
  let body: Buffer;
  let contentType: string;
  try {
    if (parsed.data.format === 'pdf') {
      const { renderResumePdf } = await import('@/lib/resume/export/pdf');
      body = await renderResumePdf(document);
      contentType = 'application/pdf';
    } else {
      const { renderResumeDocx } = await import('@/lib/resume/export/docx');
      body = await renderResumeDocx(document);
      contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    }
  } catch (error) {
    console.error('resume export failed:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }

  await recordResumeEvent(context, 'resume_exported', {
    format: parsed.data.format,
    from_job: Boolean(parsed.data.jobId),
  });
  const { ascii, encoded } = buildContentDispositionFilename(filename, parsed.data.format);
  return new NextResponse(new Uint8Array(body), {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${ascii}"; filename*=UTF-8''${encoded}`,
      'Cache-Control': 'no-store',
    },
  });
}
