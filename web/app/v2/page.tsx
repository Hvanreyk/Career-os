import type { Metadata } from 'next';
import Link from 'next/link';
import { Archivo, JetBrains_Mono } from 'next/font/google';
import { HeroImage } from '@/components/lab/HeroImage';
import { ConceptSwitcher } from '@/components/lab/ConceptSwitcher';
import { Wordmark } from '@/components/lab/Wordmark';
import {
  brand,
  capabilities,
  close,
  compass,
  compassReadouts,
  method,
  primaryCta,
  problem,
  sampleProfile,
  secondaryCtas,
} from '@/lib/lab/content';
import './signal.css';

/**
 * V2 · SIGNAL LANDSCAPE — cinematic data texture × institutional intelligence.
 *
 * THESIS: arriving on the page should feel like being admitted to an
 * intelligence system. It refuses the lit-up SaaS dashboard and the card grid.
 * OWN-WORLD: near-black teal ground, deep petrol strata, one controlled amber,
 * warm off-white type, hairline rules, mono notation at the edges, information
 * held in narrow columns against very large empty space.
 * STORY: the terrain is built from other people's data; here is where you sit
 * on it; build your map.
 * FIRST VIEWPORT: full-bleed landscape, headline left over the darkest region,
 * amber action beneath, stage and route notation along the margins.
 */

