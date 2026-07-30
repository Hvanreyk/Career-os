'use client';

import { useMemo, useState } from 'react';
import { Landmark, Loader2, Plus, Trash2 } from 'lucide-react';
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

const STATUS_COLOURS: Record<string, string> = {
  researching: 'bg-white/10 text-slate-300',
  networking: 'bg-sky-400/15 text-sky-300',
  applied: 'bg-gold-400/15 text-gold-300',
  interviewing: 'bg-purple-400/15 text-purple-300',
  offer: 'bg-emerald-400/15 text-emerald-300',
  rejected: 'bg-red-400/15 text-red-300',
  closed: 'bg-white/5 text-slate-500',
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
    <div className="space-y-6">
      {/* Add */}
      <div className="glass rounded-2xl border border-white/8 p-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void addTarget(newBank);
          }}
          className="flex gap-3"
        >
          <input
            type="text"
            value={newBank}
            onChange={(e) => setNewBank(e.target.value)}
            placeholder="Add a firm (any bank, boutique or advisory firm)"
            className="flex-1 px-4 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-gold-400/50"
          />
          <button
            type="submit"
            disabled={!newBank.trim() || busy}
            className="px-5 py-3 bg-gold-400 text-navy-950 font-semibold text-sm rounded-xl hover:bg-gold-300 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Add
          </button>
        </form>
        <div className="flex flex-wrap gap-2 mt-4">
          {QUICK_ADD.filter((name) => !existingNames.has(name.toLowerCase())).map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => void addTarget(name)}
              disabled={busy}
              className="text-xs px-3 py-1.5 rounded-full border border-white/10 text-slate-400 hover:text-white hover:border-gold-400/40 transition-colors disabled:opacity-50"
            >
              + {name}
            </button>
          ))}
        </div>
        {error && <p className="text-red-400 text-xs mt-3">{error}</p>}
      </div>

      {/* Targets */}
      {sorted.length === 0 ? (
        <div className="glass rounded-2xl border border-white/8 p-10 text-center">
          <Landmark className="w-8 h-8 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">
            No targets yet. Add the firms you&apos;re researching — Module 8 walks through
            how to build and prioritise this list.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((t) => (
            <div key={t.id} className="glass rounded-2xl border border-white/8 p-5">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <h3 className="text-white font-semibold flex-1 min-w-[10rem]">{t.bank_name}</h3>
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_COLOURS[t.status] ?? STATUS_COLOURS.researching}`}
                >
                  {STATUS_LABELS[t.status] ?? t.status}
                </span>
                <button
                  type="button"
                  onClick={() => void removeTarget(t.id)}
                  className="text-slate-600 hover:text-red-400 transition-colors"
                  aria-label={`Remove ${t.bank_name}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                <label className="block">
                  <span className="text-xs text-slate-500 block mb-1">Division / team</span>
                  <input
                    type="text"
                    defaultValue={t.division}
                    placeholder="e.g. M&A, ECM, generalist"
                    onBlur={(e) => {
                      if (e.target.value !== t.division) {
                        void updateTarget(t.id, { division: e.target.value });
                      }
                    }}
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-gold-400/50"
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-slate-500 block mb-1">Priority</span>
                  <select
                    value={t.priority}
                    onChange={(e) => void updateTarget(t.id, { priority: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-white text-sm focus:outline-none focus:border-gold-400/50 [&>option]:bg-navy-950"
                  >
                    {[1, 2, 3].map((p) => (
                      <option key={p} value={p}>
                        {PRIORITY_LABELS[p]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs text-slate-500 block mb-1">Apps open</span>
                  <input
                    type="date"
                    defaultValue={t.apps_open ?? ''}
                    onBlur={(e) => {
                      const v = e.target.value || null;
                      if (v !== t.apps_open) void updateTarget(t.id, { apps_open: v });
                    }}
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-white text-sm focus:outline-none focus:border-gold-400/50 [color-scheme:dark]"
                  />
                </label>
                <label className="block">
                  <span className="text-xs text-slate-500 block mb-1">Apps close</span>
                  <input
                    type="date"
                    defaultValue={t.apps_close ?? ''}
                    onBlur={(e) => {
                      const v = e.target.value || null;
                      if (v !== t.apps_close) void updateTarget(t.id, { apps_close: v });
                    }}
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-white text-sm focus:outline-none focus:border-gold-400/50 [color-scheme:dark]"
                  />
                </label>
                <label className="block sm:col-span-2">
                  <span className="text-xs text-slate-500 block mb-1">Status</span>
                  <select
                    value={t.status}
                    onChange={(e) => void updateTarget(t.id, { status: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-white text-sm focus:outline-none focus:border-gold-400/50 [&>option]:bg-navy-950"
                  >
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block sm:col-span-2">
                  <span className="text-xs text-slate-500 block mb-1">
                    Why this firm / notes (contacts, deals, eligibility)
                  </span>
                  <input
                    type="text"
                    defaultValue={t.notes}
                    placeholder="e.g. spoke to an analyst in March; strong in infrastructure"
                    onBlur={(e) => {
                      if (e.target.value !== t.notes) {
                        void updateTarget(t.id, { notes: e.target.value });
                      }
                    }}
                    className="w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-gold-400/50"
                  />
                </label>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
