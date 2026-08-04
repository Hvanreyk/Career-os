import { NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth';
import { stripeRequest } from '@/lib/billing/stripe';
import { createServiceClient } from '@/lib/supabase/server';

interface StripeCustomer { id: string }
interface StripeCheckoutSession { id: string; url: string | null }

export async function POST(request: Request) {
  if (process.env.INTERVIEW_BILLING_ENABLED !== 'true') {
    return NextResponse.json({ error: 'Billing is disabled during product testing' }, { status: 404 });
  }
  const user = await getRequestUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  const priceId = process.env.STRIPE_TECHNICAL_CORE_PRICE_ID;
  if (!priceId) return NextResponse.json({ error: 'Technical Core billing is not configured' }, { status: 503 });
  const service = createServiceClient();
  const { data: existing } = await service.from('billing_customers')
    .select('provider_customer_id').eq('user_id', user.id).maybeSingle();
  let customerId = existing?.provider_customer_id ?? null;
  try {
    if (!customerId) {
      const customerValues = new URLSearchParams({
        email: user.email ?? '',
        'metadata[user_id]': user.id,
        'metadata[product]': 'technical_core',
      });
      const customer = await stripeRequest<StripeCustomer>('/customers', customerValues);
      customerId = customer.id;
      await service.from('billing_customers').upsert({
        user_id: user.id,
        provider_customer_id: customerId,
      }, { onConflict: 'user_id' });
    }
    const origin = new URL(request.url).origin;
    const values = new URLSearchParams({
      mode: 'subscription',
      customer: customerId,
      'line_items[0][price]': priceId,
      'line_items[0][quantity]': '1',
      success_url: `${origin}/resources/interview-preparation/practice?checkout=success`,
      cancel_url: `${origin}/resources/interview-preparation/practice?checkout=cancelled`,
      'subscription_data[metadata][user_id]': user.id,
      'subscription_data[metadata][product]': 'technical_core',
      'metadata[user_id]': user.id,
      'metadata[product]': 'technical_core',
      allow_promotion_codes: 'true',
    });
    const session = await stripeRequest<StripeCheckoutSession>('/checkout/sessions', values);
    if (!session.url) throw new Error('Stripe did not return a checkout URL.');
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('technical checkout failed:', error);
    return NextResponse.json({ error: 'Could not start checkout' }, { status: 502 });
  }
}
