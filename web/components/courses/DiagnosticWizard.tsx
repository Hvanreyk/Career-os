'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, ChevronLeft, Loader2 } from 'lucide-react';
import { ChoiceButton } from '@/components/onboard/ChoiceButton';
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
      <div className="space-y-6">
        <ReadinessGauge
          score={readiness.score}
          dimensions={readiness.dimensions}
          dimensionLabels={dimensionLabels}
          heading="Your readiness score"
        />
        {priorities.length > 0 && (
          <div className="glass rounded-2xl border border-white/8 p-7">
            <p className="text-xs font-semibold text-gold-400 uppercase tracking-widest mb-4">
              Start here
            </p>
            <p className="text-slate-400 text-sm mb-4">
              Based on your answers, these modules will move your readiness fastest:
            </p>
            <ol className="space-y-2">
              {priorities.map((slug, i) => (
                <li key={slug} className="flex items-center gap-3 text-sm">
                  <span className="w-6 h-6 rounded-full bg-gold-400/10 text-gold-400 font-semibold flex items-center justify-center shrink-0 text-xs">
                    {i + 1}
                  </span>
                  <span className="text-white">{moduleTitles[slug]}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
        <div className="flex justify-end">
          <Link
            href={`/resources/${courseSlug}`}
            className="px-5 py-3 bg-gold-400 text-navy-950 font-semibold text-sm rounded-xl hover:bg-gold-300 transition-all shadow-[0_0_20px_rgba(212,175,55,0.25)] flex items-center gap-2"
          >
            Back to {courseTitle} <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  // ── Question steps ───────────────────────────────────────────
  if (!question) return null;
  const progress = ((step + 1) / questions.length) * 100;

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-slate-500 uppercase tracking-widest">
            Question {step + 1} of {questions.length}
          </span>
          {prefill[question.id] && !answers[question.id] && (
            <span className="text-xs text-slate-600">Suggested from your profile</span>
          )}
        </div>
        <div className="h-1 rounded-full bg-navy-800 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-gold-500 to-gold-300"
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        </div>
      </div>

      <motion.div
        key={question.id}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        <h2 className="font-serif text-2xl font-bold text-white mb-6">{question.prompt}</h2>
        <div className="space-y-3">
          {question.options.map((opt) => (
            <ChoiceButton
              key={opt.id}
              selected={answers[question.id] === opt.id}
              onClick={() => choose(opt.id)}
            >
              {opt.text}
            </ChoiceButton>
          ))}
        </div>
      </motion.div>

      <div className="flex items-center justify-between mt-8">
        {step > 0 ? (
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-300 text-sm transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
        ) : (
          <span />
        )}
        {submitting && (
          <span className="text-sm text-slate-400 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Scoring…
          </span>
        )}
      </div>
      {error && <p className="text-red-400 text-sm mt-4">{error}</p>}
    </div>
  );
}
