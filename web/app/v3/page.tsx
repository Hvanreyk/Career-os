import type { Metadata } from 'next';
import { Archivo, JetBrains_Mono } from 'next/font/google';
import { DitheredHome } from '@/components/lab/dithered/DitheredHome';
import { getConcept } from '@/lib/lab/concepts';

/**
 * v3 · Dithered Intelligence with the "Atrium" hero plate.
 *
 * The design is shared across /v1–/v5 (see DitheredHome); only the plate
 * changes, so this route exists purely to compare hero images.
 */

const display = Archivo({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--di-display',
  display: 'swap',
});
const mono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--di-mono',
  display: 'swap',
});

const concept = getConcept('v3')!;

export const metadata: Metadata = {
  title: 'V3 · Atrium plate',
  description:
    'MappedLabs — Dithered Intelligence with the Atrium hero plate. A small figure crossing an enormous brutalist atrium.',
};

export default function Page() {
  return (
    <div className={`${display.variable} ${mono.variable} font-[family-name:var(--di-display)]`}>
      <DitheredHome concept={concept} />
    </div>
  );
}
