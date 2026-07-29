import type { Metadata } from 'next';
import Link from 'next/link';
import { Archivo, JetBrains_Mono } from 'next/font/google';
import { Wordmark } from '@/components/lab/Wordmark';
import { concepts } from '@/lib/lab/concepts';

/**
 * Internal comparison page.
 *
 * The direction is settled (Dithered Intelligence). This now compares the five
 * hero plates that direction could ship with — same page, same copy, one
 * variable. Deliberately plain: a workbench, not a sixth concept.
 */

const sans = Archivo({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'], variable: '--dl-sans' });
const mono = JetBrains_Mono({ subsets: ['latin'], weight: ['400'], variable: '--dl-mono' });

export const metadata: Metadata = {
  title: 'Design Lab',
  description: 'Internal comparison of the five MappedLabs hero plates.',
  robots: { index: false, follow: false },
};

export default function DesignLabPage() {
  return (
    <div
      className={`min-h-screen bg-[#0a0a0b] pb-24 text-[#edeae3] ${sans.variable} ${mono.variable} font-[family-name:var(--dl-sans)]`}
    >
      <header className="border-b border-white/10 px-6 py-6 sm:px-10">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-4">
          <Wordmark className="h-7 w-auto" ink="#edeae3" accent="#f0563a" />
          <span className="font-[family-name:var(--dl-mono)] text-[12px] uppercase tracking-[0.16em] text-white/45">
            Design Lab · Internal
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-[1280px] px-6 sm:px-10">
        <section className="border-b border-white/10 py-14">
          <span className="font-[family-name:var(--dl-mono)] text-[12px] uppercase tracking-[0.16em] text-[#f0563a]">
            Direction selected · Dithered Intelligence
          </span>
          <h1 className="mt-5 max-w-[22ch] text-[clamp(2rem,4.6vw,3.25rem)] font-extrabold uppercase leading-[1.0] tracking-[-0.035em]">
            Five hero plates, one page.
          </h1>
          <p className="mt-6 max-w-[70ch] text-[17px] leading-[1.65] text-white/65">
            The design, copy and{' '}
            <span className="text-white">Build My Career Map</span> conversion action are identical
            across all five routes. The only variable is the hero plate — so this is purely an image
            decision.
          </p>
          <p className="mt-4 max-w-[70ch] text-[15px] leading-[1.6] text-white/45">
            The production homepage at <code className="font-[family-name:var(--dl-mono)]">/</code>{' '}
            is untouched. The four superseded design directions remain recoverable from commit{' '}
            <code className="font-[family-name:var(--dl-mono)]">a2b02c7</code>.
          </p>
        </section>

        <ul className="divide-y divide-white/10">
          {concepts.map((c, i) => (
            <li key={c.id}>
              <article className="grid grid-cols-1 gap-8 py-10 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-14">
                <Link
                  href={`/${c.id}`}
                  className="group block focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#f0563a]"
                >
                  <div className="relative overflow-hidden border border-white/12 transition-transform duration-200 group-hover:-translate-y-1">
                    <picture>
                      <source srcSet={`/hero/${c.slug}-desktop.avif`} type="image/avif" />
                      <img
                        src={`/hero/${c.slug}-desktop.webp`}
                        alt={c.alt}
                        width={2400}
                        height={1600}
                        loading={i < 2 ? 'eager' : 'lazy'}
                        decoding="async"
                        className="block aspect-[3/2] w-full object-cover"
                      />
                    </picture>
                    <span className="absolute bottom-2 right-2 bg-[#0a0a0b]/80 px-2 py-1 font-[family-name:var(--dl-mono)] text-[11px] uppercase tracking-[0.14em] text-white/70">
                      {c.caption}
                    </span>
                  </div>
                </Link>

                <div>
                  <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                    <span className="font-[family-name:var(--dl-mono)] text-[12px] uppercase tracking-[0.16em] text-[#f0563a]">
                      {c.id}
                    </span>
                    <h2 className="text-[26px] font-extrabold uppercase tracking-[-0.03em]">
                      {c.name}
                    </h2>
                  </div>

                  <p className="mt-4 max-w-[68ch] text-[17px] leading-[1.65] text-white/80">
                    {c.premise}
                  </p>

                  <dl className="mt-6 grid grid-cols-1 gap-x-10 gap-y-4 sm:grid-cols-2">
                    <div>
                      <dt className="font-[family-name:var(--dl-mono)] text-[11px] uppercase tracking-[0.14em] text-white/40">
                        Strength
                      </dt>
                      <dd className="mt-1 max-w-[46ch] text-[15px] leading-[1.55] text-white/70">
                        {c.strength}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-[family-name:var(--dl-mono)] text-[11px] uppercase tracking-[0.14em] text-white/40">
                        Risk
                      </dt>
                      <dd className="mt-1 max-w-[46ch] text-[15px] leading-[1.55] text-white/70">
                        {c.risk}
                      </dd>
                    </div>
                  </dl>

                  <Link
                    href={`/${c.id}`}
                    className="mt-7 inline-flex min-h-[46px] items-center gap-2 bg-[#f0563a] px-6 font-[family-name:var(--dl-sans)] text-[15px] font-bold uppercase tracking-[0.04em] text-[#0a0a0b] transition-colors duration-200 hover:bg-[#ff7156] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-white"
                  >
                    Open {c.id} <span aria-hidden="true">▸</span>
                  </Link>
                </div>
              </article>
            </li>
          ))}
        </ul>

        <section className="border-t border-white/10 py-12">
          <h2 className="font-[family-name:var(--dl-mono)] text-[12px] uppercase tracking-[0.16em] text-white/40">
            Shared across all five
          </h2>
          <ul className="mt-5 grid grid-cols-1 gap-x-12 gap-y-3 text-[15px] leading-[1.6] text-white/70 sm:grid-cols-2">
            <li>Full-height hero that parallaxes on pointer and scroll, with a slow scanline sweep.</li>
            <li>Three ground values alternating band by band, so the scroll reads as descent rather than one flat sheet.</li>
            <li>The sample readout matches the real Career Compass output — per-tier index, signed drivers, ranked moves. No stage model.</li>
            <li>Continuous MappedLabs marquee in the footer, running left to right and pausing on hover.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
