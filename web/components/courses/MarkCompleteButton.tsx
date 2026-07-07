'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Check, Loader2 } from 'lucide-react';

interface Props {
  lessonId: string;
  alreadyCompleted: boolean;
  /** Where "continue" goes: next lesson, module quiz, or course overview. */
  nextHref: string;
  nextLabel: string;
}

export function MarkCompleteButton({ lessonId, alreadyCompleted, nextHref, nextLabel }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function markComplete() {
    if (alreadyCompleted) {
      router.push(nextHref);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/courses/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lessonId }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? 'Could not save progress');
      }
      router.push(nextHref);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save progress');
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={markComplete}
        disabled={saving}
        className="px-5 py-3 bg-gold-400 text-navy-950 font-semibold text-sm rounded-xl hover:bg-gold-300 transition-all shadow-[0_0_20px_rgba(212,175,55,0.25)] flex items-center gap-2 disabled:opacity-60"
      >
        {saving ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : alreadyCompleted ? (
          <Check className="w-4 h-4" />
        ) : null}
        {alreadyCompleted ? nextLabel : `Mark complete & ${nextLabel.toLowerCase()}`}
        <ArrowRight className="w-4 h-4" />
      </button>
      {error && <p className="text-red-400 text-xs">{error}</p>}
    </div>
  );
}
