'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { StateBlock } from '@/components/ui/StateBlock';
import { StatusLabel } from '@/components/ui/Status';
import { createClient } from '@/lib/supabase/client';
import type { BankTargetRow } from '@/lib/courses/types';

// Module 8 workspace. Talks to bank_targets directly through the
// browser client — owner-only RLS scopes every operation to the
// signed-in user, so no API route is needed.

const STATUSES = [
  'researching',
  'networking',
  'applied',
  'interviewing',
  'offer',
  'rejected',
  'closed',
] as const;

const STATUS_LABELS: Record<string, string> = {
  researching: 'Researching',
  networking: 'Networking',
  applied: 'Applied',
  interviewing: 'Interviewing',
  offer: 'Offer',
  rejected: 'Rejected',
  closed: 'Closed',
};

// The word carries the status; the tone only reinforces the two outcomes that
// are genuinely terminal. Everything in flight stays neutral so a long list
// does not turn into a colour chart.
const STATUS_TONES: Record<string, 'neutral' | 'ok' | 'warn'> = {
  offer: 'ok',
  rejected: 'warn',
};

const PRIORITY_LABELS: Record<number, string> = { 1: 'High', 2: 'Medium', 3: 'Low' };

// Quick-add chips: common names in the AU market. Not a ranking — just
// keystrokes saved. Students add anything via the free-text field.
const QUICK_ADD = [
  'Macquarie Capital',
  'Goldman Sachs',
  'UBS',
  'Morgan Stanley',
  'J.P. Morgan',
  'Barrenjoey',
  'Jarden',
  'Bank of America',
  'Citi',
  'Lazard',
  'Rothschild & Co',
  'Gresham',
];

interface Props {
  initialTargets: BankTargetRow[];
  userId: string;
}

/** Field label + control, sharing one skin across text, date and select. */
function FieldLabel({
  label,
  children,
  className = '',
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="ml-label block">{label}</span>
      <span className="mt-1.5 block">{children}</span>
    </label>
  );
}

