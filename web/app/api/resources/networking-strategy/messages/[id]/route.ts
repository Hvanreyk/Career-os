import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  MESSAGE_BODY_MAX,
  MESSAGE_SUBJECT_MAX,
  MessageContextSchema,
} from '@trajectoryos/core/networking/types';
import {
  getNetworkingApiContext,
  hashMessageContent,
} from '@/lib/networking/server';

const IdSchema = z.uuid();

const UpdateSchema = z.object({
  subject: z.string().max(MESSAGE_SUBJECT_MAX).optional(),
  body: z.string().max(MESSAGE_BODY_MAX).optional(),
  context: MessageContextSchema.optional(),
});

/**
 * Edits a draft. If the message was reviewed and the content changes,
 * the reviewed state is invalidated (back to draft) so a stale review
 * can never accompany different text.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await getNetworkingApiContext('message-review');
  if (result.response) return result.response;
  const { context } = result;
  const { id } = await params;
  if (!IdSchema.safeParse(id).success) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const parsed = UpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid update' }, { status: 400 });
  }
  const input = parsed.data;

  const { data: message } = await context.service
    .from('networking_messages')
    .select('id, subject, body, state, reviewed_hash')
    .eq('id', id)
    .eq('user_id', context.user.id)
    .maybeSingle();
  if (!message) return NextResponse.json({ error: 'Message not found' }, { status: 404 });
  if (message.state === 'sent' || message.state === 'sending') {
    return NextResponse.json({ error: 'Sent messages cannot be edited' }, { status: 422 });
  }

  const nextSubject = input.subject ?? message.subject;
  const nextBody = input.body ?? message.body;
  const update: Record<string, unknown> = {};
  if (input.subject !== undefined) update.subject = input.subject;
  if (input.body !== undefined) update.body = input.body;
  if (input.context !== undefined) update.context = input.context;

  const contentChanged = hashMessageContent(nextSubject, nextBody) !== hashMessageContent(message.subject, message.body);
  if (contentChanged && message.state === 'reviewed') {
    update.state = 'draft';
    update.reviewed_hash = null;
  }
  if (Object.keys(update).length === 0) return NextResponse.json({ ok: true });

  const { error } = await context.service
    .from('networking_messages')
    .update(update)
    .eq('id', id)
    .eq('user_id', context.user.id);
  if (error) return NextResponse.json({ error: 'Could not update the draft' }, { status: 500 });
  return NextResponse.json({ ok: true, reviewInvalidated: contentChanged && message.state === 'reviewed' });
}

/**
 * Deletes a draft and its review history.
 */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await getNetworkingApiContext('message-review');
  if (result.response) return result.response;
  const { context } = result;
  const { id } = await params;
  if (!IdSchema.safeParse(id).success) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const { error } = await context.service
    .from('networking_messages')
    .delete()
    .eq('id', id)
    .eq('user_id', context.user.id);
  if (error) return NextResponse.json({ error: 'Could not delete the draft' }, { status: 500 });
  return NextResponse.json({ ok: true });
}
