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
import { Button } from '@/components/ui/Button';
import { CheckControl, Field } from '@/components/ui/Field';
import { Panel } from '@/components/ui/Panel';
import { networkingApi } from './api';
import { Notice, SectionHeading } from './ui';

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
  const locked = state === 'sent';
  const sendDisabled = !contact?.email || !body.trim();

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] lg:gap-10">
      <div className="space-y-8">
        {error && <Notice>{error}</Notice>}

        {/* ── Composer ─────────────────────────────────────────── */}
        <section>
          <SectionHeading title="Draft" label={locked ? 'Sent — read only' : `State: ${state}`} />

          <div className="mt-5 space-y-5">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Contact">
                {(f) => (
                  <select
                    {...f}
                    value={contactId}
                    onChange={(e) => { setContactId(e.target.value); setMessageId(null); resetOutputs(); }}
                    className="ml-field"
                    disabled={locked}
                  >
                    {contacts.length === 0 && <option value="">No contacts yet</option>}
                    {contacts.map((c) => <option key={c.id} value={c.id}>{c.full_name}{c.firm ? ` — ${c.firm}` : ''}</option>)}
                  </select>
                )}
              </Field>
              <Field label="Channel">
                {(f) => (
                  <select
                    {...f}
                    value={channel}
                    onChange={(e) => changeChannel(e.target.value as MessageChannel)}
                    className="ml-field"
                    disabled={locked}
                  >
                    <option value="email">Email</option>
                    <option value="linkedin">LinkedIn</option>
                  </select>
                )}
              </Field>
              <Field label="Purpose">
                {(f) => (
                  <select
                    {...f}
                    value={purpose}
                    onChange={(e) => { setPurpose(e.target.value as MessagePurpose); setMessageId(null); resetOutputs(); }}
                    className="ml-field"
                    disabled={locked}
                  >
                    {availablePurposes.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                )}
              </Field>
            </div>

            {contact?.do_not_contact && (
              <Notice label="Do not contact">
                This contact is marked do-not-contact. Choose a different contact.
              </Notice>
            )}
            {channel === 'email' && !contact?.email_normalized && (
              <Notice tone="warn" label="No email on file">
                This contact has no email saved. Add one on their record, or switch to LinkedIn.
              </Notice>
            )}

            <Field
              label="Truthful facts to personalise with"
              hint="One per line, up to eight. The AI uses only these — it invents nothing."
            >
              {(f) => (
                <textarea
                  {...f}
                  value={factsText}
                  onChange={(e) => setFactsText(e.target.value)}
                  rows={3}
                  placeholder={'Interned at a Big 4 firm in audit\nAttended the UNSW finance society info night'}
                  className="ml-field"
                  disabled={locked}
                />
              )}
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Your ask" hint="For example: a 15-minute call.">
                {(f) => (
                  <input
                    {...f}
                    value={ask}
                    onChange={(e) => setAsk(e.target.value)}
                    className="ml-field"
                    disabled={locked}
                  />
                )}
              </Field>
              <Field label="Prior interaction" hint="Optional.">
                {(f) => (
                  <input
                    {...f}
                    value={priorInteraction}
                    onChange={(e) => setPriorInteraction(e.target.value)}
                    className="ml-field"
                    disabled={locked}
                  />
                )}
              </Field>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                variant="secondary"
                onClick={aiDraft}
                disabled={busy !== null || !contactId || locked}
                loading={busy === 'ai_draft'}
              >
                AI first draft
              </Button>
              {quota && (
                <span className="ml-num text-[13px] text-graphite">
                  {quota.remaining} AI uses left today
                </span>
              )}
            </div>

            {channel === 'email' && (
              <Field label="Subject">
                {(f) => (
                  <input
                    {...f}
                    value={subject}
                    onChange={(e) => { setSubject(e.target.value); setState('draft'); }}
                    className="ml-field"
                    maxLength={200}
                    disabled={locked}
                  />
                )}
              </Field>
            )}

            <Field label="Message body">
              {(f) => (
                <>
                  <textarea
                    {...f}
                    value={body}
                    onChange={(e) => { setBody(e.target.value); setState('draft'); }}
                    rows={10}
                    placeholder={channel === 'linkedin' ? 'LinkedIn message or connection note…' : 'Write your message…'}
                    className="ml-field"
                    maxLength={bodyMax}
                    disabled={locked}
                  />
                  <p className="ml-num mt-1.5 text-right text-[13px] text-graphite">
                    {body.length}/{bodyMax}
                  </p>
                </>
              )}
            </Field>

            {blockingIssues.length > 0 && (
              <Notice label="Fix before review">
                <ul className="space-y-1.5">
                  {blockingIssues.map((issue) => (
                    <li key={issue.code}>
                      <span className="ml-num text-[12px] uppercase tracking-[0.12em] text-graphite">
                        {issue.severity === 'block' ? 'Blocking' : 'Warning'}
                      </span>{' '}
                      {issue.message}
                    </li>
                  ))}
                </ul>
              </Notice>
            )}

            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                onClick={saveDraft}
                disabled={busy !== null || !contactId || !body.trim() || locked}
                loading={busy === 'save'}
              >
                Save draft
              </Button>
              <Button
                onClick={runReview}
                disabled={busy !== null || !contactId || !body.trim() || locked}
                loading={busy === 'review'}
              >
                AI review
              </Button>
            </div>
          </div>
        </section>

        {/* ── Review ───────────────────────────────────────────── */}
        {review && (
          <section>
            <SectionHeading title="Review" label="AI assessment" />
            <p className="mt-4 max-w-[72ch] text-[16px] leading-[1.62] text-bone">{review.summary}</p>

            {review.strengths.length > 0 && (
              <div className="mt-6">
                <span className="ml-label">Strengths</span>
                <ul className="mt-2">
                  {review.strengths.map((s) => (
                    <li key={s} className="ml-row py-2.5 text-[16px] leading-[1.6] text-graphite">{s}</li>
                  ))}
                </ul>
              </div>
            )}

            {review.issues.length > 0 && (
              <div className="mt-6">
                <span className="ml-label">Issues</span>
                <ul className="mt-2">
                  {review.issues.map((issue) => (
                    <li key={issue.observation} className="ml-row py-4">
                      <span className="ml-label">{issue.area}</span>
                      <p className="mt-1.5 max-w-[70ch] text-[16px] leading-[1.6] text-bone">
                        {issue.observation}
                      </p>
                      <p className="mt-1.5 max-w-[70ch] text-[15px] leading-[1.55] text-graphite">
                        {issue.why_it_matters}
                      </p>
                      <p className="mt-2 max-w-[70ch] border-l-2 border-rule-bright pl-3 text-[15px] leading-[1.55] text-graphite">
                        {issue.revision_question}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {review.rewrite_options.length > 0 && (
              <div className="mt-6">
                <span className="ml-label">Faithful rewrites</span>
                <div className="mt-2 space-y-4">
                  {review.rewrite_options.map((rewrite, index) => (
                    <Panel as="div" key={index} raised className="p-4 sm:p-5">
                      <span className="ml-label">Option {String(index + 1).padStart(2, '0')}</span>
                      {rewrite.subject && (
                        <p className="mt-2 text-[15px] font-semibold text-bone">{rewrite.subject}</p>
                      )}
                      <p className="mt-2 max-w-[70ch] whitespace-pre-wrap text-[16px] leading-[1.62] text-graphite">
                        {rewrite.body}
                      </p>
                      <p className="mt-3 text-[14px] leading-[1.55] text-graphite">
                        {rewrite.change_summary}
                      </p>
                      <Button
                        variant="secondary"
                        size="sm"
                        className="mt-4"
                        onClick={() => applyRewrite(rewrite.subject, rewrite.body)}
                      >
                        Use this version
                      </Button>
                    </Panel>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}
      </div>

      {/* ── Rail ───────────────────────────────────────────────── */}
      <div className="space-y-8">
        <section>
          <SectionHeading title="Send" />
          {locked || sentConfirmation ? (
            <Notice tone="ok" label="Sent" className="mt-4">
              Logged as sent. Your timeline and follow-ups are up to date.
            </Notice>
          ) : (
            <div className="mt-4 space-y-5">
              <p className="max-w-[60ch] text-[15px] leading-[1.6] text-graphite">
                TrajectoryOS does not send email or LinkedIn messages directly yet. Send it yourself,
                then log it here so your timeline and follow-ups stay accurate.
              </p>

              {channel === 'email' ? (
                <a
                  href={mailtoHref()}
                  onClick={() => logSent('mailto')}
                  aria-disabled={sendDisabled}
                  className={`ml-btn ml-btn-primary on-accent min-h-[44px] px-5 text-[13px] ${
                    sendDisabled ? 'pointer-events-none' : ''
                  }`}
                >
                  Open in mail app <span aria-hidden="true">▸</span>
                </a>
              ) : (
                <Button
                  onClick={() => { void copyBody(); void logSent('linkedin_copy'); }}
                  disabled={!body.trim() || busy !== null}
                  loading={busy === 'send'}
                >
                  Copy and mark sent
                </Button>
              )}

              <div>
                <Button
                  variant="secondary"
                  onClick={() => logSent('copy')}
                  disabled={!messageId || busy !== null}
                >
                  Already sent it — just log it
                </Button>
              </div>

              <div className="border-t border-rule pt-3">
                <CheckControl
                  checked={followUp.enabled}
                  onChange={() => setFollowUp({ ...followUp, enabled: !followUp.enabled })}
                  label="Queue a follow-up"
                />
                {followUp.enabled && (
                  <div className="mt-3 grid gap-4 sm:grid-cols-2">
                    <Field label="Type">
                      {(f) => (
                        <select
                          {...f}
                          value={followUp.kind}
                          onChange={(e) => setFollowUp({ ...followUp, kind: e.target.value })}
                          className="ml-field"
                        >
                          <option value="follow_up_no_reply">Follow up if no reply</option>
                          <option value="maintain">Keep warm</option>
                        </select>
                      )}
                    </Field>
                    <Field label="Timing">
                      {(f) => (
                        <select
                          {...f}
                          value={followUp.days}
                          onChange={(e) => setFollowUp({ ...followUp, days: Number(e.target.value) })}
                          className="ml-field"
                        >
                          <option value={3}>In 3 days</option>
                          <option value={5}>In 5 days</option>
                          <option value={7}>In 7 days</option>
                        </select>
                      )}
                    </Field>
                  </div>
                )}
              </div>
            </div>
          )}
        </section>

        <section>
          <SectionHeading title="Recent drafts" label={`${messages.length}`} />
          {messages.length === 0 ? (
            <p className="mt-4 text-[16px] text-graphite">Nothing saved yet.</p>
          ) : (
            <ul className="mt-2">
              {messages.slice(0, 10).map((message) => (
                <li key={message.id} className="ml-row">
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
                    className="ml-row-hover flex min-h-[44px] w-full flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2.5 text-left text-[15px] text-bone hover:text-red"
                  >
                    <span className="capitalize">{message.purpose.replace(/_/g, ' ')}</span>
                    <span className="ml-num text-[12px] uppercase tracking-[0.12em] text-graphite">
                      {message.channel} · {message.state}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
