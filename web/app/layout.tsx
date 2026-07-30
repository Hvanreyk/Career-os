import type { Metadata } from 'next';
import { Archivo, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { SiteChrome } from '@/components/layout/SiteChrome';

/**
 * Archivo carries headings and body; JetBrains Mono carries labels, IDs and
 * figures. Both are loaded once here so the landing page and the application
 * share exactly one typographic system.
 *
 * --di-display / --di-mono are the names the landing page already compiles
 * against. They are aliased rather than renamed so that page is untouched.
 */
const archivo = Archivo({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-archivo',
  display: 'swap',
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-jetbrains',
  display: 'swap',
});

const DESCRIPTION =
  'MappedLabs benchmarks your profile, identifies the gaps and turns recruiting timelines into a ranked plan of what to do next.';

export const metadata: Metadata = {
  metadataBase: new URL('https://career-oz.netlify.app'),
  title: { default: 'MappedLabs — Career intelligence for high finance', template: '%s | MappedLabs' },
  description: DESCRIPTION,
  applicationName: 'MappedLabs',
  keywords: ['investment banking', 'finance careers', 'IB recruiting', 'career intelligence', 'Australia'],
  openGraph: {
    type: 'website',
    siteName: 'MappedLabs',
    title: 'MappedLabs — Career intelligence for high finance',
    description: DESCRIPTION,
    locale: 'en_AU',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'MappedLabs — Career intelligence for high finance',
    description: DESCRIPTION,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${jetbrains.variable} h-full`}
      style={
        {
          '--di-display': `var(--font-archivo)`,
          '--di-mono': `var(--font-jetbrains)`,
        } as React.CSSProperties
      }
    >
      <body className="min-h-full flex flex-col bg-ink text-bone antialiased">
        <a
          href="#main"
          className="ml-btn ml-btn-primary sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:px-4 focus:py-2 focus:text-[13px]"
        >
          Skip to content
        </a>
        <SiteChrome>{children}</SiteChrome>
      </body>
    </html>
  );
}
