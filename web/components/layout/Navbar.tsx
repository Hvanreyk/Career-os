'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Wordmark } from '@/components/ui/Wordmark';
import { createClient } from '@/lib/supabase/client';

/**
 * Application navigation.
 *
 * A hard-ruled bar, not a floating pill. The active route is marked with a
 * single red-orange underline — one indicator, one accent colour.
 *
 * Auth state decides the right-hand pair: signed out gets Log in + Build My
 * Career Map, signed in gets Dashboard + Sign out. It is tracked live via
 * onAuthStateChange so the bar updates without a reload.
 */

const NAV = [
  { label: 'Career Compass', href: '/tools/career-compass' },
  { label: 'Resources', href: '/resources' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const pathname = usePathname();
  const toggleRef = useRef<HTMLButtonElement>(null);

  // Track auth so the bar can switch between "Log in" and "Dashboard".
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => setSignedIn(!!user));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(!!session?.user);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Close the sheet whenever the route changes — including back/forward, which
  // an onClick on the links would miss. Adjusted during render rather than in an
  // effect so it never renders a frame with a stale open menu.
  const [openedAt, setOpenedAt] = useState(pathname);
  if (openedAt !== pathname) {
    setOpenedAt(pathname);
    if (open) setOpen(false);
  }

  // Escape closes the sheet and returns focus to the control that opened it.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const items = signedIn ? [{ label: 'Dashboard', href: '/dashboard' }, ...NAV] : NAV;

  return (
    <header className="sticky top-0 z-50 border-b border-rule bg-ink">
      <nav
        aria-label="Primary"
        className="mx-auto flex h-14 max-w-[90rem] items-center gap-4 px-5 sm:px-8"
      >
        <Link href="/" className="flex h-11 shrink-0 items-center pr-2" aria-label="MappedLabs — home">
          <Wordmark className="h-5 w-auto" ink="#edeae3" accent="#f0563a" />
        </Link>

        {/* Desktop */}
        <ul className="ml-2 hidden flex-1 items-center gap-0.5 lg:flex">
          {items.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={`relative flex h-14 items-center px-3 font-[family-name:var(--font-jetbrains)] text-[12px] uppercase tracking-[0.1em] transition-colors ${
                    active ? 'text-bone' : 'text-graphite hover:text-bone'
                  }`}
                >
                  {item.label}
                  {active && (
                    <span className="absolute inset-x-2 bottom-0 h-0.5 bg-red" aria-hidden="true" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Right-hand pair. Secondary styling on purpose: the nav is persistent
            chrome, so page content keeps the single primary action per view. */}
        <div className="ml-auto hidden items-center gap-2 lg:flex">
          {signedIn ? (
            <form action="/auth/signout" method="post">
              <button type="submit" className="ml-btn ml-btn-secondary min-h-[36px] px-4 text-[12px]">
                Sign out
              </button>
            </form>
          ) : (
            <>
              <Link
                href="/login"
                className="ml-btn ml-btn-secondary min-h-[36px] px-4 text-[12px]"
              >
                Log in
              </Link>
              <Link
                href="/onboard/goal"
                className="ml-btn ml-btn-primary on-accent min-h-[36px] px-4 text-[12px]"
              >
                Build My Career Map
              </Link>
            </>
          )}
        </div>

        {/* Mobile toggle */}
        <button
          ref={toggleRef}
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="mobile-nav"
          className="ml-auto flex h-11 w-11 items-center justify-center text-bone lg:hidden"
        >
          <span className="sr-only">{open ? 'Close menu' : 'Open menu'}</span>
          <svg viewBox="0 0 20 20" className="h-5 w-5" aria-hidden="true">
            {open ? (
              <path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="1.6" fill="none" />
            ) : (
              <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.6" fill="none" />
            )}
          </svg>
        </button>
      </nav>

      {/* Mobile sheet: a full-width register, not a floating card. */}
      {open && (
        <div id="mobile-nav" className="border-t border-rule bg-surface lg:hidden">
          <ul className="mx-auto max-w-[90rem] px-5 sm:px-8">
            {items.map((item) => {
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href} className="ml-row">
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={`flex min-h-[52px] items-center gap-3 font-[family-name:var(--font-jetbrains)] text-[13px] uppercase tracking-[0.1em] ${
                      active ? 'text-bone' : 'text-graphite'
                    }`}
                  >
                    <span
                      className={`h-4 w-0.5 shrink-0 ${active ? 'bg-red' : 'bg-transparent'}`}
                      aria-hidden="true"
                    />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="mx-auto flex max-w-[90rem] flex-col gap-2 px-5 py-4 sm:px-8">
            {signedIn ? (
              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  className="ml-btn ml-btn-secondary w-full min-h-[44px] text-[13px]"
                >
                  Sign out
                </button>
              </form>
            ) : (
              <>
                <Link href="/login" className="ml-btn ml-btn-secondary w-full min-h-[44px] text-[13px]">
                  Log in
                </Link>
                <Link
                  href="/onboard/goal"
                  className="ml-btn ml-btn-primary on-accent w-full min-h-[44px] text-[13px]"
                >
                  Build My Career Map
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
