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
 */
export function NetworkNav({ base }: { base: string }) {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap gap-1.5 mb-8" aria-label="Networking workspace">
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
            className={`text-sm px-3.5 py-1.5 rounded-full border transition-colors ${
              active
                ? 'border-gold-400/50 bg-gold-400/10 text-gold-400'
                : 'border-white/10 text-slate-400 hover:text-white hover:border-white/25'
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
