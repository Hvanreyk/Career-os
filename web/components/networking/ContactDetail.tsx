'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { STAGE_LABELS } from '@trajectoryos/core/networking';
import type {
  FollowUpKind,
  InteractionType,
  NetworkingCoffeeChatRow,
  NetworkingContactRow,
  NetworkingFollowUpRow,
  NetworkingIntroductionRow,
  NetworkingMessageRow,
  RelationshipStage,
} from '@trajectoryos/core/networking/types';
import { Button } from '@/components/ui/Button';
import { CheckControl, Field } from '@/components/ui/Field';
import { Panel } from '@/components/ui/Panel';
import { StatusLabel } from '@/components/ui/Status';
import { networkingApi } from './api';
import { LinkedinGlyph } from './LinkedinGlyph';
import { Notice, SectionHeading, Toggle } from './ui';

const CompleteChatResponseSchema = z.object({ namesDropped: z.array(z.string()).default([]) });

const INTERACTION_TYPES: { value: InteractionType; label: string; direction: 'outbound' | 'inbound' | 'none' }[] = [
  { value: 'email_sent', label: 'Email sent', direction: 'outbound' },
  { value: 'email_reply', label: 'Email reply received', direction: 'inbound' },
  { value: 'linkedin_sent', label: 'LinkedIn message sent', direction: 'outbound' },
  { value: 'linkedin_reply', label: 'LinkedIn reply received', direction: 'inbound' },
  { value: 'call', label: 'Call', direction: 'none' },
  { value: 'event', label: 'Met at event', direction: 'none' },
  { value: 'introduction', label: 'Introduction', direction: 'none' },
  { value: 'note', label: 'Note', direction: 'none' },
];

const FOLLOWUP_KINDS: { value: FollowUpKind; label: string }[] = [
  { value: 'send_outreach', label: 'Send first outreach' },
  { value: 'follow_up_no_reply', label: 'Follow up (no reply)' },
  { value: 'thank_you', label: 'Send thank-you' },
  { value: 'schedule_chat', label: 'Schedule coffee chat' },
  { value: 'maintain', label: 'Keep relationship warm' },
  { value: 'custom', label: 'Custom' },
];

interface InteractionRow {
  id: string;
  type: string;
  direction: string;
  occurred_at: string;
  summary: string;
  outcome: string;
  source: string;
}

interface Props {
  base: string;
  contact: NetworkingContactRow;
  interactions: InteractionRow[];
  followUps: NetworkingFollowUpRow[];
  messages: NetworkingMessageRow[];
  chats: NetworkingCoffeeChatRow[];
  introductions: NetworkingIntroductionRow[];
  targets: Array<{ id: string; bank_name: string }>;
  linkedTargetIds: string[];
  otherContacts: Array<{ id: string; full_name: string }>;
}

/** Every side panel is the same square form block. */
const FORM_PANEL = 'ml-panel p-5 sm:p-6';

/**
 * Full contact record: identity + stage, quick actions, next action,
 * coffee chats (prep/debrief), warm introductions and the timeline.
 */
