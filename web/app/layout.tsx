import type { Metadata } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import './globals.css';
import { SiteChrome } from '@/components/layout/SiteChrome';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
});

const playfair = Playfair_Display({
  variable: '--font-playfair',
  subsets: ['latin'],
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
    <html lang="en" className={`${inter.variable} ${playfair.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-navy-950 text-slate-200 antialiased">
        <SiteChrome>{children}</SiteChrome>
      </body>
    </html>
  );
}