export function BankTrackerTable({ initialTargets, userId }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [targets, setTargets] = useState<BankTargetRow[]>(initialTargets);
  const [newBank, setNewBank] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const existingNames = new Set(targets.map((t) => t.bank_name.toLowerCase()));

  async function addTarget(bankName: string) {
    const name = bankName.trim();
    if (!name || busy) return;
    setBusy(true);
    setError(null);
    const { data, error: insertError } = await supabase
      .from('bank_targets')
      .insert({
        user_id: userId,
        bank_name: name,
        sort_order: targets.length,
      })
      .select(
        'id, bank_name, division, tier, priority, apps_open, apps_close, status, notes, sort_order',
      )
      .single();
    setBusy(false);
    if (insertError || !data) {
      setError(insertError?.message ?? 'Could not add the firm');
      return;
    }
    setTargets((t) => [...t, data as BankTargetRow]);
    setNewBank('');
  }

  async function updateTarget(id: string, patch: Partial<BankTargetRow>) {
    const before = targets;
    setTargets((t) => t.map((row) => (row.id === id ? { ...row, ...patch } : row)));
    setError(null);
    const { error: updateError } = await supabase.from('bank_targets').update(patch).eq('id', id);
    if (updateError) {
      setTargets(before);
      setError(updateError.message);
    }
  }

  async function removeTarget(id: string) {
    const before = targets;
    setTargets((t) => t.filter((row) => row.id !== id));
    setError(null);
    const { error: deleteError } = await supabase.from('bank_targets').delete().eq('id', id);
    if (deleteError) {
      setTargets(before);
      setError(deleteError.message);
    }
  }

  const sorted = [...targets].sort(
    (a, b) => a.priority - b.priority || a.sort_order - b.sort_order,
  );

  return (
    <div className="space-y-10">
      {/* ── Add a firm ─────────────────────────────────────────── */}
      <section className="ml-panel">
        <div className="border-b border-rule px-4 py-3 sm:px-5">
          <span className="ml-label">Add a firm</span>
        </div>
        <div className="px-4 py-5 sm:px-5">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void addTarget(newBank);
            }}
            className="flex flex-wrap gap-3"
          >
            <input
              type="text"
              value={newBank}
              onChange={(e) => setNewBank(e.target.value)}
              placeholder="Any bank, boutique or advisory firm"
              aria-label="Firm name"
              className="ml-field min-h-[44px] flex-1 basis-[16rem]"
            />
            <Button type="submit" disabled={!newBank.trim()} loading={busy}>
              Add firm
            </Button>
          </form>

          <div className="mt-5">
            <span className="ml-label">Common AU names — not a ranking</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {QUICK_ADD.filter((name) => !existingNames.has(name.toLowerCase())).map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => void addTarget(name)}
                  disabled={busy}
                  className="ml-row-hover min-h-[44px] border border-rule px-3 text-[13px] text-graphite hover:border-rule-bright hover:text-bone disabled:cursor-not-allowed disabled:opacity-50"
                >
                  + {name}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="mt-4 text-[14px] text-red" role="alert">
              ▲ {error}
            </p>
          )}
        </div>
      </section>

      {/* ── Targets ────────────────────────────────────────────── */}
      {sorted.length === 0 ? (
        <StateBlock kind="empty" title="No target firms yet">
          Add the firms you&apos;re researching — Module 8 walks through how to build and
          prioritise this list.
        </StateBlock>
      ) : (
        <section>
          <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-bone pb-3">
            <h2 className="text-[17px] font-bold uppercase tracking-[-0.015em] text-bone">
              Target list
            </h2>
            <span className="ml-label">
              <span className="ml-num">{sorted.length}</span>{' '}
              {sorted.length === 1 ? 'firm' : 'firms'}
            </span>
          </div>

          <ol>
            {sorted.map((t, i) => (
              <li key={t.id} className="ml-row py-6">
                <div className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-4">
                  <span className="ml-num pt-1 text-[13px] text-graphite" aria-hidden="true">
                    {String(i + 1).padStart(2, '0')}
                  </span>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                      <h3 className="min-w-0 flex-1 text-[16px] font-bold uppercase tracking-[-0.01em] text-bone">
                        {t.bank_name}
                      </h3>
                      <StatusLabel tone={STATUS_TONES[t.status] ?? 'neutral'}>
                        {STATUS_LABELS[t.status] ?? t.status}
                      </StatusLabel>
                      <StatusLabel>{PRIORITY_LABELS[t.priority] ?? 'Medium'}</StatusLabel>
                      <button
                        type="button"
                        onClick={() => void removeTarget(t.id)}
                        className="ml-btn ml-btn-text min-h-[44px] px-1 text-[13px]"
                      >
                        Remove
                      </button>
                    </div>

                    <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <FieldLabel label="Division / team">
                        <input
                          type="text"
                          defaultValue={t.division}
                          placeholder="e.g. M&A, ECM, generalist"
                          onBlur={(e) => {
                            if (e.target.value !== t.division) {
                              void updateTarget(t.id, { division: e.target.value });
                            }
                          }}
                          className="ml-field min-h-[44px]"
                        />
                      </FieldLabel>

                      <FieldLabel label="Priority">
                        <select
                          value={t.priority}
                          onChange={(e) =>
                            void updateTarget(t.id, { priority: Number(e.target.value) })
                          }
                          className="ml-field min-h-[44px]"
                        >
                          {[1, 2, 3].map((p) => (
                            <option key={p} value={p}>
                              {PRIORITY_LABELS[p]}
                            </option>
                          ))}
                        </select>
                      </FieldLabel>

                      <FieldLabel label="Apps open">
                        <input
                          type="date"
                          defaultValue={t.apps_open ?? ''}
                          onBlur={(e) => {
                            const v = e.target.value || null;
                            if (v !== t.apps_open) void updateTarget(t.id, { apps_open: v });
                          }}
                          className="ml-field ml-num min-h-[44px] [color-scheme:dark]"
                        />
                      </FieldLabel>

                      <FieldLabel label="Apps close">
                        <input
                          type="date"
                          defaultValue={t.apps_close ?? ''}
                          onBlur={(e) => {
                            const v = e.target.value || null;
                            if (v !== t.apps_close) void updateTarget(t.id, { apps_close: v });
                          }}
                          className="ml-field ml-num min-h-[44px] [color-scheme:dark]"
                        />
                      </FieldLabel>

                      <FieldLabel label="Status" className="sm:col-span-2">
                        <select
                          value={t.status}
                          onChange={(e) => void updateTarget(t.id, { status: e.target.value })}
                          className="ml-field min-h-[44px]"
                        >
                          {STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {STATUS_LABELS[s]}
                            </option>
                          ))}
                        </select>
                      </FieldLabel>

                      <FieldLabel
                        label="Why this firm / notes"
                        className="sm:col-span-2 lg:col-span-2"
                      >
                        <input
                          type="text"
                          defaultValue={t.notes}
                          placeholder="e.g. spoke to an analyst in March; strong in infrastructure"
                          onBlur={(e) => {
                            if (e.target.value !== t.notes) {
                              void updateTarget(t.id, { notes: e.target.value });
                            }
                          }}
                          className="ml-field min-h-[44px]"
                        />
                      </FieldLabel>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
