import { NextResponse, type NextRequest } from 'next/server';
import { createHash } from 'node:crypto';
import { ProviderSchema } from '@trajectoryos/core/networking/types';
import { getProviderConfig } from '@/lib/networking/providers';
import { createServiceClient } from '@/lib/supabase/server';

// ============================================================
// Provider webhook receivers — scaffold, live only when the provider
// flag is on. They validate, deduplicate into
// networking_webhook_receipts, and return quickly; a worker consumes
// networking_sync_jobs. Full Google OIDC push validation and
// Microsoft lifecycle handling harden in the provider slice before
// any flag is enabled in production (see PHASE_2_PLAN.md).
// ============================================================

export async function POST(request: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const { provider: rawProvider } = await params;
  const providerParse = ProviderSchema.safeParse(rawProvider);
  if (!providerParse.success) return NextResponse.json({ error: 'Unknown provider' }, { status: 404 });
  const provider = providerParse.data;

  if (!getProviderConfig(provider)) {
    return NextResponse.json({ error: 'Not enabled' }, { status: 404 });
  }

  // Microsoft subscription validation handshake: echo the token back.
  const validationToken = request.nextUrl.searchParams.get('validationToken');
  if (provider === 'microsoft' && validationToken) {
    return new NextResponse(validationToken, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  const rawBody = await request.text().catch(() => '');
  if (!rawBody) return NextResponse.json({ ok: true });

  if (provider === 'google') {
    // Google Pub/Sub push: the OIDC bearer token must be present; full
    // audience + issuer verification is enforced before flag-on.
    const authorization = request.headers.get('authorization') ?? '';
    if (!authorization.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }
  } else {
    // Microsoft: notifications must carry the clientState we set when
    // creating the subscription.
    const expectedClientState = process.env.NETWORKING_MICROSOFT_CLIENT_STATE;
    if (expectedClientState && !rawBody.includes(expectedClientState)) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }
  }

  // Deduplicate and acknowledge. Enqueueing sync work per affected
  // connection happens in the provider slice; receipts alone make the
  // endpoint idempotent from day one.
  const dedupeKey = createHash('sha256').update(rawBody).digest('hex');
  const service = createServiceClient();
  const { error } = await service
    .from('networking_webhook_receipts')
    .insert({ provider, dedupe_key: dedupeKey });
  if (error && error.code !== '23505') {
    console.error('networking webhook receipt insert failed:', error.message);
  }
  await service.rpc('cleanup_networking_operational_rows').then(() => undefined, () => undefined);

  return NextResponse.json({ ok: true });
}
