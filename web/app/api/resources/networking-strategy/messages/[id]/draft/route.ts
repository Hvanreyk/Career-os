import { NextResponse } from 'next/server';
import { z } from 'zod';
import { generateNetworkingDraft } from '@trajectoryos/core/llm/networking';
import { MessageContextSchema } from '@trajectoryos/core/networking/types';
import {
  getNetworkingAiDailyLimit,
  getNetworkingApiContext,
  recordNetworkingEvent,
} from '@/lib/networking/server';

const IdSchema = z.uuid();

/**
 * Generates an AI first draft from the student's structured, truthful
 * context and writes it into the saved message (state stays 'draft' —
 * the student always edits and reviews before anything is sent).
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await getNetworkingApiContext('message-review');
  if (result.response) return result.response;
  const { context } = result;
  const { id } = await params;
  if (!IdSchema.safeParse(id).success) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const { data: message } = await context.service
    .from('networking_messages')
    .select('id, contact_id, channel, purpose, context, state')
    .eq('id', id)
    .eq('user_id', context.user.id)
    .maybeSingle();
  if (!message) return NextResponse.json({ error: 'Message not found' }, { status: 404 });
  if (message.state === 'sent' || message.state === 'sending') {
    return NextResponse.json({ error: 'Sent messages cannot be redrafted' }, { status: 422 });
  }

  const { data: contact } = await context.service
    .from('networking_contacts')
    .select('id, full_name, firm, role_title, seniority, city, stage, is_alum, do_not_contact')
    .eq('id', message.contact_id)
    .eq('user_id', context.user.id)
    .maybeSingle();
  if (!contact) return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
  if (contact.do_not_contact) {
    return NextResponse.json({ error: 'This contact is marked do-not-contact' }, { status: 422 });
  }

  const messageContext = MessageContextSchema.safeParse(message.context);
  const ctx = messageContext.success
    ? messageContext.data
    : { personal_facts: [], ask: '', prior_interaction: '' };

  const limit = getNetworkingAiDailyLimit();
  const { data: quotaRows, error: quotaError } = await context.service.rpc(
    'claim_networking_review_quota',
    { p_user_id: context.user.id, p_limit: limit },
  );
  const quota = Array.isArray(quotaRows) ? quotaRows[0] : null;
  if (quotaError || !quota) return NextResponse.json({ error: 'Could not check the AI quota' }, { status: 500 });
  if (!quota.allowed) {
    return NextResponse.json({
      error: 'Daily AI limit reached',
      remaining: 0,
      resetsAt: quota.resets_at,
    }, { status: 429 });
  }

  try {
    const generated = await generateNetworkingDraft({
      channel: message.channel,
      purpose: message.purpose,
      stage: contact.stage,
      contact: {
        name: contact.full_name,
        firm: contact.firm,
        roleTitle: contact.role_title,
        seniority: contact.seniority,
        city: contact.city,
        isAlum: contact.is_alum,
      },
      facts: ctx.personal_facts,
      ask: ctx.ask,
      priorInteraction: ctx.prior_interaction,
    });

    const { error } = await context.service
      .from('networking_messages')
      .update({
        subject: message.channel === 'email' ? generated.output.subject : '',
        body: generated.output.body,
        state: 'draft',
        reviewed_hash: null,
      })
      .eq('id', message.id)
      .eq('user_id', context.user.id);
    if (error) {
      await context.service.rpc('release_networking_review_quota', { p_user_id: context.user.id });
      return NextResponse.json({ error: 'Could not save the draft' }, { status: 500 });
    }

    await recordNetworkingEvent(context, 'networking_message_ai_drafted', {
      channel: message.channel,
      purpose: message.purpose,
      model: generated.model,
    });
    return NextResponse.json({
      draft: generated.output,
      remaining: quota.remaining,
      resetsAt: quota.resets_at,
    });
  } catch (error) {
    await context.service.rpc('release_networking_review_quota', { p_user_id: context.user.id });
    console.error('networking draft failed:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: 'AI drafting is temporarily unavailable' }, { status: 502 });
  }
}
