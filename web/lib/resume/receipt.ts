import { createHmac, timingSafeEqual } from 'node:crypto';
import {
  ResumeCritiqueSchema,
  type ResumeCritique,
} from '@trajectoryos/core/resume/types';

const RECEIPT_LIFETIME_SECONDS = 2 * 60 * 60;

export interface CritiqueReceiptPayload {
  userId: string;
  bulletId: string;
  inputHash: string;
  critique: ResumeCritique;
  model: string;
  promptVersion: string;
  usage: { input_tokens: number; output_tokens: number };
  issuedAt: number;
  expiresAt: number;
}

/**
 * Retrieves the secret used to sign critique receipts.
 *
 * @returns The configured receipt secret
 * @throws Error If `CRITIQUE_RECEIPT_SECRET` is missing or contains fewer than 32 characters
 */
function receiptSecret(): string {
  const secret = process.env.CRITIQUE_RECEIPT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('CRITIQUE_RECEIPT_SECRET must contain at least 32 characters');
  }
  return secret;
}

/**
 * Generates a base64url-encoded HMAC-SHA256 signature for an encoded payload.
 *
 * @param encodedPayload - The payload to sign.
 * @returns The base64url-encoded signature.
 */
function signature(encodedPayload: string): string {
  return createHmac('sha256', receiptSecret()).update(encodedPayload).digest('base64url');
}

/**
 * Creates a signed receipt containing a critique payload and its validity period.
 *
 * @param payload - The critique receipt data without issuance and expiration timestamps
 * @returns The signed receipt and its expiration time as an ISO timestamp
 */
export function createCritiqueReceipt(
  payload: Omit<CritiqueReceiptPayload, 'issuedAt' | 'expiresAt'>,
): { receipt: string; expiresAt: string } {
  const issuedAt = Math.floor(Date.now() / 1000);
  const fullPayload: CritiqueReceiptPayload = {
    ...payload,
    issuedAt,
    expiresAt: issuedAt + RECEIPT_LIFETIME_SECONDS,
  };
  const encoded = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
  return {
    receipt: `${encoded}.${signature(encoded)}`,
    expiresAt: new Date(fullPayload.expiresAt * 1000).toISOString(),
  };
}

export class ReceiptError extends Error {
  constructor(readonly code: 'INVALID' | 'EXPIRED') {
    super(code === 'EXPIRED' ? 'Critique receipt expired' : 'Invalid critique receipt');
    this.name = 'ReceiptError';
  }
}

/**
 * Verifies a signed critique receipt and validates its contents and expiration.
 *
 * @param receipt - The signed receipt to verify.
 * @returns The validated critique receipt payload.
 * @throws `ReceiptError` with code `INVALID` when the receipt is malformed, unsigned, or contains invalid data.
 * @throws `ReceiptError` with code `EXPIRED` when the receipt has expired.
 */
export function verifyCritiqueReceipt(receipt: string): CritiqueReceiptPayload {
  const [encoded, suppliedSignature, extra] = receipt.split('.');
  if (!encoded || !suppliedSignature || extra) throw new ReceiptError('INVALID');
  const expected = Buffer.from(signature(encoded));
  const supplied = Buffer.from(suppliedSignature);
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) {
    throw new ReceiptError('INVALID');
  }

  let value: unknown;
  try {
    value = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
  } catch {
    throw new ReceiptError('INVALID');
  }
  if (!value || typeof value !== 'object') throw new ReceiptError('INVALID');
  const p = value as Record<string, unknown>;
  const usage = p.usage as Record<string, unknown> | undefined;
  if (
    typeof p.userId !== 'string' ||
    typeof p.bulletId !== 'string' ||
    typeof p.inputHash !== 'string' ||
    !/^[a-f0-9]{64}$/.test(p.inputHash) ||
    typeof p.model !== 'string' ||
    typeof p.promptVersion !== 'string' ||
    typeof p.issuedAt !== 'number' ||
    typeof p.expiresAt !== 'number' ||
    !usage ||
    typeof usage.input_tokens !== 'number' ||
    typeof usage.output_tokens !== 'number'
  ) {
    throw new ReceiptError('INVALID');
  }
  const critique = ResumeCritiqueSchema.safeParse(p.critique);
  if (!critique.success) throw new ReceiptError('INVALID');
  if (p.expiresAt <= Math.floor(Date.now() / 1000)) throw new ReceiptError('EXPIRED');

  return {
    userId: p.userId,
    bulletId: p.bulletId,
    inputHash: p.inputHash,
    critique: critique.data,
    model: p.model,
    promptVersion: p.promptVersion,
    usage: {
      input_tokens: usage.input_tokens,
      output_tokens: usage.output_tokens,
    },
    issuedAt: p.issuedAt,
    expiresAt: p.expiresAt,
  };
}
