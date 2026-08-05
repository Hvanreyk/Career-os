import { createHmac } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { stripeRequest, verifyStripeSignature } from '../../web/lib/billing/stripe';

const originalSecret = process.env.STRIPE_WEBHOOK_SECRET;
const originalApiKey = process.env.STRIPE_SECRET_KEY;

afterEach(() => {
  if (originalSecret === undefined) delete process.env.STRIPE_WEBHOOK_SECRET;
  else process.env.STRIPE_WEBHOOK_SECRET = originalSecret;
  if (originalApiKey === undefined) delete process.env.STRIPE_SECRET_KEY;
  else process.env.STRIPE_SECRET_KEY = originalApiKey;
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Stripe webhook signatures', () => {
  it('accepts a valid signature and safely rejects malformed hex', () => {
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
    const body = '{"id":"evt_test"}';
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const signature = createHmac('sha256', 'whsec_test').update(`${timestamp}.${body}`).digest('hex');
    expect(verifyStripeSignature(body, `t=${timestamp},v1=${signature}`)).toBe(true);
    expect(() => verifyStripeSignature(body, `t=${timestamp},v1=${'z'.repeat(64)}`)).not.toThrow();
    expect(verifyStripeSignature(body, `t=${timestamp},v1=${'z'.repeat(64)}`)).toBe(false);
  });

  it('bounds provider requests to 15 seconds', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test';
    const signal = new AbortController().signal;
    const timeout = vi.spyOn(AbortSignal, 'timeout').mockReturnValue(signal);
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new DOMException('Timed out', 'TimeoutError')));
    await expect(stripeRequest('/customers')).rejects.toMatchObject({ name: 'TimeoutError' });
    expect(timeout).toHaveBeenCalledWith(15_000);
  });

  it('rejects unreadable JSON from a successful Stripe response', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test';
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('not-json', { status: 200 })));
    await expect(stripeRequest('/customers')).rejects.toThrow('Stripe returned an unreadable success response.');
  });
});
