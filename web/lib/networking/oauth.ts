import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';

// ============================================================
// OAuth state + PKCE helpers. The code verifier and state nonce are
// carried in an HMAC-signed, httpOnly, short-lived cookie bound to
// the initiating user, so the callback can only complete for the
// browser + user that started the flow.
// ============================================================

const STATE_LIFETIME_SECONDS = 10 * 60;
export const OAUTH_STATE_COOKIE = 'networking_oauth_state';

/**
 * Retrieves the secret used to sign and verify OAuth state values.
 *
 * @returns A configured secret containing at least 32 characters
 * @throws If neither supported environment variable provides a secret of sufficient length
 */
function stateSecret(): string {
  const secret = process.env.NETWORKING_OAUTH_STATE_SECRET ?? process.env.CRITIQUE_RECEIPT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('NETWORKING_OAUTH_STATE_SECRET (or CRITIQUE_RECEIPT_SECRET) must contain at least 32 characters');
  }
  return secret;
}

export interface OauthStatePayload {
  userId: string;
  provider: string;
  nonce: string;
  codeVerifier: string;
  expiresAt: number;
}

/** Generates PKCE verifier + S256 challenge and a random state nonce. */
export function createPkce(): { codeVerifier: string; codeChallenge: string; nonce: string } {
  const codeVerifier = randomBytes(48).toString('base64url');
  const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url');
  return { codeVerifier, codeChallenge, nonce: randomBytes(24).toString('base64url') };
}

/**
 * Creates a signed, short-lived OAuth state value for cookie storage.
 *
 * @param payload - The OAuth state data to protect.
 * @returns The base64url-encoded state payload and its HMAC signature.
 */
export function sealOauthState(payload: Omit<OauthStatePayload, 'expiresAt'>): string {
  const full: OauthStatePayload = {
    ...payload,
    expiresAt: Math.floor(Date.now() / 1000) + STATE_LIFETIME_SECONDS,
  };
  const encoded = Buffer.from(JSON.stringify(full)).toString('base64url');
  const signature = createHmac('sha256', stateSecret()).update(encoded).digest('base64url');
  return `${encoded}.${signature}`;
}

/**
 * Verifies an OAuth state cookie against the expected callback context.
 *
 * @param cookieValue - The signed OAuth state cookie value
 * @param expected - The user, provider, and nonce required in the state payload
 * @returns The validated OAuth state payload, or `null` if the value is malformed, invalid, mismatched, or expired
 */
export function openOauthState(
  cookieValue: string,
  expected: { userId: string; provider: string; nonce: string },
): OauthStatePayload | null {
  const [encoded, suppliedSignature, extra] = cookieValue.split('.');
  if (!encoded || !suppliedSignature || extra !== undefined) return null;
  const expectedSignature = Buffer.from(
    createHmac('sha256', stateSecret()).update(encoded).digest('base64url'),
  );
  const supplied = Buffer.from(suppliedSignature);
  if (expectedSignature.length !== supplied.length || !timingSafeEqual(expectedSignature, supplied)) {
    return null;
  }
  let payload: OauthStatePayload;
  try {
    payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as OauthStatePayload;
  } catch {
    return null;
  }
  if (
    payload.userId !== expected.userId
    || payload.provider !== expected.provider
    || payload.nonce !== expected.nonce
    || payload.expiresAt <= Math.floor(Date.now() / 1000)
  ) {
    return null;
  }
  return payload;
}
