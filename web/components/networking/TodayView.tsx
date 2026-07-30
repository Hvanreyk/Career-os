'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { PlanAction, WeeklyPlan } from '@trajectoryos/core/networking';
import { Button } from '@/components/ui/Button';
import { Panel, PanelHeader, Stat } from '@/components/ui/Panel';
import { StateBlock } from '@/components/ui/StateBlock';
import { StatusLabel } from '@/components/ui/Status';
import { networkingApi } from './api';
import { Notice, SectionHeading } from './ui';

/** Each queue item is filed under a short kind, written out rather than drawn. */
const ACTION_KIND: Record<PlanAction['type'], string> = {
  debrief_chat: 'Debrief',
  thank_you: 'Thank-you',
  overdue_followup: 'Overdue',
  due_followup: 'Due',
  prep_chat: 'Prep',
  silence_bump: 'Bump',
  coverage_gap: 'Coverage',
  start_outreach: 'Outreach',
  stale_connection: 'Stale',
};

interface Props {
  plan: WeeklyPlan;
  base: string;
  contactCount: number;
  coveredTargets: number;
  totalTargets: number;
}

/**
 * Renders the Today queue with one-click completion for follow-ups and
 * deep links into the contact, chat and Message Lab flows.
 */
export function TodayView({ plan, base, contactCount, coveredTargets, totalTargets }: Props) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const actionKey = (action: PlanAction, index: number) =>
    `${action.type}-${action.followUpId ?? action.chatId ?? action.contactId ?? action.targetId ?? index}`;

  async function completeFollowUp(followUpId: string) {
    setBusyId(followUpId);
    setError(null);
    try {
      await networkingApi(`/followups/${followUpId}`, 'PATCH', { status: 'completed' });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusyId(null);
    }
  }

  async function snoozeFollowUp(followUpId: string) {
    setBusyId(followUpId);
    setError(null);
    try {
      const dueAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
      await networkingApi(`/followups/${followUpId}`, 'PATCH', { status: 'snoozed', due_at: dueAt });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setBusyId(null);
    }
  }

  function actionHref(action: PlanAction): string {
    if (action.contactId) return `${base}/contacts/${action.contactId}`;
    if (action.targetId) return `${base}/target-map`;
    return `${base}/contacts`;
  }

  const stats = useMemo(() => ([
    { label: 'Contacts', value: String(contactCount) },
    { label: 'Overdue', value: String(plan.overdueCount) },
    { label: 'Due today', value: String(plan.dueTodayCount) },
    { label: 'Chats ahead', value: String(plan.upcomingChatCount) },
    { label: 'Targets covered', value: totalTargets > 0 ? `${coveredTargets}/${totalTargets}` : '—' },
    { label: 'Weekly outreach goal', value: String(plan.weeklyOutreachTarget) },
  ]), [contactCount, plan, coveredTargets, totalTargets]);

  return (
    <div className="space-y-8">
      {error && <Notice>{error}</Notice>}

      {/* Coverage read-out. Overdue is the only figure allowed to shout. */}
      <div className="grid grid-cols-2 gap-px border border-rule bg-rule sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((stat) => (
          <Stat
            key={stat.label}
            label={stat.label}
            value={stat.value}
            accent={stat.label === 'Overdue' && plan.overdueCount > 0}
            className="bg-surface p-4"
          />
        ))}
      </div>

      {plan.timelineNotices.length > 0 && (
        <Panel>
          <PanelHeader title="AU recruiting timeline" label="Calendar" />
          <div className="px-4 py-1 sm:px-5">
            {plan.timelineNotices.map((notice) => (
              <p key={notice} className="ml-row py-3 text-[16px] leading-[1.6] text-graphite">
                {notice}
              </p>
            ))}
          </div>
        </Panel>
      )}

      {plan.recommended && (
        <Panel raised className="p-5 sm:p-6">
          <span className="ml-label">Recommended next action</span>
          <h2 className="mt-2.5 text-[19px] font-bold uppercase leading-tight tracking-[-0.02em] text-bone">
            {plan.recommended.title}
          </h2>
          <p className="mt-2 max-w-[68ch] text-[16px] leading-[1.6] text-graphite">
            {plan.recommended.detail}
          </p>
          <Button href={actionHref(plan.recommended)} className="mt-5">
            Open <span aria-hidden="true">▸</span>
          </Button>
        </Panel>
      )}

      <section>
        <SectionHeading
          title="This week’s queue"
          label={`${plan.actions.length} item${plan.actions.length === 1 ? '' : 's'}`}
        />
        {plan.actions.length === 0 ? (
          <StateBlock
            kind="empty"
            title="The queue is clear"
            action={
              <Button href={`${base}/contacts`} variant="secondary">
                Open contacts
              </Button>
            }
            className="mt-5"
          >
            Nothing is due. Add contacts, or build coverage at your target firms, to keep the
            relationships moving.
          </StateBlock>
        ) : (
          <ul>
            {plan.actions.map((action, index) => {
              const busy = busyId === action.followUpId;
              return (
                <li
                  key={actionKey(action, index)}
                  className="ml-row grid gap-x-5 gap-y-3 py-4 md:grid-cols-[7.5rem_minmax(0,1fr)_auto] md:items-start"
                >
                  <div className="md:pt-0.5">
                    <StatusLabel tone={action.type === 'overdue_followup' ? 'accent' : 'neutral'}>
                      {ACTION_KIND[action.type]}
                    </StatusLabel>
                  </div>

                  <div className="min-w-0">
                    <p className="text-[16px] font-semibold leading-snug text-bone">{action.title}</p>
                    <p className="mt-1 max-w-[70ch] text-[15px] leading-[1.55] text-graphite">
                      {action.detail}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 md:justify-end">
                    {action.followUpId && (
                      <>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => completeFollowUp(action.followUpId!)}
                          disabled={busy}
                          loading={busy}
                          aria-label={`Mark done: ${action.title}`}
                        >
                          Done
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => snoozeFollowUp(action.followUpId!)}
                          disabled={busy}
                          aria-label={`Snooze two days: ${action.title}`}
                        >
                          Snooze 2d
                        </Button>
                      </>
                    )}
                    <Link
                      href={actionHref(action)}
                      className="ml-btn ml-btn-text min-h-[44px] text-[14px]"
                      aria-label={`Open: ${action.title}`}
                    >
                      Open <span aria-hidden="true">▸</span>
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
