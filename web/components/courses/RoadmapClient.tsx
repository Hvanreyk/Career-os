'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { StateBlock } from '@/components/ui/StateBlock';

// Drives the two-phase generate flow (create → process → refresh),
// modelled on ReportPending. The server page passes the latest roadmap
// state; this component (re)generates and refreshes to reveal it.

interface RoadmapItem {
  title: string;
  detail: string;
}

export interface RoadmapSectionsView {
  this_week: RoadmapItem[];
  next_30_days: RoadmapItem[];
  next_90_days: RoadmapItem[];
  before_apps_open: RoadmapItem[];
}

const SECTION_TITLES: [keyof RoadmapSectionsView, string][] = [
  ['this_week', 'This week'],
  ['next_30_days', 'Next 30 days'],
  ['next_90_days', 'Next 90 days'],
  ['before_apps_open', 'Before applications open'],
];

interface Props {
  courseSlug: string;
  initial: {
    id: string;
    status: 'pending' | 'processing' | 'completed' | 'error';
    errorMessage: string | null;
    sections: RoadmapSectionsView | null;
    createdAt: string;
  } | null;
}

export function RoadmapClient({ courseSlug, initial }: Props) {
  const router = useRouter();
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(
    initial?.status === 'error' ? (initial.errorMessage ?? 'Generation failed') : null,
  );
  const started = useRef(false);

  async function processRoadmap(id: string) {
    const res = await fetch(`/api/roadmaps/${id}/process`, { method: 'POST' });
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      throw new Error(body?.error ?? 'Roadmap generation failed');
    }
  }

  async function generate() {
    setWorking(true);
    setError(null);
    try {
      const res = await fetch(`/api/courses/${courseSlug}/roadmap`, { method: 'POST' });
      const body = (await res.json().catch(() => null)) as
        | { roadmapId?: string; status?: string; error?: string }
        | null;
      if (!res.ok || !body?.roadmapId) {
        throw new Error(body?.error ?? 'Could not start roadmap generation');
      }
      if (body.status !== 'completed') {
        await processRoadmap(body.roadmapId);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setWorking(false);
    }
  }

  // A pending or interrupted processing roadmap resumes once. The server's
  // atomic lease prevents this request racing another active invocation.
  useEffect(() => {
    if (
      started.current ||
      !initial ||
      !['pending', 'processing'].includes(initial.status)
    ) return;
    started.current = true;
    setWorking(true);
    processRoadmap(initial.id)
      .then(() => router.refresh())
      .catch((err) => setError(err instanceof Error ? err.message : 'Generation failed'))
      .finally(() => setWorking(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Completed: show the plan ─────────────────────────────────
  if (initial?.status === 'completed' && initial.sections) {
    const sections = initial.sections;
    return (
      <div className="space-y-10">
        {SECTION_TITLES.map(([key, title], sectionIndex) => (
          <section key={key}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-bone pb-3">
              <div className="flex flex-wrap items-baseline gap-x-3">
                <span className="ml-label" aria-hidden="true">
                  H{sectionIndex + 1}
                </span>
                <h2 className="text-[17px] font-bold uppercase tracking-[-0.015em] text-bone">
                  {title}
                </h2>
              </div>
              <span className="ml-label">
                <span className="ml-num">{sections[key].length}</span> actions
              </span>
            </div>

            <ol className="mt-2">
              {sections[key].map((item, i) => (
                <li
                  key={i}
                  className="ml-row grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-4 py-4"
                >
                  <span className="ml-num pt-0.5 text-[13px] text-graphite" aria-hidden="true">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="min-w-0">
                    <p className="text-[16px] font-semibold leading-[1.4] text-bone">
                      {item.title}
                    </p>
                    <p className="mt-1.5 max-w-[68ch] text-[15px] leading-[1.6] text-graphite">
                      {item.detail}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        ))}

        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-rule pt-6">
          <p className="max-w-[52ch] text-[13px] leading-[1.55] text-graphite">
            <span className="ml-label mr-2">Generated</span>
            <span className="ml-num">
              {new Date(initial.createdAt).toLocaleDateString('en-AU', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </span>
            . Dates referenced are typical patterns — verify with each firm.
          </p>
          <Button onClick={() => void generate()} variant="secondary" loading={working}>
            Regenerate with latest progress
          </Button>
        </div>

        {error && (
          <p className="text-[15px] text-red" role="alert">
            ▲ {error}
          </p>
        )}
      </div>
    );
  }

  // ── Empty / processing / error ───────────────────────────────
  if (working) {
    return (
      <StateBlock kind="loading" title="Building your roadmap">
        Turning your readiness profile, quiz results and target list into a week-by-week plan.
        This takes a few seconds.
      </StateBlock>
    );
  }

  return (
    <StateBlock
      kind={error ? 'error' : 'empty'}
      title={error ? "We couldn't finish your roadmap" : 'Your personalised recruiting roadmap'}
      action={
        <Button onClick={() => void generate()} size="lg">
          {error ? 'Try again' : 'Generate my roadmap'}
        </Button>
      }
    >
      {error ??
        'A week-by-week action plan built from your diagnostic, course progress and bank target list.'}
    </StateBlock>
  );
}
