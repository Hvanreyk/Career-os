import { NextResponse } from 'next/server';
import { z } from 'zod';
import { FollowUpKindSchema, type FollowUpKind } from '@trajectoryos/core/networking/types';
import {
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
 * client or LinkedIn) and logs it. Claiming the message, logging the
 * immutable sent interaction, and advancing the stage commit
 * atomically (see log_networking_message_sent in migration 0010), so
 * a double-click can never produce duplicate sent interactions.
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

  const contact = await loadOwnedContact(context, message.contact_id);
  if (!contact) return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
  if (contact.do_not_contact) {
    return NextResponse.json({ error: 'This contact is marked do-not-contact' }, { status: 422 });
  }

  const now = new Date().toISOString();
  const { data: rows, error } = await context.service.rpc('log_networking_message_sent', {
    p_user_id: context.user.id,
    p_message_id: id,
    p_occurred_at: now,
  });
  if (error) return NextResponse.json({ error: 'Could not log the sent message' }, { status: 500 });
  const outcome = Array.isArray(rows) ? rows[0] : rows;
  if (!outcome || !outcome.claimed) {
    return NextResponse.json({ error: 'This message is already logged as sent' }, { status: 409 });
  }
  const stage = outcome.stage;

  let followUpId: string | null = null;
  const followup = parsed.data.followup;
  if (followup) {
    const { data: followUpRows, error: followUpError } = await context.service.rpc('schedule_networking_followup', {
      p_user_id: context.user.id,
      p_contact_id: message.contact_id,
      p_kind: followup.kind,
      p_due_at: followup.due_at,
      p_reason: followup.reason,
    });
    const followUpOutcome = Array.isArray(followUpRows) ? followUpRows[0] : followUpRows;
    if (!followUpError && followUpOutcome) {
      followUpId = followUpOutcome.id;
      await recordNetworkingEvent(context, 'networking_followup_scheduled', {
        kind: followup.kind,
        rescheduled: followUpOutcome.rescheduled,
      });
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
