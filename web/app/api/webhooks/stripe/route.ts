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
  const { data: customer } = await service.from('billing_customers')
    .select('user_id').eq('provider_customer_id', subscription.customer).maybeSingle();
  if (!customer) throw new Error(`Unknown Stripe customer ${subscription.customer}`);
  const priceId = subscription.items?.data?.[0]?.price?.id ?? process.env.STRIPE_TECHNICAL_CORE_PRICE_ID ?? 'unknown';
  const graceEndsAt = subscription.status === 'past_due'
    ? new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString()
    : null;
  await service.from('billing_subscriptions').upsert({
    user_id: customer.user_id,
    provider_subscription_id: subscription.id,
    provider_price_id: priceId,
    status: subscription.status,
    current_period_start: iso(subscription.current_period_start),
    current_period_end: iso(subscription.current_period_end),
    cancel_at_period_end: subscription.cancel_at_period_end,
    grace_ends_at: graceEndsAt,
  }, { onConflict: 'provider_subscription_id' });
  const active = ['active', 'trialing'].includes(subscription.status);
  const grace = subscription.status === 'past_due';
  await service.from('resource_entitlements').upsert({
    user_id: customer.user_id,
    resource_slug: 'interview-preparation',
    capability: 'question-bank',
    source: 'subscription',
    source_reference: subscription.id,
    status: active ? 'active' : grace ? 'grace' : 'expired',
    starts_at: iso(subscription.current_period_start) ?? new Date().toISOString(),
    ends_at: grace ? graceEndsAt : iso(subscription.current_period_end),
  }, { onConflict: 'user_id,resource_slug,capability,source' });
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!verifyStripeSignature(rawBody, request.headers.get('stripe-signature'))) {
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
  }
  const event = JSON.parse(rawBody) as StripeEvent;
  const service = createServiceClient();
  const { error: receiptError } = await service.from('billing_webhook_receipts').insert({
    provider_event_id: event.id,
    event_type: event.type,
    payload_hash: hashWebhookPayload(rawBody),
  });
  if (receiptError?.code === '23505') return NextResponse.json({ received: true, duplicate: true });
  if (receiptError) return NextResponse.json({ error: 'Could not record webhook' }, { status: 500 });
  try {
    if (event.type.startsWith('customer.subscription.')) {
      await syncSubscription(service, event.data.object as unknown as StripeSubscription);
    } else if (event.type === 'checkout.session.completed') {
      const object = event.data.object;
      const userId = (object.metadata as Record<string, string> | undefined)?.user_id;
      const customerId = typeof object.customer === 'string' ? object.customer : null;
      const subscriptionId = typeof object.subscription === 'string' ? object.subscription : null;
      if (userId && customerId) await service.from('billing_customers').upsert({
        user_id: userId, provider_customer_id: customerId,
      }, { onConflict: 'user_id' });
      if (subscriptionId) await syncSubscription(service, await getStripeSubscription(subscriptionId));
    }
    await service.from('billing_webhook_receipts').update({ status: 'processed', processed_at: new Date().toISOString() })
      .eq('provider_event_id', event.id);
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('stripe webhook processing failed:', error);
    await service.from('billing_webhook_receipts').update({
      status: 'error', error_message: error instanceof Error ? error.message.slice(0, 1000) : 'Unknown error',
    }).eq('provider_event_id', event.id);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
