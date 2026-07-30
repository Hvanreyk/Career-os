import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createCritiqueReceipt, ReceiptError, verifyCritiqueReceipt } from '../../web/lib/resume/receipt.js';

const critique = {
  summary: 'Clear action with room for more context.',
  strengths: ['Uses a direct action.'],
  improvements: [],
  rewrite_options: [{ text: 'Analysed the available scenarios.', change_summary: 'Keeps the supplied facts.' }],
};

describe('critique receipts', () => {
  const previous = process.env.CRITIQUE_RECEIPT_SECRET;

  beforeEach(() => {
    process.env.CRITIQUE_RECEIPT_SECRET = 'test-secret-that-is-longer-than-thirty-two-characters';
  });
  afterEach(() => {
    process.env.CRITIQUE_RECEIPT_SECRET = previous;
  });

  it('round-trips a signed critique payload', () => {
    const signed = createCritiqueReceipt({
      userId: 'user-1',
      bulletId: 'bullet-1',
      inputHash: 'a'.repeat(64),
      critique,
      model: 'gpt-test',
      promptVersion: 'resume-critique-v1',
      usage: { input_tokens: 20, output_tokens: 40 },
    });
    const payload = verifyCritiqueReceipt(signed.receipt);
    expect(payload.bulletId).toBe('bullet-1');
    expect(payload.critique).toEqual(critique);
    expect(new Date(signed.expiresAt).getTime()).toBeGreaterThan(Date.now());
  });

  it('rejects a modified receipt', () => {
    const signed = createCritiqueReceipt({
      userId: 'user-1', bulletId: 'bullet-1', inputHash: 'a'.repeat(64), critique,
      model: 'gpt-test', promptVersion: 'resume-critique-v1',
      usage: { input_tokens: 20, output_tokens: 40 },
    });
    const modified = `${signed.receipt.slice(0, -1)}x`;
    expect(() => verifyCritiqueReceipt(modified)).toThrow(ReceiptError);
  });
});
