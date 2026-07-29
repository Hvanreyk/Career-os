import type { Metadata } from 'next';
import Link from 'next/link';
import { Archivo, JetBrains_Mono } from 'next/font/google';
import { Wordmark } from '@/components/lab/Wordmark';
import { concepts } from '@/lib/lab/concepts';

/**
 * Internal comparison page for the five landing-page directions.
 *
 * Deliberately plain: it is a workbench, not a sixth concept. Neutral chrome so
 * nothing here competes with the directions it is presenting.
 */

const sans = Archivo({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--dl-sans' });
const mono = JetBrains_Mono({ subsets: ['latin'], weight: ['400'], variable: '--dl-mono' });

export const metadata: Metadata = {
  title: 'Design Lab',
  description: 'Internal comparison of the five MappedLabs landing-page directions.',
  robots: { index: false, follow: false },
};

export default function DesignLabPage() {
  return (
    <div
      className={`min-h-screen bg-[#0F0F11] pb-24 text-[#E8E6E1] ${sans.variable} ${mono.variable} font-[family-name:var(--dl-sans)]`}
    >
      <header className="border-b border-white/10 px-6 py-6 sm:px-10">
        <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-4">
          <Wordmark className="h-7 w-auto" ink="#E8E6E1" accent="#C8452A" />
          <span className="font-[family-name:var(--dl-mono)] text-[12px] uppercase tracking-[0.16em] text-white/45">
            Design Lab · Internal
          </span>
        </div>
      </header>

      <div className="mx-auto max-w-[1280px] px-6 sm:px-10">
        <section className="border-b border-white/10 py-14">
          <h1 className="max-w-[20ch] text-[clamp(2rem,4.6vw,3.25rem)] font-bold leading-[1.03] tracking-[-0.03em]">
            Five directions for the MappedLabs landing page.
          </h1>
          <p className="mt-6 max-w-[70ch] text-[17px] leading-[1.65] text-white/65">
            Each concept carries the same product strategy, the same copy spine and the same{' '}
            <span className="text-white">Build My Career Map</span> conversion action. They differ
            only in visual system, composition and tone — so the choice here is a design decision,
            not a content one.
          </p>
          <p className="mt-4 max-w-[70ch] text-[15px] leading-[1.6] text-white/45">
            The production homepage at <code className="font-[family-name:var(--dl-mono)]">/</code>{' '}
            is untouched. Nothing here is promoted until a direction is selected.
          </p>
        </section>

        <ul className="divide-y divide-white/10">
          {concepts.map((c, i) => (
            <li key={c.id}>
              <article className="grid grid-cols-1 gap-8 py-10 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] lg:gap-14">
                {/* Palette + type specimen */}
                <div>
                  <Link
                    href={`/${c.id}`}
                    className="group block rounded-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C8452A]"
                  >
                    <div
                      className="flex aspect-[4/3] flex-col justify-between p-5 transition-transform duration-200 group-hover:-translate-y-1"
                      style={{ background: c.ground, color: c.ink }}
                    >
                      <span className="font-[family-name:var(--dl-mono)] text-[11px] uppercase tracking-[0.16em] opacity-60">
                        {c.id}
                      </span>
                      <span className="text-[clamp(1.5rem,2.6vw,2rem)] font-bold leading-[1.05] tracking-[-0.03em]">
                        {c.name}
                      </span>
                      <span className="flex gap-1.5" aria-hidden="true">
                        {c.swatches.map((s) => (
                          <span
                            key={s}
                            className="h-4 w-4 ring-1 ring-black/15"
                            style={{ background: s }}
                          />
                        ))}
                      </span>
                    </div>
                  </Link>
                </div>

                {/* Written premise */}
                <div>
                  <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                    <span className="font-[family-name:var(--dl-mono)] text-[12px] uppercase tracking-[0.16em] text-white/40">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <h2 className="text-[26px] font-bold tracking-[-0.02em]">{c.name}</h2>
                    <span className="text-[15px] text-white/50">{c.aesthetic}</span>
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
                    <div className="sm:col-span-2">
                      <dt className="font-[family-name:var(--dl-mono)] text-[11px] uppercase tracking-[0.14em] text-white/40">
                        Typefaces
                      </dt>
                      <dd className="mt-1 text-[15px] text-white/70">{c.type}</dd>
                    </div>
                  </dl>

                  <Link
                    href={`/${c.id}`}
                    className="mt-7 inline-flex min-h-[46px] items-center gap-2 bg-[#C8452A] px-6 text-[15px] font-semibold text-white transition-colors duration-200 hover:bg-[#ab371f] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-white"
                  >
                    Open {c.id} <span aria-hidden="true">→</span>
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
            <li>Primary CTA “Build My Career Map” in the hero, mid-page and final section, routed to <code className="font-[family-name:var(--dl-mono)] text-white/85">/onboard</code>.</li>
            <li>The same seven-part narrative: hero, problem, Career Compass, method, capabilities, evidence, close.</li>
            <li>One original generated hero per direction, served as AVIF with a WebP fallback and a separate mobile crop.</li>
            <li>No testimonials, usage figures, success rates or partner claims. The one sample profile is labelled illustrative.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
