'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { STAGE_LABELS, STAGE_ORDER, type PlanContact } from '@trajectoryos/core/networking';
import type {
  NetworkingContactRow,
  NetworkingFollowUpRow,
  RelationshipStage,
} from '@trajectoryos/core/networking/types';
import { networkingApi } from './api';

const SELECT = 'px-2 py-1 rounded-lg bg-white/[0.04] border border-white/10 text-slate-300 text-xs focus:outline-none focus:border-gold-400/50 [&>option]:bg-navy-950';

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
 * Displays networking contacts in stage columns with attention filters.
 *
 * Moving a card updates its stage label only; it does not log interactions or complete follow-ups.
 *
 * @param base - The path prefix used for contact links
 * @param contacts - The contacts displayed on the stage board
 * @param planContacts - Outreach and follow-up data used for attention filters
 * @param followUps - Follow-up records used to identify overdue contacts
 */
export function PipelineView({ base, contacts, planContacts, followUps }: Props) {
  const router = useRouter();
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

  /**
   * Updates a contact's relationship stage and refreshes the view.
   *
   * @param contactId - The contact whose stage should be updated
   * @param stage - The new relationship stage
   */
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
    <div className="space-y-5">
      {error && <p role="alert" className="text-sm text-red-400 border border-red-400/30 bg-red-400/10 rounded-lg px-4 py-2.5">{error}</p>}

      <div className="flex flex-wrap gap-2">
        {ATTENTION_FILTERS.map((filter) => (
          <button
            key={filter.value}
            type="button"
            onClick={() => setAttention(filter.value)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              attention === filter.value
                ? 'border-gold-400/50 bg-gold-400/10 text-gold-400'
                : 'border-white/10 text-slate-400 hover:text-white'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto pb-2 -mx-1 px-1">
        <div className="flex gap-4 min-w-max">
          {STAGE_ORDER.map((stage) => {
            const inStage = filtered.filter((contact) => contact.stage === stage);
            return (
              <div key={stage} className="w-64 shrink-0">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 px-1">
                  {STAGE_LABELS[stage]} <span className="text-slate-600">({inStage.length})</span>
                </p>
                <div className="space-y-2 min-h-[3rem]">
                  {inStage.map((contact) => (
                    <div key={contact.id} className={`glass rounded-xl border border-white/8 p-3 ${busyId === contact.id ? 'opacity-50' : ''}`}>
                      <Link href={`${base}/contacts/${contact.id}`} className="text-sm text-white hover:text-gold-400 transition-colors font-medium">
                        {contact.full_name}
                      </Link>
                      <p className="text-xs text-slate-500 mt-0.5">{[contact.role_title, contact.firm].filter(Boolean).join(' · ') || '—'}</p>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <select
                          value={contact.stage}
                          disabled={busyId === contact.id}
                          onChange={(event) => moveStage(contact.id, event.target.value as RelationshipStage)}
                          className={SELECT}
                          aria-label={`Move ${contact.full_name} to stage`}
                        >
                          {STAGE_ORDER.map((option) => <option key={option} value={option}>{STAGE_LABELS[option]}</option>)}
                        </select>
                        {overdueContactIds.has(contact.id) && <span className="text-[10px] text-red-400 uppercase tracking-wider">Overdue</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <p className="text-xs text-slate-600">
        Moving a card changes the stage label only — it never logs interactions or completes follow-ups for you.
      </p>
    </div>
  );
}
