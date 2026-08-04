import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

const STRIPE_API = 'https://api.stripe.com/v1';
const STRIPE_REQUEST_TIMEOUT_MS = 15_000;

function secretKey(): string {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not configured.');
  return key;
}

interface StripeRequestOptions {
  method?: 'GET' | 'POST';
  idempotencyKey?: string;
}

export async function stripeRequest<T>(
  path: string,
  values?: URLSearchParams,
  options: StripeRequestOptions = {},
): Promise<T> {
  const response = await fetch(`${STRIPE_API}${path}`, {
    method: options.method ?? 'POST',
    signal: AbortSignal.timeout(STRIPE_REQUEST_TIMEOUT_MS),
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      ...(values ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
      ...(options.idempotencyKey ? { 'Idempotency-Key': options.idempotencyKey } : {}),
    },
    body: values,
  });
  let payload: unknown;
  try {
    payload = await response.json();
  } catch (error) {
    if (response.ok) throw new Error('Stripe returned an unreadable success response.', { cause: error });
    payload = null;
  }
  const errorMessage = payload && typeof payload === 'object' && 'error' in payload
    && payload.error && typeof payload.error === 'object' && 'message' in payload.error
    && typeof payload.error.message === 'string'
    ? payload.error.message
    : null;
  if (!response.ok) throw new Error(errorMessage ?? `Stripe request failed (${response.status})`);
  if (!payload || typeof payload !== 'object') throw new Error('Stripe returned a malformed success response.');
  return payload as T;
}

export function verifyStripeSignature(body: string, signatureHeader: string | null): boolean {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !signatureHeader) return false;
  const parts = signatureHeader.split(',').map((part) => part.split('=', 2));
  const timestamp = parts.find(([key]) => key === 't')?.[1];
  const signatures = parts.filter(([key]) => key === 'v1').map(([, value]) => value).filter(Boolean) as string[];
  if (!timestamp || !signatures.length) return false;
  const seconds = Number(timestamp);
  if (!Number.isFinite(seconds) || Math.abs(Date.now() / 1000 - seconds) > 300) return false;
  const expected = createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
  return signatures.some((signature) => {
    if (!/^[0-9a-f]{64}$/i.test(signature)) return false;
    const received = Buffer.from(signature, 'hex');
    const expectedBytes = Buffer.from(expected, 'hex');
    if (received.length !== expectedBytes.length) return false;
    return timingSafeEqual(received, expectedBytes);
  });
}

export function hashWebhookPayload(body: string): string {
  return createHash('sha256').update(body).digest('hex');
}

export interface StripeSubscription {
  id: string;
  customer: string;
  status: string;
  cancel_at_period_end: boolean;
  current_period_start: number;
  current_period_end: number;
  items?: { data?: Array<{ price?: { id?: string } }> };
}

export async function getStripeSubscription(id: string): Promise<StripeSubscription> {
  return stripeRequest<StripeSubscription>(`/subscriptions/${encodeURIComponent(id)}`, undefined, { method: 'GET' });
}
