import type { Metadata } from 'next';
import Link from 'next/link';
import { Archivo, Newsreader, JetBrains_Mono } from 'next/font/google';
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
import './mapped-paper.css';

/**
 * V1 · MAPPED PAPER — print-tech cartography × analytical publication.
 *
 * THESIS: the page is a survey document about one student, not a brochure. It
 * refuses the hero-plus-six-feature-cards arrangement outright.
 * OWN-WORLD: pale sage stock, dark forest ink, vermilion marks, ruler edges,
 * registration targets, sheet numbering, contour bedding, oversized grotesk
 * against a reading serif, mono marginalia.
 * STORY: recruiting can be surveyed; here is the survey; build yours.
 * FIRST VIEWPORT: headline left at monumental scale, contour plate isolated
 * centre-right with mono annotations around it, primary action beneath the
 * support line.
 */

const display = Archivo({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--mp-display' });
const serif = Newsreader({ subsets: ['latin'], weight: ['300', '400'], style: ['normal', 'italic'], variable: '--mp-serif' });
const mono = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--mp-mono' });

export const metadata: Metadata = {
  title: 'V1 · Mapped Paper',
  description: 'MappedLabs landing concept 1 — the page as a cartographic survey document.',
};

/** Small mono marginalia. Set at 12px, never smaller — it must stay readable. */
function Mark({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`font-[family-name:var(--mp-mono)] text-[12px] tracking-[0.14em] uppercase text-[var(--mp-ink-2)] ${className}`}>
      {children}
    </span>
  );
}

function SheetRule({ n, title }: { n: string; title: string }) {
  return (
    <div className="flex items-center gap-4 border-t border-[var(--mp-rule)] pt-3">
      <Mark className="!text-[var(--mp-accent-text)]">Sheet {n}</Mark>
      <Mark>{title}</Mark>
      <span className="mp-ruler ml-auto hidden h-2 flex-1 opacity-60 sm:block" aria-hidden="true" />
    </div>
  );
}

function PrimaryCta({ className = '' }: { className?: string }) {
  return (
    <Link
      href={primaryCta.href}
      className={`mp-cta inline-flex min-h-[52px] items-center gap-3 px-7 font-[family-name:var(--mp-display)] text-[17px] font-semibold tracking-[-0.01em] ${className}`}
    >
      {primaryCta.label}
      <span aria-hidden="true">→</span>
    </Link>
  );
}

export default function V1Page() {
  return (
    <div
      className={`mp mp-paper-tooth min-h-screen pb-28 ${display.variable} ${serif.variable} ${mono.variable} font-[family-name:var(--mp-serif)]`}
    >
      {/* ── Masthead ─────────────────────────────────────────────── */}
      <header className="mx-auto flex max-w-[1400px] items-center justify-between gap-6 px-6 py-6 sm:px-10">
        <Wordmark className="h-7 w-auto" ink="var(--mp-ink)" accent="var(--mp-accent)" />
        <div className="flex items-center gap-5">
          <Mark className="hidden sm:inline">Sheet 01–07</Mark>
          <span className="mp-reg hidden sm:block" aria-hidden="true" />
          <Mark>Rev. 2026.1</Mark>
        </div>
      </header>

      {/* ── 01 Hero ──────────────────────────────────────────────── */}
      <section className="mx-auto max-w-[1400px] px-6 sm:px-10">
        <div className="grid grid-cols-1 items-center gap-10 py-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-16 lg:py-10">
          {/* Copy column */}
          <div className="max-w-[40rem]">
            <div className="mb-6 flex items-center gap-3">
              <span className="h-px w-10 bg-[var(--mp-accent)]" aria-hidden="true" />
              <Mark className="!text-[var(--mp-accent-text)]">{brand.eyebrow}</Mark>
            </div>

            {/* Scale capped so the headline holds three lines and the primary
                action stays above the fold on a 900px-tall viewport. */}
            <h1 className="font-[family-name:var(--mp-display)] text-[clamp(2.4rem,4.9vw,3.9rem)] font-bold leading-[0.98] tracking-[-0.032em]">
              Map your route into investment banking.
            </h1>

            <p className="mt-6 max-w-[46ch] text-[18px] leading-[1.6] text-[var(--mp-ink-2)]">
              {brand.support}
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <PrimaryCta />
              <Link
                href={secondaryCtas.how.href}
                className="mp-cta-2 mp-link inline-flex min-h-[52px] items-center px-6 font-[family-name:var(--mp-display)] text-[15px] font-medium"
              >
                {secondaryCtas.how.label}
              </Link>
            </div>

            <dl className="mt-10 grid max-w-md grid-cols-3 gap-6 border-t border-[var(--mp-rule)] pt-5">
              {[
                ['Built for', 'AU students'],
                ['Output', 'Ranked plan'],
                ['Basis', 'Mapped paths'],
              ].map(([k, v]) => (
                <div key={k}>
                  <dt className="font-[family-name:var(--mp-mono)] text-[11px] uppercase tracking-[0.12em] text-[var(--mp-ink-2)]">
                    {k}
                  </dt>
                  <dd className="mt-1 font-[family-name:var(--mp-display)] text-[15px] font-medium">{v}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Plate: image isolated, annotations around it, paper showing through */}
          <figure className="relative">
            <div className="pointer-events-none absolute -left-4 -top-4 hidden lg:block">
              <span className="mp-reg" aria-hidden="true" />
            </div>
            <div className="relative overflow-hidden border border-[var(--mp-rule)]">
              <HeroImage
                slug="v1-mapped-paper"
                alt="Engraved topographic plate: layered elevation contours crossed by branching route traces, with sparse vermilion markers at the junctions."
                className="block aspect-[8/5] w-full object-cover mix-blend-multiply"
              />
            </div>
            <figcaption className="mt-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-1">
              <Mark>Plate 01 · Terrain & route traces</Mark>
              <Mark>34°55′S 138°36′E</Mark>
            </figcaption>
            <div className="mp-ruler mt-3 h-2 opacity-70" aria-hidden="true" />
          </figure>
        </div>
      </section>

      {/* ── 02 The problem ───────────────────────────────────────── */}
      <section className="mx-auto mt-16 max-w-[1400px] px-6 sm:px-10">
        <SheetRule n="02" title="Field observation" />
        <div className="grid grid-cols-1 gap-10 pt-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)] lg:gap-20">
          <div>
            <h2 className="font-[family-name:var(--mp-display)] text-[clamp(2rem,4.2vw,3.1rem)] font-bold leading-[1.03] tracking-[-0.03em]">
              {problem.heading}
            </h2>
            <p className="mt-6 max-w-[42ch] text-[18px] leading-[1.65] text-[var(--mp-ink-2)]">
              {problem.body}
            </p>
          </div>

          {/* Field notes: a numbered register, not icon cards. */}
          <ul className="border-t border-[var(--mp-rule)]">
            {problem.unknowns.map((item, i) => (
              <li
                key={item.q}
                className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-5 gap-y-1 border-b border-[var(--mp-rule)] py-5"
              >
                <span className="font-[family-name:var(--mp-mono)] pt-1 text-[12px] text-[var(--mp-accent-text)]">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className="font-[family-name:var(--mp-display)] text-[19px] font-semibold tracking-[-0.01em]">
                  {item.q}
                </h3>
                <p className="col-start-2 max-w-[52ch] text-[16px] leading-[1.55] text-[var(--mp-ink-2)]">
                  {item.a}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── 03 Career Compass ────────────────────────────────────── */}
      <section id="how" className="mx-auto mt-24 max-w-[1400px] px-6 sm:px-10">
        <SheetRule n="03" title="Instrument" />
        <div className="grid grid-cols-1 gap-12 pt-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-16">
          <div className="lg:sticky lg:top-10 lg:self-start">
            <Mark className="!text-[var(--mp-accent-text)]">{compass.name}</Mark>
            <h2 className="mt-4 font-[family-name:var(--mp-display)] text-[clamp(2rem,4.2vw,3.1rem)] font-bold leading-[1.03] tracking-[-0.03em]">
              {compass.heading}
            </h2>
            <p className="mt-6 max-w-[44ch] text-[18px] leading-[1.65] text-[var(--mp-ink-2)]">
              {compass.body}
            </p>
            <Link
              href={compass.href}
              className="mp-link mt-7 inline-flex min-h-[44px] items-center border-b border-[var(--mp-ink)] font-[family-name:var(--mp-display)] text-[15px] font-medium"
            >
              {secondaryCtas.compass.label} →
            </Link>
          </div>

          {/* The eight readouts as a legend, keyed like a map. */}
          <dl className="grid grid-cols-1 gap-px border border-[var(--mp-rule)] bg-[var(--mp-rule)] sm:grid-cols-2">
            {compassReadouts.map((r, i) => (
              <div key={r.key} className="bg-[var(--mp-paper)] p-5">
                <div className="flex items-baseline gap-2.5">
                  <span className="font-[family-name:var(--mp-mono)] text-[12px] text-[var(--mp-accent-text)]">
                    {String.fromCharCode(65 + i)}
                  </span>
                  <dt className="font-[family-name:var(--mp-display)] text-[16px] font-semibold tracking-[-0.01em]">
                    {r.label}
                  </dt>
                </div>
                <dd className="mt-1.5 pl-[1.55rem] text-[15px] leading-[1.5] text-[var(--mp-ink-2)]">
                  {r.note}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ── 04 Method ────────────────────────────────────────────── */}
      <section className="mx-auto mt-24 max-w-[1400px] px-6 sm:px-10">
        <SheetRule n="04" title="Method" />
        <div className="pt-10">
          <h2 className="max-w-[20ch] font-[family-name:var(--mp-display)] text-[clamp(2rem,4.2vw,3.1rem)] font-bold leading-[1.03] tracking-[-0.03em]">
            {method.heading}
          </h2>
          <p className="mt-5 max-w-[52ch] text-[18px] leading-[1.65] text-[var(--mp-ink-2)]">
            {method.body}
          </p>

          {/* A traverse: five stations along one line. */}
          <ol className="mt-12 grid grid-cols-1 gap-px bg-[var(--mp-rule)] sm:grid-cols-2 lg:grid-cols-5">
            {method.steps.map((step, i) => (
              <li key={step.n} className="relative bg-[var(--mp-paper)] p-6 pt-9">
                <span
                  className="absolute left-6 top-6 h-2.5 w-2.5 rounded-full"
                  style={{ background: i === 0 ? 'var(--mp-accent)' : 'var(--mp-ink)' }}
                  aria-hidden="true"
                />
                <Mark className="absolute right-5 top-6">{step.n}</Mark>
                <h3 className="mt-4 font-[family-name:var(--mp-display)] text-[18px] font-semibold tracking-[-0.015em]">
                  {step.title}
                </h3>
                <p className="mt-2 text-[15px] leading-[1.55] text-[var(--mp-ink-2)]">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── 05 Capabilities — specimen index, mid-page conversion ── */}
      <section className="mx-auto mt-24 max-w-[1400px] px-6 sm:px-10">
        <SheetRule n="05" title="Index of capabilities" />
        <div className="grid grid-cols-1 gap-12 pt-10 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)] lg:gap-20">
          <ul>
            {capabilities.map((c) => (
              <li
                key={c.id}
                className="grid grid-cols-[4.5rem_minmax(0,1fr)] items-baseline gap-x-4 border-b border-[var(--mp-rule)] py-4 first:border-t"
              >
                <span className="font-[family-name:var(--mp-mono)] text-[12px] text-[var(--mp-ink-2)]">
                  {c.id}
                </span>
                <div>
                  <h3 className="font-[family-name:var(--mp-display)] text-[17px] font-semibold tracking-[-0.01em]">
                    {c.title}
                  </h3>
                  <p className="mt-1 max-w-[58ch] text-[15px] leading-[1.55] text-[var(--mp-ink-2)]">
                    {c.body}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          {/* Mid-page conversion, sitting in the margin like a bound-in card. */}
          <aside className="mp-contour self-start border border-[var(--mp-ink)] p-7">
            <Mark className="!text-[var(--mp-accent-text)]">Start here</Mark>
            <p className="mt-3 font-[family-name:var(--mp-display)] text-[24px] font-bold leading-[1.15] tracking-[-0.025em]">
              Your map begins with where you actually stand.
            </p>
            <p className="mt-3 text-[15px] leading-[1.55] text-[var(--mp-ink-2)]">
              Intake takes a few minutes. The output is a ranked sequence, not a score to feel
              good about.
            </p>
            <PrimaryCta className="mt-6 w-full justify-center" />
          </aside>
        </div>
      </section>

      {/* ── 06 Evidence: labelled sample ─────────────────────────── */}
      <section id="sample" className="mx-auto mt-24 max-w-[1400px] px-6 sm:px-10">
        <SheetRule n="06" title="Worked example" />
        <div className="mt-10 border border-[var(--mp-ink)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--mp-ink)] px-6 py-4">
            <div className="flex items-center gap-3">
              <span className="bg-[var(--mp-accent)] px-2 py-1 font-[family-name:var(--mp-mono)] text-[11px] uppercase tracking-[0.12em] text-[#fdfbf6]">
                {sampleProfile.label}
              </span>
              <Mark>{sampleProfile.ref}</Mark>
            </div>
            <Mark>{sampleProfile.student}</Mark>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
            {/* Scores */}
            <div className="border-b border-[var(--mp-rule)] p-6 lg:border-b-0 lg:border-r">
              <div className="mb-6 flex items-baseline gap-3">
                <span className="font-[family-name:var(--mp-display)] text-[56px] font-bold leading-none tracking-[-0.04em]">
                  {sampleProfile.stage.value}
                </span>
                <span className="font-[family-name:var(--mp-display)] text-[18px] text-[var(--mp-ink-2)]">
                  {sampleProfile.stage.label}
                </span>
              </div>
              <dl className="space-y-4">
                {sampleProfile.metrics.map((m) => (
                  <div key={m.label}>
                    <div className="flex items-baseline justify-between">
                      <dt className="text-[15px]">{m.label}</dt>
                      <dd className="font-[family-name:var(--mp-mono)] text-[13px] tabular-nums">
                        {m.value}
                      </dd>
                    </div>
                    <div className="mt-1.5 h-[3px] w-full bg-[var(--mp-rule)]">
                      <div
                        className="h-full bg-[var(--mp-ink)]"
                        style={{ width: `${m.value}%` }}
                      />
                    </div>
                  </div>
                ))}
              </dl>
            </div>

            {/* Ranked actions */}
            <div className="p-6">
              <Mark className="mb-4 block">Ranked actions</Mark>
              <ol>
                {sampleProfile.actions.map((a) => (
                  <li
                    key={a.rank}
                    className="grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-baseline gap-x-4 border-b border-[var(--mp-rule)] py-3 last:border-b-0"
                  >
                    <span className="font-[family-name:var(--mp-mono)] text-[13px] text-[var(--mp-accent-text)]">
                      {a.rank}
                    </span>
                    <span className="text-[16px] leading-snug">{a.action}</span>
                    <span className="font-[family-name:var(--mp-mono)] text-right text-[12px] uppercase tracking-[0.1em] text-[var(--mp-ink-2)]">
                      {a.window}
                    </span>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <p className="border-t border-[var(--mp-rule)] px-6 py-4 text-[14px] italic leading-[1.5] text-[var(--mp-ink-2)]">
            {sampleProfile.disclaimer}
          </p>
        </div>
      </section>

      {/* ── 07 Close ─────────────────────────────────────────────── */}
      <section className="mx-auto mt-24 max-w-[1400px] px-6 sm:px-10">
        <SheetRule n="07" title="Close" />
        <div className="grid grid-cols-1 items-end gap-10 pt-12 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <div>
            <h2 className="max-w-[16ch] font-[family-name:var(--mp-display)] text-[clamp(2.5rem,6vw,4.5rem)] font-bold leading-[0.98] tracking-[-0.035em]">
              {close.heading}
            </h2>
            <p className="mt-6 max-w-[46ch] text-[18px] leading-[1.65] text-[var(--mp-ink-2)]">
              {close.body}
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <PrimaryCta />
              <Link
                href={secondaryCtas.sample.href}
                className="mp-cta-2 mp-link inline-flex min-h-[52px] items-center px-6 font-[family-name:var(--mp-display)] text-[15px] font-medium"
              >
                {secondaryCtas.sample.label}
              </Link>
            </div>
          </div>
          <div className="mp-ruler-v hidden h-40 w-2 justify-self-end opacity-60 lg:block" aria-hidden="true" />
        </div>

        <footer className="mt-20 flex flex-wrap items-center justify-between gap-4 border-t border-[var(--mp-rule)] pt-6">
          <Wordmark className="h-6 w-auto" ink="var(--mp-ink)" accent="var(--mp-accent)" />
          <Mark>{brand.name} · Sheet 07 of 07 · Concept V1</Mark>
        </footer>
      </section>

      <ConceptSwitcher current="v1" />
    </div>
  );
}
