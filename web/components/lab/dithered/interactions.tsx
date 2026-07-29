'use client';

import { useEffect, useRef, useState } from 'react';

/** True when the visitor has asked for reduced motion. */
function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(true); // assume reduced until proven otherwise
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);
  return reduced;
}

/**
 * Hero plate wrapper: the image drifts a few pixels toward the pointer and
 * parallaxes as the hero scrolls away.
 *
 * Both effects are transform-only and run off a single rAF, so they never touch
 * layout. The wrapper is inset by -3% (see .di-plate) so translating it can't
 * expose an edge. Pointer tracking is skipped on coarse pointers — on a phone
 * there is no cursor and the listener would only cost battery.
 */
export function PlateMotion({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) return;

    const fine = window.matchMedia('(pointer: fine)').matches;
    let px = 0;
    let py = 0;
    let scroll = 0;
    let frame = 0;

    const write = () => {
      frame = 0;
      el.style.transform = `translate3d(${px.toFixed(2)}px, ${(py + scroll).toFixed(2)}px, 0)`;
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(write);
    };

    const onPointer = (e: PointerEvent) => {
      const { innerWidth: w, innerHeight: h } = window;
      px = (e.clientX / w - 0.5) * -26;
      py = (e.clientY / h - 0.5) * -18;
      schedule();
    };

    const onScroll = () => {
      const rect = el.getBoundingClientRect();
      // Only parallax while the plate is on screen.
      if (rect.bottom < 0 || rect.top > window.innerHeight) return;
      scroll = (-rect.top / window.innerHeight) * 46;
      schedule();
    };

    if (fine) window.addEventListener('pointermove', onPointer, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    return () => {
      if (fine) window.removeEventListener('pointermove', onPointer);
      window.removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [reduced]);

  return (
    <div ref={ref} className="di-plate di-plate-drift">
      {children}
    </div>
  );
}

/**
 * Reveals its children once, when they first enter the viewport.
 *
 * Starts from an already-legible default in CSS if JS never runs — the
 * `data-shown` attribute is what withholds it, and it is set to true
 * immediately when IntersectionObserver is unavailable.
 */
export function Reveal({
  children,
  className = '',
  delay = 0,
  as: Tag = 'div',
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  as?: 'div' | 'section' | 'li' | 'article';
}) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // No observer support: show on the next tick rather than synchronously,
    // which would cascade a second render pass during the effect.
    if (!('IntersectionObserver' in window)) {
      const t = window.setTimeout(() => setShown(true), 0);
      return () => window.clearTimeout(t);
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: '0px 0px -12% 0px', threshold: 0.05 },
    );
    io.observe(el);

    /* Safety net: content must never be permanently invisible. If the observer
       never fires — background tab, occluded document, a jump straight to a
       deep scroll position — force the reveal so the page is readable anyway.
       Without this, a failed observer leaves the section blank. */
    const failsafe = window.setTimeout(() => {
      setShown(true);
      io.disconnect();
    }, 1400);

    return () => {
      io.disconnect();
      window.clearTimeout(failsafe);
    };
  }, []);

  return (
    <Tag
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ref={ref as any}
      className={`di-reveal ${className}`}
      data-shown={shown ? 'true' : 'false'}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}

/** Thin read-progress rule in the terminal bar. Reinforces descent through a document. */
export function ScrollProgress() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      el.style.setProperty('--di-p', max > 0 ? String(Math.min(window.scrollY / max, 1)) : '0');
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    update();
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className="h-px w-full bg-[var(--di-rule)]" aria-hidden="true">
      <div ref={ref} className="di-progress h-px bg-[var(--di-red)]" />
    </div>
  );
}
