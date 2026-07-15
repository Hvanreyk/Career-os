import { NextResponse } from 'next/server';
import { ProviderSchema } from '@trajectoryos/core/networking/types';
import { decryptToken, TokenCryptoError } from '@/lib/networking/crypto';
import { getProviderConfig, revokeToken } from '@/lib/networking/providers';
import {
  getNetworkingOwnerContext,
  recordNetworkingEvent,
} from '@/lib/networking/server';

/**
 * Disconnects a provider: revokes access at the provider where
 * supported, then deletes the local tokens and sync jobs. Sent email
 * and existing calendar events are never recalled.
 */
export async function DELETE(_request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const result = await getNetworkingOwnerContext();
  if (result.response) return result.response;
  const { context } = result;

  const { provider: rawProvider } = await params;
  const providerParse = ProviderSchema.safeParse(rawProvider);
  if (!providerParse.success) return NextResponse.json({ error: 'Unknown provider' }, { status: 404 });
  const provider = providerParse.data;

  const { data: connection } = await context.service
    .from('networking_connections')
    .select('id, refresh_token_ciphertext, key_version')
    .eq('user_id', context.user.id)
    .eq('provider', provider)
    .maybeSingle();
  if (!connection) return NextResponse.json({ error: 'No connection to disconnect' }, { status: 404 });

  const config = getProviderConfig(provider);
  if (config) {
    try {
      const refreshToken = decryptToken(connection.refresh_token_ciphertext, connection.key_version, {
        userId: context.user.id,
        provider,
        connectionId: connection.id,
      });
      await revokeToken(provider, config, refreshToken);
    } catch (error) {
      // Revocation is best-effort: local deletion below always stops
      // this app's access, and decryption failures must not trap the
      // user in a connected state.
      if (!(error instanceof TokenCryptoError)) {
        console.error('networking disconnect: revocation failed');
      }
    }
  }

  const { error } = await context.service
    .from('networking_connections')
    .delete()
    .eq('id', connection.id)
    .eq('user_id', context.user.id);
  if (error) return NextResponse.json({ error: 'Could not disconnect' }, { status: 500 });

  await recordNetworkingEvent(context, 'networking_provider_disconnected', { provider });
  return NextResponse.json({ ok: true });
}
