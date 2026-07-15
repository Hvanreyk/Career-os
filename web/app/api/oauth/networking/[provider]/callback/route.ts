import { NextResponse, type NextRequest } from 'next/server';
import { ProviderSchema } from '@trajectoryos/core/networking/types';
import { encryptToken } from '@/lib/networking/crypto';
import { OAUTH_STATE_COOKIE, openOauthState } from '@/lib/networking/oauth';
import { exchangeCode, getProviderConfig } from '@/lib/networking/providers';
import {
  getNetworkingApiContext,
  NETWORKING_RESOURCE_SLUG,
  recordNetworkingEvent,
} from '@/lib/networking/server';

function connectionsRedirect(request: NextRequest, status: 'connected' | 'error'): NextResponse {
  const url = new URL(`/resources/${NETWORKING_RESOURCE_SLUG}/network/connections`, request.nextUrl.origin);
  url.searchParams.set('status', status);
  const response = NextResponse.redirect(url);
  response.cookies.delete(OAUTH_STATE_COOKIE);
  return response;
}

/**
 * OAuth callback: verifies the signed state cookie against the
 * callback parameters and the signed-in user, exchanges the code
 * (PKCE), encrypts the refresh token and upserts the connection.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const result = await getNetworkingApiContext();
  if (result.response) return result.response;
  const { context } = result;

  const { provider: rawProvider } = await params;
  const providerParse = ProviderSchema.safeParse(rawProvider);
  if (!providerParse.success) return NextResponse.json({ error: 'Unknown provider' }, { status: 404 });
  const provider = providerParse.data;

  const config = getProviderConfig(provider);
  if (!config) return NextResponse.json({ error: 'This provider is not enabled yet' }, { status: 404 });

  const code = request.nextUrl.searchParams.get('code');
  const stateNonce = request.nextUrl.searchParams.get('state');
  const cookie = request.cookies.get(OAUTH_STATE_COOKIE)?.value;
  if (!code || !stateNonce || !cookie) return connectionsRedirect(request, 'error');

  const state = openOauthState(cookie, { userId: context.user.id, provider, nonce: stateNonce });
  if (!state) return connectionsRedirect(request, 'error');

  try {
    const exchanged = await exchangeCode(provider, config, code, state.codeVerifier);
    if (!exchanged.refreshToken) {
      console.error(`networking oauth: ${provider} returned no refresh token`);
      return connectionsRedirect(request, 'error');
    }

    // Deterministic connection id so encryption AAD can bind to it
    // before the row exists (upsert on user_id+provider).
    const { data: existing } = await context.service
      .from('networking_connections')
      .select('id')
      .eq('user_id', context.user.id)
      .eq('provider', provider)
      .maybeSingle();
    const connectionId = existing?.id ?? crypto.randomUUID();
    const encrypted = encryptToken(exchanged.refreshToken, {
      userId: context.user.id,
      provider,
      connectionId,
    });

    const { error } = await context.service.from('networking_connections').upsert({
      id: connectionId,
      user_id: context.user.id,
      provider,
      account_email: exchanged.accountEmail,
      scopes: exchanged.grantedScopes,
      refresh_token_ciphertext: encrypted.ciphertext,
      key_version: encrypted.keyVersion,
      health: 'connected',
    }, { onConflict: 'user_id,provider' });
    if (error) {
      console.error('networking oauth: connection upsert failed:', error.message);
      return connectionsRedirect(request, 'error');
    }

    await recordNetworkingEvent(context, 'networking_provider_connected', { provider });
    return connectionsRedirect(request, 'connected');
  } catch (error) {
    console.error('networking oauth callback failed:', error instanceof Error ? error.message : 'Unknown error');
    return connectionsRedirect(request, 'error');
  }
}
