'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Meter } from '@/components/ui/Status';

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
  const answeredCount = questions.filter((q) => answers[q.id]).length;

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

  const passed = graded ? graded.score / graded.total >= 0.7 : false;

  return (
    <div className="space-y-8">
      {/* ── Result ─────────────────────────────────────────────── */}
      {graded && (
        <section className="ml-panel" role="status">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-rule px-4 py-3 sm:px-5">
            <span className="ml-label">Result</span>
            <span className={`ml-label ${passed ? 'text-ok' : 'text-red'}`}>
              {graded.score === graded.total
                ? 'Full marks'
                : passed
                  ? 'Pass'
                  : 'Below threshold'}
            </span>
          </div>

          <div className="px-4 py-6 sm:px-5">
            <div className="flex items-baseline gap-2">
              <span className="ml-num text-[44px] font-bold leading-none tracking-[-0.04em] text-bone">
                {graded.score}
              </span>
              <span className="ml-num text-[18px] text-graphite">/ {graded.total}</span>
            </div>
            <Meter
              value={graded.score}
              max={graded.total}
              accent={!passed}
              className="mt-4 max-w-[24rem]"
              label={`Quiz score: ${graded.score} of ${graded.total}`}
            />
            <p className="mt-4 max-w-[62ch] text-[16px] leading-[1.6] text-graphite">
              {graded.score === graded.total
                ? 'Perfect — this module is locked in.'
                : passed
                  ? 'Solid. Review the explanations below, then keep moving.'
                  : 'Worth a revisit — reread the lessons flagged below before moving on.'}
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button href={courseHref}>
                Back to course <span aria-hidden="true">▸</span>
              </Button>
              <Button onClick={retry} variant="secondary">
                Retry quiz
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* ── Questions ──────────────────────────────────────────── */}
      <ol className="space-y-6">
        {questions.map((q, i) => {
          const result = resultFor(q.id);
          return (
            <li key={q.id} className="ml-panel">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-rule px-4 py-3 sm:px-5">
                <span className="ml-label">
                  Q{String(i + 1).padStart(2, '0')} / {String(questions.length).padStart(2, '0')}
                </span>
                {result && (
                  <span className={`ml-label ${result.correct ? 'text-ok' : 'text-red'}`}>
                    {result.correct ? 'Correct' : 'Incorrect'}
                  </span>
                )}
              </div>

              <div className="px-4 py-5 sm:px-5">
                <p className="max-w-[64ch] text-[16px] font-semibold leading-[1.55] text-bone">
                  {q.prompt}
                </p>

                <div className="mt-4 border border-rule">
                  {q.options.map((opt) => {
                    const chosen = answers[q.id] === opt.id;
                    let state = chosen
                      ? 'border-l-red bg-raised'
                      : 'border-l-transparent';
                    if (result) {
                      if (opt.id === result.correctId) state = 'border-l-ok bg-raised';
                      else if (chosen) state = 'border-l-red bg-raised';
                      else state = 'border-l-transparent opacity-60';
                    }
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        disabled={Boolean(result)}
                        aria-pressed={chosen}
                        onClick={() => setAnswers((a) => ({ ...a, [q.id]: opt.id }))}
                        className={`ml-row ${result ? '' : 'ml-row-hover'} flex w-full min-h-[52px] items-start gap-3 border-l-2 px-4 py-3 text-left text-[15px] leading-[1.5] text-bone ${state} ${
                          result ? 'cursor-default' : 'cursor-pointer'
                        }`}
                      >
                        <span className="min-w-0 flex-1">{opt.text}</span>
                        {/* Words, not just tint — required for the greyscale case. */}
                        {!result && chosen && <span className="ml-label shrink-0">Chosen</span>}
                        {result && opt.id === result.correctId && (
                          <span className="ml-label shrink-0 text-ok">Correct</span>
                        )}
                        {result && chosen && opt.id !== result.correctId && (
                          <span className="ml-label shrink-0 text-red">Your answer</span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {result && result.explanation && (
                  <div
                    className={`mt-4 max-w-[66ch] border-l-2 pl-4 text-[15px] leading-[1.65] text-graphite ${
                      result.correct ? 'border-ok' : 'border-red'
                    }`}
                  >
                    <span className="ml-label mr-2">Why</span>
                    {result.explanation}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {/* ── Submit ─────────────────────────────────────────────── */}
      {!graded && (
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-rule pt-6">
          <div>
            <span className="ml-label">
              <span className="ml-num">{answeredCount}</span> of{' '}
              <span className="ml-num">{questions.length}</span> answered
            </span>
            {!allAnswered && (
              <p className="mt-1 text-[14px] text-graphite">Answer every question to submit.</p>
            )}
            {error && (
              <p className="mt-1 text-[14px] text-red" role="alert">
                ▲ {error}
              </p>
            )}
          </div>
          <Button onClick={submit} disabled={!allAnswered} loading={submitting} size="lg">
            Submit answers
          </Button>
        </div>
      )}
    </div>
  );
}
