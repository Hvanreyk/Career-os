'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type {
  MessageChannel,
  MessagePurpose,
  NetworkingContactRow,
  NetworkingMessageRow,
  NetworkingReview,
} from '@trajectoryos/core/networking/types';
import { runPreflight, preflightPasses, type PreflightIssue } from '@trajectoryos/core/networking';
import {
  AlertTriangle,
  Check,
  Clipboard,
  Loader2,
  Mail,
  Send,
  Sparkles,
} from 'lucide-react';
import { networkingApi } from './api';

const INPUT = 'w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-gold-400/50';
const SELECT = `${INPUT} [&>option]:bg-navy-950`;
const BUTTON = 'text-xs px-3 py-1.5 rounded-full border border-white/10 text-slate-400 hover:text-white hover:border-gold-400/40 transition-colors disabled:opacity-50 inline-flex items-center gap-1.5';
const PRIMARY = 'text-sm px-4 py-2 rounded-full bg-gold-400/15 text-gold-400 border border-gold-400/40 hover:bg-gold-400/25 transition-colors disabled:opacity-50 inline-flex items-center gap-2';

type ContactLite = Pick<NetworkingContactRow, 'id' | 'full_name' | 'firm' | 'role_title' | 'seniority' | 'city' | 'email' | 'email_normalized' | 'linkedin_url' | 'linkedin_normalized' | 'stage' | 'is_alum' | 'do_not_contact'>;

const PURPOSES: { value: MessagePurpose; label: string; channel: MessageChannel | 'both' }[] = [
  { value: 'cold_intro', label: 'Cold introduction', channel: 'email' },
  { value: 'linkedin_connection', label: 'LinkedIn connection note', channel: 'linkedin' },
  { value: 'event_followup', label: 'Event follow-up', channel: 'both' },
  { value: 'thank_you', label: 'Thank-you', channel: 'both' },
  { value: 'conversation_followup', label: 'Conversation follow-up', channel: 'both' },
  { value: 'referral_request', label: 'Referral request', channel: 'both' },
  { value: 'intro_request', label: 'Warm-intro request (forwardable)', channel: 'email' },
  { value: 'reply_response', label: 'Response to their reply', channel: 'both' },
  { value: 'reengagement', label: 'Re-engagement', channel: 'both' },
  { value: 'custom', label: 'Custom', channel: 'both' },
];

interface Props {
  contacts: ContactLite[];
  messages: NetworkingMessageRow[];
  initialContactId: string | null;
  initialChannel: MessageChannel;
  initialMessageId: string | null;
}

/**
 * Message Lab: pick a contact, draft (by hand or with AI help from
 * truthful facts), run deterministic preflight, get a qualitative AI
 * review with faithful rewrites, then send manually or log it sent.
 */
