import type { Metadata } from 'next';
import { buildWeeklyPlan } from '@trajectoryos/core/networking';
import { AU_RECRUITING_CYCLES } from '@trajectoryos/core/courses/timeline';
import { TrackProductEvent } from '@/components/analytics/TrackProductEvent';
import { TodayView } from '@/components/networking/TodayView';
import { buildPlanInputs, loadWorkspaceData } from '@/lib/networking/queries';

export const metadata: Metadata = { title: 'Networking — Today' };
export const dynamic = 'force-dynamic';

/**
 * Today: the deterministic weekly plan — debriefs and thank-yous
 * first, then due work, chat prep, silence bumps and coverage gaps
 * weighted by the AU recruiting timeline.
 */
export default async function NetworkTodayPage({ params }: { params: Promise<{ courseSlug: string }> }) {
  const { courseSlug } = await params;
  const data = await loadWorkspaceData();
  const nowIso = new Date().toISOString();
  const inputs = buildPlanInputs(data, nowIso);
  const plan = buildWeeklyPlan({
    nowIso,
    contacts: inputs.contacts,
    followUps: inputs.followUps,
    coffeeChats: inputs.coffeeChats,
    coverage: inputs.coverage.rows,
    cycles: AU_RECRUITING_CYCLES,
  });

  return (
    <>
      <TrackProductEvent eventName="networking_workspace_opened" resourceSlug={courseSlug} />
      <TodayView
        plan={plan}
        base={`/resources/${courseSlug}/network`}
        contactCount={data.contacts.length}
        coveredTargets={inputs.coverage.coveredCount}
        totalTargets={inputs.coverage.totalTargets}
      />
    </>
  );
}