const display = Archivo({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--sl-display' });
const mono = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--sl-mono' });

export const metadata: Metadata = {
  title: 'V2 · Signal Landscape',
  description: 'MappedLabs landing concept 2 — recruiting data rendered as terrain.',
};

function Note({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`font-[family-name:var(--sl-mono)] text-[12px] uppercase tracking-[0.16em] text-[var(--sl-stone)] ${className}`}>
      {children}
    </span>
  );
}

function PrimaryCta({ className = '' }: { className?: string }) {
  return (
    <Link
      href={primaryCta.href}
      className={`sl-cta inline-flex min-h-[54px] items-center gap-3 px-8 font-[family-name:var(--sl-display)] text-[17px] font-semibold tracking-[-0.01em] ${className}`}
    >
      {primaryCta.label}
      <span aria-hidden="true">→</span>
    </Link>
  );
}

export default function V2Page() {
  return (
    <div
      className={`sl min-h-screen pb-28 ${display.variable} ${mono.variable} font-[family-name:var(--sl-display)]`}
    >
      {/* ── Hero: full-bleed, headline over the darkest region ───── */}
      <section className="relative min-h-[92svh] overflow-hidden">
        <HeroImage
          slug="v2-signal-landscape"
          alt="A vast dark ridge and cloud mass built from thousands of faint amber data characters and connected node points, accumulating toward the lower right."
          className="absolute inset-0 h-full w-full object-cover"
          position="72% 85%"
        />
        {/* Hold the left column dark enough for AA type, then clear completely
            by the midpoint so the terrain actually reads on the right. */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(96deg, rgba(10,20,22,0.94) 0%, rgba(10,20,22,0.86) 24%, rgba(10,20,22,0.42) 46%, rgba(10,20,22,0.06) 68%, rgba(10,20,22,0) 100%)',
          }}
          aria-hidden="true"
        />
        <div className="sl-fade-down absolute inset-x-0 bottom-0 h-40" aria-hidden="true" />

        <div className="relative mx-auto flex min-h-[92svh] max-w-[1440px] flex-col px-6 sm:px-10">
          <header className="flex items-center justify-between gap-6 py-7">
            <Wordmark className="h-7 w-auto" ink="var(--sl-text)" accent="var(--sl-amber)" />
            <Note className="hidden sm:inline">Stage index · S0–S4</Note>
          </header>

          <div className="flex flex-1 items-center py-14">
            <div className="max-w-[36rem]">
              <div className="mb-7 flex items-center gap-3">
                <span className="h-px w-10 bg-[var(--sl-amber)]" aria-hidden="true" />
                <Note className="!text-[var(--sl-amber)]">{brand.eyebrow}</Note>
              </div>

              <h1 className="text-[clamp(2.6rem,6.6vw,4.75rem)] font-bold leading-[0.98] tracking-[-0.035em]">
                Map your route into investment banking.
              </h1>

              <p className="mt-7 max-w-[44ch] text-[19px] leading-[1.6] text-[var(--sl-stone)]">
                {brand.support}
              </p>

              <div className="mt-9 flex flex-wrap items-center gap-4">
                <PrimaryCta />
                <Link
                  href={secondaryCtas.how.href}
                  className="sl-cta-2 sl-link inline-flex min-h-[54px] items-center px-6 text-[15px] font-medium"
                >
                  {secondaryCtas.how.label}
                </Link>
              </div>
            </div>
          </div>

          {/* Edge notation */}
          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[var(--sl-rule)] py-5">
            <Note>Route AU·IB — 01</Note>
            <Note className="hidden md:inline">Window · penultimate summer opens July</Note>
            <Note>34°55′S 138°36′E</Note>
          </div>
        </div>
      </section>

      {/* ── The problem: narrow column, wide silence ─────────────── */}
      <section className="mx-auto max-w-[1440px] px-6 py-28 sm:px-10 lg:py-40">
        <div className="ml-auto max-w-[46rem]">
          <Note>01 · Observation</Note>
          <h2 className="mt-5 text-[clamp(2rem,4.4vw,3.25rem)] font-bold leading-[1.04] tracking-[-0.03em]">
            {problem.heading}
          </h2>
          <p className="mt-6 max-w-[52ch] text-[18px] leading-[1.7] text-[var(--sl-stone)]">
            {problem.body}
          </p>
        </div>

        {/* Six unknowns as a readout register, hairline-ruled. */}
        <dl className="mt-20 border-t border-[var(--sl-rule)]">
          {problem.unknowns.map((item, i) => (
            <div
              key={item.q}
              className="grid grid-cols-1 gap-x-10 gap-y-2 border-b border-[var(--sl-rule)] py-7 md:grid-cols-[7rem_minmax(0,1fr)_minmax(0,1.15fr)]"
            >
              <Note className="pt-1">{String(i + 1).padStart(2, '0')}</Note>
              <dt className="text-[20px] font-semibold tracking-[-0.015em]">{item.q}</dt>
              <dd className="max-w-[54ch] text-[16px] leading-[1.6] text-[var(--sl-stone)]">
                {item.a}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ── Career Compass ──────────────────────────────────────── */}
      <section id="how" className="border-y border-[var(--sl-rule)] bg-[var(--sl-petrol)]/40">
        <div className="mx-auto max-w-[1440px] px-6 py-28 sm:px-10">
          <div className="grid grid-cols-1 gap-14 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-24">
            <div className="lg:sticky lg:top-12 lg:self-start">
              <Note className="!text-[var(--sl-amber)]">{compass.name}</Note>
              <h2 className="mt-5 text-[clamp(2rem,4.4vw,3.25rem)] font-bold leading-[1.04] tracking-[-0.03em]">
                {compass.heading}
              </h2>
              <p className="mt-6 max-w-[46ch] text-[18px] leading-[1.7] text-[var(--sl-stone)]">
                {compass.body}
              </p>
              <Link
                href={compass.href}
                className="sl-link mt-8 inline-flex min-h-[44px] items-center border-b border-[var(--sl-amber)] pb-1 text-[15px] font-medium text-[var(--sl-amber)]"
              >
                {secondaryCtas.compass.label} →
              </Link>
            </div>

            {/* Eight readouts, precise rather than decorative. */}
            <dl>
              {compassReadouts.map((r, i) => (
                <div
                  key={r.key}
                  className="flex items-baseline justify-between gap-8 border-b border-[var(--sl-rule)] py-5 first:border-t"
                >
                  <div>
                    <dt className="text-[17px] font-semibold tracking-[-0.01em]">{r.label}</dt>
                    <dd className="mt-1 max-w-[46ch] text-[15px] leading-[1.55] text-[var(--sl-stone)]">
                      {r.note}
                    </dd>
                  </div>
                  <Note className="shrink-0">{String(i + 1).padStart(2, '0')}</Note>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* ── Method ──────────────────────────────────────────────── */}
      <section className="mx-auto max-w-[1440px] px-6 py-28 sm:px-10 lg:py-36">
        <Note>02 · Method</Note>
        <h2 className="mt-5 max-w-[22ch] text-[clamp(2rem,4.4vw,3.25rem)] font-bold leading-[1.04] tracking-[-0.03em]">
          {method.heading}
        </h2>
        <p className="mt-5 max-w-[54ch] text-[18px] leading-[1.7] text-[var(--sl-stone)]">
          {method.body}
        </p>

        <ol className="mt-16 space-y-px">
          {method.steps.map((step) => (
            <li
              key={step.n}
              className="grid grid-cols-1 gap-x-12 gap-y-3 border-t border-[var(--sl-rule)] py-8 md:grid-cols-[6rem_minmax(0,0.7fr)_minmax(0,1.3fr)]"
            >
              <span className="font-[family-name:var(--sl-mono)] text-[13px] text-[var(--sl-amber)]">
                {step.n}
              </span>
              <h3 className="text-[22px] font-semibold tracking-[-0.02em]">{step.title}</h3>
              <p className="max-w-[58ch] text-[16px] leading-[1.65] text-[var(--sl-stone)]">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </section>

      {/* ── Capabilities + mid-page conversion ──────────────────── */}
      <section className="mx-auto max-w-[1440px] px-6 pb-28 sm:px-10">
        <div className="grid grid-cols-1 gap-14 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)] lg:gap-24">
          <div>
            <Note>03 · Capabilities</Note>
            <ul className="mt-8">
              {capabilities.map((c) => (
                <li
                  key={c.id}
                  className="grid grid-cols-[4.5rem_minmax(0,1fr)] items-baseline gap-x-5 border-b border-[var(--sl-rule)] py-5 first:border-t"
                >
                  <span className="font-[family-name:var(--sl-mono)] text-[12px] text-[var(--sl-stone)]">
                    {c.id}
                  </span>
                  <div>
                    <h3 className="text-[17px] font-semibold tracking-[-0.01em]">{c.title}</h3>
                    <p className="mt-1 max-w-[58ch] text-[15px] leading-[1.55] text-[var(--sl-stone)]">
                      {c.body}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <aside className="self-start border border-[var(--sl-rule)] bg-[var(--sl-ground)] p-8 lg:sticky lg:top-12">
            <Note className="!text-[var(--sl-amber)]">Start</Note>
            <p className="mt-4 text-[26px] font-bold leading-[1.15] tracking-[-0.025em]">
              Positioning first. Everything else follows from it.
            </p>
            <p className="mt-4 text-[15px] leading-[1.6] text-[var(--sl-stone)]">
              Intake takes a few minutes and returns a ranked sequence rather than a score.
            </p>
            <PrimaryCta className="mt-7 w-full justify-center" />
          </aside>
        </div>
      </section>

      {/* ── Evidence: labelled sample readout ───────────────────── */}
      <section
        id="sample"
        className="border-y border-[var(--sl-rule)] bg-[var(--sl-petrol)]/40"
      >
        <div className="mx-auto max-w-[1440px] px-6 py-24 sm:px-10">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="bg-[var(--sl-amber)] px-2.5 py-1 font-[family-name:var(--sl-mono)] text-[11px] uppercase tracking-[0.14em] text-[#14100a]">
                {sampleProfile.label}
              </span>
              <Note>{sampleProfile.ref}</Note>
            </div>
            <Note>{sampleProfile.student}</Note>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-14 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-24">
            <div>
              <div className="flex items-baseline gap-4">
                <span className="text-[72px] font-bold leading-none tracking-[-0.045em] text-[var(--sl-amber)]">
                  {sampleProfile.stage.value}
                </span>
                <span className="text-[19px] text-[var(--sl-stone)]">{sampleProfile.stage.label}</span>
              </div>
              <dl className="mt-10 space-y-6">
                {sampleProfile.metrics.map((m) => (
                  <div key={m.label}>
                    <div className="flex items-baseline justify-between gap-4">
                      <dt className="text-[16px]">{m.label}</dt>
                      <dd className="font-[family-name:var(--sl-mono)] text-[13px] tabular-nums text-[var(--sl-stone)]">
                        {m.value}
                      </dd>
                    </div>
                    <div className="sl-meter mt-2.5" role="img" aria-label={`${m.value} of 100`}>
                      <i style={{ width: `${m.value}%` }} />
                    </div>
                  </div>
                ))}
              </dl>
            </div>

            <div>
              <Note>Ranked actions</Note>
              <ol className="mt-6">
                {sampleProfile.actions.map((a) => (
                  <li
                    key={a.rank}
                    className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-baseline gap-x-5 border-b border-[var(--sl-rule)] py-4 first:border-t"
                  >
                    <span className="font-[family-name:var(--sl-mono)] text-[13px] text-[var(--sl-amber)]">
                      {a.rank}
                    </span>
                    <span className="text-[16px] leading-snug">{a.action}</span>
                    <Note className="text-right">{a.window}</Note>
                  </li>
                ))}
              </ol>
              <p className="mt-6 max-w-[60ch] text-[14px] leading-[1.6] text-[var(--sl-stone)]">
                {sampleProfile.disclaimer}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Close ───────────────────────────────────────────────── */}
      <section className="mx-auto max-w-[1440px] px-6 py-32 sm:px-10">
        <div className="max-w-[44rem]">
          <h2 className="text-[clamp(2.5rem,6vw,4.5rem)] font-bold leading-[0.99] tracking-[-0.035em]">
            {close.heading}
          </h2>
          <p className="mt-7 max-w-[48ch] text-[19px] leading-[1.65] text-[var(--sl-stone)]">
            {close.body}
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <PrimaryCta />
            <Link
              href={secondaryCtas.sample.href}
              className="sl-cta-2 sl-link inline-flex min-h-[54px] items-center px-6 text-[15px] font-medium"
            >
              {secondaryCtas.sample.label}
            </Link>
          </div>
        </div>

        <footer className="mt-24 flex flex-wrap items-center justify-between gap-4 border-t border-[var(--sl-rule)] pt-7">
          <Wordmark className="h-6 w-auto" ink="var(--sl-text)" accent="var(--sl-amber)" />
          <Note>{brand.name} · Concept V2 · Signal Landscape</Note>
        </footer>
      </section>

      <ConceptSwitcher current="v2" />
    </div>
  );
}
