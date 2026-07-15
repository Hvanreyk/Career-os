import { NextResponse } from 'next/server';
import { z } from 'zod';
import { NetworkingEventInputSchema } from '@trajectoryos/core/networking/types';
import { getNetworkingApiContext } from '@/lib/networking/server';

const IdSchema = z.uuid();

/**
 * Updates a networking event (mark attended, edit notes).
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await getNetworkingApiContext();
  if (result.response) return result.response;
  const { context } = result;
  const { id } = await params;
  if (!IdSchema.safeParse(id).success) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const parsed = NetworkingEventInputSchema.partial().safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid update' }, { status: 400 });
  const update = Object.fromEntries(
    Object.entries(parsed.data).filter(([, value]) => value !== undefined),
  );
  if (Object.keys(update).length === 0) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });

  const { data: updated, error } = await context.service
    .from('networking_events')
    .update(update)
    .eq('id', id)
    .eq('user_id', context.user.id)
    .select('id')
    .maybeSingle();
  if (error) return NextResponse.json({ error: 'Could not update the event' }, { status: 500 });
  if (!updated) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
