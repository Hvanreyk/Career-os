'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { StateBlock, StatePage } from '@/components/ui/StateBlock';

const PHASES = [
  { id: 'analyse', label: 'Analysing your profile', duration: 1800 },
  { id: 'match', label: 'Matching against 300+ career paths', duration: 2200 },
  { id: 'score', label: 'Running scoring engine', duration: 1600 },
  { id: 'generate', label: 'Generating your Career Compass report', duration: 2400 },
];

export default function ReportLoadingPage() {
  const router = useRouter();
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  // If creation succeeded and only processing failed, the report row already
  // exists — sending the user back through onboarding would discard it.
  const [createdId, setCreatedId] = useState<string | null>(null);
  const called = useRef(false);

  useEffect(() => {
    if (called.current) return;
    called.current = true;

    const run = async () => {
      const raw = localStorage.getItem('tos_profile');
      if (!raw) {
        // No pending onboarding data (e.g. revisit, or the confirmation link was
        // opened on another device). The dashboard shows the persisted report.
        router.replace('/dashboard');
        return;
      }

      let formData: unknown;
      try {
        formData = JSON.parse(raw);
      } catch {
        setError('Invalid profile data. Please try again.');
        return;
      }

      // Animate through phases while the API call runs in parallel
      let phase = 0;
      const advancePhase = () => {
        phase++;
        if (phase < PHASES.length) {
          setPhaseIndex(phase);
          setTimeout(advancePhase, PHASES[phase].duration);
        }
      };
      setTimeout(advancePhase, PHASES[0].duration);

      try {
        // Phase 1 — create: score + persist a 'processing' report (fast).
        const createRes = await fetch('/api/generate-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        });

        if (!createRes.ok) {
          const body = await createRes.json().catch(() => ({}));
          throw new Error((body as { error?: string }).error ?? 'Report generation failed');
        }

        const { reportId, existing } = await createRes.json() as { reportId: string; existing?: boolean };
        setCreatedId(reportId);
        localStorage.removeItem('tos_profile');

        // Profile unchanged — the persisted report is reused, no regeneration.
        if (existing) {
          router.replace(`/report/${reportId}`);
          return;
        }

        // Phase 2 — process: run the LLM and flip status to completed.
        const processRes = await fetch(`/api/reports/${reportId}/process`, {
          method: 'POST',
        });

        if (!processRes.ok) {
          const body = await processRes.json().catch(() => ({}));
          throw new Error((body as { error?: string }).error ?? 'Report generation failed');
        }

        // Hold on the final phase animation briefly, then reveal the report.
        const elapsed = PHASES.slice(0, 3).reduce((s, p) => s + p.duration, 0);
        const remaining = Math.max(0, elapsed + PHASES[3].duration - 800);
        const wait = Math.max(0, remaining - elapsed);
        setTimeout(() => router.replace(`/report/${reportId}`), wait);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
      }
    };

    run();
  }, [router]);

  // Smooth progress bar across all phases
  useEffect(() => {
    const totalDuration = PHASES.reduce((s, p) => s + p.duration, 0);
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - start;
      setProgress(Math.min((elapsed / totalDuration) * 100, 97));
    }, 80);
    return () => clearInterval(interval);
  }, []);

  if (error) {
    return (
      <StatePage>
        <StateBlock
          kind="error"
          title="Something went wrong"
          action={
            createdId ? (
              // The row exists; /report/[id] renders ReportPending, which
              // retries the write-up rather than rebuilding the profile.
              <>
                <Button href={`/report/${createdId}`}>Continue to your report</Button>
                <Button href="/onboard/goal" variant="secondary">
                  Start over
                </Button>
              </>
            ) : (
              <Button href="/onboard/goal">Start over</Button>
            )
          }
        >
          {error}
          {createdId && (
            <span className="mt-3 block">
              Your profile was saved and scored — only the written analysis failed, and it can be
              retried without re-entering anything.
            </span>
          )}
        </StateBlock>
      </StatePage>
    );
  }

  return (
    <StatePage>
      {/* A run log, not a spinner: each phase stays on screen so the wait reads
          as work being done rather than time passing. */}
      <div className="border border-rule bg-surface">
        <div className="flex items-baseline justify-between gap-4 border-b border-rule px-5 py-3">
          <span className="ml-label text-red">▸ Running</span>
          <span className="ml-label" aria-hidden="true">
            {String(Math.round(progress)).padStart(2, '0')}%
          </span>
        </div>

        <ol className="px-5 py-2">
          {PHASES.map((p, i) => {
            const done = i < phaseIndex;
            const active = i === phaseIndex;
            return (
              <li
                key={p.id}
                className="ml-row flex items-center gap-3 py-3"
                aria-current={active ? 'step' : undefined}
              >
                <span
                  className={`ml-num w-6 shrink-0 text-[12px] ${
                    active ? 'text-red' : done ? 'text-bone' : 'text-rule-bright'
                  }`}
                  aria-hidden="true"
                >
                  {done ? '✓' : String(i + 1).padStart(2, '0')}
                </span>
                <span
                  className={`text-[15px] leading-snug ${
                    active ? 'text-bone' : done ? 'text-graphite' : 'text-graphite/60'
                  }`}
                >
                  {p.label}
                </span>
              </li>
            );
          })}
        </ol>

        <div className="h-0.5 w-full bg-raised" role="presentation">
          <div
            className="h-full bg-red transition-[width] duration-150 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <p className="mt-4 text-[13px] text-graphite" aria-live="polite">
        {PHASES[phaseIndex].label} — this usually takes 10–15 seconds.
      </p>
    </StatePage>
  );
}
