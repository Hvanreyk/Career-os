import { NextResponse } from 'next/server';
import { NetworkingEventInputSchema } from '@trajectoryos/core/networking/types';
import { getNetworkingApiContext, recordNetworkingEvent } from '@/lib/networking/server';

/**
 * Creates a networking event (career fair, info session, insight day)
 * for pre-event prep and rapid post-event contact capture.
 */
export async function POST(request: Request) {
  const result = await getNetworkingApiContext();
  if (result.response) return result.response;
  const { context } = result;

  const parsed = NetworkingEventInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid event' }, { status: 400 });
  }
  const input = parsed.data;
  const { data: event, error } = await context.service
    .from('networking_events')
    .insert({
      user_id: context.user.id,
      name: input.name,
      event_date: input.event_date,
      related_firm: input.related_firm,
      status: input.status,
      notes: input.notes,
    })
    .select('id')
    .single();
  if (error || !event) return NextResponse.json({ error: 'Could not create the event' }, { status: 500 });

  await recordNetworkingEvent(context, 'networking_event_created', { status: input.status });
  return NextResponse.json({ id: event.id }, { status: 201 });
}
