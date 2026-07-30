import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createPkce, openOauthState, sealOauthState } from '../../web/lib/networking/oauth.js';

describe('OAuth PKCE + state', () => {
  const previous = process.env.NETWORKING_OAUTH_STATE_SECRET;

  beforeEach(() => {
    process.env.NETWORKING_OAUTH_STATE_SECRET = 'test-secret-that-is-longer-than-thirty-two-characters';
  });

  afterEach(() => {
    if (previous === undefined) delete process.env.NETWORKING_OAUTH_STATE_SECRET;
    else process.env.NETWORKING_OAUTH_STATE_SECRET = previous;
  });

  it('derives a code challenge deterministically from the verifier', () => {
    const { codeVerifier, codeChallenge } = createPkce();
    expect(codeVerifier.length).toBeGreaterThan(32);
    expect(codeChallenge).not.toBe(codeVerifier);
  });

  it('round-trips a sealed state and matches on user/provider/nonce', () => {
    const { codeVerifier, nonce } = createPkce();
    const sealed = sealOauthState({ userId: 'user-1', provider: 'google', nonce, codeVerifier });
    const opened = openOauthState(sealed, { userId: 'user-1', provider: 'google', nonce });
    expect(opened?.codeVerifier).toBe(codeVerifier);
  });

  it('rejects a state opened for a different user (callback-to-user binding)', () => {
    const { codeVerifier, nonce } = createPkce();
    const sealed = sealOauthState({ userId: 'user-1', provider: 'google', nonce, codeVerifier });
    expect(openOauthState(sealed, { userId: 'user-2', provider: 'google', nonce })).toBeNull();
  });

  it('rejects a mismatched nonce', () => {
    const { codeVerifier, nonce } = createPkce();
    const sealed = sealOauthState({ userId: 'user-1', provider: 'google', nonce, codeVerifier });
    expect(openOauthState(sealed, { userId: 'user-1', provider: 'google', nonce: 'different-nonce' })).toBeNull();
  });

  it('rejects a mismatched provider', () => {
    const { codeVerifier, nonce } = createPkce();
    const sealed = sealOauthState({ userId: 'user-1', provider: 'google', nonce, codeVerifier });
    expect(openOauthState(sealed, { userId: 'user-1', provider: 'microsoft', nonce })).toBeNull();
  });

  it('rejects a tampered cookie value', () => {
    const { codeVerifier, nonce } = createPkce();
    const sealed = sealOauthState({ userId: 'user-1', provider: 'google', nonce, codeVerifier });
    expect(openOauthState(`${sealed}tampered`, { userId: 'user-1', provider: 'google', nonce })).toBeNull();
  });
});
