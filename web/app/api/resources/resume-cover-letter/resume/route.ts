import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getResumeApiContext, recordResumeEvent } from '@/lib/resume/server';

const CreateSchema = z.object({
  title: z.string().trim().min(1).max(120).default('Master resume'),
});
const UpdateSchema = z.object({
  title: z.string().trim().min(1).max(120).optional(),
  status: z.enum(['draft', 'current']).optional(),
}).refine((value) => Object.keys(value).length > 0);

/**
 * Creates a resume for the authenticated user.
 *
 * @param request - The request containing the resume title.
 * @returns The created resume, or the existing resume when one already exists.
 */
export async function POST(request: Request) {
  const result = await getResumeApiContext();
  if (result.response) return result.response;
  const parsed = CreateSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid resume' }, { status: 400 });
  const { context } = result;
  const { data, error } = await context.service
    .from('resumes')
    .insert({ user_id: context.user.id, title: parsed.data.title })
    .select('id, title, status, created_at, updated_at')
    .single();
  if (error?.code === '23505') {
    const { data: existing } = await context.service
      .from('resumes')
      .select('id, title, status, created_at, updated_at')
      .eq('user_id', context.user.id)
      .single();
    return NextResponse.json({ resume: existing, existing: true });
  }
  if (error || !data) return NextResponse.json({ error: 'Could not create resume' }, { status: 500 });
  await recordResumeEvent(context, 'resume_created');
  return NextResponse.json({ resume: data }, { status: 201 });
}

/**
 * Updates the authenticated user's resume.
 *
 * @param request - The request containing the resume fields to update.
 * @returns The updated resume, or an error response if the input is invalid, the update fails, or no resume is found.
 */
export async function PATCH(request: Request) {
  const result = await getResumeApiContext();
  if (result.response) return result.response;
  const parsed = UpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid resume update' }, { status: 400 });
  const { context } = result;
  const { data, error } = await context.service
    .from('resumes')
    .update(parsed.data)
    .eq('user_id', context.user.id)
    .select('id, title, status, created_at, updated_at')
    .maybeSingle();
  if (error) return NextResponse.json({ error: 'Could not update resume' }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Resume not found' }, { status: 404 });
  await recordResumeEvent(context, 'resume_updated', { operation: 'resume_updated' });
  return NextResponse.json({ resume: data });
}

/**
 * Deletes the authenticated user's resume data.
 *
 * @returns An empty response with status 204 on success.
 */
export async function DELETE() {
  const result = await getResumeApiContext();
  if (result.response) return result.response;
  const { context } = result;
  const { error } = await context.service.from('resumes').delete().eq('user_id', context.user.id);
  if (error) return NextResponse.json({ error: 'Could not delete workshop data' }, { status: 500 });
  await recordResumeEvent(context, 'resume_workshop_data_deleted');
  return new NextResponse(null, { status: 204 });
}
