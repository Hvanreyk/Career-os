'use client';

import { usePathname } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { CursorGlow } from '@/components/background/CursorGlow';
import { conceptIds } from '@/lib/lab/concepts';

/**
 * Design-lab routes (/design-lab, /v1…/v5) are standalone: each concept commits
 * to its own visual world, so the site's Navbar/Footer/CursorGlow would fight it.
 *
 * usePathname resolves during SSR too (there are no rewrites in next.config), so
 * a direct URL hit renders the correct shell in the initial HTML — no flash of
 * chrome, and no hydration mismatch.
 */
const LAB_ROUTES = ['/design-lab', ...conceptIds.map((id) => `/${id}`)];

function isLabRoute(pathname: string): boolean {
  return LAB_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  if (isLabRoute(pathname)) {
    return <main className="flex-1">{children}</main>;
  }

  return (
    <>
      <CursorGlow />
      <Navbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
