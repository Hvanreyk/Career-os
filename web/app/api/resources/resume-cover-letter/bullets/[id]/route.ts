import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getResumeApiContext, recordResumeEvent } from '@/lib/resume/server';

const UpdateSchema = z.object({
  text: z.string().trim().min(1).max(1000).optional(),
  status: z.enum(['draft', 'final']).optional(),
  sortOrder: z.number().int().min(0).max(1000).optional(),
}).refine((value) => Object.keys(value).length > 0);

/**
 * Updates a resume bullet for the authenticated user.
 *
 * @param request - The request containing the bullet fields to update
 * @param params - Route parameters containing the bullet identifier
 * @returns The updated bullet, or an error response if validation or the update fails
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await getResumeApiContext();
  if (result.response) return result.response;
  const [{ id }, parsed] = await Promise.all([
    params,
    request.json().catch(() => null).then((body) => UpdateSchema.safeParse(body)),
  ]);
  if (!z.uuid().safeParse(id).success || !parsed.success) {
    return NextResponse.json({ error: 'Invalid bullet update' }, { status: 400 });
  }
  const patch = {
    ...(parsed.data.text ? { text: parsed.data.text } : {}),
    ...(parsed.data.status ? { status: parsed.data.status } : {}),
    ...(parsed.data.sortOrder !== undefined ? { sort_order: parsed.data.sortOrder } : {}),
  };
  const { context } = result;
  const { data, error } = await context.service.from('resume_bullets').update(patch)
    .eq('id', id).eq('user_id', context.user.id)
    .select('id, section_id, text, status, sort_order, created_at, updated_at').maybeSingle();
  if (error) return NextResponse.json({ error: 'Could not update bullet' }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Bullet not found' }, { status: 404 });
  await recordResumeEvent(context, 'resume_updated', { operation: 'bullet_updated' });
  return NextResponse.json({ bullet: data });
}

/**
 * Deletes a resume bullet owned by the authenticated user.
 *
 * @param params - Route parameters containing the bullet identifier.
 * @returns An empty response with status 204 when the bullet is deleted, or an error response when validation or deletion fails.
 */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await getResumeApiContext();
  if (result.response) return result.response;
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return NextResponse.json({ error: 'Invalid bullet' }, { status: 400 });
  const { context } = result;
  const { data, error } = await context.service.from('resume_bullets').delete()
    .eq('id', id).eq('user_id', context.user.id).select('id').maybeSingle();
  if (error) return NextResponse.json({ error: 'Could not delete bullet' }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Bullet not found' }, { status: 404 });
  await recordResumeEvent(context, 'resume_updated', { operation: 'bullet_deleted' });
  return new NextResponse(null, { status: 204 });
}
