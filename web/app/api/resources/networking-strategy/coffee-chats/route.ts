import { NextResponse } from 'next/server';
import { buildPrepSheet } from '@trajectoryos/core/networking';
import { CoffeeChatInputSchema, type ContactSeniority } from '@trajectoryos/core/networking/types';
import {
  getNetworkingApiContext,
  loadOwnedContact,
  recordNetworkingEvent,
} from '@/lib/networking/server';

/**
 * Schedules a coffee chat, seeds a role-calibrated prep sheet, and
 * advances the relationship stage to conversation_booked.
 */
export async function POST(request: Request) {
  const result = await getNetworkingApiContext();
  if (result.response) return result.response;
  const { context } = result;

  const parsed = CoffeeChatInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid coffee chat' }, { status: 400 });
  }
  const input = parsed.data;
  const contact = await loadOwnedContact(context, input.contact_id);
  if (!contact) return NextResponse.json({ error: 'Contact not found' }, { status: 404 });

  const { data: chat, error } = await context.service
    .from('networking_coffee_chats')
    .insert({
      user_id: context.user.id,
      contact_id: input.contact_id,
      scheduled_at: input.scheduled_at,
      timezone: input.timezone,
      duration_minutes: input.duration_minutes,
      location: input.location,
      notes: input.notes,
      prep: buildPrepSheet(contact.seniority as ContactSeniority),
    })
    .select('id')
    .single();
  if (error || !chat) return NextResponse.json({ error: 'Could not schedule the coffee chat' }, { status: 500 });

  const current = contact.stage;
  if (current !== 'connected') {
    await context.service
      .from('networking_contacts')
      .update({ stage: 'conversation_booked' })
      .eq('id', contact.id)
      .eq('user_id', context.user.id)
      .in('stage', ['prospect', 'ready_to_contact', 'contacted', 'replied', 'dormant']);
  }

  await recordNetworkingEvent(context, 'networking_coffee_chat_scheduled', {
    duration_minutes: input.duration_minutes,
  });
  return NextResponse.json({ id: chat.id }, { status: 201 });
}
