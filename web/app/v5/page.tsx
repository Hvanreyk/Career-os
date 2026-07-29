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
import './atlas.css';

/**
 * V5 · THE CAREER ATLAS — classical knowledge × contemporary analytical editorial.
 *
 * THESIS: recruiting is a discipline to be studied, not a game to be hacked.
 * The page is a field guide, refusing the startup landing-page sequence.
 * OWN-WORLD: warm laid paper, ink blue, oxblood accent, engraved plates,
 * chapter rules, marginalia in mono, orbit lines behind the text column, a
 * reading serif with italic emphasis over an elegant sans for apparatus.
 * STORY: here is the terrain, the instrument and the method; open the guide.
 * FIRST VIEWPORT: headline and action left over faint orbits, engraved plate
 * right, a narrow methodology strip closing the fold.
 */

const serif = Newsreader({ subsets: ['latin'], weight: ['300', '400', '500'], style: ['normal', 'italic'], variable: '--at-serif' });
const sans = Archivo({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--at-sans' });
const mono = JetBrains_Mono({ subsets: ['latin'], weight: ['400'], variable: '--at-mono' });

export const metadata: Metadata = {
  title: 'V5 · The Career Atlas',
  description: 'MappedLabs landing concept 5 — Career Compass as a modern field guide.',
};

function Marginal({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`font-[family-name:var(--at-mono)] text-[12px] uppercase tracking-[0.15em] text-[var(--at-char)] ${className}`}>
      {children}
    </span>
  );
}

function Chapter({ n, title }: { n: string; title: string }) {
  return (
    <div className="at-chapter flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-3">
      <Marginal className="!text-[var(--at-ox)]">Chapter {n}</Marginal>
      <Marginal>{title}</Marginal>
    </div>
  );
}

function PrimaryCta({ className = '' }: { className?: string }) {
  return (
    <Link
      href={primaryCta.href}
      className={`at-cta inline-flex min-h-[52px] items-center gap-3 px-7 font-[family-name:var(--at-sans)] text-[16px] font-semibold tracking-[0.005em] ${className}`}
    >
      {primaryCta.label}
      <span aria-hidden="true">→</span>
    </Link>
  );
}

export default function V5Page() {
  return (
    <div
      className={`at at-laid min-h-screen pb-28 ${serif.variable} ${sans.variable} ${mono.variable} font-[family-name:var(--at-serif)]`}
    >
      <header className="mx-auto flex max-w-[1360px] items-center justify-between gap-6 px-6 py-6 sm:px-10">
        <Wordmark className="h-7 w-auto" ink="var(--at-ink)" accent="var(--at-ox)" />
        <Marginal className="hidden sm:inline">A field guide · First edition</Marginal>
      </header>

      {/* ── Hero ────────────────────────────────────────────────── */}
      <section className="at-orbits">
        <div className="mx-auto max-w-[1360px] px-6 sm:px-10">
          <div className="grid grid-cols-1 items-center gap-12 py-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.02fr)] lg:gap-16 lg:py-16">
            <div className="max-w-[36rem]">
              <div className="mb-6 flex items-center gap-3">
                <span className="h-px w-9 bg-[var(--at-ox)]" aria-hidden="true" />
                <Marginal className="!text-[var(--at-ox)]">{brand.eyebrow}</Marginal>
              </div>

              <h1 className="text-[clamp(2.6rem,6.4vw,4.75rem)] font-light leading-[1.02] tracking-[-0.025em]">
                Map your route into <em className="font-normal italic">investment banking.</em>
              </h1>

              <p className="mt-7 max-w-[46ch] font-[family-name:var(--at-sans)] text-[18px] leading-[1.65] text-[var(--at-char)]">
                {brand.support}
              </p>

              <div className="mt-9 flex flex-wrap items-center gap-4">
                <PrimaryCta />
                <Link
                  href={secondaryCtas.how.href}
                  className="at-cta-2 at-link inline-flex min-h-[52px] items-center px-6 font-[family-name:var(--at-sans)] text-[15px] font-medium"
                >
                  {secondaryCtas.how.label}
                </Link>
              </div>
            </div>

            <figure className="at-plate relative">
              <div className="border border-[var(--at-rule)] p-2">
                <HeroImage
                  slug="v5-atlas"
                  alt="Steel-engraved plate: a young analyst at a plain table studying a large sheet of branching route lines, orbital arcs and plotted diagrams."
                  className="block aspect-[8/5] w-full object-cover"
                  position="center"
                />
              </div>
              <figcaption className="mt-3 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                <Marginal>Plate V · The analyst at work</Marginal>
                <Marginal>Fig. 1</Marginal>
              </figcaption>
            </figure>
          </div>

          {/* Methodology strip closing the fold. */}
          <dl className="grid grid-cols-1 gap-px border-y border-[var(--at-rule)] bg-[var(--at-rule)] sm:grid-cols-3">
            {[
              ['Benchmarked', 'Against mapped professional paths, not a generic rubric.'],
              ['Deterministic', 'The same inputs return the same read, every time.'],
              ['Revised', 'The ranking recomputes as your stage changes.'],
            ].map(([k, v]) => (
              <div key={k} className="bg-[var(--at-paper)] px-5 py-5">
                <dt className="font-[family-name:var(--at-sans)] text-[15px] font-semibold">{k}</dt>
                <dd className="mt-1 font-[family-name:var(--at-sans)] text-[14px] leading-[1.55] text-[var(--at-char)]">
                  {v}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ── Ch. I The problem ───────────────────────────────────── */}
      <section className="mx-auto mt-24 max-w-[1360px] px-6 sm:px-10">
        <Chapter n="I" title="The difficulty" />
        <div className="grid grid-cols-1 gap-12 pt-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)] lg:gap-20">
          <div>
            <h2 className="max-w-[18ch] text-[clamp(2rem,4.2vw,3.1rem)] font-light leading-[1.08] tracking-[-0.02em]">
              {problem.heading}
            </h2>
            <p className="at-lead mt-7 max-w-[52ch] text-[19px] leading-[1.7] text-[var(--at-char)]">
              {problem.body}
            </p>
          </div>

          {/* Marginalia-style register of the six unknowns. */}
          <ul className="border-t border-[var(--at-rule)]">
            {problem.unknowns.map((item, i) => (
              <li key={item.q} className="border-b border-[var(--at-rule)] py-5">
                <div className="flex items-baseline gap-4">
                  <Marginal className="!text-[var(--at-ox)]">{String(i + 1).padStart(2, '0')}</Marginal>
                  <h3 className="text-[20px] font-normal italic leading-snug">{item.q}</h3>
                </div>
                <p className="mt-1.5 max-w-[54ch] pl-[2.6rem] font-[family-name:var(--at-sans)] text-[15px] leading-[1.6] text-[var(--at-char)]">
                  {item.a}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Ch. II Career Compass ───────────────────────────────── */}
      <section id="how" className="mx-auto mt-24 max-w-[1360px] px-6 sm:px-10">
        <Chapter n="II" title={`The instrument — ${compass.name}`} />
        <div className="grid grid-cols-1 gap-12 pt-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-20">
          <div className="lg:sticky lg:top-10 lg:self-start">
            <h2 className="max-w-[16ch] text-[clamp(2rem,4.2vw,3.1rem)] font-light leading-[1.08] tracking-[-0.02em]">
              {compass.heading}
            </h2>
            <p className="mt-6 max-w-[46ch] font-[family-name:var(--at-sans)] text-[17px] leading-[1.7] text-[var(--at-char)]">
              {compass.body}
            </p>
            <Link
              href={compass.href}
              className="at-link mt-7 inline-flex min-h-[44px] items-center border-b border-[var(--at-ox)] font-[family-name:var(--at-sans)] text-[15px] font-medium text-[var(--at-ox)]"
            >
              {secondaryCtas.compass.label} →
            </Link>
          </div>

          {/* A plate legend: eight keyed readouts. */}
          <dl className="grid grid-cols-1 gap-x-10 sm:grid-cols-2">
            {compassReadouts.map((r, i) => (
              <div key={r.key} className="border-b border-[var(--at-rule)] py-4 first:border-t sm:[&:nth-child(2)]:border-t">
                <div className="flex items-baseline gap-3">
                  <span className="font-[family-name:var(--at-mono)] text-[12px] text-[var(--at-ox)]">
                    {String.fromCharCode(97 + i)}.
                  </span>
                  <dt className="font-[family-name:var(--at-sans)] text-[16px] font-semibold">
                    {r.label}
                  </dt>
                </div>
                <dd className="mt-1 pl-[1.7rem] font-[family-name:var(--at-sans)] text-[14px] leading-[1.55] text-[var(--at-char)]">
                  {r.note}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ── Ch. III Method ──────────────────────────────────────── */}
      <section className="mx-auto mt-24 max-w-[1360px] px-6 sm:px-10">
        <Chapter n="III" title="The method" />
        <div className="pt-10">
          <h2 className="max-w-[20ch] text-[clamp(2rem,4.2vw,3.1rem)] font-light leading-[1.08] tracking-[-0.02em]">
            {method.heading}
          </h2>
          <p className="mt-5 max-w-[54ch] font-[family-name:var(--at-sans)] text-[17px] leading-[1.7] text-[var(--at-char)]">
            {method.body}
          </p>

          <ol className="mt-14 space-y-10">
            {method.steps.map((step) => (
              <li key={step.n} className="grid grid-cols-[3rem_minmax(0,1fr)] gap-x-6 sm:grid-cols-[6rem_minmax(0,1fr)] sm:gap-x-12">
                <Marginal className="pt-2">{step.n}</Marginal>
                <div className="border-t border-[var(--at-rule)] pt-3">
                  <h3 className="text-[clamp(1.4rem,2.6vw,1.9rem)] font-normal italic leading-[1.2]">
                    {step.title}
                  </h3>
                  <p className="mt-2.5 max-w-[62ch] font-[family-name:var(--at-sans)] text-[16px] leading-[1.7] text-[var(--at-char)]">
                    {step.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Ch. IV Capabilities + mid-page conversion ───────────── */}
      <section className="mx-auto mt-24 max-w-[1360px] px-6 sm:px-10">
        <Chapter n="IV" title="Contents" />
        <div className="grid grid-cols-1 gap-12 pt-10 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)] lg:gap-20">
          {/* Set as a table of contents, with leaders. */}
          <ol>
            {capabilities.map((c) => (
              <li key={c.id} className="border-b border-[var(--at-rule)] py-4 first:border-t">
                <div className="flex items-baseline gap-3">
                  <Marginal>{c.id}</Marginal>
                  <h3 className="text-[19px] font-normal leading-snug">{c.title}</h3>
                </div>
                <p className="mt-1 max-w-[60ch] pl-[4.2rem] font-[family-name:var(--at-sans)] text-[15px] leading-[1.6] text-[var(--at-char)]">
                  {c.body}
                </p>
              </li>
            ))}
          </ol>

          <aside className="self-start border border-[var(--at-ink)] bg-[var(--at-paper-2)] p-7">
            <Marginal className="!text-[var(--at-ox)]">Begin here</Marginal>
            <p className="mt-3 text-[25px] font-light leading-[1.18] tracking-[-0.015em]">
              Positioning first. Everything else follows from it.
            </p>
            <p className="mt-3 font-[family-name:var(--at-sans)] text-[15px] leading-[1.6] text-[var(--at-char)]">
              Intake takes a few minutes and returns a ranked sequence rather than a score.
            </p>
            <PrimaryCta className="mt-6 w-full justify-center" />
          </aside>
        </div>
      </section>

      {/* ── Ch. V Worked example ────────────────────────────────── */}
      <section id="sample" className="mx-auto mt-24 max-w-[1360px] px-6 sm:px-10">
        <Chapter n="V" title="A worked example" />
        <div className="mt-10 border border-[var(--at-ink)] bg-[var(--at-paper-2)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--at-ink)] px-6 py-4">
            <span className="bg-[var(--at-ox)] px-2.5 py-1 font-[family-name:var(--at-mono)] text-[11px] uppercase tracking-[0.14em] text-[var(--at-paper)]">
              {sampleProfile.label}
            </span>
            <Marginal>
              {sampleProfile.ref} · {sampleProfile.student}
            </Marginal>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
            <div className="border-b border-[var(--at-rule)] p-6 lg:border-b-0 lg:border-r">
              <div className="flex items-baseline gap-4">
                <span className="text-[60px] font-light leading-none tracking-[-0.04em] text-[var(--at-ox)]">
                  {sampleProfile.stage.value}
                </span>
                <span className="font-[family-name:var(--at-sans)] text-[17px] text-[var(--at-char)]">
                  {sampleProfile.stage.label}
                </span>
              </div>
              <dl className="mt-8 space-y-4">
                {sampleProfile.metrics.map((m) => (
                  <div key={m.label}>
                    <div className="flex items-baseline justify-between gap-4">
                      <dt className="font-[family-name:var(--at-sans)] text-[15px]">{m.label}</dt>
                      <dd className="font-[family-name:var(--at-mono)] text-[13px] tabular-nums text-[var(--at-char)]">
                        {m.value}
                      </dd>
                    </div>
                    <div className="mt-1.5 h-[3px] w-full bg-[var(--at-rule)]">
                      <div className="h-full bg-[var(--at-ink)]" style={{ width: `${m.value}%` }} />
                    </div>
                  </div>
                ))}
              </dl>
            </div>

            <div className="p-6">
              <Marginal>Ranked actions</Marginal>
              <ol className="mt-5">
                {sampleProfile.actions.map((a) => (
                  <li
                    key={a.rank}
                    className="grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-baseline gap-x-4 border-b border-[var(--at-rule)] py-3 last:border-b-0"
                  >
                    <span className="font-[family-name:var(--at-mono)] text-[13px] text-[var(--at-ox)]">
                      {a.rank}
                    </span>
                    <span className="font-[family-name:var(--at-sans)] text-[15px] leading-snug">
                      {a.action}
                    </span>
                    <Marginal className="text-right">{a.window}</Marginal>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <p className="border-t border-[var(--at-rule)] px-6 py-4 font-[family-name:var(--at-sans)] text-[14px] italic leading-[1.6] text-[var(--at-char)]">
            {sampleProfile.disclaimer}
          </p>
        </div>
      </section>

      {/* ── Colophon / close ───────────────────────────────────── */}
      <section className="mx-auto mt-24 max-w-[1360px] px-6 sm:px-10">
        <Chapter n="VI" title="Colophon" />
        <div className="grid grid-cols-1 items-end gap-10 pt-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <div>
            <h2 className="max-w-[16ch] text-[clamp(2.4rem,5.6vw,4.25rem)] font-light leading-[1.02] tracking-[-0.025em]">
              {close.heading}
            </h2>
            <p className="mt-6 max-w-[48ch] font-[family-name:var(--at-sans)] text-[17px] leading-[1.7] text-[var(--at-char)]">
              {close.body}
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <PrimaryCta />
              <Link
                href={secondaryCtas.sample.href}
                className="at-cta-2 at-link inline-flex min-h-[52px] items-center px-6 font-[family-name:var(--at-sans)] text-[15px] font-medium"
              >
                {secondaryCtas.sample.label}
              </Link>
            </div>
          </div>
        </div>

        <footer className="mt-20 flex flex-wrap items-center justify-between gap-4 border-t border-[var(--at-rule)] pt-6">
          <Wordmark className="h-6 w-auto" ink="var(--at-ink)" accent="var(--at-ox)" />
          <Marginal>{brand.name} · Concept V5 · The Career Atlas</Marginal>
        </footer>
      </section>

      <ConceptSwitcher current="v5" />
    </div>
  );
}
