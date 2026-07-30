import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { decryptToken, encryptToken, TokenCryptoError } from '../../web/lib/networking/crypto.js';

describe('token encryption', () => {
  const previousKey = process.env.NETWORKING_TOKEN_KEY;
  const previousVersion = process.env.NETWORKING_TOKEN_KEY_VERSION;

  beforeEach(() => {
    process.env.NETWORKING_TOKEN_KEY = Buffer.alloc(32, 7).toString('base64');
    process.env.NETWORKING_TOKEN_KEY_VERSION = '1';
  });

  afterEach(() => {
    if (previousKey === undefined) delete process.env.NETWORKING_TOKEN_KEY;
    else process.env.NETWORKING_TOKEN_KEY = previousKey;
    if (previousVersion === undefined) delete process.env.NETWORKING_TOKEN_KEY_VERSION;
    else process.env.NETWORKING_TOKEN_KEY_VERSION = previousVersion;
  });

  const aad = { userId: 'user-1', provider: 'google', connectionId: 'conn-1' };

  it('round-trips a refresh token', () => {
    const { ciphertext, keyVersion } = encryptToken('super-secret-refresh-token', aad);
    expect(decryptToken(ciphertext, keyVersion, aad)).toBe('super-secret-refresh-token');
  });

  it('fails to decrypt when the AAD context does not match (cross-user binding)', () => {
    const { ciphertext, keyVersion } = encryptToken('token', aad);
    expect(() => decryptToken(ciphertext, keyVersion, { ...aad, userId: 'someone-else' }))
      .toThrow(TokenCryptoError);
  });

  it('fails to decrypt tampered ciphertext', () => {
    const { ciphertext, keyVersion } = encryptToken('token', aad);
    const tampered = ciphertext.slice(0, -4) + 'XXXX';
    expect(() => decryptToken(tampered, keyVersion, aad)).toThrow(TokenCryptoError);
  });

  it('rejects malformed ciphertext', () => {
    expect(() => decryptToken('not-a-valid-ciphertext', 1, aad)).toThrow(TokenCryptoError);
  });

  it('produces different ciphertext for the same plaintext (random nonce)', () => {
    const first = encryptToken('token', aad);
    const second = encryptToken('token', aad);
    expect(first.ciphertext).not.toBe(second.ciphertext);
  });

  it('throws a clear error when no key is configured', () => {
    delete process.env.NETWORKING_TOKEN_KEY;
    expect(() => encryptToken('token', aad)).toThrow(TokenCryptoError);
  });
});
