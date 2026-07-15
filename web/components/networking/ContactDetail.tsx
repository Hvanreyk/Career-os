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
import {
  CalendarPlus,
  Check,
  ChevronLeft,
  Coffee,
  ExternalLink,
  Loader2,
  Mail,
  NotebookPen,
  Trash2,
  UserPlus,
} from 'lucide-react';
import { networkingApi } from './api';
import { LinkedinGlyph } from './LinkedinGlyph';

const INPUT = 'w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-gold-400/50';
const SELECT = `${INPUT} [&>option]:bg-navy-950`;
const BUTTON = 'text-xs px-3 py-1.5 rounded-full border border-white/10 text-slate-400 hover:text-white hover:border-gold-400/40 transition-colors disabled:opacity-50';
const PRIMARY = 'text-sm px-4 py-2 rounded-full bg-gold-400/15 text-gold-400 border border-gold-400/40 hover:bg-gold-400/25 transition-colors disabled:opacity-50 inline-flex items-center gap-2';

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

  return (
    <div className="space-y-5">
      <Link href={`${base}/contacts`} className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-300 text-sm">
        <ChevronLeft className="w-4 h-4" /> All contacts
      </Link>
      {error && <p role="alert" className="text-sm text-red-400 border border-red-400/30 bg-red-400/10 rounded-lg px-4 py-2.5">{error}</p>}

      {/* Identity + stage */}
      <div className="glass rounded-2xl border border-white/8 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="font-serif text-2xl font-bold text-white">
              {contact.full_name}
              {contact.is_alum && <span className="ml-2 align-middle text-[10px] px-1.5 py-0.5 rounded bg-gold-400/15 text-gold-400 uppercase tracking-wider">Alum</span>}
            </h2>
            <p className="text-sm text-slate-400 mt-1">
              {[contact.role_title, contact.firm, contact.city].filter(Boolean).join(' · ') || 'No role details yet'}
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-3">
              {contact.email && (
                <a href={`mailto:${contact.email}`} className={`${BUTTON} inline-flex items-center gap-1.5`}><Mail className="w-3 h-3" /> {contact.email}</a>
              )}
              {contact.linkedin_url && (
                <a href={contact.linkedin_url} target="_blank" rel="noreferrer" className={`${BUTTON} inline-flex items-center gap-1.5`}>
                  <LinkedinGlyph className="w-3 h-3" /> LinkedIn <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <select
              value={contact.stage}
              onChange={(event) => patchContact({ stage: event.target.value as RelationshipStage })}
              disabled={busy}
              className={`${SELECT} w-auto`}
              aria-label="Relationship stage"
            >
              {Object.entries(STAGE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <label className="flex items-center gap-2 text-xs text-slate-500">
              <input
                type="checkbox"
                checked={contact.do_not_contact}
                onChange={(event) => patchContact({ do_not_contact: event.target.checked })}
                className="accent-[#d3a955]"
              />
              Do not contact
            </label>
            <button type="button" onClick={deleteContact} disabled={busy} className="text-xs text-slate-600 hover:text-red-400 transition-colors inline-flex items-center gap-1">
              <Trash2 className="w-3 h-3" /> Delete contact
            </button>
          </div>
        </div>
        {targets.length > 0 && (
          <div className="mt-4 pt-4 border-t border-white/5">
            <p className="text-xs text-slate-500 mb-2">Target firms</p>
            <div className="flex flex-wrap gap-2">
              {targets.map((target) => {
                const linked = linkedTargetIds.includes(target.id);
                return (
                  <button
                    key={target.id}
                    type="button"
                    disabled={busy}
                    onClick={() => patchContact({
                      bank_target_ids: linked
                        ? linkedTargetIds.filter((t) => t !== target.id)
                        : [...linkedTargetIds, target.id],
                    })}
                    className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${linked ? 'border-gold-400/50 bg-gold-400/10 text-gold-400' : 'border-white/10 text-slate-400 hover:text-white'}`}
                  >
                    {target.bank_name}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        <Link href={`${base}/messages?contact=${contact.id}&channel=email`} className={`${BUTTON} inline-flex items-center gap-1.5`}><Mail className="w-3.5 h-3.5" /> Draft email</Link>
        <Link href={`${base}/messages?contact=${contact.id}&channel=linkedin`} className={`${BUTTON} inline-flex items-center gap-1.5`}><LinkedinGlyph className="w-3.5 h-3.5" /> Draft LinkedIn</Link>
        <button type="button" onClick={() => setPanel(panel === 'log' ? 'none' : 'log')} className={`${BUTTON} inline-flex items-center gap-1.5`}><NotebookPen className="w-3.5 h-3.5" /> Log interaction</button>
        <button type="button" onClick={() => setPanel(panel === 'followup' ? 'none' : 'followup')} className={`${BUTTON} inline-flex items-center gap-1.5`}><CalendarPlus className="w-3.5 h-3.5" /> Schedule follow-up</button>
        <button type="button" onClick={() => setPanel(panel === 'chat' ? 'none' : 'chat')} className={`${BUTTON} inline-flex items-center gap-1.5`}><Coffee className="w-3.5 h-3.5" /> Schedule coffee chat</button>
        <button type="button" onClick={() => setPanel(panel === 'intro' ? 'none' : 'intro')} className={`${BUTTON} inline-flex items-center gap-1.5`}><UserPlus className="w-3.5 h-3.5" /> Record introduction</button>
      </div>

      {panel === 'log' && (
        <form
          className="glass rounded-2xl border border-white/8 p-5 grid sm:grid-cols-2 gap-3"
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
          <select value={logForm.type} onChange={(e) => setLogForm({ ...logForm, type: e.target.value as InteractionType })} className={SELECT} aria-label="Interaction type">
            {INTERACTION_TYPES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <input value={logForm.summary} onChange={(e) => setLogForm({ ...logForm, summary: e.target.value })} placeholder="What happened? (kept private)" className={INPUT} aria-label="Summary" />
          <button type="submit" disabled={busy} className={`${PRIMARY} sm:col-span-2 w-fit`}>
            {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Log it
          </button>
        </form>
      )}

      {panel === 'followup' && (
        <form
          className="glass rounded-2xl border border-white/8 p-5 grid sm:grid-cols-3 gap-3"
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
          <select value={followUpForm.kind} onChange={(e) => setFollowUpForm({ ...followUpForm, kind: e.target.value as FollowUpKind })} className={SELECT} aria-label="Follow-up kind">
            {FOLLOWUP_KINDS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <input type="date" value={followUpForm.due} onChange={(e) => setFollowUpForm({ ...followUpForm, due: e.target.value })} className={`${INPUT} [color-scheme:dark]`} aria-label="Due date" />
          <input value={followUpForm.reason} onChange={(e) => setFollowUpForm({ ...followUpForm, reason: e.target.value })} placeholder="Why (optional)" className={INPUT} aria-label="Reason" />
          <p className="sm:col-span-3 text-xs text-slate-500 -mt-1">One active next action per contact — scheduling replaces the current one.</p>
          <button type="submit" disabled={busy} className={`${PRIMARY} w-fit`}>
            {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Schedule
          </button>
        </form>
      )}

      {panel === 'chat' && (
        <form
          className="glass rounded-2xl border border-white/8 p-5 grid sm:grid-cols-3 gap-3"
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
          <input type="datetime-local" required value={chatForm.when} onChange={(e) => setChatForm({ ...chatForm, when: e.target.value })} className={`${INPUT} [color-scheme:dark]`} aria-label="When" />
          <select value={chatForm.duration} onChange={(e) => setChatForm({ ...chatForm, duration: Number(e.target.value) })} className={SELECT} aria-label="Duration">
            {[15, 20, 30, 45, 60].map((minutes) => <option key={minutes} value={minutes}>{minutes} min</option>)}
          </select>
          <input value={chatForm.location} onChange={(e) => setChatForm({ ...chatForm, location: e.target.value })} placeholder="Location or video link" className={INPUT} aria-label="Location" />
          <p className="sm:col-span-3 text-xs text-slate-500 -mt-1">Times use your timezone ({timezone}). A role-calibrated prep sheet is created automatically.</p>
          <button type="submit" disabled={busy} className={`${PRIMARY} w-fit`}>
            {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Schedule chat
          </button>
        </form>
      )}

      {panel === 'intro' && (
        <form
          className="glass rounded-2xl border border-white/8 p-5 grid sm:grid-cols-3 gap-3"
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
          <select value={introForm.to_contact_id} onChange={(e) => setIntroForm({ ...introForm, to_contact_id: e.target.value })} className={SELECT} aria-label="Introduce me to (existing contact)">
            <option value="">Someone new (name below)</option>
            {otherContacts.map((other) => <option key={other.id} value={other.id}>{other.full_name}</option>)}
          </select>
          <input value={introForm.to_name} onChange={(e) => setIntroForm({ ...introForm, to_name: e.target.value })} placeholder="Their name (if not a contact yet)" className={INPUT} aria-label="Name" />
          <input value={introForm.notes} onChange={(e) => setIntroForm({ ...introForm, notes: e.target.value })} placeholder="Context (optional)" className={INPUT} aria-label="Notes" />
          <p className="sm:col-span-3 text-xs text-slate-500 -mt-1">
            {contact.full_name} can introduce you. Ask with a short forwardable paragraph — draft one in the Message Lab (purpose: warm-intro request).
          </p>
          <button type="submit" disabled={busy} className={`${PRIMARY} w-fit`}>
            {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Record
          </button>
        </form>
      )}

      <div className="grid lg:grid-cols-3 gap-5">
        {/* Timeline */}
        <div className="lg:col-span-2 glass rounded-2xl border border-white/8 p-6">
          <h3 className="text-white font-semibold mb-4">Timeline</h3>
          {interactions.length === 0 ? (
            <p className="text-sm text-slate-500">No interactions yet. Log your first touch or draft outreach in the Message Lab.</p>
          ) : (
            <ul className="space-y-4">
              {interactions.map((interaction) => (
                <li key={interaction.id} className="flex gap-3">
                  <span className="w-2 h-2 rounded-full bg-gold-400/70 mt-2 shrink-0" />
                  <div>
                    <p className="text-sm text-white">
                      {INTERACTION_TYPES.find((t) => t.value === interaction.type)?.label ?? interaction.type.replace(/_/g, ' ')}
                      {interaction.type === 'coffee_chat' && ' Coffee chat'}
                      <span className="text-xs text-slate-500 ml-2">{new Date(interaction.occurred_at).toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                    </p>
                    {interaction.summary && <p className="text-sm text-slate-400 mt-0.5 leading-relaxed whitespace-pre-wrap">{interaction.summary}</p>}
                    {interaction.outcome && <p className="text-xs text-slate-500 mt-0.5">Outcome: {interaction.outcome}</p>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Right rail */}
        <div className="space-y-5">
          <div className="glass rounded-2xl border border-white/8 p-5">
            <h3 className="text-white font-semibold mb-3">Next action</h3>
            {activeFollowUp ? (
              <div>
                <p className="text-sm text-white">{FOLLOWUP_KINDS.find((k) => k.value === activeFollowUp.kind)?.label ?? activeFollowUp.kind}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Due {new Date(activeFollowUp.due_at).toLocaleDateString('en-AU')}{activeFollowUp.status === 'snoozed' ? ' (snoozed)' : ''}
                </p>
                {activeFollowUp.reason && <p className="text-xs text-slate-400 mt-1">{activeFollowUp.reason}</p>}
                <div className="flex gap-2 mt-3">
                  <button type="button" disabled={busy} onClick={() => run(async () => { await networkingApi(`/followups/${activeFollowUp.id}`, 'PATCH', { status: 'completed' }); })} className={`${BUTTON} inline-flex items-center gap-1`}>
                    <Check className="w-3 h-3" /> Done
                  </button>
                  <button type="button" disabled={busy} onClick={() => run(async () => { await networkingApi(`/followups/${activeFollowUp.id}`, 'PATCH', { status: 'cancelled' }); })} className={BUTTON}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">No next action scheduled — every live relationship should have one.</p>
            )}
          </div>

          <div className="glass rounded-2xl border border-white/8 p-5">
            <h3 className="text-white font-semibold mb-3">Coffee chats</h3>
            {chats.length === 0 && <p className="text-sm text-slate-500">None yet.</p>}
            <ul className="space-y-4">
              {chats.map((chat) => (
                <li key={chat.id} className="border border-white/8 rounded-xl p-3.5">
                  <p className="text-sm text-white">
                    {new Date(chat.scheduled_at).toLocaleString('en-AU', { dateStyle: 'medium', timeStyle: 'short' })}
                    <span className="text-xs text-slate-500 ml-2">{chat.duration_minutes} min · {chat.status}</span>
                  </p>
                  {chat.status === 'scheduled' && chat.prep && (
                    <details className="mt-2">
                      <summary className="text-xs text-gold-400 cursor-pointer">Prep sheet</summary>
                      <ul className="mt-2 space-y-1.5">
                        {((chat.prep as { questions?: string[] }).questions ?? []).map((question) => (
                          <li key={question} className="text-xs text-slate-400 leading-relaxed">• {question}</li>
                        ))}
                      </ul>
                    </details>
                  )}
                  {chat.status === 'scheduled' && (
                    <div className="flex gap-2 mt-2.5">
                      <button type="button" className={BUTTON} onClick={() => setDebriefFor(debriefFor === chat.id ? null : chat.id)}>Complete + debrief</button>
                      <button type="button" disabled={busy} className={BUTTON} onClick={() => run(async () => { await networkingApi(`/coffee-chats/${chat.id}`, 'PATCH', { action: 'cancel' }); })}>Cancel</button>
                    </div>
                  )}
                  {chat.status === 'completed' && chat.debrief && (
                    <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{(chat.debrief as { learned?: string }).learned}</p>
                  )}
                  {debriefFor === chat.id && (
                    <form
                      className="mt-3 space-y-2"
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
                      <textarea required value={debrief.learned} onChange={(e) => setDebrief({ ...debrief, learned: e.target.value })} rows={3} placeholder="What did you learn?" className={INPUT} aria-label="What did you learn" />
                      <input value={debrief.names} onChange={(e) => setDebrief({ ...debrief, names: e.target.value })} placeholder="Names they mentioned (comma-separated)" className={INPUT} aria-label="Names dropped" />
                      <input value={debrief.promises_made} onChange={(e) => setDebrief({ ...debrief, promises_made: e.target.value })} placeholder="Anything you promised to do" className={INPUT} aria-label="Promises made" />
                      <label className="flex items-center gap-2 text-xs text-slate-400">
                        <input type="checkbox" checked={debrief.referral_offered} onChange={(e) => setDebrief({ ...debrief, referral_offered: e.target.checked })} className="accent-[#d3a955]" />
                        They offered a referral or to pass my name on
                      </label>
                      <p className="text-xs text-slate-500">Completing queues your thank-you (due within 24h) automatically.</p>
                      <button type="submit" disabled={busy} className={`${PRIMARY} w-fit`}>
                        {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Save debrief
                      </button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
            {droppedNames.length > 0 && (
              <div className="mt-3 border border-gold-400/25 rounded-xl p-3">
                <p className="text-xs text-gold-400 mb-2">Add the people they mentioned as prospects:</p>
                <div className="flex flex-wrap gap-2">
                  {droppedNames.map((name) => (
                    <button
                      key={name}
                      type="button"
                      disabled={busy}
                      className={BUTTON}
                      onClick={() => run(async () => {
                        await networkingApi('/contacts', 'POST', { full_name: name, firm: contact.firm, source: 'introduction' });
                        setDroppedNames((prev) => prev.filter((n) => n !== name));
                      })}
                    >
                      + {name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {introductions.length > 0 && (
            <div className="glass rounded-2xl border border-white/8 p-5">
              <h3 className="text-white font-semibold mb-3">Introductions via {contact.full_name.split(' ')[0]}</h3>
              <ul className="space-y-2">
                {introductions.map((intro) => (
                  <li key={intro.id} className="text-sm text-slate-400 flex items-center justify-between gap-2">
                    <span>{intro.to_name || 'Contact'} <span className="text-xs text-slate-600">({intro.status})</span></span>
                    {intro.status !== 'made' && intro.status !== 'declined' && (
                      <button type="button" disabled={busy} className={BUTTON} onClick={() => run(async () => { await networkingApi(`/introductions/${intro.id}`, 'PATCH', { status: intro.status === 'planned' ? 'requested' : 'made' }); })}>
                        Mark {intro.status === 'planned' ? 'requested' : 'made'}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="glass rounded-2xl border border-white/8 p-5">
            <h3 className="text-white font-semibold mb-3">Private notes</h3>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              onBlur={() => { if (notes !== contact.notes) void patchContact({ notes }); }}
              rows={4}
              placeholder="Research, common ground, what matters to them…"
              className={INPUT}
              aria-label="Private notes"
            />
          </div>

          {messages.length > 0 && (
            <div className="glass rounded-2xl border border-white/8 p-5">
              <h3 className="text-white font-semibold mb-3">Drafts & messages</h3>
              <ul className="space-y-2">
                {messages.slice(0, 6).map((message) => (
                  <li key={message.id}>
                    <Link href={`${base}/messages?message=${message.id}`} className="text-sm text-slate-400 hover:text-gold-400 transition-colors">
                      {message.purpose.replace(/_/g, ' ')} · {message.channel} · <span className="text-xs">{message.state}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
