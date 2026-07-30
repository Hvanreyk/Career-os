'use client';

import { usePathname } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';

/**
 * The landing page and the onboarding flow carry their own chrome — the landing
 * page has its terminal bar and marquee footer, and onboarding is a focused
 * task that a full nav would only offer exits from. Everything else gets the
 * standard application shell.
 *
 * usePathname resolves during SSR (there are no rewrites in next.config), so a
 * direct URL hit renders the right shell in the initial HTML: no flash of
 * chrome, no hydration mismatch.
 */
const BARE_ROUTES = ['/', '/onboard', '/report/loading'];

function isBare(pathname: string): boolean {
  return BARE_ROUTES.some((route) =>
    route === '/' ? pathname === '/' : pathname === route || pathname.startsWith(`${route}/`),
  );
}

export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (isBare(pathname)) {
    return (
      <main id="main" className="flex-1">
        {children}
      </main>
    );
  }

  return (
    <>
      <Navbar />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer />
    </>
  );
}
