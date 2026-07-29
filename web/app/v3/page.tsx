import type { Metadata } from 'next';
import Link from 'next/link';
import { Archivo, Newsreader } from 'next/font/google';
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
import './quiet.css';

/**
 * V3 · QUIET INSTITUTION — editorial minimalism × architectural confidence.
 *
 * THESIS: credibility is demonstrated by what the page declines to do. It
 * refuses borders, cards, chrome and the oversized shouting hero.
 * OWN-WORLD: fog-white ground, charcoal text, a single cobalt, hairlines used
 * once per section at most, a monumental monochrome plate, and type set small
 * against very large silence.
 * STORY: this is a serious methodology; read a little; begin.
 * FIRST VIEWPORT: full-bleed aerial fading into fog, small centred headline in
 * the quiet upper band, one filled action beneath.
 */

const serif = Newsreader({ subsets: ['latin'], weight: ['300', '400', '500'], style: ['normal', 'italic'], variable: '--qi-serif' });
const sans = Archivo({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--qi-sans' });

export const metadata: Metadata = {
  title: 'V3 · Quiet Institution',
  description: 'MappedLabs landing concept 3 — editorial restraint and architectural scale.',
};

function Label({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`font-[family-name:var(--qi-sans)] text-[12px] uppercase tracking-[0.2em] text-[var(--qi-mute)] ${className}`}>
      {children}
    </span>
  );
}

function PrimaryCta({ className = '' }: { className?: string }) {
  return (
    <Link
      href={primaryCta.href}
      className={`qi-cta inline-flex min-h-[52px] items-center px-8 font-[family-name:var(--qi-sans)] text-[16px] font-medium tracking-[0.01em] ${className}`}
    >
      {primaryCta.label}
    </Link>
  );
}

export default function V3Page() {
  return (
    <div
      className={`qi min-h-screen pb-32 ${serif.variable} ${sans.variable} font-[family-name:var(--qi-serif)]`}
    >
      {/* ── Hero: quiet above, weight below ─────────────────────── */}
      <section className="qi-figure relative">
        <div className="absolute inset-0">
          <HeroImage
            slug="v3-quiet-institution"
            alt="High-altitude monochrome aerial view of intersecting roads, rail alignments and large flat roofs, the upper half dissolving into fog."
            className="h-full w-full object-cover"
            position="center 88%"
          />
        </div>
        <div className="qi-hero-veil absolute inset-0" aria-hidden="true" />

        <div className="relative mx-auto flex min-h-[94svh] max-w-[1200px] flex-col px-6 sm:px-10">
          <header className="flex items-center justify-between gap-6 py-8">
            <Wordmark className="h-6 w-auto" ink="var(--qi-ink)" accent="var(--qi-cobalt)" />
            <Label className="hidden sm:inline">Est. Australia</Label>
          </header>

          {/* Type held small, high in the frame, centred. */}
          <div className="mx-auto max-w-[42rem] pt-[2vh] text-center sm:pt-[4vh]">
            <Label>{brand.eyebrow}</Label>
            <h1 className="mt-7 text-[clamp(2rem,4.4vw,3.4rem)] font-light leading-[1.12] tracking-[-0.02em]">
              Map your route into investment banking.
            </h1>
            <p className="mx-auto mt-6 max-w-[46ch] font-[family-name:var(--qi-sans)] text-[17px] leading-[1.65] text-[var(--qi-mute)]">
              {brand.support}
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
              <PrimaryCta />
              <Link
                href={secondaryCtas.how.href}
                className="qi-quiet font-[family-name:var(--qi-sans)] text-[15px] leading-[2.6]"
              >
                {secondaryCtas.how.label}
              </Link>
            </div>
          </div>

          <div className="qi-hero-caption -mx-6 mt-auto px-6 py-8 text-center sm:-mx-10 sm:px-10">
            <Label className="!text-[var(--qi-ink)]">
              Career intelligence · Investment banking · Private equity
            </Label>
          </div>
        </div>
      </section>

      {/* ── The problem ─────────────────────────────────────────── */}
      <section className="mx-auto max-w-[1200px] px-6 pt-32 sm:px-10 lg:pt-48">
        <div className="mx-auto max-w-[38rem] text-center">
          <Label>I. Observation</Label>
          <h2 className="mt-7 text-[clamp(1.85rem,3.6vw,2.9rem)] font-light leading-[1.14] tracking-[-0.02em]">
            {problem.heading}
          </h2>
          <p className="mx-auto mt-7 max-w-[58ch] font-[family-name:var(--qi-sans)] text-[17px] leading-[1.75] text-[var(--qi-mute)]">
            {problem.body}
          </p>
        </div>

        {/* Six questions, set as a reading list. No boxes. */}
        <div className="mx-auto mt-24 max-w-[52rem] space-y-14">
          {problem.unknowns.map((item, i) => (
            <article
              key={item.q}
              className={`max-w-[36rem] ${i % 2 === 1 ? 'ml-auto text-right' : ''}`}
            >
              <Label>{String(i + 1).padStart(2, '0')}</Label>
              <h3 className="mt-3 text-[clamp(1.4rem,2.6vw,2rem)] font-light italic leading-[1.2] tracking-[-0.015em]">
                {item.q}
              </h3>
              <p className="mt-3 font-[family-name:var(--qi-sans)] text-[16px] leading-[1.7] text-[var(--qi-mute)]">
                {item.a}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* ── Career Compass ──────────────────────────────────────── */}
      <section id="how" className="mx-auto max-w-[1200px] px-6 pt-40 sm:px-10">
        <div className="mx-auto max-w-[40rem] text-center">
          <Label>II. {compass.name}</Label>
          <h2 className="mt-7 text-[clamp(1.85rem,3.6vw,2.9rem)] font-light leading-[1.14] tracking-[-0.02em]">
            {compass.heading}
          </h2>
          <p className="mx-auto mt-7 max-w-[58ch] font-[family-name:var(--qi-sans)] text-[17px] leading-[1.75] text-[var(--qi-mute)]">
            {compass.body}
          </p>
        </div>

        {/* The eight readouts as a plain index — hairlines only. */}
        <dl className="mx-auto mt-20 max-w-[54rem]">
          {compassReadouts.map((r) => (
            <div
              key={r.key}
              className="grid grid-cols-1 gap-x-12 gap-y-1 border-t border-[var(--qi-hair)] py-6 sm:grid-cols-[minmax(0,0.75fr)_minmax(0,1fr)]"
            >
              <dt className="font-[family-name:var(--qi-sans)] text-[17px] font-medium">{r.label}</dt>
              <dd className="font-[family-name:var(--qi-sans)] text-[16px] leading-[1.6] text-[var(--qi-mute)]">
                {r.note}
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-14 text-center">
          <Link
            href={compass.href}
            className="qi-quiet font-[family-name:var(--qi-sans)] text-[15px] leading-[2.6]"
          >
            {secondaryCtas.compass.label} →
          </Link>
        </div>
      </section>

      {/* ── Method ──────────────────────────────────────────────── */}
      <section className="mx-auto max-w-[1200px] px-6 pt-40 sm:px-10">
        <div className="mx-auto max-w-[40rem] text-center">
          <Label>III. Method</Label>
          <h2 className="mt-7 text-[clamp(1.85rem,3.6vw,2.9rem)] font-light leading-[1.14] tracking-[-0.02em]">
            {method.heading}
          </h2>
          <p className="mx-auto mt-6 max-w-[54ch] font-[family-name:var(--qi-sans)] text-[17px] leading-[1.75] text-[var(--qi-mute)]">
            {method.body}
          </p>
        </div>

        <ol className="mx-auto mt-20 max-w-[46rem] space-y-16">
          {method.steps.map((step) => (
            <li key={step.n} className="grid grid-cols-[3.5rem_minmax(0,1fr)] gap-x-8">
              <Label className="pt-2">{step.n}</Label>
              <div>
                <h3 className="text-[clamp(1.35rem,2.4vw,1.85rem)] font-light leading-[1.2] tracking-[-0.015em]">
                  {step.title}
                </h3>
                <p className="mt-3 max-w-[56ch] font-[family-name:var(--qi-sans)] text-[16px] leading-[1.72] text-[var(--qi-mute)]">
                  {step.body}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* ── Mid-page conversion, as a quiet caesura ─────────────── */}
      <section className="mx-auto mt-40 max-w-[1200px] border-y border-[var(--qi-hair)] px-6 py-24 text-center sm:px-10">
        <p className="mx-auto max-w-[26ch] text-[clamp(1.6rem,3.2vw,2.4rem)] font-light leading-[1.2] tracking-[-0.02em]">
          Positioning first. Everything else follows from it.
        </p>
        <PrimaryCta className="mt-10" />
      </section>

      {/* ── Capabilities ────────────────────────────────────────── */}
      <section className="mx-auto max-w-[1200px] px-6 pt-40 sm:px-10">
        <div className="mx-auto max-w-[40rem] text-center">
          <Label>IV. Capabilities</Label>
        </div>
        <dl className="mx-auto mt-16 max-w-[56rem]">
          {capabilities.map((c) => (
            <div
              key={c.id}
              className="grid grid-cols-1 gap-x-12 gap-y-2 border-t border-[var(--qi-hair)] py-7 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.1fr)]"
            >
              <dt className="text-[clamp(1.2rem,2.1vw,1.55rem)] font-light leading-[1.25] tracking-[-0.015em]">
                {c.title}
              </dt>
              <dd className="max-w-[56ch] font-[family-name:var(--qi-sans)] text-[16px] leading-[1.7] text-[var(--qi-mute)]">
                {c.body}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ── Evidence ────────────────────────────────────────────── */}
      <section id="sample" className="mx-auto max-w-[1200px] px-6 pt-40 sm:px-10">
        <div className="mx-auto max-w-[40rem] text-center">
          <Label>V. Worked example</Label>
          <h2 className="mt-7 text-[clamp(1.85rem,3.6vw,2.9rem)] font-light leading-[1.14] tracking-[-0.02em]">
            What the output actually looks like.
          </h2>
        </div>

        <div className="mx-auto mt-16 max-w-[54rem]">
          <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-[var(--qi-ink)] pb-3">
            <span className="font-[family-name:var(--qi-sans)] text-[12px] uppercase tracking-[0.2em] text-[var(--qi-cobalt)]">
              {sampleProfile.label}
            </span>
            <Label>
              {sampleProfile.ref} · {sampleProfile.student}
            </Label>
          </div>

          <div className="grid grid-cols-1 gap-x-16 gap-y-12 pt-10 sm:grid-cols-2">
            <div>
              <div className="flex items-baseline gap-4">
                <span className="text-[64px] font-light leading-none tracking-[-0.04em]">
                  {sampleProfile.stage.value}
                </span>
                <span className="font-[family-name:var(--qi-sans)] text-[17px] text-[var(--qi-mute)]">
                  {sampleProfile.stage.label}
                </span>
              </div>
              <dl className="mt-9 space-y-5">
                {sampleProfile.metrics.map((m) => (
                  <div key={m.label} className="flex items-baseline justify-between gap-6">
                    <dt className="font-[family-name:var(--qi-sans)] text-[16px]">{m.label}</dt>
                    <dd className="font-[family-name:var(--qi-sans)] text-[16px] tabular-nums text-[var(--qi-mute)]">
                      {m.value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            <div>
              <Label>Ranked actions</Label>
              <ol className="mt-6 space-y-4">
                {sampleProfile.actions.map((a) => (
                  <li key={a.rank} className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-x-4">
                    <span className="font-[family-name:var(--qi-sans)] text-[15px] text-[var(--qi-cobalt)]">
                      {a.rank}
                    </span>
                    <span>
                      <span className="font-[family-name:var(--qi-sans)] text-[16px] leading-snug">
                        {a.action}
                      </span>
                      <span className="mt-0.5 block font-[family-name:var(--qi-sans)] text-[13px] text-[var(--qi-mute)]">
                        {a.window}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <p className="mt-12 border-t border-[var(--qi-hair)] pt-5 font-[family-name:var(--qi-sans)] text-[14px] leading-[1.65] text-[var(--qi-mute)]">
            {sampleProfile.disclaimer}
          </p>
        </div>
      </section>

      {/* ── Close ───────────────────────────────────────────────── */}
      <section className="mx-auto max-w-[1200px] px-6 pt-44 text-center sm:px-10">
        <h2 className="mx-auto max-w-[20ch] text-[clamp(2.2rem,5vw,3.75rem)] font-light leading-[1.08] tracking-[-0.025em]">
          {close.heading}
        </h2>
        <p className="mx-auto mt-7 max-w-[52ch] font-[family-name:var(--qi-sans)] text-[17px] leading-[1.7] text-[var(--qi-mute)]">
          {close.body}
        </p>
        <div className="mt-11 flex flex-wrap items-center justify-center gap-x-8 gap-y-4">
          <PrimaryCta />
          <Link
            href={secondaryCtas.sample.href}
            className="qi-quiet font-[family-name:var(--qi-sans)] text-[15px] leading-[2.6]"
          >
            {secondaryCtas.sample.label}
          </Link>
        </div>

        <footer className="mt-28 flex flex-col items-center gap-4 border-t border-[var(--qi-hair)] pt-8">
          <Wordmark className="h-6 w-auto" ink="var(--qi-ink)" accent="var(--qi-cobalt)" />
          <Label>{brand.name} · Concept V3 · Quiet Institution</Label>
        </footer>
      </section>

      <ConceptSwitcher current="v3" />
    </div>
  );
}
