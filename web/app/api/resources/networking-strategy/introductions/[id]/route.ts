import { NextResponse } from 'next/server';
import { z } from 'zod';
import { IntroductionStatusSchema, type IntroductionStatus } from '@trajectoryos/core/networking/types';
import { getNetworkingApiContext, recordNetworkingEvent } from '@/lib/networking/server';

const IdSchema = z.uuid();

const UpdateSchema = z.object({
  status: z.custom<IntroductionStatus>((value) => IntroductionStatusSchema.safeParse(value).success).optional(),
  notes: z.string().max(4000).optional(),
});

/**
 * Updates the authenticated user's warm introduction status or notes.
 *
 * @returns A JSON response indicating whether the update succeeded or why it failed.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await getNetworkingApiContext();
  if (result.response) return result.response;
  const { context } = result;
  const { id } = await params;
  if (!IdSchema.safeParse(id).success) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const parsed = UpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid update' }, { status: 400 });
  const input = parsed.data;
  const update: Record<string, unknown> = {};
  if (input.status !== undefined) update.status = input.status;
  if (input.notes !== undefined) update.notes = input.notes;
  if (Object.keys(update).length === 0) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });

  const { data: updated, error } = await context.service
    .from('networking_introductions')
    .update(update)
    .eq('id', id)
    .eq('user_id', context.user.id)
    .select('id')
    .maybeSingle();
  if (error) return NextResponse.json({ error: 'Could not update the introduction' }, { status: 500 });
  if (!updated) return NextResponse.json({ error: 'Introduction not found' }, { status: 404 });

  if (input.status === 'made') {
    await recordNetworkingEvent(context, 'networking_introduction_recorded', { status: 'made' });
  }
  return NextResponse.json({ ok: true });
}
