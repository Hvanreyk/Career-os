'use client';

import { useState } from 'react';

// Formative inline check: instant client-side feedback, nothing is
// recorded. (Scored quizzes are the module quiz, graded server-side.)

interface Props {
  block: {
    question: string;
    options: { id: string; text: string }[];
    correctId: string;
    explanation: string;
  };
}

export function KnowledgeCheck({ block }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const answered = selected !== null;
  const correct = selected === block.correctId;

  return (
    <section className="ml-panel">
      <div className="border-b border-rule px-4 py-3 sm:px-5">
        <span className="ml-label">Quick check · not recorded</span>
      </div>

      <div className="px-4 py-5 sm:px-5">
        <p className="max-w-[62ch] text-[16px] font-semibold leading-[1.55] text-bone">
          {block.question}
        </p>

        {/* One frame, hairline-separated rows — the options are a register. */}
        <div className="mt-4 border border-rule">
          {block.options.map((opt) => {
            const isChosen = selected === opt.id;
            const isCorrect = opt.id === block.correctId;
            let state = 'border-l-transparent';
            if (answered) {
              if (isCorrect) state = 'border-l-ok bg-raised';
              else if (isChosen) state = 'border-l-red bg-raised';
              else state = 'border-l-transparent opacity-60';
            }
            return (
              <button
                key={opt.id}
                type="button"
                disabled={answered}
                onClick={() => setSelected(opt.id)}
                className={`ml-row ${answered ? '' : 'ml-row-hover'} flex w-full min-h-[52px] items-start gap-3 border-l-2 px-4 py-3 text-left text-[15px] leading-[1.5] text-bone ${state} ${
                  answered ? 'cursor-default' : 'cursor-pointer'
                }`}
              >
                <span className="min-w-0 flex-1">{opt.text}</span>
                {/* Never colour alone: the outcome is spelled out. */}
                {answered && isCorrect && (
                  <span className="ml-label shrink-0 text-ok">Correct</span>
                )}
                {answered && isChosen && !isCorrect && (
                  <span className="ml-label shrink-0 text-red">Your answer</span>
                )}
              </button>
            );
          })}
        </div>

        {answered && (
          <div
            className={`mt-4 max-w-[68ch] border-l-2 pl-4 text-[15px] leading-[1.65] text-graphite ${
              correct ? 'border-ok' : 'border-red'
            }`}
            role="status"
          >
            <span className={`ml-label mr-2 ${correct ? 'text-ok' : 'text-red'}`}>
              {correct ? 'Correct' : 'Not quite'}
            </span>
            {block.explanation}
          </div>
        )}
      </div>
    </section>
  );
}
