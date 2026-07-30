'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, Loader2, RotateCcw, X } from 'lucide-react';

interface Question {
  id: string;
  prompt: string;
  options: { id: string; text: string }[];
}

interface QuestionResult {
  questionId: string;
  correct: boolean;
  correctId: string;
  explanation: string;
}

interface GradeResponse {
  score: number;
  total: number;
  results: QuestionResult[];
}

interface Props {
  moduleId: string;
  questions: Question[];
  courseHref: string;
}

// Answers are graded server-side (/api/courses/quiz-attempts) — this
// component never sees the correct answers until after submission.
export function QuizRunner({ moduleId, questions, courseHref }: Props) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [graded, setGraded] = useState<GradeResponse | null>(null);

  const resultFor = (questionId: string) =>
    graded?.results.find((r) => r.questionId === questionId) ?? null;

  const allAnswered = questions.every((q) => answers[q.id]);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/courses/quiz-attempts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moduleId, answers }),
      });
      const body = (await res.json().catch(() => null)) as
        | (GradeResponse & { error?: string })
        | null;
      if (!res.ok || !body || body.error) {
        throw new Error(body?.error ?? 'Could not grade the quiz');
      }
      setGraded(body);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not grade the quiz');
    } finally {
      setSubmitting(false);
    }
  }

  function retry() {
    setAnswers({});
    setGraded(null);
    setError(null);
  }

  return (
    <div className="space-y-6">
      {graded && (
        <div
          className={`glass rounded-2xl border p-6 text-center ${
            graded.score / graded.total >= 0.7 ? 'border-emerald-400/30' : 'border-gold-400/30'
          }`}
        >
          <div className="font-serif text-4xl font-bold text-white mb-1">
            {graded.score}/{graded.total}
          </div>
          <p className="text-slate-400 text-sm">
            {graded.score === graded.total
              ? 'Perfect — this module is locked in.'
              : graded.score / graded.total >= 0.7
                ? 'Solid. Review the explanations below, then keep moving.'
                : 'Worth a revisit — reread the lessons flagged below before moving on.'}
          </p>
          <div className="flex justify-center gap-3 mt-5">
            <button
              type="button"
              onClick={retry}
              className="px-4 py-2.5 rounded-xl border border-white/10 text-sm text-slate-300 hover:text-white hover:border-gold-400/40 transition-colors flex items-center gap-2"
            >
              <RotateCcw className="w-4 h-4" /> Retry
            </button>
            <Link
              href={courseHref}
              className="px-4 py-2.5 bg-gold-400 text-navy-950 font-semibold text-sm rounded-xl hover:bg-gold-300 transition-all flex items-center gap-2"
            >
              Back to course <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}

      {questions.map((q, i) => {
        const result = resultFor(q.id);
        return (
          <div key={q.id} className="glass rounded-2xl border border-white/8 p-6">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">
              Question {i + 1} of {questions.length}
            </p>
            <p className="text-white font-medium mb-4">{q.prompt}</p>
            <div className="space-y-2">
              {q.options.map((opt) => {
                const chosen = answers[q.id] === opt.id;
                let ring = chosen
                  ? 'border-gold-400/60 bg-gold-400/5'
                  : 'border-white/10 hover:border-gold-400/40';
                if (result) {
                  if (opt.id === result.correctId) ring = 'border-emerald-400/60 bg-emerald-400/5';
                  else if (chosen) ring = 'border-red-400/60 bg-red-400/5';
                  else ring = 'border-white/10 opacity-60';
                }
                return (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={Boolean(result)}
                    onClick={() => setAnswers((a) => ({ ...a, [q.id]: opt.id }))}
                    className={`w-full text-left px-4 py-3 rounded-lg border text-sm text-slate-300 transition-colors flex items-start gap-3 ${ring} ${
                      result ? 'cursor-default' : 'cursor-pointer'
                    }`}
                  >
                    {result && opt.id === result.correctId && (
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    )}
                    {result && chosen && opt.id !== result.correctId && (
                      <X className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    )}
                    <span>{opt.text}</span>
                  </button>
                );
              })}
            </div>
            {result && result.explanation && (
              <div
                className={`mt-4 text-sm rounded-lg p-4 ${
                  result.correct ? 'bg-emerald-400/10 text-emerald-200' : 'bg-red-400/10 text-red-200'
                }`}
              >
                {result.explanation}
              </div>
            )}
          </div>
        );
      })}

      {!graded && (
        <div className="flex flex-col items-end gap-2">
          <button
            type="button"
            onClick={submit}
            disabled={!allAnswered || submitting}
            className="px-6 py-3 bg-gold-400 text-navy-950 font-semibold text-sm rounded-xl hover:bg-gold-300 transition-all shadow-[0_0_20px_rgba(212,175,55,0.25)] flex items-center gap-2 disabled:opacity-50"
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Submit answers
          </button>
          {!allAnswered && (
            <p className="text-xs text-slate-600">Answer every question to submit.</p>
          )}
          {error && <p className="text-red-400 text-xs">{error}</p>}
        </div>
      )}
    </div>
  );
}
