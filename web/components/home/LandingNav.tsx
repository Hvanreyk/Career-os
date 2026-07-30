'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

/**
 * Navigation for the landing page's terminal bar.
 *
 * The landing page keeps its own chrome rather than the application Navbar, so
 * this supplies the same routes and auth actions in the page's mono idiom —
 * uppercase, letterspaced, no pills. Collapses to a full-width sheet below lg
 * so the bar never wraps into two rows on a phone.
 */

const LINKS = [
  { label: 'Career Compass', href: '/tools/career-compass' },
  { label: 'Resources', href: '/resources' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
];

const linkClass =
  'font-[family-name:var(--di-mono)] text-[12px] uppercase tracking-[0.1em] text-[var(--di-graphite)] transition-colors hover:text-[var(--di-bone)]';

export function LandingNav() {
  const [signedIn, setSignedIn] = useState(false);
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => setSignedIn(!!user));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => setSignedIn(!!session?.user));
    return () => subscription.unsubscribe();
  }, []);

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

  const items = signedIn ? [{ label: 'Dashboard', href: '/dashboard' }, ...LINKS] : LINKS;

  return (
    <>
      {/* Desktop */}
      <nav aria-label="Primary" className="hidden items-center gap-6 lg:flex">
        <ul className="flex items-center gap-5">
          {items.map((item) => (
            <li key={item.href}>
              <Link href={item.href} className={`di-link ${linkClass}`}>
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-2">
          {signedIn ? (
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="di-cta-2 di-link inline-flex min-h-[36px] items-center px-4 font-[family-name:var(--di-mono)] text-[12px] uppercase tracking-[0.08em]"
              >
                Sign out
              </button>
            </form>
          ) : (
            <Link
              href="/login"
              className="di-cta-2 di-link inline-flex min-h-[36px] items-center px-4 font-[family-name:var(--di-mono)] text-[12px] uppercase tracking-[0.08em]"
            >
              Log in
            </Link>
          )}
        </div>
      </nav>

      {/* Mobile toggle */}
      <button
        ref={toggleRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="landing-nav"
        className="di-link -mr-2 flex h-11 w-11 items-center justify-center text-[var(--di-bone)] lg:hidden"
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

      {/* Mobile sheet */}
      {open && (
        <div
          id="landing-nav"
          className="order-last w-full border-t border-[var(--di-rule)] lg:hidden"
        >
          <ul>
            {items.map((item) => (
              <li key={item.href} className="border-b border-[var(--di-rule)]">
                <Link
                  href={item.href}
                  className={`di-link flex min-h-[52px] items-center ${linkClass}`}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="py-4">
            {signedIn ? (
              <form action="/auth/signout" method="post">
                <button
                  type="submit"
                  className="di-cta-2 di-link inline-flex min-h-[44px] w-full items-center justify-center px-4 font-[family-name:var(--di-mono)] text-[13px] uppercase tracking-[0.08em]"
                >
                  Sign out
                </button>
              </form>
            ) : (
              <Link
                href="/login"
                className="di-cta-2 di-link inline-flex min-h-[44px] w-full items-center justify-center px-4 font-[family-name:var(--di-mono)] text-[13px] uppercase tracking-[0.08em]"
              >
                Log in
              </Link>
            )}
          </div>
        </div>
      )}
    </>
  );
}
