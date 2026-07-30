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
import { Button } from '@/components/ui/Button';
import { CheckControl, Field } from '@/components/ui/Field';
import { Panel } from '@/components/ui/Panel';
import { StateBlock } from '@/components/ui/StateBlock';
import { StatusLabel } from '@/components/ui/Status';
import type { BankTargetRow, ContactTargetLink, InteractionSummaryRow } from '@/lib/networking/queries';
import { networkingApi } from './api';
import { Notice, SectionHeading, TableScroll, Th, Toggle } from './ui';

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

/**
 * Two tones only: a relationship that has answered you reads differently
 * from one that has not. The stage name always does the actual work.
 */
const STAGE_TONE: Record<RelationshipStage, 'neutral' | 'ok'> = {
  prospect: 'neutral',
  ready_to_contact: 'neutral',
  contacted: 'neutral',
  replied: 'ok',
  conversation_booked: 'ok',
  connected: 'ok',
  dormant: 'neutral',
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

  function toggleTarget(targetId: string) {
    setForm((prev) => ({
      ...prev,
      bank_target_ids: prev.bank_target_ids.includes(targetId)
        ? prev.bank_target_ids.filter((t) => t !== targetId)
        : [...prev.bank_target_ids, targetId],
    }));
  }

  const now = new Date();

  return (
    <div className="space-y-8">
      {error && <Notice>{error}</Notice>}

      {/* ── Filter bar ─────────────────────────────────────────── */}
      <div className="flex flex-wrap items-end gap-x-4 gap-y-4">
        <Field label="Search" className="min-w-[14rem] flex-1 sm:max-w-[20rem]">
          {(p) => (
            <input
              {...p}
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Name, firm or role"
              className="ml-field"
            />
          )}
        </Field>
        <Field label="Stage" className="min-w-[11rem]">
          {(p) => (
            <select
              {...p}
              value={stageFilter}
              onChange={(event) => setStageFilter(event.target.value as typeof stageFilter)}
              className="ml-field"
            >
              <option value="all">All stages</option>
              {Object.entries(STAGE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          )}
        </Field>
        <Field label="Target firm" className="min-w-[11rem]">
          {(p) => (
            <select
              {...p}
              value={targetFilter}
              onChange={(event) => setTargetFilter(event.target.value)}
              className="ml-field"
            >
              <option value="all">All target firms</option>
              {targets.map((target) => (
                <option key={target.id} value={target.bank_name}>{target.bank_name}</option>
              ))}
            </select>
          )}
        </Field>

        <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
          <a
            href="/api/resources/networking-strategy/export"
            className="ml-btn ml-btn-secondary min-h-[44px] px-5 text-[13px]"
          >
            Export CSV
          </a>
          <Button
            variant="secondary"
            onClick={() => setPanel(panel === 'import' ? 'none' : 'import')}
            aria-expanded={panel === 'import'}
          >
            {panel === 'import' ? 'Close import' : 'Import CSV'}
          </Button>
          <Button
            onClick={() => setPanel(panel === 'add' ? 'none' : 'add')}
            aria-expanded={panel === 'add'}
          >
            {panel === 'add' ? 'Close' : 'Add contact'}
          </Button>
        </div>
      </div>

      {/* ── Quick add ──────────────────────────────────────────── */}
      {panel === 'add' && (
        <Panel as="div" className="p-5 sm:p-6">
          <SectionHeading title="New contact record" />
          <form onSubmit={createContact} className="mt-5 space-y-5">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Full name" required>
                {(p) => (
                  <input
                    {...p}
                    required
                    value={form.full_name}
                    onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                    className="ml-field"
                  />
                )}
              </Field>
              <Field label="Firm">
                {(p) => (
                  <input
                    {...p}
                    value={form.firm}
                    onChange={(e) => setForm({ ...form, firm: e.target.value })}
                    className="ml-field"
                  />
                )}
              </Field>
              <Field label="Role title">
                {(p) => (
                  <input
                    {...p}
                    value={form.role_title}
                    onChange={(e) => setForm({ ...form, role_title: e.target.value })}
                    className="ml-field"
                  />
                )}
              </Field>
              <Field label="Seniority">
                {(p) => (
                  <select
                    {...p}
                    value={form.seniority}
                    onChange={(e) => setForm({ ...form, seniority: e.target.value as ContactSeniority })}
                    className="ml-field"
                  >
                    {SENIORITIES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                )}
              </Field>
              <Field label="City">
                {(p) => (
                  <input
                    {...p}
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className="ml-field"
                  />
                )}
              </Field>
              <Field label="Source" hint="How you came across them.">
                {(p) => (
                  <select
                    {...p}
                    value={form.source}
                    onChange={(e) => setForm({ ...form, source: e.target.value as ContactSource })}
                    className="ml-field"
                  >
                    {SOURCES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                )}
              </Field>
              <Field label="Email">
                {(p) => (
                  <input
                    {...p}
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="ml-field"
                  />
                )}
              </Field>
              <Field label="LinkedIn URL">
                {(p) => (
                  <input
                    {...p}
                    value={form.linkedin_url}
                    onChange={(e) => setForm({ ...form, linkedin_url: e.target.value })}
                    className="ml-field"
                  />
                )}
              </Field>
              <div className="self-end">
                <CheckControl
                  checked={form.is_alum}
                  onChange={() => setForm({ ...form, is_alum: !form.is_alum })}
                  label="Alum of my university"
                />
              </div>
            </div>

            {targets.length > 0 && (
              <fieldset>
                <legend className="text-[13px] font-semibold text-bone">Link to bank targets</legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {targets.map((target) => {
                    const linked = form.bank_target_ids.includes(target.id);
                    return (
                      <Toggle
                        key={target.id}
                        active={linked}
                        onClick={() => toggleTarget(target.id)}
                        aria-label={`${linked ? 'Unlink from' : 'Link to'} ${target.bank_name}`}
                      >
                        {target.bank_name}
                      </Toggle>
                    );
                  })}
                </div>
              </fieldset>
            )}

            <Button type="submit" disabled={busy} loading={busy}>
              Save contact
            </Button>
          </form>
        </Panel>
      )}

      {/* ── CSV import ─────────────────────────────────────────── */}
      {panel === 'import' && (
        <Panel as="div" className="p-5 sm:p-6">
          <SectionHeading title="Import contacts" label="Max 500 rows" />
          <div className="mt-5 space-y-5">
            <Field
              label="CSV content"
              hint="Include a header row. Recognised columns: name, firm, role, seniority, city, email, linkedin, tags, notes. Duplicates are detected by email, then LinkedIn, then name + firm."
            >
              {(p) => (
                <textarea
                  {...p}
                  value={csv}
                  onChange={(event) => { setCsv(event.target.value); setPreview(null); }}
                  rows={6}
                  placeholder={'name,firm,role,email\nJane Doe,Macquarie,Analyst,jane@example.com'}
                  className="ml-field font-mono text-[14px]"
                />
              )}
            </Field>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                onClick={previewImport}
                disabled={busy || !csv.trim()}
                loading={busy && !preview}
              >
                Preview
              </Button>
              {preview && preview.candidates.length > 0 && (
                <Button onClick={commitImport} disabled={busy} loading={busy}>
                  Import {preview.candidates.length} contact{preview.candidates.length === 1 ? '' : 's'}
                </Button>
              )}
            </div>

            {preview && (
              <div className="border-t border-rule pt-4">
                <p className="ml-num text-[14px] text-bone">
                  {preview.candidates.length} importable · {preview.duplicates.length} duplicates
                  skipped · {preview.errors.length} row errors
                </p>
                {preview.unmappedHeaders.length > 0 && (
                  <p className="mt-1.5 text-[14px] text-graphite">
                    Ignored columns: {preview.unmappedHeaders.join(', ')}
                  </p>
                )}
                {preview.errors.length > 0 && (
                  <ul className="mt-3">
                    {preview.errors.slice(0, 5).map((rowError) => (
                      <li key={rowError.rowNumber} className="ml-row py-2 text-[14px] text-bone">
                        <span className="ml-num text-red">Row {rowError.rowNumber}</span>{' '}
                        {rowError.message}
                      </li>
                    ))}
                  </ul>
                )}
                {preview.duplicates.length > 0 && (
                  <ul className="mt-3">
                    {preview.duplicates.slice(0, 5).map((duplicate) => (
                      <li key={duplicate.rowNumber} className="ml-row py-2 text-[14px] text-graphite">
                        <span className="ml-num">Row {duplicate.rowNumber}</span> {duplicate.full_name}{' '}
                        already exists (matched by {duplicate.matchType.replace('_', '+')})
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </Panel>
      )}

      {/* ── Register ───────────────────────────────────────────── */}
      <section>
        <SectionHeading
          title="Contact register"
          label={`${filtered.length} of ${contacts.length}`}
        />

        {filtered.length === 0 ? (
          <StateBlock
            kind="empty"
            title={contacts.length === 0 ? 'No contacts yet' : 'No contacts match these filters'}
            className="mt-5"
            action={
              contacts.length === 0 ? (
                <Button href={`${base}/target-map`} variant="secondary">
                  Open target map
                </Button>
              ) : undefined
            }
          >
            {contacts.length === 0
              ? 'Start with two or three people per target firm. The target map shows where coverage matters most.'
              : 'Clear the search, or widen the stage and firm filters.'}
          </StateBlock>
        ) : (
          <TableScroll className="mt-2">
            <table className="w-full min-w-[34rem] border-collapse text-left">
              <caption className="sr-only">
                Contacts, with relationship stage, next action and last touch
              </caption>
              <thead>
                <tr>
                  <Th>Name</Th>
                  <Th className="hidden md:table-cell">Firm</Th>
                  <Th>Stage</Th>
                  <Th className="hidden lg:table-cell">Targets</Th>
                  <Th className="hidden sm:table-cell">Next action due</Th>
                  <Th className="hidden lg:table-cell">Last touch</Th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((contact) => {
                  const followUp = followUpByContact.get(contact.id);
                  const overdue = followUp ? new Date(followUp.due_at) < now : false;
                  const touch = lastTouch.get(contact.id);
                  return (
                    <tr key={contact.id} className="ml-row ml-row-hover align-top">
                      <td className="px-3 py-3">
                        <Link
                          href={`${base}/contacts/${contact.id}`}
                          className="text-[16px] font-semibold text-bone hover:text-red"
                        >
                          {contact.full_name}
                        </Link>
                        <span className="mt-0.5 block text-[14px] text-graphite md:hidden">
                          {contact.firm || '—'}
                        </span>
                        {(contact.do_not_contact || contact.is_alum) && (
                          <span className="mt-1.5 flex flex-wrap gap-1.5">
                            {contact.do_not_contact && <StatusLabel tone="accent">Do not contact</StatusLabel>}
                            {contact.is_alum && <StatusLabel>Alum</StatusLabel>}
                          </span>
                        )}
                      </td>
                      <td className="hidden px-3 py-3 md:table-cell">
                        <span className="text-[15px] text-bone">{contact.firm || '—'}</span>
                        {contact.role_title && (
                          <span className="mt-0.5 block text-[13px] text-graphite">{contact.role_title}</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <StatusLabel tone={STAGE_TONE[contact.stage]}>
                          {STAGE_LABELS[contact.stage]}
                        </StatusLabel>
                      </td>
                      <td className="hidden px-3 py-3 text-[14px] text-graphite lg:table-cell">
                        {(targetsByContact.get(contact.id) ?? []).join(', ') || '—'}
                      </td>
                      <td className="ml-num hidden px-3 py-3 text-[14px] sm:table-cell">
                        {followUp ? (
                          <span className={overdue ? 'text-red' : 'text-graphite'}>
                            {new Date(followUp.due_at).toLocaleDateString('en-AU')}
                            {overdue && ' · overdue'}
                          </span>
                        ) : (
                          <span className="text-graphite">None</span>
                        )}
                      </td>
                      <td className="ml-num hidden px-3 py-3 text-[14px] text-graphite lg:table-cell">
                        {touch ? new Date(touch).toLocaleDateString('en-AU') : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </TableScroll>
        )}
      </section>
    </div>
  );
}