export function ContactDetail(props: Props) {
  const { base, contact, interactions, followUps, messages, chats, introductions, targets, linkedTargetIds, otherContacts } = props;
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [panel, setPanel] = useState<'none' | 'log' | 'followup' | 'chat' | 'intro'>('none');
  const [notes, setNotes] = useState(contact.notes);

  const activeFollowUp = followUps.find((f) => f.status === 'open' || f.status === 'snoozed') ?? null;

  const [logForm, setLogForm] = useState({ type: 'email_sent' as InteractionType, summary: '', outcome: '' });
  const [followUpForm, setFollowUpForm] = useState({ kind: 'follow_up_no_reply' as FollowUpKind, due: defaultDue(3), reason: '' });
  const [chatForm, setChatForm] = useState({ when: '', duration: 30, location: 'Video call' });
  const [introForm, setIntroForm] = useState({ to_name: '', to_contact_id: '', notes: '' });
  const [debriefFor, setDebriefFor] = useState<string | null>(null);
  const [debrief, setDebrief] = useState({ learned: '', referral_offered: false, names: '', promises_made: '', outcome: '' });
  const [droppedNames, setDroppedNames] = useState<string[]>([]);

  function defaultDue(days: number): string {
    const date = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    return date.toISOString().slice(0, 10);
  }

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  const patchContact = (body: Record<string, unknown>) =>
    run(async () => { await networkingApi(`/contacts/${contact.id}`, 'PATCH', body); });

  async function deleteContact() {
    if (!window.confirm(`Delete ${contact.full_name} and their entire timeline? This cannot be undone.`)) return;
    await run(async () => {
      await networkingApi(`/contacts/${contact.id}`, 'DELETE');
      router.push(`${base}/contacts`);
    });
  }

  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Australia/Sydney';
  const identity = [contact.role_title, contact.firm, contact.city].filter(Boolean).join(' · ');

  return (
    <div className="space-y-8">
      <Link href={`${base}/contacts`} className="ml-btn ml-btn-text min-h-[44px] text-[14px]">
        <span aria-hidden="true">◂</span> All contacts
      </Link>

      {error && <Notice>{error}</Notice>}

      {/* ── Record head ────────────────────────────────────────── */}
      <header className="border-b border-rule pb-6">
        <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-6">
          <div className="min-w-0">
            <span className="ml-label">Contact record</span>
            <h1 className="ml-title mt-2.5 text-bone">{contact.full_name}</h1>
            {(contact.is_alum || contact.do_not_contact) && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {contact.is_alum && <StatusLabel>Alum</StatusLabel>}
                {contact.do_not_contact && <StatusLabel tone="accent">Do not contact</StatusLabel>}
              </div>
            )}
            <p className="mt-3 text-[16px] leading-[1.6] text-graphite">
              {identity || 'No role details yet'}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              {contact.email && (
                <a
                  href={`mailto:${contact.email}`}
                  className="ml-btn ml-btn-secondary min-h-[44px] px-4 text-[13px] normal-case tracking-normal"
                >
                  {contact.email}
                </a>
              )}
              {contact.linkedin_url && (
                <a
                  href={contact.linkedin_url}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-btn ml-btn-secondary min-h-[44px] px-4 text-[13px]"
                >
                  <LinkedinGlyph className="h-3.5 w-3.5" /> LinkedIn
                  <span className="sr-only"> (opens in a new tab)</span>
                  <span aria-hidden="true">↗</span>
                </a>
              )}
            </div>
          </div>

          <div className="w-full max-w-[17rem]">
            <Field label="Relationship stage">
              {(p) => (
                <select
                  {...p}
                  value={contact.stage}
                  onChange={(event) => patchContact({ stage: event.target.value as RelationshipStage })}
                  disabled={busy}
                  className="ml-field"
                >
                  {Object.entries(STAGE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              )}
            </Field>
            <CheckControl
              checked={contact.do_not_contact}
              onChange={() => patchContact({ do_not_contact: !contact.do_not_contact })}
              disabled={busy}
              label="Do not contact"
            />
            <button
              type="button"
              onClick={deleteContact}
              disabled={busy}
              className="ml-btn ml-btn-text mt-1 min-h-[44px] text-[14px] text-graphite hover:text-red disabled:opacity-45"
            >
              Delete contact
            </button>
          </div>
        </div>

        {targets.length > 0 && (
          <fieldset className="mt-6 border-t border-rule pt-5">
            <legend className="sr-only">Target firms</legend>
            <span className="text-[13px] font-semibold text-bone">Target firms</span>
            <div className="mt-2 flex flex-wrap gap-2">
              {targets.map((target) => {
                const linked = linkedTargetIds.includes(target.id);
                return (
                  <Toggle
                    key={target.id}
                    active={linked}
                    disabled={busy}
                    onClick={() => patchContact({
                      bank_target_ids: linked
                        ? linkedTargetIds.filter((t) => t !== target.id)
                        : [...linkedTargetIds, target.id],
                    })}
                    aria-label={`${linked ? 'Unlink from' : 'Link to'} ${target.bank_name}`}
                  >
                    {target.bank_name}
                  </Toggle>
                );
              })}
            </div>
          </fieldset>
        )}
      </header>

      {/* ── Actions ────────────────────────────────────────────── */}
      <div>
        <span className="ml-label">Record an action</span>
        <div className="mt-2.5 flex flex-wrap gap-2">
          <Link
            href={`${base}/messages?contact=${contact.id}&channel=email`}
            className="ml-btn ml-btn-secondary min-h-[44px] px-5 text-[13px]"
          >
            Draft email
          </Link>
          <Link
            href={`${base}/messages?contact=${contact.id}&channel=linkedin`}
            className="ml-btn ml-btn-secondary min-h-[44px] px-5 text-[13px]"
          >
            Draft LinkedIn
          </Link>
          <Button variant="secondary" onClick={() => setPanel(panel === 'log' ? 'none' : 'log')} aria-expanded={panel === 'log'}>
            Log interaction
          </Button>
          <Button variant="secondary" onClick={() => setPanel(panel === 'followup' ? 'none' : 'followup')} aria-expanded={panel === 'followup'}>
            Schedule follow-up
          </Button>
          <Button variant="secondary" onClick={() => setPanel(panel === 'chat' ? 'none' : 'chat')} aria-expanded={panel === 'chat'}>
            Schedule coffee chat
          </Button>
          <Button variant="secondary" onClick={() => setPanel(panel === 'intro' ? 'none' : 'intro')} aria-expanded={panel === 'intro'}>
            Record introduction
          </Button>
        </div>
      </div>

      {panel === 'log' && (
        <form
          className={FORM_PANEL}
          onSubmit={(event) => {
            event.preventDefault();
            const type = INTERACTION_TYPES.find((t) => t.value === logForm.type)!;
            void run(async () => {
              await networkingApi('/interactions', 'POST', {
                contact_id: contact.id,
                type: logForm.type,
                direction: type.direction,
                occurred_at: new Date().toISOString(),
                summary: logForm.summary,
                outcome: logForm.outcome,
              });
              setPanel('none');
              setLogForm({ type: 'email_sent', summary: '', outcome: '' });
            });
          }}
        >
          <SectionHeading title="Log interaction" />
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <Field label="Interaction type">
              {(p) => (
                <select
                  {...p}
                  value={logForm.type}
                  onChange={(e) => setLogForm({ ...logForm, type: e.target.value as InteractionType })}
                  className="ml-field"
                >
                  {INTERACTION_TYPES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              )}
            </Field>
            <Field label="Summary" hint="Kept private to your workspace.">
              {(p) => (
                <input
                  {...p}
                  value={logForm.summary}
                  onChange={(e) => setLogForm({ ...logForm, summary: e.target.value })}
                  placeholder="What happened?"
                  className="ml-field"
                />
              )}
            </Field>
          </div>
          <Button type="submit" disabled={busy} loading={busy} className="mt-5">
            Log it
          </Button>
        </form>
      )}

      {panel === 'followup' && (
        <form
          className={FORM_PANEL}
          onSubmit={(event) => {
            event.preventDefault();
            void run(async () => {
              await networkingApi('/followups', 'POST', {
                contact_id: contact.id,
                kind: followUpForm.kind,
                due_at: new Date(`${followUpForm.due}T09:00:00`).toISOString(),
                reason: followUpForm.reason,
              });
              setPanel('none');
            });
          }}
        >
          <SectionHeading title="Schedule follow-up" label="One per contact" />
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <Field label="Kind">
              {(p) => (
                <select
                  {...p}
                  value={followUpForm.kind}
                  onChange={(e) => setFollowUpForm({ ...followUpForm, kind: e.target.value as FollowUpKind })}
                  className="ml-field"
                >
                  {FOLLOWUP_KINDS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              )}
            </Field>
            <Field label="Due date">
              {(p) => (
                <input
                  {...p}
                  type="date"
                  value={followUpForm.due}
                  onChange={(e) => setFollowUpForm({ ...followUpForm, due: e.target.value })}
                  className="ml-field [color-scheme:dark]"
                />
              )}
            </Field>
            <Field label="Reason" hint="Optional.">
              {(p) => (
                <input
                  {...p}
                  value={followUpForm.reason}
                  onChange={(e) => setFollowUpForm({ ...followUpForm, reason: e.target.value })}
                  className="ml-field"
                />
              )}
            </Field>
          </div>
          <p className="mt-4 max-w-[62ch] border-l-2 border-red pl-4 text-[15px] leading-[1.55] text-graphite">
            One active next action per contact — scheduling replaces the current one.
          </p>
          <Button type="submit" disabled={busy} loading={busy} className="mt-5">
            Schedule
          </Button>
        </form>
      )}

      {panel === 'chat' && (
        <form
          className={FORM_PANEL}
          onSubmit={(event) => {
            event.preventDefault();
            if (!chatForm.when) return;
            void run(async () => {
              await networkingApi('/coffee-chats', 'POST', {
                contact_id: contact.id,
                scheduled_at: new Date(chatForm.when).toISOString(),
                timezone,
                duration_minutes: chatForm.duration,
                location: chatForm.location,
              });
              setPanel('none');
            });
          }}
        >
          <SectionHeading title="Schedule coffee chat" />
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <Field label="When" hint={`Times use your timezone (${timezone}).`} required>
              {(p) => (
                <input
                  {...p}
                  type="datetime-local"
                  required
                  value={chatForm.when}
                  onChange={(e) => setChatForm({ ...chatForm, when: e.target.value })}
                  className="ml-field [color-scheme:dark]"
                />
              )}
            </Field>
            <Field label="Duration">
              {(p) => (
                <select
                  {...p}
                  value={chatForm.duration}
                  onChange={(e) => setChatForm({ ...chatForm, duration: Number(e.target.value) })}
                  className="ml-field"
                >
                  {[15, 20, 30, 45, 60].map((minutes) => <option key={minutes} value={minutes}>{minutes} min</option>)}
                </select>
              )}
            </Field>
            <Field label="Location" hint="A place, or a video link.">
              {(p) => (
                <input
                  {...p}
                  value={chatForm.location}
                  onChange={(e) => setChatForm({ ...chatForm, location: e.target.value })}
                  className="ml-field"
                />
              )}
            </Field>
          </div>
          <p className="mt-4 max-w-[62ch] text-[15px] leading-[1.55] text-graphite">
            A role-calibrated prep sheet is created automatically.
          </p>
          <Button type="submit" disabled={busy} loading={busy} className="mt-5">
            Schedule chat
          </Button>
        </form>
      )}

      {panel === 'intro' && (
        <form
          className={FORM_PANEL}
          onSubmit={(event) => {
            event.preventDefault();
            void run(async () => {
              await networkingApi('/introductions', 'POST', {
                via_contact_id: contact.id,
                to_contact_id: introForm.to_contact_id || null,
                to_name: introForm.to_name,
                notes: introForm.notes,
              });
              setPanel('none');
              setIntroForm({ to_name: '', to_contact_id: '', notes: '' });
            });
          }}
        >
          <SectionHeading title="Record introduction" />
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <Field label="Introduce me to">
              {(p) => (
                <select
                  {...p}
                  value={introForm.to_contact_id}
                  onChange={(e) => setIntroForm({ ...introForm, to_contact_id: e.target.value })}
                  className="ml-field"
                >
                  <option value="">Someone new (name below)</option>
                  {otherContacts.map((other) => <option key={other.id} value={other.id}>{other.full_name}</option>)}
                </select>
              )}
            </Field>
            <Field label="Their name" hint="If they are not a contact yet.">
              {(p) => (
                <input
                  {...p}
                  value={introForm.to_name}
                  onChange={(e) => setIntroForm({ ...introForm, to_name: e.target.value })}
                  className="ml-field"
                />
              )}
            </Field>
            <Field label="Context" hint="Optional.">
              {(p) => (
                <input
                  {...p}
                  value={introForm.notes}
                  onChange={(e) => setIntroForm({ ...introForm, notes: e.target.value })}
                  className="ml-field"
                />
              )}
            </Field>
          </div>
          <p className="mt-4 max-w-[62ch] text-[15px] leading-[1.55] text-graphite">
            {contact.full_name} can introduce you. Ask with a short forwardable paragraph — draft one in
            the Message Lab (purpose: warm-intro request).
          </p>
          <Button type="submit" disabled={busy} loading={busy} className="mt-5">
            Record
          </Button>
        </form>
      )}

      {/* ── Timeline + rail ────────────────────────────────────── */}
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-10">
        <section>
          <SectionHeading title="Timeline" label={`${interactions.length} logged`} />
          {interactions.length === 0 ? (
            <p className="mt-4 max-w-[62ch] text-[16px] leading-[1.6] text-graphite">
              No interactions yet. Log your first touch, or draft outreach in the Message Lab.
            </p>
          ) : (
            <ul className="mt-2">
              {interactions.map((interaction) => (
                <li key={interaction.id} className="ml-row py-4">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="text-[16px] font-semibold text-bone">
                      {INTERACTION_TYPES.find((t) => t.value === interaction.type)?.label
                        ?? interaction.type.replace(/_/g, ' ')}
                      {interaction.type === 'coffee_chat' && ' Coffee chat'}
                    </span>
                    <span className="ml-num text-[13px] text-graphite">
                      {new Date(interaction.occurred_at).toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' })}
                    </span>
                  </div>
                  {interaction.summary && (
                    <p className="mt-1.5 max-w-[70ch] whitespace-pre-wrap text-[16px] leading-[1.6] text-graphite">
                      {interaction.summary}
                    </p>
                  )}
                  {interaction.outcome && (
                    <p className="mt-1.5 text-[14px] text-graphite">
                      <span className="ml-label">Outcome</span> {interaction.outcome}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className="space-y-8">
          {/* Next action */}
          <section>
            <SectionHeading title="Next action" />
            {activeFollowUp ? (
              <div className="mt-4">
                <p className="text-[16px] font-semibold text-bone">
                  {FOLLOWUP_KINDS.find((k) => k.value === activeFollowUp.kind)?.label ?? activeFollowUp.kind}
                </p>
                <p className="ml-num mt-1 text-[13px] text-graphite">
                  Due {new Date(activeFollowUp.due_at).toLocaleDateString('en-AU')}
                  {activeFollowUp.status === 'snoozed' ? ' · snoozed' : ''}
                </p>
                {activeFollowUp.reason && (
                  <p className="mt-2 text-[15px] leading-[1.55] text-graphite">{activeFollowUp.reason}</p>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={busy}
                    onClick={() => run(async () => { await networkingApi(`/followups/${activeFollowUp.id}`, 'PATCH', { status: 'completed' }); })}
                  >
                    Done
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={busy}
                    onClick={() => run(async () => { await networkingApi(`/followups/${activeFollowUp.id}`, 'PATCH', { status: 'cancelled' }); })}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <p className="mt-4 text-[16px] leading-[1.6] text-graphite">
                No next action scheduled — every live relationship should have one.
              </p>
            )}
          </section>

          {/* Coffee chats */}
          <section>
            <SectionHeading title="Coffee chats" label={`${chats.length}`} />
            {chats.length === 0 ? (
              <p className="mt-4 text-[16px] text-graphite">None yet.</p>
            ) : (
              <ul className="mt-2">
                {chats.map((chat) => (
                  <li key={chat.id} className="ml-row py-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                      <span className="ml-num text-[14px] text-bone">
                        {new Date(chat.scheduled_at).toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' })}
                      </span>
                      <StatusLabel>{chat.duration_minutes} min · {chat.status}</StatusLabel>
                    </div>

                    {chat.status === 'scheduled' && chat.prep && (
                      <details className="mt-3">
                        <summary className="ml-label cursor-pointer text-bone">Prep sheet</summary>
                        <ul className="mt-2 space-y-1.5">
                          {((chat.prep as { questions?: string[] }).questions ?? []).map((question) => (
                            <li key={question} className="text-[15px] leading-[1.55] text-graphite">
                              <span aria-hidden="true">— </span>{question}
                            </li>
                          ))}
                        </ul>
                      </details>
                    )}

                    {chat.status === 'scheduled' && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setDebriefFor(debriefFor === chat.id ? null : chat.id)}
                          aria-expanded={debriefFor === chat.id}
                        >
                          Complete + debrief
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          disabled={busy}
                          onClick={() => run(async () => { await networkingApi(`/coffee-chats/${chat.id}`, 'PATCH', { action: 'cancel' }); })}
                        >
                          Cancel
                        </Button>
                      </div>
                    )}

                    {chat.status === 'completed' && chat.debrief && (
                      <p className="mt-2 text-[15px] leading-[1.55] text-graphite">
                        {(chat.debrief as { learned?: string }).learned}
                      </p>
                    )}

                    {debriefFor === chat.id && (
                      <form
                        className="mt-4 space-y-4 border-l-2 border-rule-bright pl-4"
                        onSubmit={(event) => {
                          event.preventDefault();
                          void run(async () => {
                            const names = debrief.names.split(',').map((n) => n.trim()).filter(Boolean);
                            const raw = await networkingApi<unknown>(`/coffee-chats/${chat.id}`, 'PATCH', {
                              action: 'complete',
                              debrief: {
                                learned: debrief.learned,
                                referral_offered: debrief.referral_offered,
                                names_dropped: names,
                                promises_made: debrief.promises_made,
                                outcome: debrief.outcome,
                              },
                            });
                            const result = CompleteChatResponseSchema.parse(raw);
                            setDroppedNames(result.namesDropped);
                            setDebriefFor(null);
                          });
                        }}
                      >
                        <Field label="What did you learn?" required>
                          {(p) => (
                            <textarea
                              {...p}
                              required
                              value={debrief.learned}
                              onChange={(e) => setDebrief({ ...debrief, learned: e.target.value })}
                              rows={3}
                              className="ml-field"
                            />
                          )}
                        </Field>
                        <Field
                          label="Names they mentioned"
                          hint="Comma-separated. Each one can be added as a prospect afterwards."
                        >
                          {(p) => (
                            <input
                              {...p}
                              value={debrief.names}
                              onChange={(e) => setDebrief({ ...debrief, names: e.target.value })}
                              className="ml-field"
                            />
                          )}
                        </Field>
                        <Field label="Anything you promised to do">
                          {(p) => (
                            <input
                              {...p}
                              value={debrief.promises_made}
                              onChange={(e) => setDebrief({ ...debrief, promises_made: e.target.value })}
                              className="ml-field"
                            />
                          )}
                        </Field>
                        <CheckControl
                          checked={debrief.referral_offered}
                          onChange={() => setDebrief({ ...debrief, referral_offered: !debrief.referral_offered })}
                          label="They offered a referral, or to pass my name on"
                        />
                        <p className="text-[14px] leading-[1.55] text-graphite">
                          Completing queues your thank-you (due within 24 hours) automatically.
                        </p>
                        <Button type="submit" disabled={busy} loading={busy}>
                          Save debrief
                        </Button>
                      </form>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {droppedNames.length > 0 && (
              <Panel as="div" raised className="mt-4 p-4">
                <span className="ml-label">Add the people they mentioned</span>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {droppedNames.map((name) => (
                    <Button
                      key={name}
                      variant="secondary"
                      size="sm"
                      disabled={busy}
                      onClick={() => run(async () => {
                        await networkingApi('/contacts', 'POST', { full_name: name, firm: contact.firm, source: 'introduction' });
                        setDroppedNames((prev) => prev.filter((n) => n !== name));
                      })}
                      aria-label={`Add ${name} as a prospect`}
                    >
                      + {name}
                    </Button>
                  ))}
                </div>
              </Panel>
            )}
          </section>

          {introductions.length > 0 && (
            <section>
              <SectionHeading title={`Introductions via ${contact.full_name.split(' ')[0]}`} />
              <ul className="mt-2">
                {introductions.map((intro) => (
                  <li
                    key={intro.id}
                    className="ml-row flex flex-wrap items-center justify-between gap-x-3 gap-y-2 py-3"
                  >
                    <span className="flex flex-wrap items-center gap-2 text-[15px] text-bone">
                      {intro.to_name || 'Contact'}
                      <StatusLabel>{intro.status}</StatusLabel>
                    </span>
                    {intro.status !== 'made' && intro.status !== 'declined' && (
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={busy}
                        onClick={() => run(async () => { await networkingApi(`/introductions/${intro.id}`, 'PATCH', { status: intro.status === 'planned' ? 'requested' : 'made' }); })}
                      >
                        Mark {intro.status === 'planned' ? 'requested' : 'made'}
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Private notes */}
          <section>
            <SectionHeading title="Private notes" />
            <div className="mt-4">
              <Field label="Notes" hint="Saved when you click away. Never shared or sent.">
                {(p) => (
                  <textarea
                    {...p}
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    onBlur={() => { if (notes !== contact.notes) void patchContact({ notes }); }}
                    rows={4}
                    placeholder="Research, common ground, what matters to them…"
                    className="ml-field"
                  />
                )}
              </Field>
            </div>
          </section>

          {messages.length > 0 && (
            <section>
              <SectionHeading title="Drafts and messages" label={`${messages.length}`} />
              <ul className="mt-2">
                {messages.slice(0, 6).map((message) => (
                  <li key={message.id} className="ml-row">
                    <Link
                      href={`${base}/messages?message=${message.id}`}
                      className="ml-row-hover flex min-h-[44px] flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2.5 text-[15px] text-bone hover:text-red"
                    >
                      <span className="capitalize">{message.purpose.replace(/_/g, ' ')}</span>
                      <span className="ml-num text-[12px] uppercase tracking-[0.12em] text-graphite">
                        {message.channel} · {message.state}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
