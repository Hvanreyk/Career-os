import { NextResponse } from 'next/server';
import { z } from 'zod';
import { FollowUpKindSchema, type FollowUpKind } from '@trajectoryos/core/networking/types';
import {
  advanceContactStage,
  getNetworkingApiContext,
  loadOwnedContact,
  maybeRecordActivation,
  recordNetworkingEvent,
} from '@/lib/networking/server';

const IdSchema = z.uuid();

const BodySchema = z.object({
  channel_action: z.enum(['mailto', 'copy', 'linkedin_copy']).optional(),
  followup: z.object({
    kind: z.custom<FollowUpKind>((value) => FollowUpKindSchema.safeParse(value).success),
    due_at: z.iso.datetime({ offset: true }),
    reason: z.string().max(300).default(''),
  }).nullable().optional(),
});

/**
 * Manual send path: the student sent the message themselves (mail
 * client or LinkedIn) and logs it. Creates the immutable sent
 * interaction, marks the message sent (channel 'manual'), advances the
 * stage, and optionally schedules the next follow-up in one step.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await getNetworkingApiContext('message-review');
  if (result.response) return result.response;
  const { context } = result;
  const { id } = await params;
  if (!IdSchema.safeParse(id).success) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const parsed = BodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

  const { data: message } = await context.service
    .from('networking_messages')
    .select('id, contact_id, channel, purpose, state')
    .eq('id', id)
    .eq('user_id', context.user.id)
    .maybeSingle();
  if (!message) return NextResponse.json({ error: 'Message not found' }, { status: 404 });
  if (message.state === 'sent') {
    return NextResponse.json({ error: 'This message is already logged as sent' }, { status: 409 });
  }

  const contact = await loadOwnedContact(context, message.contact_id);
  if (!contact) return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
  if (contact.do_not_contact) {
    return NextResponse.json({ error: 'This contact is marked do-not-contact' }, { status: 422 });
  }

  const now = new Date().toISOString();
  const interactionType = message.channel === 'email' ? 'email_sent' : 'linkedin_sent';
  const { error: interactionError } = await context.service
    .from('networking_interactions')
    .insert({
      user_id: context.user.id,
      contact_id: message.contact_id,
      type: interactionType,
      direction: 'outbound',
      occurred_at: now,
      summary: `Sent ${message.purpose.replace(/_/g, ' ')} (${message.channel})`,
      source: 'manual',
    });
  if (interactionError) {
    return NextResponse.json({ error: 'Could not log the sent message' }, { status: 500 });
  }

  const { error: messageError } = await context.service
    .from('networking_messages')
    .update({ state: 'sent', send_channel: 'manual', sent_at: now })
    .eq('id', message.id)
    .eq('user_id', context.user.id);
  if (messageError) {
    return NextResponse.json({ error: 'The interaction was logged but the draft state could not be updated' }, { status: 500 });
  }

  const stage = await advanceContactStage(context, contact, interactionType, 'outbound');

  let followUpId: string | null = null;
  const followup = parsed.data.followup;
  if (followup) {
    const { data: existing } = await context.service
      .from('networking_followups')
      .select('id')
      .eq('user_id', context.user.id)
      .eq('contact_id', message.contact_id)
      .in('status', ['open', 'snoozed'])
      .maybeSingle();
    if (existing) {
      await context.service
        .from('networking_followups')
        .update({ kind: followup.kind, due_at: followup.due_at, reason: followup.reason, status: 'open' })
        .eq('id', existing.id)
        .eq('user_id', context.user.id);
      followUpId = existing.id;
    } else {
      const { data: created } = await context.service
        .from('networking_followups')
        .insert({
          user_id: context.user.id,
          contact_id: message.contact_id,
          kind: followup.kind,
          due_at: followup.due_at,
          reason: followup.reason,
        })
        .select('id')
        .single();
      followUpId = created?.id ?? null;
    }
    if (followUpId) {
      await recordNetworkingEvent(context, 'networking_followup_scheduled', { kind: followup.kind, rescheduled: Boolean(existing) });
    }
  }

  await recordNetworkingEvent(context, 'networking_message_sent', {
    channel: message.channel,
    purpose: message.purpose,
    send_channel: 'manual',
  });
  if (parsed.data.channel_action === 'linkedin_copy') {
    await recordNetworkingEvent(context, 'networking_linkedin_copy_used', { purpose: message.purpose });
  }
  await maybeRecordActivation(context);
  return NextResponse.json({ ok: true, stage, followUpId });
}
