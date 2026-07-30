import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getResumeApiContext, recordResumeEvent } from '@/lib/resume/server';

const UpdateSchema = z.object({
  kind: z.enum(['education', 'experience', 'leadership', 'extracurricular', 'skills', 'other']).optional(),
  heading: z.string().trim().min(1).max(80).optional(),
  sortOrder: z.number().int().min(0).max(1000).optional(),
}).refine((value) => Object.keys(value).length > 0);

/**
 * Updates a resume section owned by the authenticated user.
 *
 * @returns A response containing the updated section, or an error response for invalid input, update failures, or a missing section.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await getResumeApiContext();
  if (result.response) return result.response;
  const [{ id }, parsed] = await Promise.all([
    params,
    request.json().catch(() => null).then((body) => UpdateSchema.safeParse(body)),
  ]);
  if (!z.uuid().safeParse(id).success || !parsed.success) {
    return NextResponse.json({ error: 'Invalid section update' }, { status: 400 });
  }
  const patch = {
    ...(parsed.data.kind ? { kind: parsed.data.kind } : {}),
    ...(parsed.data.heading ? { heading: parsed.data.heading } : {}),
    ...(parsed.data.sortOrder !== undefined ? { sort_order: parsed.data.sortOrder } : {}),
  };
  const { context } = result;
  const { data, error } = await context.service.from('resume_sections').update(patch)
    .eq('id', id).eq('user_id', context.user.id)
    .select('id, resume_id, kind, heading, sort_order, created_at, updated_at').maybeSingle();
  if (error) return NextResponse.json({ error: 'Could not update section' }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Section not found' }, { status: 404 });
  await recordResumeEvent(context, 'resume_updated', { operation: 'section_updated', section_kind: data.kind });
  return NextResponse.json({ section: data });
}

/**
 * Deletes a resume section belonging to the authenticated user.
 *
 * @param params - Route parameters containing the section ID.
 * @returns An empty response with status 204 when the section is deleted; otherwise, an error response.
 */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await getResumeApiContext();
  if (result.response) return result.response;
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return NextResponse.json({ error: 'Invalid section' }, { status: 400 });
  const { context } = result;
  const { data, error } = await context.service.from('resume_sections').delete()
    .eq('id', id).eq('user_id', context.user.id).select('id').maybeSingle();
  if (error) return NextResponse.json({ error: 'Could not delete section' }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Section not found' }, { status: 404 });
  await recordResumeEvent(context, 'resume_updated', { operation: 'section_deleted' });
  return new NextResponse(null, { status: 204 });
}
