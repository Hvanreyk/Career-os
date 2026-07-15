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
 * advances the relationship stage to conversation_booked. Creation
 * and the conditional stage advance commit atomically (see
 * create_networking_coffee_chat in migration 0010).
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

  const { data: rows, error } = await context.service.rpc('create_networking_coffee_chat', {
    p_user_id: context.user.id,
    p_contact_id: input.contact_id,
    p_scheduled_at: input.scheduled_at,
    p_timezone: input.timezone,
    p_duration_minutes: input.duration_minutes,
    p_location: input.location,
    p_notes: input.notes,
    p_prep: buildPrepSheet(contact.seniority as ContactSeniority),
  });
  if (error) return NextResponse.json({ error: 'Could not schedule the coffee chat' }, { status: 500 });
  const created = Array.isArray(rows) ? rows[0] : rows;
  if (!created) return NextResponse.json({ error: 'Could not schedule the coffee chat' }, { status: 500 });

  await recordNetworkingEvent(context, 'networking_coffee_chat_scheduled', {
    duration_minutes: input.duration_minutes,
  });
  return NextResponse.json({ id: created.id }, { status: 201 });
}
