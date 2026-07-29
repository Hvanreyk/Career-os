'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { concepts } from '@/lib/lab/concepts';

/**
 * Neutral lab chrome that sits on top of every concept.
 *
 * Deliberately styled in none of the five worlds — it reads as the frame around
 * the work, not part of it. Collapses to a single dot so a concept can be viewed
 * (or screenshotted) clean. ←/→ move between concepts.
 */
export function ConceptSwitcher({ current }: { current: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(true);

  const index = concepts.findIndex((c) => c.id === current);
  const active = concepts[index];

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (
        event.metaKey ||
        event.ctrlKey ||
        event.altKey ||
        (target &&
          (target.isContentEditable ||
            ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)))
      ) {
        return;
      }

      if (event.key === 'ArrowRight' && index < concepts.length - 1) {
        router.push(`/${concepts[index + 1].id}`);
      } else if (event.key === 'ArrowLeft' && index > 0) {
        router.push(`/${concepts[index - 1].id}`);
      } else if (event.key.toLowerCase() === 'h') {
        setOpen((o) => !o);
      }
    }

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, router]);

  if (!active) return null;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Show concept switcher"
        className="fixed bottom-5 left-1/2 z-[999] -translate-x-1/2 h-8 w-8 rounded-full bg-[#17171a] text-white/70 text-[11px] font-medium shadow-[0_4px_16px_rgba(0,0,0,0.45)] ring-1 ring-white/15 transition hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        {index + 1}
      </button>
    );
  }

  return (
    <nav
      aria-label="Homepage concepts"
      className="fixed bottom-5 left-1/2 z-[999] -translate-x-1/2 flex items-center gap-1 rounded-full bg-[#17171a]/95 p-1 pl-1.5 shadow-[0_8px_28px_rgba(0,0,0,0.5)] ring-1 ring-white/15 backdrop-blur-sm"
      style={{ fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif' }}
    >
      <Link
        href="/design-lab"
        className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] font-semibold tracking-wide text-white/60 transition hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        <svg viewBox="0 0 16 16" className="h-3 w-3" aria-hidden="true">
          <path
            d="M9.5 3.5 5 8l4.5 4.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Lab
      </Link>

      <span className="h-4 w-px bg-white/15" aria-hidden="true" />

      {concepts.map((concept, i) => {
        const isActive = concept.id === current;
        return (
          <Link
            key={concept.id}
            href={`/${concept.id}`}
            aria-current={isActive ? 'page' : undefined}
            title={`${concept.id.toUpperCase()} — ${concept.name}`}
            className={`rounded-full px-2.5 py-1.5 text-[11px] font-semibold tabular-nums transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
              isActive
                ? 'bg-white text-[#17171a]'
                : 'text-white/55 hover:bg-white/10 hover:text-white'
            }`}
          >
            {i + 1}
          </Link>
        );
      })}

      <span className="h-4 w-px bg-white/15" aria-hidden="true" />

      <span className="px-2 py-1.5 text-[11px] font-medium text-white/70">{active.name}</span>

      <button
        type="button"
        onClick={() => setOpen(false)}
        aria-label="Hide concept switcher"
        className="rounded-full px-2 py-1.5 text-white/40 transition hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        <svg viewBox="0 0 16 16" className="h-3 w-3" aria-hidden="true">
          <path
            d="M3.5 3.5l9 9m0-9l-9 9"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </nav>
  );
}
