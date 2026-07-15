'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { STAGE_LABELS } from '@trajectoryos/core/networking';
import type {
  ContactSeniority,
  ContactSource,
  NetworkingContactRow,
  NetworkingFollowUpRow,
  RelationshipStage,
} from '@trajectoryos/core/networking/types';
import { Download, Loader2, Plus, Upload, X } from 'lucide-react';
import type { BankTargetRow, ContactTargetLink, InteractionSummaryRow } from '@/lib/networking/queries';
import { networkingApi } from './api';

const INPUT = 'w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-gold-400/50';
const SELECT = `${INPUT} [&>option]:bg-navy-950`;

const SENIORITIES: { value: ContactSeniority; label: string }[] = [
  { value: 'analyst', label: 'Analyst' },
  { value: 'associate', label: 'Associate' },
  { value: 'vp', label: 'VP' },
  { value: 'director', label: 'Director' },
  { value: 'md', label: 'MD' },
  { value: 'recruiter', label: 'Recruiter' },
  { value: 'student', label: 'Student' },
  { value: 'other', label: 'Other' },
];

const SOURCES: { value: ContactSource; label: string }[] = [
  { value: 'alumni', label: 'Alumni' },
  { value: 'cold', label: 'Cold' },
  { value: 'event', label: 'Event' },
  { value: 'introduction', label: 'Introduction' },
  { value: 'existing', label: 'Existing relationship' },
  { value: 'other', label: 'Other' },
];

const STAGE_CHIP: Record<RelationshipStage, string> = {
  prospect: 'text-slate-400 border-white/10',
  ready_to_contact: 'text-sky-300 border-sky-300/30',
  contacted: 'text-amber-300 border-amber-300/30',
  replied: 'text-emerald-300 border-emerald-300/30',
  conversation_booked: 'text-gold-400 border-gold-400/40',
  connected: 'text-emerald-400 border-emerald-400/40',
  dormant: 'text-slate-500 border-white/10',
};

interface ImportPreviewPayload {
  preview: {
    candidates: Array<{ rowNumber: number; full_name: string; firm: string; email: string }>;
    errors: Array<{ rowNumber: number; message: string }>;
    duplicates: Array<{ rowNumber: number; full_name: string; matchType: string }>;
    unmappedHeaders: string[];
    totalRows: number;
  };
}

interface Props {
  base: string;
  contacts: NetworkingContactRow[];
  followUps: NetworkingFollowUpRow[];
  interactions: InteractionSummaryRow[];
  targets: BankTargetRow[];
  links: ContactTargetLink[];
}

/**
 * Contact directory with search, filters, quick add, CSV import
 * preview/commit, and private export.
 */
