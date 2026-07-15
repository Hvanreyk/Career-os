// ============================================================
// Provider adapter boundary (Google / Microsoft) — scaffold.
//
// This ships ahead of OAuth verification so the contract is stable:
//   * enablement is env-driven and OFF by default
//   * OAuth authorization-code + PKCE endpoints and token exchange
//   * revocation on disconnect
// Send / tracked-thread sync / calendar sync implementations land
// behind the same interface once provider verification clears —
// nothing in the UI dead-ends when a provider is not configured.
// ============================================================

import type { NetworkingProvider } from '@trajectoryos/core/networking/types';

export interface ProviderConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
  authorizeUrl: string;
  tokenUrl: string;
  revokeUrl: string;
}

export class ProviderError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = 'ProviderError';
  }
}

/** Gmail send + metadata (restricted scopes — Google verification required). */
const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.metadata',
  'https://www.googleapis.com/auth/calendar.events',
  'openid',
  'email',
];

/** Delegated Microsoft Graph scopes; Mail.ReadBasic excludes bodies. */
const MICROSOFT_SCOPES = [
  'https://graph.microsoft.com/Mail.Send',
  'https://graph.microsoft.com/Mail.ReadBasic',
  'https://graph.microsoft.com/Calendars.ReadWrite',
  'https://graph.microsoft.com/User.Read',
  'openid',
  'email',
  'offline_access',
];

/**
 * Gets the configured site URL without a trailing slash.
 *
 * @returns The configured site URL, or `http://localhost:3000` when none is set.
 */
function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
}

/**
 * Resolves the OAuth configuration for an enabled provider.
 *
 * @returns The provider configuration when enablement and required credentials are present, or `null` otherwise.
 */
export function getProviderConfig(provider: NetworkingProvider): ProviderConfig | null {
  const enabled = (process.env.NETWORKING_PROVIDERS_ENABLED ?? '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  if (!enabled.includes(provider)) return null;
  if (!process.env.NETWORKING_TOKEN_KEY) return null;

  if (provider === 'google') {
    const clientId = process.env.NETWORKING_GOOGLE_CLIENT_ID;
    const clientSecret = process.env.NETWORKING_GOOGLE_CLIENT_SECRET;
    if (!clientId || !clientSecret) return null;
    return {
      clientId,
      clientSecret,
      redirectUri: `${siteUrl()}/api/oauth/networking/google/callback`,
      scopes: GOOGLE_SCOPES,
      authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      revokeUrl: 'https://oauth2.googleapis.com/revoke',
    };
  }

  const clientId = process.env.NETWORKING_MICROSOFT_CLIENT_ID;
  const clientSecret = process.env.NETWORKING_MICROSOFT_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  const tenant = process.env.NETWORKING_MICROSOFT_TENANT ?? 'common';
  return {
    clientId,
    clientSecret,
    redirectUri: `${siteUrl()}/api/oauth/networking/microsoft/callback`,
    scopes: MICROSOFT_SCOPES,
    authorizeUrl: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`,
    tokenUrl: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
    revokeUrl: '',
  };
}

/** Which providers are enabled in this deployment (for the UI). */
export function enabledProviders(): NetworkingProvider[] {
  return (['google', 'microsoft'] as const).filter((provider) => getProviderConfig(provider) !== null);
}

/**
 * Builds an OAuth authorization URL with the configured scopes and PKCE parameters.
 *
 * @param config - Provider OAuth configuration used to populate the authorization request
 * @param params - Authorization state and PKCE code challenge
 * @returns The provider authorization URL
 */
export function buildAuthorizeUrl(
  config: ProviderConfig,
  params: { state: string; codeChallenge: string },
): string {
  const url = new URL(config.authorizeUrl);
  url.searchParams.set('client_id', config.clientId);
  url.searchParams.set('redirect_uri', config.redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', config.scopes.join(' '));
  url.searchParams.set('state', params.state);
  url.searchParams.set('code_challenge', params.codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');
  // Refresh tokens: Google needs offline access + consent prompt.
  if (config.authorizeUrl.includes('google')) {
    url.searchParams.set('access_type', 'offline');
    url.searchParams.set('prompt', 'consent');
  }
  return url.toString();
}

export interface TokenExchangeResult {
  accessToken: string;
  refreshToken: string | null;
  accountEmail: string;
  grantedScopes: string[];
}

/**
 * Exchanges an authorization code for provider tokens and identifies the connected account.
 *
 * @param provider - The OAuth provider associated with the authorization code
 * @param config - OAuth endpoints and credentials for the provider
 * @param code - The authorization code to exchange
 * @param codeVerifier - The PKCE verifier used for the authorization request
 * @returns The access token, optional refresh token, connected account email, and granted scopes
 * @throws `ProviderError` if the token request fails or the response lacks an access token
 */
export async function exchangeCode(
  provider: NetworkingProvider,
  config: ProviderConfig,
  code: string,
  codeVerifier: string,
): Promise<TokenExchangeResult> {
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    redirect_uri: config.redirectUri,
    grant_type: 'authorization_code',
    code,
    code_verifier: codeVerifier,
  });
  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!response.ok) {
    throw new ProviderError(`Token exchange failed (${response.status})`);
  }
  const json = (await response.json()) as {
    access_token?: string;
    refresh_token?: string;
    scope?: string;
    id_token?: string;
  };
  if (!json.access_token) throw new ProviderError('Token exchange returned no access token');

  let accountEmail = '';
  if (json.id_token) {
    const claims = decodeJwtClaims(json.id_token);
    if (typeof claims?.email === 'string') accountEmail = claims.email;
  }
  if (!accountEmail) {
    accountEmail = await fetchAccountEmail(provider, json.access_token);
  }

  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? null,
    accountEmail,
    grantedScopes: (json.scope ?? '').split(' ').filter(Boolean),
  };
}

/**
 * Extracts the payload claims from a JWT without verifying its signature.
 *
 * @param jwt - The JWT to decode
 * @returns The decoded payload claims, or `null` if the JWT is malformed or its payload is not valid JSON.
 */
function decodeJwtClaims(jwt: string): Record<string, unknown> | null {
  const parts = jwt.split('.');
  if (parts.length !== 3 || !parts[1]) return null;
  try {
    return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Retrieves the connected account's email address from the provider.
 *
 * @param provider - The OAuth provider whose account information is requested
 * @param accessToken - The provider access token
 * @returns The account email address, or an empty string when it is unavailable
 */
async function fetchAccountEmail(provider: NetworkingProvider, accessToken: string): Promise<string> {
  const url = provider === 'google'
    ? 'https://openidconnect.googleapis.com/v1/userinfo'
    : 'https://graph.microsoft.com/v1.0/me';
  const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!response.ok) return '';
  const json = (await response.json()) as { email?: string; mail?: string; userPrincipalName?: string };
  return json.email ?? json.mail ?? json.userPrincipalName ?? '';
}

/**
 * Attempts to revoke a Google refresh token.
 *
 * @param refreshToken - The refresh token to revoke
 */
export async function revokeToken(
  provider: NetworkingProvider,
  config: ProviderConfig,
  refreshToken: string,
): Promise<void> {
  if (provider !== 'google' || !config.revokeUrl) return;
  await fetch(config.revokeUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ token: refreshToken }),
  }).catch(() => undefined);
}
