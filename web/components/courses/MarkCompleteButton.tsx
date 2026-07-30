'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';

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
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <Button onClick={markComplete} loading={saving} size="lg">
        {alreadyCompleted ? nextLabel : `Mark complete & ${nextLabel.toLowerCase()}`}{' '}
        <span aria-hidden="true">▸</span>
      </Button>
      {error && (
        <p className="ml-label text-red" role="alert">
          ▲ {error}
        </p>
      )}
    </div>
  );
}
