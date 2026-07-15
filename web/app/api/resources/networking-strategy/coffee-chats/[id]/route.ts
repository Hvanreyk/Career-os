import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ChatDebriefSchema, CHAT_NOTES_MAX } from '@trajectoryos/core/networking/types';
import {
  advanceContactStage,
  getNetworkingApiContext,
  loadOwnedContact,
  recordNetworkingEvent,
} from '@/lib/networking/server';

const IdSchema = z.uuid();

const PrepSchema = z.object({
  research_notes: z.string().max(CHAT_NOTES_MAX),
  questions: z.array(z.string().max(500)).max(10),
  my_ask: z.string().max(500),
});

const UpdateSchema = z.object({
  action: z.enum(['update', 'complete', 'cancel']),
  scheduled_at: z.iso.datetime({ offset: true }).optional(),
  timezone: z.string().min(1).max(60).optional(),
  duration_minutes: z.number().int().min(10).max(120).optional(),
  location: z.string().max(120).optional(),
  notes: z.string().max(CHAT_NOTES_MAX).optional(),
  prep: PrepSchema.optional(),
  debrief: z.unknown().optional(),
});

/**
 * Updates, completes (with structured debrief) or cancels a coffee
 * chat. Completing records the immutable coffee_chat interaction,
 * advances the stage to connected, and queues the thank-you.
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

  const { data: chat } = await context.service
    .from('networking_coffee_chats')
    .select('id, contact_id, status, scheduled_at')
    .eq('id', id)
    .eq('user_id', context.user.id)
    .maybeSingle();
  if (!chat) return NextResponse.json({ error: 'Coffee chat not found' }, { status: 404 });

  const contact = await loadOwnedContact(context, chat.contact_id);
  if (!contact) return NextResponse.json({ error: 'Contact not found' }, { status: 404 });

  if (input.action === 'cancel') {
    if (chat.status !== 'scheduled') {
      return NextResponse.json({ error: 'Only scheduled chats can be cancelled' }, { status: 422 });
    }
    const { error } = await context.service
      .from('networking_coffee_chats')
      .update({ status: 'cancelled' })
      .eq('id', id)
      .eq('user_id', context.user.id);
    if (error) return NextResponse.json({ error: 'Could not cancel the chat' }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (input.action === 'update') {
    const update: Record<string, unknown> = {};
    if (input.scheduled_at !== undefined) update.scheduled_at = input.scheduled_at;
    if (input.timezone !== undefined) update.timezone = input.timezone;
    if (input.duration_minutes !== undefined) update.duration_minutes = input.duration_minutes;
    if (input.location !== undefined) update.location = input.location;
    if (input.notes !== undefined) update.notes = input.notes;
    if (input.prep !== undefined) update.prep = input.prep;
    if (Object.keys(update).length === 0) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    const { error } = await context.service
      .from('networking_coffee_chats')
      .update(update)
      .eq('id', id)
      .eq('user_id', context.user.id);
    if (error) return NextResponse.json({ error: 'Could not update the chat' }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // action === 'complete'
  if (chat.status === 'completed') {
    return NextResponse.json({ error: 'This chat is already completed' }, { status: 409 });
  }
  const debrief = ChatDebriefSchema.safeParse(input.debrief ?? {});
  if (!debrief.success) return NextResponse.json({ error: 'Invalid debrief' }, { status: 400 });

  const { error: completeError } = await context.service
    .from('networking_coffee_chats')
    .update({ status: 'completed', debrief: debrief.data })
    .eq('id', id)
    .eq('user_id', context.user.id);
  if (completeError) return NextResponse.json({ error: 'Could not complete the chat' }, { status: 500 });

  await context.service.from('networking_interactions').insert({
    user_id: context.user.id,
    contact_id: chat.contact_id,
    type: 'coffee_chat',
    direction: 'none',
    occurred_at: chat.scheduled_at,
    summary: debrief.data.learned,
    outcome: debrief.data.outcome,
    source: 'manual',
  });
  const stage = await advanceContactStage(context, contact, 'coffee_chat', 'none');

  // Queue the thank-you: the highest-value follow-up, due within 24h.
  const dueAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const { data: existing } = await context.service
    .from('networking_followups')
    .select('id')
    .eq('user_id', context.user.id)
    .eq('contact_id', chat.contact_id)
    .in('status', ['open', 'snoozed'])
    .maybeSingle();
  if (existing) {
    await context.service
      .from('networking_followups')
      .update({ kind: 'thank_you', due_at: dueAt, reason: 'Thank-you after your coffee chat', status: 'open' })
      .eq('id', existing.id)
      .eq('user_id', context.user.id);
  } else {
    await context.service.from('networking_followups').insert({
      user_id: context.user.id,
      contact_id: chat.contact_id,
      kind: 'thank_you',
      due_at: dueAt,
      reason: 'Thank-you after your coffee chat',
    });
  }

  await recordNetworkingEvent(context, 'networking_coffee_chat_completed', {
    referral_offered: debrief.data.referral_offered,
    names_dropped: debrief.data.names_dropped.length,
  });
  if (debrief.data.referral_offered) {
    await recordNetworkingEvent(context, 'networking_referral_earned');
  }
  return NextResponse.json({ ok: true, stage, namesDropped: debrief.data.names_dropped });
}
