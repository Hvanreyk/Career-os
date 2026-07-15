import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

// ============================================================
// Refresh-token encryption: AES-256-GCM with key versioning.
//
// Keys live only in server env vars:
//   NETWORKING_TOKEN_KEY        — base64, 32 bytes (current key)
//   NETWORKING_TOKEN_KEY_VERSION — integer, default 1
//   NETWORKING_TOKEN_KEY_V<N>   — older keys kept for rotation
//
// The authenticated context (AAD) binds ciphertext to the owning
// user + provider + connection, so a ciphertext copied onto another
// row fails authentication. Token material never reaches the browser.
// ============================================================

const IV_BYTES = 12;

export class TokenCryptoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TokenCryptoError';
  }
}

/**
 * Loads and validates the 32-byte encryption key for a specified version.
 *
 * @param version - The encryption key version to load
 * @returns The decoded encryption key
 * @throws `TokenCryptoError` if the key is not configured or is not 32 bytes
 */
function keyForVersion(version: number): Buffer {
  const current = Number(process.env.NETWORKING_TOKEN_KEY_VERSION ?? '1');
  const raw = version === current
    ? process.env.NETWORKING_TOKEN_KEY
    : process.env[`NETWORKING_TOKEN_KEY_V${version}`] ?? (version === 1 ? process.env.NETWORKING_TOKEN_KEY : undefined);
  if (!raw) throw new TokenCryptoError(`No encryption key configured for version ${version}`);
  const key = Buffer.from(raw, 'base64');
  if (key.length !== 32) throw new TokenCryptoError('NETWORKING_TOKEN_KEY must be 32 bytes of base64');
  return key;
}

/** Current key version for new ciphertexts. */
export function currentKeyVersion(): number {
  const value = Number(process.env.NETWORKING_TOKEN_KEY_VERSION ?? '1');
  return Number.isInteger(value) && value >= 1 ? value : 1;
}

export interface TokenAad {
  userId: string;
  provider: string;
  connectionId: string;
}

/**
 * Encodes token authentication context as a UTF-8 buffer.
 *
 * @param aad - The user, provider, and connection identifiers to encode.
 * @returns The UTF-8 encoded authentication context.
 */
function aadBuffer(aad: TokenAad): Buffer {
  return Buffer.from(`${aad.userId}|${aad.provider}|${aad.connectionId}`, 'utf8');
}

/**
 * Encrypts a token and associates it with the active encryption key version.
 *
 * @param plaintext - The token value to encrypt
 * @param aad - Context authenticated with the encrypted token
 * @returns The encoded ciphertext and the key version used for encryption
 */
export function encryptToken(plaintext: string, aad: TokenAad): { ciphertext: string; keyVersion: number } {
  const keyVersion = currentKeyVersion();
  const key = keyForVersion(keyVersion);
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(aadBuffer(aad));
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    ciphertext: `${iv.toString('base64')}.${tag.toString('base64')}.${encrypted.toString('base64')}`,
    keyVersion,
  };
}

/**
 * Decrypts a refresh token using its key version and authenticated context.
 *
 * @param ciphertext - The token ciphertext encoded as base64 IV, authentication tag, and encrypted data.
 * @param keyVersion - The version of the key used to encrypt the token.
 * @param aad - The authenticated context associated with the token.
 * @returns The decrypted refresh token.
 * @throws TokenCryptoError If the ciphertext is malformed, the key is invalid, or decryption authentication fails.
 */
export function decryptToken(ciphertext: string, keyVersion: number, aad: TokenAad): string {
  const [ivB64, tagB64, dataB64, extra] = ciphertext.split('.');
  if (!ivB64 || !tagB64 || !dataB64 || extra !== undefined) {
    throw new TokenCryptoError('Malformed token ciphertext');
  }
  const key = keyForVersion(keyVersion);
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivB64, 'base64'));
  decipher.setAAD(aadBuffer(aad));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  try {
    return Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]).toString('utf8');
  } catch {
    throw new TokenCryptoError('Token decryption failed (wrong key or tampered ciphertext)');
  }
}
