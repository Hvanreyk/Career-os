'use client';

import { useState } from 'react';
import { Check, CircleHelp, X } from 'lucide-react';

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
    <div className="glass rounded-xl border border-white/10 p-5">
      <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-gold-400">
        <CircleHelp className="w-4 h-4 shrink-0" />
        Quick check
      </div>
      <p className="text-white text-sm font-medium mb-4">{block.question}</p>
      <div className="space-y-2">
        {block.options.map((opt) => {
          const isChosen = selected === opt.id;
          const isCorrect = opt.id === block.correctId;
          let ring = 'border-white/10 hover:border-gold-400/40';
          if (answered) {
            if (isCorrect) ring = 'border-emerald-400/60 bg-emerald-400/5';
            else if (isChosen) ring = 'border-red-400/60 bg-red-400/5';
            else ring = 'border-white/10 opacity-60';
          }
          return (
            <button
              key={opt.id}
              type="button"
              disabled={answered}
              onClick={() => setSelected(opt.id)}
              className={`w-full text-left px-4 py-3 rounded-lg border text-sm text-slate-300 transition-colors flex items-start gap-3 ${ring} ${
                answered ? 'cursor-default' : 'cursor-pointer'
              }`}
            >
              {answered && isCorrect && (
                <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              )}
              {answered && isChosen && !isCorrect && (
                <X className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              )}
              <span>{opt.text}</span>
            </button>
          );
        })}
      </div>
      {answered && (
        <div
          className={`mt-4 text-sm rounded-lg p-4 ${
            correct ? 'bg-emerald-400/10 text-emerald-200' : 'bg-red-400/10 text-red-200'
          }`}
        >
          <span className="font-semibold">{correct ? 'Correct. ' : 'Not quite. '}</span>
          {block.explanation}
        </div>
      )}
    </div>
  );
}
