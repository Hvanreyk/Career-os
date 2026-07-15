import { NextResponse } from 'next/server';
import { enabledProviders } from '@/lib/networking/providers';
import { getNetworkingApiContext } from '@/lib/networking/server';

/**
 * Lists the requester's provider connections (never token material)
 * plus which providers this deployment has enabled.
 */
export async function GET() {
  const result = await getNetworkingApiContext();
  if (result.response) return result.response;
  const { context } = result;

  const { data } = await context.service
    .from('networking_connections')
    .select('id, provider, account_email, scopes, health, last_synced_at, created_at')
    .eq('user_id', context.user.id)
    .order('created_at');

  return NextResponse.json({
    connections: data ?? [],
    enabledProviders: enabledProviders(),
  });
}
