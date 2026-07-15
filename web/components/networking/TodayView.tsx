'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { PlanAction, WeeklyPlan } from '@trajectoryos/core/networking';
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  Check,
  Clock,
  Coffee,
  Loader2,
  Mail,
  Sparkles,
  Users,
} from 'lucide-react';
import { networkingApi } from './api';

const ACTION_ICONS: Record<PlanAction['type'], typeof Mail> = {
  debrief_chat: Coffee,
  thank_you: Sparkles,
  overdue_followup: AlertTriangle,
  due_followup: Clock,
  prep_chat: CalendarClock,
  silence_bump: Mail,
  coverage_gap: Users,
  start_outreach: Mail,
  stale_connection: Users,
};

interface Props {
  plan: WeeklyPlan;
  base: string;
  contactCount: number;
  coveredTargets: number;
  totalTargets: number;
}

/**
 * Renders the Today queue with summary metrics, timeline notices, recommended actions, and follow-up controls.
 *
 * @param plan - The weekly plan containing queue actions, metrics, notices, and recommendations
 * @param base - The base path used to construct navigation links
 * @param contactCount - The number of contacts to display in the summary
 * @param coveredTargets - The number of covered targets
 * @param totalTargets - The total number of targets
 */
export function TodayView({ plan, base, contactCount, coveredTargets, totalTargets }: Props) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const actionKey = (action: PlanAction, index: number) =>
    `${action.type}-${action.followUpId ?? action.chatId ?? action.contactId ?? action.targetId ?? index}`;

  /**
   * Marks a follow-up as completed and refreshes the current view.
   *
   * @param followUpId - The identifier of the follow-up to complete
   */
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

  /**
   * Snoozes a follow-up for two days and refreshes the view after the update.
   *
   * @param followUpId - The identifier of the follow-up to snooze
   */
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

  /**
   * Builds a navigation URL for a plan action.
   *
   * @param action - The plan action whose identifiers determine the destination.
   * @returns A contact URL, target map URL, or contacts URL.
   */
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
    <div className="space-y-6">
      {error && (
        <p role="alert" className="text-sm text-red-400 border border-red-400/30 bg-red-400/10 rounded-lg px-4 py-2.5">{error}</p>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {stats.map((stat) => (
          <div key={stat.label} className="glass rounded-2xl border border-white/8 p-4">
            <p className="text-2xl font-semibold text-white">{stat.value}</p>
            <p className="text-xs text-slate-500 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {plan.timelineNotices.length > 0 && (
        <div className="glass rounded-2xl border border-gold-400/25 p-5 space-y-2">
          <p className="text-xs font-semibold text-gold-400 uppercase tracking-widest">AU recruiting timeline</p>
          {plan.timelineNotices.map((notice) => (
            <p key={notice} className="text-sm text-slate-300 leading-relaxed">{notice}</p>
          ))}
        </div>
      )}

      {plan.recommended && (
        <div className="glass rounded-2xl border border-gold-400/40 p-6">
          <p className="text-xs font-semibold text-gold-400 uppercase tracking-widest mb-2">Recommended next action</p>
          <h2 className="text-white font-semibold text-lg mb-1">{plan.recommended.title}</h2>
          <p className="text-sm text-slate-400 mb-4">{plan.recommended.detail}</p>
          <Link
            href={actionHref(plan.recommended)}
            className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-full bg-gold-400/15 text-gold-400 border border-gold-400/40 hover:bg-gold-400/25 transition-colors"
          >
            Go <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      <div className="glass rounded-2xl border border-white/8 p-6">
        <h2 className="text-white font-semibold mb-4">This week&apos;s queue</h2>
        {plan.actions.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-slate-300 mb-1">Nothing due — the queue is clear.</p>
            <p className="text-sm text-slate-500 mb-4">
              Add contacts or build coverage at your target firms to keep momentum.
            </p>
            <Link href={`${base}/contacts`} className="text-sm text-gold-400 hover:underline">Open contacts</Link>
          </div>
        ) : (
          <ul className="divide-y divide-white/5">
            {plan.actions.map((action, index) => {
              const Icon = ACTION_ICONS[action.type];
              return (
                <li key={actionKey(action, index)} className="py-3.5 flex items-start gap-3">
                  <span className="w-8 h-8 rounded-lg bg-white/[0.05] flex items-center justify-center shrink-0 mt-0.5">
                    <Icon className="w-4 h-4 text-gold-400" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-white">{action.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{action.detail}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {action.followUpId && (
                      <>
                        <button
                          type="button"
                          onClick={() => completeFollowUp(action.followUpId!)}
                          disabled={busyId === action.followUpId}
                          className="text-xs px-2.5 py-1.5 rounded-full border border-white/10 text-slate-400 hover:text-white hover:border-gold-400/40 transition-colors disabled:opacity-50 inline-flex items-center gap-1"
                        >
                          {busyId === action.followUpId ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Done
                        </button>
                        <button
                          type="button"
                          onClick={() => snoozeFollowUp(action.followUpId!)}
                          disabled={busyId === action.followUpId}
                          className="text-xs px-2.5 py-1.5 rounded-full border border-white/10 text-slate-500 hover:text-white transition-colors disabled:opacity-50"
                        >
                          Snooze 2d
                        </button>
                      </>
                    )}
                    <Link
                      href={actionHref(action)}
                      className="text-xs px-2.5 py-1.5 rounded-full border border-white/10 text-slate-400 hover:text-white hover:border-gold-400/40 transition-colors"
                    >
                      Open
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
