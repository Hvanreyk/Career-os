import { NextResponse } from 'next/server';
import { ProviderSchema } from '@trajectoryos/core/networking/types';
import { createPkce, OAUTH_STATE_COOKIE, sealOauthState } from '@/lib/networking/oauth';
import { buildAuthorizeUrl, getProviderConfig } from '@/lib/networking/providers';
import { getNetworkingApiContext } from '@/lib/networking/server';

/**
 * Starts the OAuth authorization-code + PKCE flow for a provider.
 * 404s when the provider is not enabled for this deployment.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const result = await getNetworkingApiContext();
  if (result.response) return result.response;
  const { context } = result;

  const { provider: rawProvider } = await params;
  const providerParse = ProviderSchema.safeParse(rawProvider);
  if (!providerParse.success) return NextResponse.json({ error: 'Unknown provider' }, { status: 404 });
  const provider = providerParse.data;

  const config = getProviderConfig(provider);
  if (!config) {
    return NextResponse.json({ error: 'This provider is not enabled yet' }, { status: 404 });
  }

  const { codeVerifier, codeChallenge, nonce } = createPkce();
  const cookieValue = sealOauthState({ userId: context.user.id, provider, nonce, codeVerifier });
  const response = NextResponse.redirect(buildAuthorizeUrl(config, { state: nonce, codeChallenge }));
  response.cookies.set(OAUTH_STATE_COOKIE, cookieValue, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/api/oauth/networking',
    maxAge: 600,
  });
  return response;
}
