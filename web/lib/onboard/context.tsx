'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { type OnboardData, EMPTY_ONBOARD } from './types';

const SESSION_KEY = 'tos_profile';

interface OnboardCtx {
  data: OnboardData;
  update: (partial: Partial<OnboardData>) => void;
  clear: () => void;
}

const Ctx = createContext<OnboardCtx | null>(null);

export function OnboardProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<OnboardData>(EMPTY_ONBOARD);

  // Hydrate from localStorage on mount.
  // localStorage (not sessionStorage) persists across tabs, which is required
  // because the magic-link email opens in a new tab and sessionStorage is tab-scoped.
  useEffect(() => {
    try {
      const stored = localStorage.getItem(SESSION_KEY);
      if (stored) setData(JSON.parse(stored) as OnboardData);
    } catch {}
  }, []);

  const update = useCallback((partial: Partial<OnboardData>) => {
    setData((prev) => {
      const next = { ...prev, ...partial };
      try {
        localStorage.setItem(SESSION_KEY, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setData(EMPTY_ONBOARD);
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch {}
  }, []);

  return <Ctx.Provider value={{ data, update, clear }}>{children}</Ctx.Provider>;
}

export function useOnboard() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useOnboard must be used inside OnboardProvider');
  return ctx;
}