export function ContactsView({ base, contacts, followUps, interactions, targets, links }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<'all' | RelationshipStage>('all');
  const [targetFilter, setTargetFilter] = useState('all');
  const [panel, setPanel] = useState<'none' | 'add' | 'import'>('none');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Quick-add form state
  const [form, setForm] = useState({
    full_name: '', firm: '', role_title: '', city: '', email: '', linkedin_url: '',
    seniority: 'analyst' as ContactSeniority, source: 'cold' as ContactSource,
    is_alum: false, bank_target_ids: [] as string[],
  });

  // Import state
  const [csv, setCsv] = useState('');
  const [preview, setPreview] = useState<ImportPreviewPayload['preview'] | null>(null);

  const followUpByContact = useMemo(
    () => new Map(followUps.map((f) => [f.contact_id, f])),
    [followUps],
  );
  const lastTouch = useMemo(() => {
    const map = new Map<string, string>();
    for (const interaction of interactions) {
      if (!map.has(interaction.contact_id)) map.set(interaction.contact_id, interaction.occurred_at);
    }
    return map;
  }, [interactions]);
  const targetsByContact = useMemo(() => {
    const nameById = new Map(targets.map((t) => [t.id, t.bank_name]));
    const map = new Map<string, string[]>();
    for (const link of links) {
      const list = map.get(link.contact_id) ?? [];
      const name = nameById.get(link.bank_target_id);
      if (name) list.push(name);
      map.set(link.contact_id, list);
    }
    return map;
  }, [links, targets]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return contacts.filter((contact) => {
      if (stageFilter !== 'all' && contact.stage !== stageFilter) return false;
      if (targetFilter !== 'all' && !(targetsByContact.get(contact.id) ?? []).includes(targetFilter)) return false;
      if (!query) return true;
      return `${contact.full_name} ${contact.firm} ${contact.role_title} ${contact.city}`.toLowerCase().includes(query);
    });
  }, [contacts, search, stageFilter, targetFilter, targetsByContact]);

  async function createContact(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await networkingApi('/contacts', 'POST', form);
      setForm({
        full_name: '', firm: '', role_title: '', city: '', email: '', linkedin_url: '',
        seniority: 'analyst', source: 'cold', is_alum: false, bank_target_ids: [],
      });
      setPanel('none');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  async function previewImport() {
    setBusy(true);
    setError(null);
    try {
      const result = await networkingApi<ImportPreviewPayload>('/import', 'POST', { csv });
      setPreview(result.preview);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  async function commitImport() {
    setBusy(true);
    setError(null);
    try {
      await networkingApi('/import/commit', 'POST', { csv });
      setCsv('');
      setPreview(null);
      setPanel('none');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  function toggleTarget(id: string) {
    setForm((prev) => ({
      ...prev,
      bank_target_ids: prev.bank_target_ids.includes(id)
        ? prev.bank_target_ids.filter((t) => t !== id)
        : [...prev.bank_target_ids, id],
    }));
  }

  return (
    <div className="space-y-5">
      {error && (
        <p role="alert" className="text-sm text-red-400 border border-red-400/30 bg-red-400/10 rounded-lg px-4 py-2.5">{error}</p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search name, firm, role…"
          className={`${INPUT} max-w-xs`}
          aria-label="Search contacts"
        />
        <select value={stageFilter} onChange={(event) => setStageFilter(event.target.value as typeof stageFilter)} className={`${SELECT} w-auto`} aria-label="Filter by stage">
          <option value="all">All stages</option>
          {Object.entries(STAGE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <select value={targetFilter} onChange={(event) => setTargetFilter(event.target.value)} className={`${SELECT} w-auto`} aria-label="Filter by target firm">
          <option value="all">All target firms</option>
          {targets.map((target) => (
            <option key={target.id} value={target.bank_name}>{target.bank_name}</option>
          ))}
        </select>
        <div className="flex-1" />
        <a
          href="/api/resources/networking-strategy/export"
          className="text-xs px-3 py-2 rounded-full border border-white/10 text-slate-400 hover:text-white transition-colors inline-flex items-center gap-1.5"
        >
          <Download className="w-3.5 h-3.5" /> Export
        </a>
        <button
          type="button"
          onClick={() => setPanel(panel === 'import' ? 'none' : 'import')}
          className="text-xs px-3 py-2 rounded-full border border-white/10 text-slate-400 hover:text-white transition-colors inline-flex items-center gap-1.5"
        >
          <Upload className="w-3.5 h-3.5" /> Import CSV
        </button>
        <button
          type="button"
          onClick={() => setPanel(panel === 'add' ? 'none' : 'add')}
          className="text-xs px-3.5 py-2 rounded-full bg-gold-400/15 text-gold-400 border border-gold-400/40 hover:bg-gold-400/25 transition-colors inline-flex items-center gap-1.5"
        >
          {panel === 'add' ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />} Add contact
        </button>
      </div>

      {panel === 'add' && (
        <form onSubmit={createContact} className="glass rounded-2xl border border-white/8 p-6 space-y-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Full name *" className={INPUT} aria-label="Full name" />
            <input value={form.firm} onChange={(e) => setForm({ ...form, firm: e.target.value })} placeholder="Firm" className={INPUT} aria-label="Firm" />
            <input value={form.role_title} onChange={(e) => setForm({ ...form, role_title: e.target.value })} placeholder="Role title" className={INPUT} aria-label="Role title" />
            <select value={form.seniority} onChange={(e) => setForm({ ...form, seniority: e.target.value as ContactSeniority })} className={SELECT} aria-label="Seniority">
              {SENIORITIES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="City" className={INPUT} aria-label="City" />
            <select value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value as ContactSource })} className={SELECT} aria-label="Source">
              {SOURCES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email" type="email" className={INPUT} aria-label="Email" />
            <input value={form.linkedin_url} onChange={(e) => setForm({ ...form, linkedin_url: e.target.value })} placeholder="LinkedIn URL" className={INPUT} aria-label="LinkedIn URL" />
            <label className="flex items-center gap-2 text-sm text-slate-300 px-1">
              <input type="checkbox" checked={form.is_alum} onChange={(e) => setForm({ ...form, is_alum: e.target.checked })} className="accent-[#d3a955]" />
              Alum of my university
            </label>
          </div>
          {targets.length > 0 && (
            <div>
              <p className="text-xs text-slate-500 mb-2">Link to bank targets</p>
              <div className="flex flex-wrap gap-2">
                {targets.map((target) => (
                  <button
                    key={target.id}
                    type="button"
                    onClick={() => toggleTarget(target.id)}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                      form.bank_target_ids.includes(target.id)
                        ? 'border-gold-400/50 bg-gold-400/10 text-gold-400'
                        : 'border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    {target.bank_name}
                  </button>
                ))}
              </div>
            </div>
          )}
          <button type="submit" disabled={busy} className="text-sm px-4 py-2 rounded-full bg-gold-400/15 text-gold-400 border border-gold-400/40 hover:bg-gold-400/25 transition-colors disabled:opacity-50 inline-flex items-center gap-2">
            {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Save contact
          </button>
        </form>
      )}

      {panel === 'import' && (
        <div className="glass rounded-2xl border border-white/8 p-6 space-y-4">
          <p className="text-sm text-slate-400">
            Paste CSV with a header row. Recognised columns: name, firm, role, seniority, city, email,
            linkedin, tags, notes. Up to 500 rows; duplicates are detected by email, LinkedIn, then name+firm.
          </p>
          <textarea
            value={csv}
            onChange={(event) => { setCsv(event.target.value); setPreview(null); }}
            rows={6}
            placeholder={'name,firm,role,email\nJane Doe,Macquarie,Analyst,jane@example.com'}
            className={`${INPUT} font-mono text-xs`}
            aria-label="CSV content"
          />
          <div className="flex items-center gap-2">
            <button type="button" onClick={previewImport} disabled={busy || !csv.trim()} className="text-sm px-4 py-2 rounded-full border border-white/10 text-slate-300 hover:text-white transition-colors disabled:opacity-50 inline-flex items-center gap-2">
              {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Preview
            </button>
            {preview && preview.candidates.length > 0 && (
              <button type="button" onClick={commitImport} disabled={busy} className="text-sm px-4 py-2 rounded-full bg-gold-400/15 text-gold-400 border border-gold-400/40 hover:bg-gold-400/25 transition-colors disabled:opacity-50">
                Import {preview.candidates.length} contact{preview.candidates.length === 1 ? '' : 's'}
              </button>
            )}
          </div>
          {preview && (
            <div className="text-sm text-slate-400 space-y-1.5">
              <p>{preview.candidates.length} importable · {preview.duplicates.length} duplicates skipped · {preview.errors.length} row errors</p>
              {preview.unmappedHeaders.length > 0 && (
                <p className="text-xs text-slate-500">Ignored columns: {preview.unmappedHeaders.join(', ')}</p>
              )}
              {preview.errors.slice(0, 5).map((rowError) => (
                <p key={rowError.rowNumber} className="text-xs text-red-400">Row {rowError.rowNumber}: {rowError.message}</p>
              ))}
              {preview.duplicates.slice(0, 5).map((duplicate) => (
                <p key={duplicate.rowNumber} className="text-xs text-slate-500">
                  Row {duplicate.rowNumber}: {duplicate.full_name} already exists (matched by {duplicate.matchType.replace('_', '+')})
                </p>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="glass rounded-2xl border border-white/8 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-slate-300 mb-1">{contacts.length === 0 ? 'No contacts yet.' : 'No contacts match the current filters.'}</p>
            {contacts.length === 0 && (
              <p className="text-sm text-slate-500">
                Start with 2–3 people per target firm — the <Link href={`${base}/target-map`} className="text-gold-400 hover:underline">target map</Link> shows where coverage matters most.
              </p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-500 border-b border-white/5">
                  <th className="px-5 py-3 font-medium">Name</th>
                  <th className="px-5 py-3 font-medium hidden md:table-cell">Firm</th>
                  <th className="px-5 py-3 font-medium">Stage</th>
                  <th className="px-5 py-3 font-medium hidden lg:table-cell">Targets</th>
                  <th className="px-5 py-3 font-medium hidden sm:table-cell">Next action due</th>
                  <th className="px-5 py-3 font-medium hidden lg:table-cell">Last touch</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((contact) => {
                  const followUp = followUpByContact.get(contact.id);
                  const touch = lastTouch.get(contact.id);
                  return (
                    <tr key={contact.id} className="hover:bg-white/[0.03] transition-colors">
                      <td className="px-5 py-3">
                        <Link href={`${base}/contacts/${contact.id}`} className="text-white hover:text-gold-400 transition-colors font-medium">
                          {contact.full_name}
                        </Link>
                        <p className="text-xs text-slate-500 md:hidden">{contact.firm}</p>
                        {contact.do_not_contact && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-red-400/15 text-red-400 uppercase tracking-wider">DNC</span>}
                        {contact.is_alum && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-gold-400/15 text-gold-400 uppercase tracking-wider">Alum</span>}
                      </td>
                      <td className="px-5 py-3 text-slate-400 hidden md:table-cell">{contact.firm || '—'}<p className="text-xs text-slate-600">{contact.role_title}</p></td>
                      <td className="px-5 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${STAGE_CHIP[contact.stage]}`}>{STAGE_LABELS[contact.stage]}</span>
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-500 hidden lg:table-cell">{(targetsByContact.get(contact.id) ?? []).join(', ') || '—'}</td>
                      <td className="px-5 py-3 text-xs hidden sm:table-cell">
                        {followUp
                          ? <span className={new Date(followUp.due_at) < new Date() ? 'text-red-400' : 'text-slate-400'}>{new Date(followUp.due_at).toLocaleDateString('en-AU')}</span>
                          : <span className="text-slate-600">none</span>}
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-500 hidden lg:table-cell">{touch ? new Date(touch).toLocaleDateString('en-AU') : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
