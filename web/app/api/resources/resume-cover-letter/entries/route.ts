import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getResumeApiContext, recordResumeEvent, RESUME_ENTRY_COLUMNS } from '@/lib/resume/server';

const OptionalField = (max: number) =>
  z.string().trim().max(max).transform((value) => (value === '' ? null : value)).nullable().default(null);

const BodySchema = z.object({
  sectionId: z.uuid(),
  org: z.string().trim().min(1).max(120),
  roleTitle: OptionalField(120),
  location: OptionalField(80),
  dateRange: OptionalField(60),
  sortOrder: z.number().int().min(0).max(1000).default(0),
});

/**
 * Creates a resume entry (org / role / dates / location) within a section
 * owned by the authenticated user.
 */
export async function POST(request: Request) {
  const result = await getResumeApiContext();
  if (result.response) return result.response;
  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid entry' }, { status: 400 });
  const { context } = result;
  const { data: section } = await context.service.from('resume_sections').select('id, kind')
    .eq('id', parsed.data.sectionId).eq('user_id', context.user.id).maybeSingle();
  if (!section) return NextResponse.json({ error: 'Section not found' }, { status: 404 });
  const { data, error } = await context.service.from('resume_entries').insert({
    section_id: section.id,
    user_id: context.user.id,
    org: parsed.data.org,
    role_title: parsed.data.roleTitle,
    location: parsed.data.location,
    date_range: parsed.data.dateRange,
    sort_order: parsed.data.sortOrder,
  }).select(RESUME_ENTRY_COLUMNS).single();
  if (error || !data) return NextResponse.json({ error: 'Could not create entry' }, { status: 500 });
  await recordResumeEvent(context, 'resume_updated', { operation: 'entry_created', section_kind: section.kind });
  return NextResponse.json({ entry: data }, { status: 201 });
}
