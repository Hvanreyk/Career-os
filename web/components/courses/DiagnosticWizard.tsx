'use client';

import { useState } from 'react';
import { ChoiceButton } from '@/components/onboard/ChoiceButton';
import { Button } from '@/components/ui/Button';
import { Meter } from '@/components/ui/Status';
import { ReadinessGauge } from './ReadinessGauge';

// Serializable question data comes from the server page (which imports
// it from @trajectoryos/core) so the engine module isn't bundled here.

export interface WizardQuestion {
  id: string;
  prompt: string;
  options: { id: string; text: string }[];
}

interface Readiness {
  score: number;
  dimensions: Record<string, number>;
  module_priorities: string[];
}

interface Props {
  courseSlug: string;
  courseTitle: string;
  questions: WizardQuestion[];
  /** {questionId: optionId} suggestions from the onboarding profile. */
  prefill: Record<string, string>;
  dimensionLabels: Record<string, string>;
  /** module slug → title, for the priority list in the result view. */
  moduleTitles: Record<string, string>;
}

export function DiagnosticWizard({
  courseSlug,
  courseTitle,
  questions,
  prefill,
  dimensionLabels,
  moduleTitles,
}: Props) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>(prefill);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [readiness, setReadiness] = useState<Readiness | null>(null);

  const question = questions[step];
  const isLast = step === questions.length - 1;

  async function submit(finalAnswers: Record<string, string>) {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/courses/${courseSlug}/diagnostic`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: finalAnswers }),
      });
      const body = (await res.json().catch(() => null)) as
        | { readiness?: Readiness; error?: string }
        | null;
      if (!res.ok || !body?.readiness) {
        throw new Error(body?.error ?? 'Could not compute your readiness score');
      }
      setReadiness(body.readiness);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  }

  function choose(optionId: string) {
    const nextAnswers = { ...answers, [question!.id]: optionId };
    setAnswers(nextAnswers);
    if (!isLast) {
      setStep((s) => s + 1);
    } else {
      void submit(nextAnswers);
    }
  }

  // ── Result view ──────────────────────────────────────────────
  if (readiness) {
    const priorities = readiness.module_priorities
      .filter((slug) => moduleTitles[slug])
      .slice(0, 3);
    return (
      <div className="space-y-8">
        <ReadinessGauge
          score={readiness.score}
          dimensions={readiness.dimensions}
          dimensionLabels={dimensionLabels}
          heading="Your readiness score"
        />

        {priorities.length > 0 && (
          <section>
            <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-bone pb-3">
              <h2 className="text-[17px] font-bold uppercase tracking-[-0.015em] text-bone">
                Start here
              </h2>
              <span className="ml-label">Recommended order</span>
            </div>
            <p className="mt-4 max-w-[66ch] text-[16px] leading-[1.6] text-graphite">
              Based on your answers, these modules will move your readiness fastest.
            </p>
            <ol className="mt-3">
              {priorities.map((slug, i) => (
                <li
                  key={slug}
                  className="ml-row grid grid-cols-[2.5rem_minmax(0,1fr)] items-baseline gap-x-4 py-4"
                >
                  <span className="ml-num text-[13px] text-red" aria-hidden="true">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="text-[16px] leading-[1.5] text-bone">{moduleTitles[slug]}</span>
                </li>
              ))}
            </ol>
          </section>
        )}

        <div className="border-t border-rule pt-6">
          <Button href={`/resources/${courseSlug}`} size="lg">
            Back to {courseTitle} <span aria-hidden="true">▸</span>
          </Button>
        </div>
      </div>
    );
  }

  // ── Question steps ───────────────────────────────────────────
  if (!question) return null;
  const progress = ((step + 1) / questions.length) * 100;

  return (
    <div>
      {/* Position in the sequence, printed as figures — a wizard should never
          leave you guessing how much is left. */}
      <div className="border-b border-rule pb-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <span className="ml-label">
            Question <span className="ml-num text-bone">{step + 1}</span> of{' '}
            <span className="ml-num">{questions.length}</span>
          </span>
          {prefill[question.id] && !answers[question.id] && (
            <span className="ml-label">Suggested from your profile</span>
          )}
        </div>
        <Meter
          value={progress}
          accent
          className="mt-3"
          label={`Diagnostic progress: question ${step + 1} of ${questions.length}`}
        />
      </div>

      <h2 className="mt-8 max-w-[42ch] text-[20px] font-bold leading-[1.25] tracking-[-0.02em] text-bone">
        {question.prompt}
      </h2>

      {/* One frame around the options; ChoiceButton draws the hairlines. */}
      <div className="mt-5 border border-rule">
        {question.options.map((opt) => (
          <div key={opt.id} className="ml-row">
            <ChoiceButton
              selected={answers[question.id] === opt.id}
              onClick={() => choose(opt.id)}
            >
              {opt.text}
            </ChoiceButton>
          </div>
        ))}
      </div>

      <div className="mt-6 flex min-h-[44px] items-center justify-between gap-4">
        {step > 0 ? (
          <Button onClick={() => setStep((s) => s - 1)} variant="ghost">
            <span aria-hidden="true">◂</span> Back
          </Button>
        ) : (
          <span />
        )}
        {submitting && <span className="ml-label">▸ Scoring…</span>}
      </div>

      {error && (
        <p className="mt-4 text-[15px] text-red" role="alert">
          ▲ {error}
        </p>
      )}
    </div>
  );
}
