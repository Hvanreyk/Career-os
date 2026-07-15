import { NextResponse } from 'next/server';
import { FollowUpInputSchema } from '@trajectoryos/core/networking/types';
import {
  getNetworkingApiContext,
  loadOwnedContact,
  maybeRecordActivation,
  recordNetworkingEvent,
} from '@/lib/networking/server';

/**
 * Schedules a contact follow-up or reschedules the contact's active follow-up.
 *
 * @returns A JSON response containing the follow-up ID, or an error response if the request is invalid, the contact is unavailable, or persistence fails.
 */
export async function POST(request: Request) {
  const result = await getNetworkingApiContext();
  if (result.response) return result.response;
  const { context } = result;

  const parsed = FollowUpInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid follow-up' }, { status: 400 });
  }
  const input = parsed.data;
  const contact = await loadOwnedContact(context, input.contact_id);
  if (!contact) return NextResponse.json({ error: 'Contact not found' }, { status: 404 });

  const { data: existing } = await context.service
    .from('networking_followups')
    .select('id')
    .eq('user_id', context.user.id)
    .eq('contact_id', input.contact_id)
    .in('status', ['open', 'snoozed'])
    .maybeSingle();

  let id: string;
  if (existing) {
    const { error } = await context.service
      .from('networking_followups')
      .update({ kind: input.kind, due_at: input.due_at, reason: input.reason, status: 'open' })
      .eq('id', existing.id)
      .eq('user_id', context.user.id);
    if (error) return NextResponse.json({ error: 'Could not reschedule the follow-up' }, { status: 500 });
    id = existing.id;
  } else {
    const { data: created, error } = await context.service
      .from('networking_followups')
      .insert({
        user_id: context.user.id,
        contact_id: input.contact_id,
        kind: input.kind,
        due_at: input.due_at,
        reason: input.reason,
      })
      .select('id')
      .single();
    if (error || !created) return NextResponse.json({ error: 'Could not schedule the follow-up' }, { status: 500 });
    id = created.id;
  }

  await recordNetworkingEvent(context, 'networking_followup_scheduled', {
    kind: input.kind,
    rescheduled: Boolean(existing),
  });
  await maybeRecordActivation(context);
  return NextResponse.json({ id }, { status: existing ? 200 : 201 });
}
