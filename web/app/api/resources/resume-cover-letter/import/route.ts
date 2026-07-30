import { NextResponse } from 'next/server';
import { z } from 'zod';
import { RESUME_EXTRACT_GENERATION_VERSION, RESUME_EXTRACT_TEXT_LIMIT } from '@trajectoryos/core/llm/resume-extract';
import { getResumeApiContext, recordResumeEvent } from '@/lib/resume/server';
import { createResumeAiJob } from '@/lib/resume/jobs';
import {
  extractResumeText,
  ResumeFileError,
  RESUME_EXTRACT_MIN_CHARS,
  RESUME_UPLOAD_MAX_BYTES,
} from '@/lib/resume/extract';

const TextBodySchema = z.object({
  text: z.string().trim()
    .min(RESUME_EXTRACT_MIN_CHARS, 'Paste at least a few paragraphs of resume text')
    .max(RESUME_EXTRACT_TEXT_LIMIT, `That's too long to import in one go — keep it under ${RESUME_EXTRACT_TEXT_LIMIT.toLocaleString()} characters`),
});

/**
 * Starts a resume import: accepts an uploaded PDF/DOCX (multipart field
 * `file`) or pasted text (JSON `{ text }`), extracts plain text server-side
 * (the file itself is parsed and discarded — never stored), and creates an
 * AI job that converts the text into a structured resume proposal.
 */
export async function POST(request: Request) {
  const result = await getResumeApiContext();
  if (result.response) return result.response;
  const { context } = result;

  let text: string;
  const contentType = request.headers.get('content-type') ?? '';
  if (contentType.includes('multipart/form-data')) {
    let file: File | null = null;
    try {
      const form = await request.formData();
      const value = form.get('file');
      file = value instanceof File ? value : null;
    } catch {
      return NextResponse.json({ error: 'Invalid upload' }, { status: 400 });
    }
    if (!file) return NextResponse.json({ error: 'Attach a PDF or Word file' }, { status: 400 });
    if (file.size > RESUME_UPLOAD_MAX_BYTES) {
      return NextResponse.json({ error: 'File is too large — the limit is 4.5 MB' }, { status: 413 });
    }
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      text = await extractResumeText(buffer);
    } catch (error) {
      if (error instanceof ResumeFileError) {
        return NextResponse.json({ error: error.message }, { status: error.status });
      }
      throw error;
    }
    if (text.length > RESUME_EXTRACT_TEXT_LIMIT) {
      return NextResponse.json({
        error: `That resume is too long to import in one go (over ${RESUME_EXTRACT_TEXT_LIMIT.toLocaleString()} characters of text) — try the paste tab with a trimmed-down version instead`,
      }, { status: 422 });
    }
  } else {
    const parsed = TextBodySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({
        error: parsed.error.issues[0]?.message ?? 'Paste at least a few paragraphs of resume text',
      }, { status: 400 });
    }
    text = parsed.data.text;
  }

  const { data: resume } = await context.service.from('resumes')
    .select('id').eq('user_id', context.user.id).maybeSingle();

  const created = await createResumeAiJob(context, {
    kind: 'import',
    input: { text },
    generationVersion: RESUME_EXTRACT_GENERATION_VERSION,
    resumeId: resume?.id ?? null,
  });
  if (created.response) return created.response;

  await recordResumeEvent(context, 'resume_import_started', { reused: created.reused });
  return NextResponse.json({ jobId: created.jobId, reused: created.reused }, { status: created.reused ? 200 : 201 });
}