export function MessageLabView({ contacts, messages, initialContactId, initialChannel, initialMessageId }: Props) {
  const router = useRouter();
  const initialMessage = initialMessageId ? messages.find((m) => m.id === initialMessageId) ?? null : null;

  const [contactId, setContactId] = useState(initialMessage?.contact_id ?? initialContactId ?? contacts[0]?.id ?? '');
  const [channel, setChannel] = useState<MessageChannel>(initialMessage?.channel ?? initialChannel);
  const [purpose, setPurpose] = useState<MessagePurpose>(initialMessage?.purpose ?? 'cold_intro');
  const [messageId, setMessageId] = useState<string | null>(initialMessage?.id ?? null);
  const [subject, setSubject] = useState(initialMessage?.subject ?? '');
  const [body, setBody] = useState(initialMessage?.body ?? '');
  const [factsText, setFactsText] = useState((initialMessage?.context?.personal_facts ?? []).join('\n'));
  const [ask, setAsk] = useState(initialMessage?.context?.ask ?? '');
  const [priorInteraction, setPriorInteraction] = useState(initialMessage?.context?.prior_interaction ?? '');
  const [state, setState] = useState(initialMessage?.state ?? 'draft');

  const [busy, setBusy] = useState<'save' | 'ai_draft' | 'review' | 'send' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [blockingIssues, setBlockingIssues] = useState<PreflightIssue[]>([]);
  const [review, setReview] = useState<NetworkingReview | null>(null);
  const [quota, setQuota] = useState<{ remaining: number; resetsAt: string } | null>(null);
  const [followUp, setFollowUp] = useState({ enabled: true, kind: 'follow_up_no_reply', days: 5 });
  const [sentConfirmation, setSentConfirmation] = useState(false);

  const contact = contacts.find((c) => c.id === contactId) ?? null;
  const facts = useMemo(() => factsText.split('\n').map((f) => f.trim()).filter(Boolean).slice(0, 8), [factsText]);
  const availablePurposes = PURPOSES.filter((p) => p.channel === 'both' || p.channel === channel);

  function purposesForChannel(nextChannel: MessageChannel) {
    return PURPOSES.filter((p) => p.channel === 'both' || p.channel === nextChannel);
  }

  function changeChannel(nextChannel: MessageChannel) {
    setChannel(nextChannel);
    if (!purposesForChannel(nextChannel).some((p) => p.value === purpose)) {
      setPurpose(purposesForChannel(nextChannel)[0]?.value ?? 'custom');
    }
    setMessageId(null);
    resetOutputs();
  }

  function resetOutputs() {
    setReview(null);
    setBlockingIssues([]);
    setSentConfirmation(false);
  }

  async function ensureMessage(): Promise<string> {
    if (messageId) return messageId;
    const created = await networkingApi<{ id: string }>('/messages', 'POST', {
      contact_id: contactId,
      channel,
      purpose,
      subject,
      body,
      context: { personal_facts: facts, ask, prior_interaction: priorInteraction },
    });
    setMessageId(created.id);
    return created.id;
  }

  async function saveDraft() {
    setBusy('save');
    setError(null);
    try {
      const id = await ensureMessage();
      if (messageId) {
        await networkingApi(`/messages/${id}`, 'PATCH', { subject, body, context: { personal_facts: facts, ask, prior_interaction: priorInteraction } });
      }
      setState('draft');
      resetOutputs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(null);
    }
  }

  async function aiDraft() {
    setBusy('ai_draft');
    setError(null);
    try {
      const id = await ensureMessage();
      await networkingApi(`/messages/${id}`, 'PATCH', {
        subject, body, context: { personal_facts: facts, ask, prior_interaction: priorInteraction },
      });
      const result = await networkingApi<{ draft: { subject: string; body: string; notes_for_student: string }; remaining: number; resetsAt: string }>(
        `/messages/${id}/draft`, 'POST',
      );
      setSubject(result.draft.subject);
      setBody(result.draft.body);
      setQuota({ remaining: result.remaining, resetsAt: result.resetsAt });
      setState('draft');
      resetOutputs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(null);
    }
  }

  async function runReview() {
    setBusy('review');
    setError(null);
    setBlockingIssues([]);
    try {
      const id = await ensureMessage();
      await networkingApi(`/messages/${id}`, 'PATCH', { subject, body, context: { personal_facts: facts, ask, prior_interaction: priorInteraction } });
      const preflight = runPreflight({
        channel, purpose, subject, body, ask,
        hasRecipientEmail: Boolean(contact?.email_normalized),
      });
      if (!preflightPasses(preflight)) {
        setBlockingIssues(preflight);
        return;
      }
      const result = await networkingApi<{ review: NetworkingReview; remaining: number; resetsAt: string }>(`/messages/${id}/review`, 'POST');
      setReview(result.review);
      setQuota({ remaining: result.remaining, resetsAt: result.resetsAt });
      setState('reviewed');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(null);
    }
  }

  function applyRewrite(rewriteSubject: string, rewriteBody: string) {
    setSubject(rewriteSubject);
    setBody(rewriteBody);
    setState('draft');
    setReview(null);
  }

  function mailtoHref(): string {
    if (!contact?.email) return '';
    const params = new URLSearchParams({ subject, body });
    return `mailto:${contact.email}?${params.toString().replace(/\+/g, '%20')}`;
  }

  async function copyBody() {
    await navigator.clipboard.writeText(body).catch(() => undefined);
  }

  async function logSent(channelAction: 'mailto' | 'copy' | 'linkedin_copy') {
    setBusy('send');
    setError(null);
    try {
      const id = await ensureMessage();
      const dueAt = new Date(Date.now() + followUp.days * 24 * 60 * 60 * 1000).toISOString();
      const result = await networkingApi<{ stage: string }>(`/messages/${id}/log-sent`, 'POST', {
        channel_action: channelAction,
        followup: followUp.enabled ? { kind: followUp.kind, due_at: dueAt, reason: '' } : null,
      });
      setState('sent');
      setSentConfirmation(true);
      void result;
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusy(null);
    }
  }

  const bodyMax = 4000;

  return (
    <div className="grid lg:grid-cols-3 gap-5">
      <div className="lg:col-span-2 space-y-5">
        {error && <p role="alert" className="text-sm text-red-400 border border-red-400/30 bg-red-400/10 rounded-lg px-4 py-2.5">{error}</p>}

        <div className="glass rounded-2xl border border-white/8 p-6 space-y-4">
          <div className="grid sm:grid-cols-3 gap-3">
            <select
              value={contactId}
              onChange={(e) => { setContactId(e.target.value); setMessageId(null); resetOutputs(); }}
              className={SELECT}
              aria-label="Contact"
              disabled={state === 'sent'}
            >
              {contacts.length === 0 && <option value="">No contacts yet</option>}
              {contacts.map((c) => <option key={c.id} value={c.id}>{c.full_name}{c.firm ? ` — ${c.firm}` : ''}</option>)}
            </select>
            <select
              value={channel}
              onChange={(e) => changeChannel(e.target.value as MessageChannel)}
              className={SELECT}
              aria-label="Channel"
              disabled={state === 'sent'}
            >
              <option value="email">Email</option>
              <option value="linkedin">LinkedIn</option>
            </select>
            <select
              value={purpose}
              onChange={(e) => { setPurpose(e.target.value as MessagePurpose); setMessageId(null); resetOutputs(); }}
              className={SELECT}
              aria-label="Purpose"
              disabled={state === 'sent'}
            >
              {availablePurposes.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
          </div>
          {contact?.do_not_contact && (
            <p className="text-xs text-red-400">This contact is marked do-not-contact. Choose a different contact.</p>
          )}
          {channel === 'email' && !contact?.email_normalized && (
            <p className="text-xs text-amber-300">This contact has no email saved — add one on their profile, or switch to LinkedIn.</p>
          )}

          <div>
            <p className="text-xs text-slate-500 mb-2">Truthful facts to personalise with (one per line — the AI uses only these, nothing invented)</p>
            <textarea value={factsText} onChange={(e) => setFactsText(e.target.value)} rows={3} placeholder={'Interned at a Big 4 firm in audit\nAttended the UNSW finance society info night'} className={INPUT} aria-label="Facts" disabled={state === 'sent'} />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <input value={ask} onChange={(e) => setAsk(e.target.value)} placeholder="Your ask (e.g. 15-minute call)" className={INPUT} aria-label="Ask" disabled={state === 'sent'} />
            <input value={priorInteraction} onChange={(e) => setPriorInteraction(e.target.value)} placeholder="Prior interaction (optional)" className={INPUT} aria-label="Prior interaction" disabled={state === 'sent'} />
          </div>

          <div className="flex gap-2">
            <button type="button" onClick={aiDraft} disabled={busy !== null || !contactId || state === 'sent'} className={BUTTON}>
              {busy === 'ai_draft' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />} AI first draft
            </button>
            {quota && <span className="text-xs text-slate-600 self-center">{quota.remaining} AI uses left today</span>}
          </div>

          {channel === 'email' && (
            <input value={subject} onChange={(e) => { setSubject(e.target.value); setState('draft'); }} placeholder="Subject" className={INPUT} aria-label="Subject" maxLength={200} disabled={state === 'sent'} />
          )}
          <div>
            <textarea
              value={body}
              onChange={(e) => { setBody(e.target.value); setState('draft'); }}
              rows={10}
              placeholder={channel === 'linkedin' ? 'LinkedIn message or connection note…' : 'Write your message…'}
              className={INPUT}
              aria-label="Message body"
              maxLength={bodyMax}
              disabled={state === 'sent'}
            />
            <p className="text-xs text-slate-600 mt-1 text-right">{body.length}/{bodyMax}</p>
          </div>

          {blockingIssues.length > 0 && (
            <div className="border border-red-400/30 bg-red-400/5 rounded-xl p-4 space-y-1.5">
              <p className="text-xs font-semibold text-red-400 uppercase tracking-wider flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" /> Fix before review</p>
              {blockingIssues.map((issue) => (
                <p key={issue.code} className={`text-sm ${issue.severity === 'block' ? 'text-red-300' : 'text-amber-300'}`}>{issue.message}</p>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={saveDraft} disabled={busy !== null || !contactId || !body.trim() || state === 'sent'} className={BUTTON}>
              {busy === 'save' && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Save draft
            </button>
            <button type="button" onClick={runReview} disabled={busy !== null || !contactId || !body.trim() || state === 'sent'} className={PRIMARY}>
              {busy === 'review' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />} AI review
            </button>
          </div>
        </div>

        {review && (
          <div className="glass rounded-2xl border border-gold-400/25 p-6 space-y-4">
            <h3 className="text-white font-semibold">Review</h3>
            <p className="text-sm text-slate-300 leading-relaxed">{review.summary}</p>
            {review.strengths.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1.5">Strengths</p>
                <ul className="space-y-1">{review.strengths.map((s) => <li key={s} className="text-sm text-slate-300">• {s}</li>)}</ul>
              </div>
            )}
            {review.issues.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-amber-300 uppercase tracking-wider">Issues</p>
                {review.issues.map((issue) => (
                  <div key={issue.observation} className="border-l-2 border-amber-300/40 pl-3">
                    <p className="text-xs text-amber-300 uppercase tracking-wider">{issue.area}</p>
                    <p className="text-sm text-slate-300 mt-0.5">{issue.observation}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{issue.why_it_matters}</p>
                    <p className="text-xs text-slate-400 mt-1 italic">{issue.revision_question}</p>
                  </div>
                ))}
              </div>
            )}
            {review.rewrite_options.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-gold-400 uppercase tracking-wider">Faithful rewrites</p>
                {review.rewrite_options.map((rewrite, index) => (
                  <div key={index} className="border border-white/8 rounded-xl p-3.5">
                    {rewrite.subject && <p className="text-xs text-slate-500 mb-1">{rewrite.subject}</p>}
                    <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{rewrite.body}</p>
                    <p className="text-xs text-slate-500 mt-2">{rewrite.change_summary}</p>
                    <button type="button" onClick={() => applyRewrite(rewrite.subject, rewrite.body)} className={`${BUTTON} mt-2`}>Use this version</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="space-y-5">
        <div className="glass rounded-2xl border border-white/8 p-5">
          <h3 className="text-white font-semibold mb-3">Send</h3>
          {state === 'sent' || sentConfirmation ? (
            <p className="text-sm text-emerald-400 flex items-center gap-1.5"><Check className="w-4 h-4" /> Logged as sent.</p>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-slate-500">
                TrajectoryOS does not send email or LinkedIn messages directly yet. Send it yourself, then log it here
                so your timeline and follow-ups stay accurate.
              </p>
              {channel === 'email' ? (
                <a
                  href={mailtoHref()}
                  onClick={() => logSent('mailto')}
                  aria-disabled={!contact?.email || !body.trim()}
                  className={`${PRIMARY} ${(!contact?.email || !body.trim()) ? 'pointer-events-none opacity-50' : ''}`}
                >
                  <Mail className="w-4 h-4" /> Open in mail app
                </a>
              ) : (
                <button type="button" onClick={() => { void copyBody(); void logSent('linkedin_copy'); }} disabled={!body.trim() || busy !== null} className={PRIMARY}>
                  <Clipboard className="w-4 h-4" /> Copy & mark sent
                </button>
              )}
              <button type="button" onClick={() => logSent('copy')} disabled={!messageId || busy !== null} className={BUTTON}>
                <Send className="w-3.5 h-3.5" /> Already sent it — just log it
              </button>

              <div className="pt-3 border-t border-white/5">
                <label className="flex items-center gap-2 text-xs text-slate-400 mb-2">
                  <input type="checkbox" checked={followUp.enabled} onChange={(e) => setFollowUp({ ...followUp, enabled: e.target.checked })} className="accent-[#d3a955]" />
                  Queue a follow-up
                </label>
                {followUp.enabled && (
                  <div className="grid grid-cols-2 gap-2">
                    <select value={followUp.kind} onChange={(e) => setFollowUp({ ...followUp, kind: e.target.value })} className={`${SELECT} text-xs`} aria-label="Follow-up type">
                      <option value="follow_up_no_reply">Follow up if no reply</option>
                      <option value="maintain">Keep warm</option>
                    </select>
                    <select value={followUp.days} onChange={(e) => setFollowUp({ ...followUp, days: Number(e.target.value) })} className={`${SELECT} text-xs`} aria-label="Follow-up timing">
                      <option value={3}>in 3 days</option>
                      <option value={5}>in 5 days</option>
                      <option value={7}>in 7 days</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="glass rounded-2xl border border-white/8 p-5">
          <h3 className="text-white font-semibold mb-3">Recent drafts</h3>
          {messages.length === 0 ? (
            <p className="text-sm text-slate-500">Nothing saved yet.</p>
          ) : (
            <ul className="space-y-2">
              {messages.slice(0, 10).map((message) => (
                <li key={message.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setMessageId(message.id);
                      setContactId(message.contact_id);
                      setChannel(message.channel);
                      setPurpose(message.purpose);
                      setSubject(message.subject);
                      setBody(message.body);
                      setFactsText((message.context?.personal_facts ?? []).join('\n'));
                      setAsk(message.context?.ask ?? '');
                      setPriorInteraction(message.context?.prior_interaction ?? '');
                      setState(message.state);
                      resetOutputs();
                    }}
                    className="text-sm text-slate-400 hover:text-gold-400 transition-colors text-left"
                  >
                    {message.purpose.replace(/_/g, ' ')} · {message.channel} · <span className="text-xs">{message.state}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
