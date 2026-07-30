'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { path: '', label: 'Today' },
  { path: '/contacts', label: 'Contacts' },
  { path: '/pipeline', label: 'Pipeline' },
  { path: '/target-map', label: 'Target map' },
  { path: '/messages', label: 'Message lab' },
  { path: '/connections', label: 'Connections' },
];

/**
 * Networking workspace navigation tabs.
 *
 * The accent underline is the workspace's wayfinding signal, so it is the
 * one place in the chrome that spends red.
 */
export function NetworkNav({ base }: { base: string }) {
  const pathname = usePathname();
  return (
    <nav className="mb-8 flex flex-wrap border-b border-rule" aria-label="Networking workspace">
      {TABS.map((tab) => {
        const href = `${base}${tab.path}`;
        const active = tab.path === ''
          ? pathname === base || pathname === `${base}/`
          : pathname.startsWith(href);
        return (
          <Link
            key={tab.label}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={`ml-num -mb-px inline-flex min-h-[44px] items-center border-b-2 px-3.5 text-[12px] uppercase tracking-[0.12em] transition-colors sm:px-4 ${
              active
                ? 'border-red text-bone'
                : 'border-transparent text-graphite hover:border-rule-bright hover:text-bone'
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
