'use client';

import { useEffect, useRef } from 'react';
import { useMotionValue, useSpring } from 'framer-motion';

export function useMouseParallax() {
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);

  const x = useSpring(rawX, { stiffness: 40, damping: 25, mass: 0.5 });
  const y = useSpring(rawY, { stiffness: 40, damping: 25, mass: 0.5 });

  const containerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      // normalise to -0.5 … +0.5
      rawX.set(e.clientX / vw - 0.5);
      rawY.set(e.clientY / vh - 0.5);
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
  }, [rawX, rawY]);

  return { x, y, containerRef };
}
