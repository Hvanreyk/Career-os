'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { NetworkingProvider } from '@trajectoryos/core/networking/types';
import { Button } from '@/components/ui/Button';
import { StatusLabel } from '@/components/ui/Status';
import { networkingApi } from './api';
import { Notice, SectionHeading } from './ui';

const PROVIDER_LABEL: Record<NetworkingProvider, string> = { google: 'Google (Gmail + Calendar)', microsoft: 'Microsoft (Outlook + Calendar)' };

interface ConnectionRow {
  id: string;
  provider: NetworkingProvider;
  account_email: string;
  scopes: string[];
  health: string;
  last_synced_at: string | null;
  created_at: string;
}

interface Props {
  connections: ConnectionRow[];
  enabledProviders: NetworkingProvider[];
  status: string | null;
}

/**
 * Provider connection management. Absent credentials render an honest
 * "not configured yet" state rather than a dead link — direct sending
 * ships behind flags once OAuth verification clears (see
 * PHASE_2_PLAN.md). Manual send/log always works regardless.
 */
export function ConnectionsView({ connections, enabledProviders, status }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<NetworkingProvider | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function disconnect(provider: NetworkingProvider) {
    if (!window.confirm(`Disconnect ${PROVIDER_LABEL[provider]}? Sent mail and existing calendar events are not affected.`)) return;
    setBusy(provider);
    setError(null);
    try {
      await networkingApi(`/connections/${provider}`, 'DELETE');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(null);
    }
  }

  const byProvider = new Map(connections.map((c) => [c.provider, c]));

  return (
    <div className="max-w-[48rem] space-y-8">
      {status === 'connected' && <Notice tone="ok" label="Connected">Your account is linked.</Notice>}
      {status === 'error' && <Notice label="Connection failed">Try connecting again.</Notice>}
      {error && <Notice>{error}</Notice>}

      <p className="max-w-[70ch] border-l-2 border-rule-bright pl-4 text-[16px] leading-[1.6] text-graphite">
        Manual sending — your mail app, or copy to clipboard, logged in one click — always works and
        needs no connection. Connecting Gmail or Outlook will add direct sending and reply detection
        once each provider clears verification. You do not need to wait for it.
      </p>

      <section>
        <SectionHeading title="Mail and calendar accounts" label={`${connections.length} connected`} />

        <div className="mt-2">
          {(['google', 'microsoft'] as const).map((provider) => {
            const connection = byProvider.get(provider);
            const enabled = enabledProviders.includes(provider);
            const healthy = connection?.health === 'connected';
            return (
              <div
                key={provider}
                className="ml-row grid gap-x-6 gap-y-4 py-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <h3 className="text-[16px] font-bold uppercase tracking-[-0.01em] text-bone">
                      {PROVIDER_LABEL[provider]}
                    </h3>
                    {connection ? (
                      <StatusLabel tone={healthy ? 'ok' : 'warn'}>
                        {healthy ? 'Connected' : 'Reauthorisation required'}
                      </StatusLabel>
                    ) : (
                      <StatusLabel>{enabled ? 'Not connected' : 'Not configured'}</StatusLabel>
                    )}
                  </div>

                  {connection ? (
                    <>
                      <p className="mt-2 text-[16px] text-graphite">{connection.account_email}</p>
                      <p className="ml-num mt-1 text-[13px] text-graphite">
                        Last synced:{' '}
                        {connection.last_synced_at
                          ? new Date(connection.last_synced_at).toLocaleString('en-AU')
                          : 'not yet'}
                      </p>
                    </>
                  ) : (
                    <p className="mt-2 max-w-[60ch] text-[16px] leading-[1.6] text-graphite">
                      {enabled
                        ? 'Link this account to enable direct sending and reply detection.'
                        : 'Not configured for this deployment yet.'}
                    </p>
                  )}
                </div>

                <div className="sm:pt-0.5">
                  {connection ? (
                    <Button
                      variant="secondary"
                      onClick={() => disconnect(provider)}
                      disabled={busy === provider}
                      loading={busy === provider}
                      aria-label={`Disconnect ${PROVIDER_LABEL[provider]}`}
                    >
                      Disconnect
                    </Button>
                  ) : enabled ? (
                    <a
                      href={`/api/resources/networking-strategy/connections/${provider}/start`}
                      className="ml-btn ml-btn-primary on-accent min-h-[44px] px-5 text-[13px]"
                    >
                      Connect <span aria-hidden="true">▸</span>
                    </a>
                  ) : (
                    <span className="ml-label block sm:pt-3">Coming soon</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
