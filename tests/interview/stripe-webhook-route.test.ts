import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createServiceClient: vi.fn(),
  getStripeSubscription: vi.fn(),
  hashWebhookPayload: vi.fn(() => 'a'.repeat(64)),
  verifyStripeSignature: vi.fn(() => true),
}));

vi.mock('@/lib/supabase/server', () => ({ createServiceClient: mocks.createServiceClient }));
vi.mock('@/lib/billing/stripe', () => ({
  getStripeSubscription: mocks.getStripeSubscription,
  hashWebhookPayload: mocks.hashWebhookPayload,
  verifyStripeSignature: mocks.verifyStripeSignature,
}));

import { POST } from '../../web/app/api/webhooks/stripe/route';

afterEach(() => vi.clearAllMocks());

function webhookRequest(event: Record<string, unknown>) {
  return new Request('http://localhost/api/webhooks/stripe', {
    method: 'POST',
    headers: { 'stripe-signature': 'test-signature' },
    body: JSON.stringify(event),
  });
}

describe('Stripe webhook route', () => {
  it('atomically reclaims and processes a matching receipt that previously failed', async () => {
    const existingQuery = {
      select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn(),
    };
    existingQuery.select.mockReturnValue(existingQuery);
    existingQuery.eq.mockReturnValue(existingQuery);
    existingQuery.maybeSingle.mockResolvedValue({ data: { status: 'error', payload_hash: 'a'.repeat(64) }, error: null });

    const reclaimQuery = {
      eq: vi.fn(), select: vi.fn(), maybeSingle: vi.fn(),
    };
    reclaimQuery.eq.mockReturnValue(reclaimQuery);
    reclaimQuery.select.mockReturnValue(reclaimQuery);
    reclaimQuery.maybeSingle.mockResolvedValue({ data: { provider_event_id: 'evt_retry' }, error: null });
    const processedQuery = { eq: vi.fn().mockResolvedValue({ error: null }) };
    const receiptTable = {
      insert: vi.fn().mockResolvedValue({ error: { code: '23505' } }),
      select: vi.fn().mockReturnValue(existingQuery),
      update: vi.fn((values: { status: string }) => values.status === 'processing' ? reclaimQuery : processedQuery),
    };
    mocks.createServiceClient.mockReturnValue({ from: vi.fn().mockReturnValue(receiptTable) });

    const response = await POST(webhookRequest({ id: 'evt_retry', type: 'ping', data: { object: {} } }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ received: true });
    expect(receiptTable.update).toHaveBeenCalledWith({ status: 'processing', error_message: null, processed_at: null });
    expect(receiptTable.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'processed', error_message: null }));
  });

  it('returns an error when subscription persistence fails instead of acknowledging the event', async () => {
    const receiptUpdates: Array<Record<string, unknown>> = [];
    const receiptTable = {
      insert: vi.fn().mockResolvedValue({ error: null }),
      update: vi.fn((values: Record<string, unknown>) => {
        receiptUpdates.push(values);
        return { eq: vi.fn().mockResolvedValue({ error: null }) };
      }),
    };
    const customerQuery = { select: vi.fn(), eq: vi.fn(), maybeSingle: vi.fn() };
    customerQuery.select.mockReturnValue(customerQuery);
    customerQuery.eq.mockReturnValue(customerQuery);
    customerQuery.maybeSingle.mockResolvedValue({ data: { user_id: 'user-1' }, error: null });
    const customerTable = { select: customerQuery.select };
    const subscriptionTable = {
      upsert: vi.fn().mockResolvedValue({ error: { message: 'database unavailable' } }),
    };
    const service = {
      from: vi.fn((table: string) => {
        if (table === 'billing_webhook_receipts') return receiptTable;
        if (table === 'billing_customers') return customerTable;
        if (table === 'billing_subscriptions') return subscriptionTable;
        throw new Error(`Unexpected table ${table}`);
      }),
    };
    mocks.createServiceClient.mockReturnValue(service);

    const response = await POST(webhookRequest({
      id: 'evt_subscription',
      type: 'customer.subscription.updated',
      data: { object: { id: 'sub-1', customer: 'cus-1', status: 'active', items: { data: [] } } },
    }));

    expect(response.status).toBe(500);
    expect(receiptUpdates).toContainEqual(expect.objectContaining({ status: 'error' }));
    expect(receiptUpdates).not.toContainEqual(expect.objectContaining({ status: 'processed' }));
  });
});
