'use client';

import { useId, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { STAGE_LABELS, STAGE_ORDER, type PlanContact } from '@trajectoryos/core/networking';
import type {
  NetworkingContactRow,
  NetworkingFollowUpRow,
  RelationshipStage,
} from '@trajectoryos/core/networking/types';
import { StatusLabel } from '@/components/ui/Status';
import { networkingApi } from './api';
import { Notice, SectionHeading, Toggle } from './ui';

type Attention = 'all' | 'no_first_outreach' | 'unanswered' | 'overdue' | 'no_next_action' | 'stale';

const ATTENTION_FILTERS: { value: Attention; label: string }[] = [
  { value: 'all', label: 'Everyone' },
  { value: 'no_first_outreach', label: 'No first outreach' },
  { value: 'unanswered', label: 'Awaiting reply 7d+' },
  { value: 'overdue', label: 'Overdue follow-up' },
  { value: 'no_next_action', label: 'No next action' },
  { value: 'stale', label: 'Going stale' },
];

interface Props {
  base: string;
  contacts: NetworkingContactRow[];
  planContacts: PlanContact[];
  followUps: NetworkingFollowUpRow[];
}

/**
 * Stage register. Changing a row's stage sets the explicit stage only —
 * it never creates interactions or completes follow-ups.
 *
 * Deliberately a grouped register rather than a board of cards: the
 * question this page answers is "who is stuck where", which reads far
 * better down a column of rows than across a wall of tiles.
 */
export function PipelineView({ base, contacts, planContacts, followUps }: Props) {
  const router = useRouter();
  const id = useId();
  const [attention, setAttention] = useState<Attention>('all');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const planById = useMemo(() => new Map(planContacts.map((c) => [c.id, c])), [planContacts]);
  const overdueContactIds = useMemo(() => {
    const now = new Date().toISOString();
    return new Set(followUps.filter((f) => f.due_at < now).map((f) => f.contact_id));
  }, [followUps]);

  const matchesAttention = (contact: NetworkingContactRow): boolean => {
    const plan = planById.get(contact.id);
    if (!plan) return attention === 'all';
    const days = (iso: string | null) => (iso ? (Date.now() - new Date(iso).getTime()) / 86_400_000 : Infinity);
    switch (attention) {
      case 'all': return true;
      case 'no_first_outreach':
        return (contact.stage === 'prospect' || contact.stage === 'ready_to_contact') && !plan.last_outbound_at;
      case 'unanswered':
        return contact.stage === 'contacted' && days(plan.last_outbound_at) >= 7
          && (!plan.last_inbound_at || plan.last_inbound_at < (plan.last_outbound_at ?? ''));
      case 'overdue': return overdueContactIds.has(contact.id);
      case 'no_next_action': return !plan.has_active_followup && contact.stage !== 'dormant' && !contact.do_not_contact;
      case 'stale': {
        const lastTouch = [plan.last_outbound_at, plan.last_inbound_at].filter(Boolean).sort().pop() ?? null;
        return contact.stage === 'connected' && days(lastTouch) >= 30;
      }
    }
  };

  const filtered = contacts.filter(matchesAttention);

  async function moveStage(contactId: string, stage: RelationshipStage) {
    setBusyId(contactId);
    setError(null);
    try {
      await networkingApi(`/contacts/${contactId}`, 'PATCH', { stage });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-8">
      {error && <Notice>{error}</Notice>}

      <div>
        <span className="ml-label">Needs attention</span>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {ATTENTION_FILTERS.map((filter) => (
            <Toggle
              key={filter.value}
              active={attention === filter.value}
              onClick={() => setAttention(filter.value)}
            >
              {filter.label}
            </Toggle>
          ))}
        </div>
      </div>

      <section>
        <SectionHeading
          title="Relationship stages"
          label={`${filtered.length} of ${contacts.length} shown`}
        />

        <div className="mt-2">
          {STAGE_ORDER.map((stage) => {
            const inStage = filtered.filter((contact) => contact.stage === stage);
            return (
              <section key={stage} className="border-b border-rule py-5 last:border-b-0">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h3 className="text-[14px] font-bold uppercase tracking-[0.06em] text-bone">
                    {STAGE_LABELS[stage]}
                  </h3>
                  <span className="ml-num text-[13px] text-graphite">
                    {inStage.length} contact{inStage.length === 1 ? '' : 's'}
                  </span>
                </div>

                {inStage.length === 0 ? (
                  <p className="mt-2 text-[15px] text-graphite">Empty.</p>
                ) : (
                  <ul className="mt-2 border-t border-rule">
                    {inStage.map((contact) => (
                      <li
                        key={contact.id}
                        className={`ml-row grid gap-x-5 gap-y-3 py-3 sm:grid-cols-[minmax(0,1fr)_14rem] sm:items-center ${
                          busyId === contact.id ? 'opacity-50' : ''
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                            <Link
                              href={`${base}/contacts/${contact.id}`}
                              className="text-[16px] font-semibold text-bone hover:text-red"
                            >
                              {contact.full_name}
                            </Link>
                            {overdueContactIds.has(contact.id) && (
                              <StatusLabel tone="accent">Overdue</StatusLabel>
                            )}
                          </div>
                          <p className="mt-0.5 text-[14px] text-graphite">
                            {[contact.role_title, contact.firm].filter(Boolean).join(' · ') || '—'}
                          </p>
                        </div>

                        <div>
                          <label htmlFor={`${id}-${contact.id}`} className="sr-only">
                            Move {contact.full_name} to stage
                          </label>
                          <select
                            id={`${id}-${contact.id}`}
                            value={contact.stage}
                            disabled={busyId === contact.id}
                            onChange={(event) => moveStage(contact.id, event.target.value as RelationshipStage)}
                            className="ml-field"
                          >
                            {STAGE_ORDER.map((option) => (
                              <option key={option} value={option}>{STAGE_LABELS[option]}</option>
                            ))}
                          </select>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      </section>

      <p className="max-w-[70ch] border-l-2 border-rule-bright pl-4 text-[15px] leading-[1.6] text-graphite">
        Changing a stage changes the label only — it never logs interactions or completes follow-ups
        for you.
      </p>
    </div>
  );
}
