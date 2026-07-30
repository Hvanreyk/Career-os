import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getResumeApiContext, recordResumeEvent, RESUME_BULLET_COLUMNS } from '@/lib/resume/server';

const BodySchema = z.object({
  sectionId: z.uuid(),
  entryId: z.uuid().nullable().default(null),
  text: z.string().trim().min(1).max(1000),
  status: z.enum(['draft', 'final']).default('draft'),
  sortOrder: z.number().int().min(0).max(1000).default(0),
});

/**
 * Creates a resume bullet for a section owned by the authenticated user.
 *
 * @returns An HTTP response containing the created bullet, or an error response if the request is invalid, the section is unavailable, or creation fails.
 */
export async function POST(request: Request) {
  const result = await getResumeApiContext();
  if (result.response) return result.response;
  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid bullet' }, { status: 400 });
  const { context } = result;
  const { data: section } = await context.service.from('resume_sections').select('id, kind')
    .eq('id', parsed.data.sectionId).eq('user_id', context.user.id).maybeSingle();
  if (!section) return NextResponse.json({ error: 'Section not found' }, { status: 404 });
  if (parsed.data.entryId) {
    const { data: entry } = await context.service.from('resume_entries').select('id, section_id')
      .eq('id', parsed.data.entryId).eq('user_id', context.user.id).maybeSingle();
    if (!entry || entry.section_id !== section.id) {
      return NextResponse.json({ error: 'Entry not found in section' }, { status: 404 });
    }
  }
  const { data, error } = await context.service.from('resume_bullets').insert({
    section_id: section.id,
    entry_id: parsed.data.entryId,
    user_id: context.user.id,
    text: parsed.data.text,
    status: parsed.data.status,
    sort_order: parsed.data.sortOrder,
  }).select(RESUME_BULLET_COLUMNS).single();
  if (error || !data) return NextResponse.json({ error: 'Could not create bullet' }, { status: 500 });
  await recordResumeEvent(context, 'resume_updated', { operation: 'bullet_created', section_kind: section.kind });
  return NextResponse.json({ bullet: data }, { status: 201 });
}
