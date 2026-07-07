'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarRange, Loader2, Map, RefreshCw } from 'lucide-react';

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
    status: 'processing' | 'completed' | 'error';
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

  // A roadmap stuck in 'processing' (interrupted tab) resumes once.
  useEffect(() => {
    if (started.current || !initial || initial.status !== 'processing') return;
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
      <div className="space-y-6">
        {SECTION_TITLES.map(([key, title]) => (
          <div key={key} className="glass rounded-2xl border border-white/8 p-6">
            <div className="flex items-center gap-2.5 mb-4">
              <CalendarRange className="w-4 h-4 text-gold-400" />
              <h2 className="font-serif text-xl font-bold text-white">{title}</h2>
            </div>
            <ol className="space-y-4">
              {sections[key].map((item, i) => (
                <li key={i} className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-gold-400/10 text-gold-400 font-semibold flex items-center justify-center shrink-0 text-xs mt-0.5">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-white text-sm font-semibold">{item.title}</p>
                    <p className="text-slate-400 text-sm leading-relaxed mt-0.5">{item.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        ))}

        <div className="flex items-center justify-between gap-4 flex-wrap">
          <p className="text-xs text-slate-600">
            Generated{' '}
            {new Date(initial.createdAt).toLocaleDateString('en-AU', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
            . Dates referenced are typical patterns — verify with each firm.
          </p>
          <button
            type="button"
            onClick={() => void generate()}
            disabled={working}
            className="px-4 py-2.5 rounded-xl border border-white/10 text-sm text-slate-300 hover:text-white hover:border-gold-400/40 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            {working ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
            Regenerate with latest progress
          </button>
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
      </div>
    );
  }

  // ── Empty / processing / error ───────────────────────────────
  return (
    <div className="glass rounded-2xl border border-white/8 p-10 text-center">
      {working ? (
        <>
          <Loader2 className="w-8 h-8 text-gold-400 animate-spin mx-auto mb-5" />
          <h2 className="font-serif text-xl font-bold text-white mb-2">
            Building your roadmap
          </h2>
          <p className="text-slate-400 text-sm">
            Turning your readiness profile, quiz results and target list into a
            week-by-week plan. This takes a few seconds.
          </p>
        </>
      ) : (
        <>
          <Map className="w-8 h-8 text-gold-400 mx-auto mb-5" />
          <h2 className="font-serif text-xl font-bold text-white mb-2">
            {error ? "We couldn't finish your roadmap" : 'Your personalised recruiting roadmap'}
          </h2>
          <p className="text-slate-400 text-sm mb-6 max-w-md mx-auto">
            {error ??
              'A week-by-week action plan built from your diagnostic, course progress and bank target list.'}
          </p>
          <button
            type="button"
            onClick={() => void generate()}
            className="px-6 py-3 bg-gold-400 text-navy-950 font-semibold rounded-xl hover:bg-gold-300 transition-all text-sm shadow-[0_0_20px_rgba(212,175,55,0.25)]"
          >
            {error ? 'Try again' : 'Generate my roadmap'}
          </button>
        </>
      )}
    </div>
  );
}
