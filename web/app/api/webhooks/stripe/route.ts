import { NextResponse } from 'next/server';
import {
  getStripeSubscription,
  hashWebhookPayload,
  type StripeSubscription,
  verifyStripeSignature,
} from '@/lib/billing/stripe';
import { createServiceClient } from '@/lib/supabase/server';

interface StripeEvent {
  id: string;
  type: string;
  data: { object: Record<string, unknown> };
}

function iso(seconds: number | undefined): string | null {
  return seconds ? new Date(seconds * 1000).toISOString() : null;
}

async function syncSubscription(service: ReturnType<typeof createServiceClient>, subscription: StripeSubscription) {
  const { data: customer, error: customerError } = await service.from('billing_customers')
    .select('user_id').eq('provider_customer_id', subscription.customer).maybeSingle();
  if (customerError) throw new Error(`Could not load Stripe customer: ${customerError.message}`);
  if (!customer) throw new Error(`Unknown Stripe customer ${subscription.customer}`);
  const priceId = subscription.items?.data?.[0]?.price?.id ?? process.env.STRIPE_TECHNICAL_CORE_PRICE_ID ?? 'unknown';
  const graceEndsAt = subscription.status === 'past_due'
    ? new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString()
    : null;
  const { error: subscriptionError } = await service.from('billing_subscriptions').upsert({
    user_id: customer.user_id,
    provider_subscription_id: subscription.id,
    provider_price_id: priceId,
    status: subscription.status,
    current_period_start: iso(subscription.current_period_start),
    current_period_end: iso(subscription.current_period_end),
    cancel_at_period_end: subscription.cancel_at_period_end,
    grace_ends_at: graceEndsAt,
  }, { onConflict: 'provider_subscription_id' });
  if (subscriptionError) throw new Error(`Could not sync subscription: ${subscriptionError.message}`);
  const active = ['active', 'trialing'].includes(subscription.status);
  const grace = subscription.status === 'past_due';
  const { error: entitlementError } = await service.from('resource_entitlements').upsert({
    user_id: customer.user_id,
    resource_slug: 'interview-preparation',
    capability: 'question-bank',
    source: 'subscription',
    source_reference: subscription.id,
    status: active ? 'active' : grace ? 'grace' : 'expired',
    starts_at: iso(subscription.current_period_start) ?? new Date().toISOString(),
    ends_at: grace ? graceEndsAt : iso(subscription.current_period_end),
  }, { onConflict: 'user_id,resource_slug,capability,source' });
  if (entitlementError) throw new Error(`Could not sync entitlement: ${entitlementError.message}`);
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!verifyStripeSignature(rawBody, request.headers.get('stripe-signature'))) {
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
  }
  const event = JSON.parse(rawBody) as StripeEvent;
  const service = createServiceClient();
  const payloadHash = hashWebhookPayload(rawBody);
  const { error: receiptError } = await service.from('billing_webhook_receipts').insert({
    provider_event_id: event.id,
    event_type: event.type,
    payload_hash: payloadHash,
  });
  if (receiptError?.code === '23505') {
    const { data: receipt, error: existingReceiptError } = await service.from('billing_webhook_receipts')
      .select('status, payload_hash').eq('provider_event_id', event.id).maybeSingle();
    if (existingReceiptError || !receipt) {
      return NextResponse.json({ error: 'Could not verify webhook receipt' }, { status: 500 });
    }
    if (receipt.payload_hash !== payloadHash) {
      return NextResponse.json({ error: 'Webhook event payload does not match the original receipt' }, { status: 409 });
    }
    if (receipt.status !== 'error') {
      return NextResponse.json({ received: true, duplicate: true });
    }
    const { data: reclaimed, error: reclaimError } = await service.from('billing_webhook_receipts')
      .update({ status: 'processing', error_message: null, processed_at: null })
      .eq('provider_event_id', event.id).eq('status', 'error')
      .select('provider_event_id').maybeSingle();
    if (reclaimError) return NextResponse.json({ error: 'Could not retry webhook' }, { status: 500 });
    if (!reclaimed) return NextResponse.json({ received: true, duplicate: true });
  }
  if (receiptError && receiptError.code !== '23505') {
    return NextResponse.json({ error: 'Could not record webhook' }, { status: 500 });
  }
  try {
    if (event.type.startsWith('customer.subscription.')) {
      await syncSubscription(service, event.data.object as unknown as StripeSubscription);
    } else if (event.type === 'checkout.session.completed') {
      const object = event.data.object;
      const userId = (object.metadata as Record<string, string> | undefined)?.user_id;
      const customerId = typeof object.customer === 'string' ? object.customer : null;
      const subscriptionId = typeof object.subscription === 'string' ? object.subscription : null;
      if (userId && customerId) {
        const { error: customerUpsertError } = await service.from('billing_customers').upsert({
          user_id: userId, provider_customer_id: customerId,
        }, { onConflict: 'user_id' });
        if (customerUpsertError) throw new Error(`Could not sync checkout customer: ${customerUpsertError.message}`);
      }
      if (subscriptionId) await syncSubscription(service, await getStripeSubscription(subscriptionId));
    }
    const { error: processedError } = await service.from('billing_webhook_receipts')
      .update({ status: 'processed', processed_at: new Date().toISOString(), error_message: null })
      .eq('provider_event_id', event.id);
    if (processedError) throw new Error(`Could not complete webhook receipt: ${processedError.message}`);
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('stripe webhook processing failed:', error);
    const { error: receiptUpdateError } = await service.from('billing_webhook_receipts').update({
      status: 'error', error_message: error instanceof Error ? error.message.slice(0, 1000) : 'Unknown error',
    }).eq('provider_event_id', event.id);
    if (receiptUpdateError) console.error('stripe webhook receipt error update failed:', receiptUpdateError.message);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
