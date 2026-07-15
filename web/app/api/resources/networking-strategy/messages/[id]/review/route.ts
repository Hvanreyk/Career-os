import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  generateNetworkingReview,
  NETWORKING_GENERATION_VERSION,
} from '@trajectoryos/core/llm/networking';
import { runPreflight, preflightPasses } from '@trajectoryos/core/networking';
import { MessageContextSchema } from '@trajectoryos/core/networking/types';
import {
  getNetworkingAiDailyLimit,
  getNetworkingApiContext,
  hashMessageContent,
  recordNetworkingEvent,
} from '@/lib/networking/server';

const IdSchema = z.uuid();

/**
 * Reviews a saved networking message draft after preflight checks and records the review against the exact content reviewed.
 *
 * @returns A JSON response containing the review, preflight results, review ID, and remaining AI quota, or an error response.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await getNetworkingApiContext('message-review');
  if (result.response) return result.response;
  const { context } = result;
  const { id } = await params;
  if (!IdSchema.safeParse(id).success) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const { data: message } = await context.service
    .from('networking_messages')
    .select('id, contact_id, channel, purpose, subject, body, context, state')
    .eq('id', id)
    .eq('user_id', context.user.id)
    .maybeSingle();
  if (!message) return NextResponse.json({ error: 'Message not found' }, { status: 404 });

  const { data: contact } = await context.service
    .from('networking_contacts')
    .select('id, full_name, firm, role_title, seniority, city, stage, is_alum, email_normalized')
    .eq('id', message.contact_id)
    .eq('user_id', context.user.id)
    .maybeSingle();
  if (!contact) return NextResponse.json({ error: 'Contact not found' }, { status: 404 });

  const messageContext = MessageContextSchema.safeParse(message.context);
  const ctx = messageContext.success
    ? messageContext.data
    : { personal_facts: [], ask: '', prior_interaction: '' };

  const preflight = runPreflight({
    channel: message.channel,
    purpose: message.purpose,
    subject: message.subject,
    body: message.body,
    ask: ctx.ask,
    hasRecipientEmail: Boolean(contact.email_normalized),
  });
  if (!preflightPasses(preflight)) {
    return NextResponse.json({ error: 'Fix the blocking issues before an AI review', preflight }, { status: 422 });
  }

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
    const generated = await generateNetworkingReview({
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
      subject: message.subject,
      body: message.body,
    });

    const inputHash = hashMessageContent(message.subject, message.body);
    const { data: reviewRows, error: saveError } = await context.service.rpc(
      'save_networking_message_review',
      {
        p_user_id: context.user.id,
        p_message_id: message.id,
        p_input_hash: inputHash,
        p_review: generated.output,
        p_model: generated.model,
        p_prompt_version: NETWORKING_GENERATION_VERSION,
        p_input_tokens: generated.usage.input_tokens,
        p_output_tokens: generated.usage.output_tokens,
      },
    );
    if (saveError) {
      await context.service.rpc('release_networking_review_quota', { p_user_id: context.user.id });
      if (saveError.message.includes('STALE_REVIEW')) {
        return NextResponse.json({ error: 'The draft changed while it was being reviewed. Review again.' }, { status: 409 });
      }
      return NextResponse.json({ error: 'Could not record the review' }, { status: 500 });
    }

    await recordNetworkingEvent(context, 'networking_message_reviewed', {
      channel: message.channel,
      purpose: message.purpose,
      prompt_version: NETWORKING_GENERATION_VERSION,
      model: generated.model,
    });
    const review = Array.isArray(reviewRows) ? reviewRows[0] : reviewRows;
    return NextResponse.json({
      review: generated.output,
      reviewId: review?.id ?? null,
      preflight,
      remaining: quota.remaining,
      resetsAt: quota.resets_at,
    });
  } catch (error) {
    await context.service.rpc('release_networking_review_quota', { p_user_id: context.user.id });
    console.error('networking review failed:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: 'AI review is temporarily unavailable' }, { status: 502 });
  }
}
