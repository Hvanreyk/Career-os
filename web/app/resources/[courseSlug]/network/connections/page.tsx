import type { Metadata } from 'next';
import { ConnectionsView } from '@/components/networking/ConnectionsView';
import { enabledProviders } from '@/lib/networking/providers';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Networking — Connections' };
export const dynamic = 'force-dynamic';

interface ConnectionRow {
  id: string;
  provider: 'google' | 'microsoft';
  account_email: string;
  scopes: string[];
  health: string;
  last_synced_at: string | null;
  created_at: string;
}

/**
 * Renders the networking connections page for a course.
 *
 * @param params - Route parameters containing the course slug
 * @param searchParams - Query parameters containing the optional connection status
 * @returns The connections view with configured providers and connection data
 */
export default async function NetworkConnectionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseSlug: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  await params;
  const { status } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase
    .from('networking_connections')
    .select('id, provider, account_email, scopes, health, last_synced_at, created_at')
    .order('created_at');

  return (
    <ConnectionsView
      connections={(data ?? []) as ConnectionRow[]}
      enabledProviders={enabledProviders()}
      status={status ?? null}
    />
  );
}
