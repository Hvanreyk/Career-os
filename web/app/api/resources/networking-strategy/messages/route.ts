import { NextResponse } from 'next/server';
import { MessageInputSchema } from '@trajectoryos/core/networking/types';
import {
  getNetworkingApiContext,
  loadOwnedContact,
  recordNetworkingEvent,
} from '@/lib/networking/server';

/**
 * Creates and saves a Message Lab draft for an owned contact.
 *
 * @returns An HTTP response containing the saved draft ID or an error message.
 */
export async function POST(request: Request) {
  const result = await getNetworkingApiContext('message-review');
  if (result.response) return result.response;
  const { context } = result;

  const parsed = MessageInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid message' }, { status: 400 });
  }
  const input = parsed.data;
  const contact = await loadOwnedContact(context, input.contact_id);
  if (!contact) return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
  if (contact.do_not_contact) {
    return NextResponse.json({ error: 'This contact is marked do-not-contact' }, { status: 422 });
  }

  const { data: message, error } = await context.service
    .from('networking_messages')
    .insert({
      user_id: context.user.id,
      contact_id: input.contact_id,
      channel: input.channel,
      purpose: input.purpose,
      subject: input.subject,
      body: input.body,
      context: input.context,
    })
    .select('id')
    .single();
  if (error || !message) return NextResponse.json({ error: 'Could not save the draft' }, { status: 500 });

  await recordNetworkingEvent(context, 'networking_message_drafted', {
    channel: input.channel,
    purpose: input.purpose,
  });
  return NextResponse.json({ id: message.id }, { status: 201 });
}
