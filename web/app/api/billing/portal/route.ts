import { NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/auth';
import { stripeRequest } from '@/lib/billing/stripe';
import { createServiceClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  if (process.env.INTERVIEW_BILLING_ENABLED !== 'true') {
    return NextResponse.json({ error: 'Billing is disabled during product testing' }, { status: 404 });
  }
  const user = await getRequestUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  const service = createServiceClient();
  const { data: customer } = await service.from('billing_customers')
    .select('provider_customer_id').eq('user_id', user.id).maybeSingle();
  if (!customer) return NextResponse.json({ error: 'Billing account not found' }, { status: 404 });
  try {
    const session = await stripeRequest<{ url: string }>('/billing_portal/sessions', new URLSearchParams({
      customer: customer.provider_customer_id,
      return_url: `${new URL(request.url).origin}/resources/interview-preparation/practice`,
    }));
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('billing portal failed:', error);
    return NextResponse.json({ error: 'Could not open billing portal' }, { status: 502 });
  }
}
