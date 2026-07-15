'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { NetworkingProvider } from '@trajectoryos/core/networking/types';
import { AlertCircle, Check, ExternalLink, Loader2, Unplug } from 'lucide-react';
import { networkingApi } from './api';

const PRIMARY = 'text-sm px-4 py-2 rounded-full bg-gold-400/15 text-gold-400 border border-gold-400/40 hover:bg-gold-400/25 transition-colors disabled:opacity-50 inline-flex items-center gap-2';
const BUTTON = 'text-xs px-3 py-1.5 rounded-full border border-white/10 text-slate-400 hover:text-white hover:border-gold-400/40 transition-colors disabled:opacity-50 inline-flex items-center gap-1.5';

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
  base: string;
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
export function ConnectionsView({ base, connections, enabledProviders, status }: Props) {
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
    <div className="space-y-5 max-w-2xl">
      {status === 'connected' && (
        <p className="text-sm text-emerald-400 border border-emerald-400/30 bg-emerald-400/10 rounded-lg px-4 py-2.5 flex items-center gap-2"><Check className="w-4 h-4" /> Connected.</p>
      )}
      {status === 'error' && (
        <p className="text-sm text-red-400 border border-red-400/30 bg-red-400/10 rounded-lg px-4 py-2.5">Connection failed — try again.</p>
      )}
      {error && <p role="alert" className="text-sm text-red-400 border border-red-400/30 bg-red-400/10 rounded-lg px-4 py-2.5">{error}</p>}

      <div className="glass rounded-2xl border border-white/8 p-5">
        <p className="text-sm text-slate-400 leading-relaxed">
          Manual sending (mail app or copy-to-clipboard, logged in one click) always works and needs no connection.
          Connecting Gmail or Outlook will add direct sending and reply detection once each provider clears
          verification — you don&apos;t need to wait for it.
        </p>
      </div>

      {(['google', 'microsoft'] as const).map((provider) => {
        const connection = byProvider.get(provider);
        const enabled = enabledProviders.includes(provider);
        return (
          <div key={provider} className="glass rounded-2xl border border-white/8 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-white font-semibold">{PROVIDER_LABEL[provider]}</h3>
                {connection ? (
                  <>
                    <p className="text-sm text-slate-400 mt-1">{connection.account_email}</p>
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                      {connection.health === 'connected'
                        ? <><Check className="w-3.5 h-3.5 text-emerald-400" /> Connected</>
                        : <><AlertCircle className="w-3.5 h-3.5 text-amber-300" /> Reauthorisation required</>}
                    </p>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Last synced: {connection.last_synced_at ? new Date(connection.last_synced_at).toLocaleString('en-AU') : 'not yet'}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-slate-500 mt-1">
                    {enabled ? 'Not connected.' : 'Not configured for this deployment yet.'}
                  </p>
                )}
              </div>
              {connection ? (
                <button type="button" onClick={() => disconnect(provider)} disabled={busy === provider} className={BUTTON}>
                  {busy === provider ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Unplug className="w-3.5 h-3.5" />} Disconnect
                </button>
              ) : enabled ? (
                <a href={`/api/resources/networking-strategy/connections/${provider}/start`} className={PRIMARY}>
                  Connect <ExternalLink className="w-3.5 h-3.5" />
                </a>
              ) : (
                <span className="text-xs text-slate-600 px-3 py-1.5">Coming soon</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
