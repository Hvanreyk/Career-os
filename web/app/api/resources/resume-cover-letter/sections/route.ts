import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getResumeApiContext, recordResumeEvent } from '@/lib/resume/server';

const BodySchema = z.object({
  resumeId: z.uuid(),
  kind: z.enum(['education', 'experience', 'leadership', 'extracurricular', 'skills', 'other']),
  heading: z.string().trim().min(1).max(80),
  sortOrder: z.number().int().min(0).max(1000).default(0),
});

/**
 * Creates a section for an authenticated user's resume.
 *
 * @param request - Request containing the resume ID and section details
 * @returns A response containing the created section, or an error response for invalid input, a missing resume, or a creation failure
 */
export async function POST(request: Request) {
  const result = await getResumeApiContext();
  if (result.response) return result.response;
  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid section' }, { status: 400 });
  const { context } = result;
  const { data: resume } = await context.service
    .from('resumes').select('id').eq('id', parsed.data.resumeId).eq('user_id', context.user.id).maybeSingle();
  if (!resume) return NextResponse.json({ error: 'Resume not found' }, { status: 404 });
  const { data, error } = await context.service.from('resume_sections').insert({
    resume_id: resume.id,
    user_id: context.user.id,
    kind: parsed.data.kind,
    heading: parsed.data.heading,
    sort_order: parsed.data.sortOrder,
  }).select('id, resume_id, kind, heading, sort_order, created_at, updated_at').single();
  if (error || !data) return NextResponse.json({ error: 'Could not create section' }, { status: 500 });
  await recordResumeEvent(context, 'resume_updated', { operation: 'section_created', section_kind: data.kind });
  return NextResponse.json({ section: data }, { status: 201 });
}
