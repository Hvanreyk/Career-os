import { createHmac } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import { verifyStripeSignature } from '../../web/lib/billing/stripe';

const originalSecret = process.env.STRIPE_WEBHOOK_SECRET;

afterEach(() => {
  if (originalSecret === undefined) delete process.env.STRIPE_WEBHOOK_SECRET;
  else process.env.STRIPE_WEBHOOK_SECRET = originalSecret;
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
});
