import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getResumeApiContext, recordResumeEvent, RESUME_ENTRY_COLUMNS } from '@/lib/resume/server';

const OptionalField = (max: number) =>
  z.string().trim().max(max).transform((value) => (value === '' ? null : value)).nullable();

const UpdateSchema = z.object({
  org: z.string().trim().min(1).max(120).optional(),
  roleTitle: OptionalField(120).optional(),
  location: OptionalField(80).optional(),
  dateRange: OptionalField(60).optional(),
  sortOrder: z.number().int().min(0).max(1000).optional(),
}).refine((value) => Object.keys(value).length > 0);

/**
 * Updates a resume entry owned by the authenticated user.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await getResumeApiContext();
  if (result.response) return result.response;
  const [{ id }, parsed] = await Promise.all([
    params,
    request.json().catch(() => null).then((body) => UpdateSchema.safeParse(body)),
  ]);
  if (!z.uuid().safeParse(id).success || !parsed.success) {
    return NextResponse.json({ error: 'Invalid entry update' }, { status: 400 });
  }
  const patch = {
    ...(parsed.data.org !== undefined ? { org: parsed.data.org } : {}),
    ...(parsed.data.roleTitle !== undefined ? { role_title: parsed.data.roleTitle } : {}),
    ...(parsed.data.location !== undefined ? { location: parsed.data.location } : {}),
    ...(parsed.data.dateRange !== undefined ? { date_range: parsed.data.dateRange } : {}),
    ...(parsed.data.sortOrder !== undefined ? { sort_order: parsed.data.sortOrder } : {}),
  };
  const { context } = result;
  const { data, error } = await context.service.from('resume_entries').update(patch)
    .eq('id', id).eq('user_id', context.user.id)
    .select(RESUME_ENTRY_COLUMNS).maybeSingle();
  if (error) return NextResponse.json({ error: 'Could not update entry' }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
  await recordResumeEvent(context, 'resume_updated', { operation: 'entry_updated' });
  return NextResponse.json({ entry: data });
}

/**
 * Deletes a resume entry (and its attached bullets via cascade) belonging to
 * the authenticated user.
 */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await getResumeApiContext();
  if (result.response) return result.response;
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) return NextResponse.json({ error: 'Invalid entry' }, { status: 400 });
  const { context } = result;
  const { data, error } = await context.service.from('resume_entries').delete()
    .eq('id', id).eq('user_id', context.user.id).select('id').maybeSingle();
  if (error) return NextResponse.json({ error: 'Could not delete entry' }, { status: 500 });
  if (!data) return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
  await recordResumeEvent(context, 'resume_updated', { operation: 'entry_deleted' });
  return new NextResponse(null, { status: 204 });
}
