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
import './dithered.css';

/**
 * V4 · DITHERED INTELLIGENCE — brutalist editorial × bitmap research terminal.
 *
 * THESIS: a research instrument that refuses to be friendly. It rejects
 * rounded-everything, soft shadows and the reassuring product-marketing voice.
 * OWN-WORLD: near-black ground, bone type, graphite secondary, one sharp red,
 * 1px hard rules, zero radius, terminal labels, compressed information bands,
 * a cropped wordmark bleeding off the lower edge.
 * STORY: the numbers are unsentimental; so is the page; build the map anyway.
 * FIRST VIEWPORT: left half near-empty black holding the headline, dithered
 * plate on the right dissolving toward the centre, hard red action.
 */

const display = Archivo({ subsets: ['latin'], weight: ['500', '600', '700', '800'], variable: '--di-display' });
const mono = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--di-mono' });

export const metadata: Metadata = {
  title: 'V4 · Dithered Intelligence',
  description: 'MappedLabs landing concept 4 — brutalist bitmap research terminal.',
};

function Tag({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`font-[family-name:var(--di-mono)] text-[12px] uppercase tracking-[0.16em] text-[var(--di-graphite)] ${className}`}>
      {children}
    </span>
  );
}

function PrimaryCta({ className = '' }: { className?: string }) {
  return (
    <Link
      href={primaryCta.href}
      className={`di-cta inline-flex min-h-[54px] items-center gap-3 px-7 font-[family-name:var(--di-display)] text-[16px] font-bold uppercase tracking-[0.04em] ${className}`}
    >
      {primaryCta.label}
      <span aria-hidden="true">▸</span>
    </Link>
  );
}

export default function V4Page() {
  return (
    <div
      className={`di min-h-screen overflow-x-hidden pb-28 ${display.variable} ${mono.variable} font-[family-name:var(--di-display)]`}
    >
      {/* ── Terminal bar ────────────────────────────────────────── */}
      <header className="di-band flex flex-wrap items-center justify-between gap-4 px-5 py-3 sm:px-8">
        <Wordmark className="h-6 w-auto" ink="var(--di-bone)" accent="var(--di-red)" />
        <div className="flex items-center gap-5">
          <Tag className="hidden sm:inline">SYS · CAREER MAP</Tag>
          <Tag>REV 2026.1</Tag>
        </div>
      </header>

      {/* ── Hero: black left, plate right ───────────────────────── */}
      <section className="relative grid grid-cols-1 border-b border-[var(--di-rule)] lg:grid-cols-2">
        <div className="order-2 flex flex-col justify-center px-5 py-14 sm:px-8 lg:order-1 lg:py-24">
          <Tag className="!text-[var(--di-red)]">{brand.eyebrow}</Tag>
          <h1 className="mt-6 max-w-[15ch] text-[clamp(2.5rem,6.4vw,4.5rem)] font-extrabold uppercase leading-[0.93] tracking-[-0.04em] [word-spacing:0.12em]">
            Map your route into investment banking
          </h1>
          <p className="mt-7 max-w-[46ch] font-[family-name:var(--di-mono)] text-[16px] leading-[1.65] text-[var(--di-graphite)]">
            {brand.support}
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <PrimaryCta />
            <Link
              href={secondaryCtas.how.href}
              className="di-cta-2 di-link inline-flex min-h-[54px] items-center px-6 font-[family-name:var(--di-mono)] text-[14px] uppercase tracking-[0.08em]"
            >
              {secondaryCtas.how.label}
            </Link>
          </div>
        </div>

        {/* Plate dissolves toward the centre-left. */}
        <div className="di-screen relative order-1 min-h-[46svh] overflow-hidden border-b border-[var(--di-rule)] lg:order-2 lg:min-h-[86svh] lg:border-b-0 lg:border-l">
          <HeroImage
            slug="v4-dithered"
            alt="Coarse one-bit dithered plate: a lone figure seen from behind studying a wall of branching pathway lines and plotted nodes, dissolving into black."
            className="h-full w-full object-cover"
            position="right center"
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(90deg, var(--di-black) 0%, rgba(11,11,12,0.75) 22%, rgba(11,11,12,0) 58%)',
            }}
            aria-hidden="true"
          />
          <div className="absolute bottom-4 right-5 z-10">
            <Tag>PLATE 04 · 1-BIT · OBSERVED</Tag>
          </div>
        </div>
      </section>

      {/* ── Problem: compressed band ────────────────────────────── */}
      <section className="px-5 py-20 sm:px-8">
        <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-[var(--di-bone)] pb-3">
          <h2 className="max-w-[24ch] text-[clamp(1.7rem,3.6vw,2.6rem)] font-bold uppercase leading-[1.02] tracking-[-0.03em]">
            {problem.heading}
          </h2>
          <Tag>SEC 01</Tag>
        </div>
        <p className="mt-6 max-w-[62ch] font-[family-name:var(--di-mono)] text-[16px] leading-[1.7] text-[var(--di-graphite)]">
          {problem.body}
        </p>

        <ul className="mt-12">
          {problem.unknowns.map((item, i) => (
            <li
              key={item.q}
              className="di-row grid grid-cols-[3rem_minmax(0,1fr)] items-baseline gap-x-5 gap-y-1 py-5 md:grid-cols-[3rem_minmax(0,0.8fr)_minmax(0,1.2fr)]"
            >
              <Tag className="!text-[var(--di-red)]">{String(i + 1).padStart(2, '0')}</Tag>
              <h3 className="text-[19px] font-bold uppercase tracking-[-0.015em]">{item.q}</h3>
              <p className="col-start-2 max-w-[56ch] font-[family-name:var(--di-mono)] text-[15px] leading-[1.6] text-[var(--di-graphite)] md:col-start-3">
                {item.a}
              </p>
            </li>
          ))}
        </ul>
      </section>

      {/* ── Career Compass ──────────────────────────────────────── */}
      <section id="how" className="di-band px-5 py-20 sm:px-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
          <div>
            <Tag className="!text-[var(--di-red)]">{compass.name}</Tag>
            <h2 className="mt-5 max-w-[18ch] text-[clamp(1.7rem,3.6vw,2.6rem)] font-bold uppercase leading-[1.02] tracking-[-0.03em]">
              {compass.heading}
            </h2>
            <p className="mt-6 max-w-[48ch] font-[family-name:var(--di-mono)] text-[16px] leading-[1.7] text-[var(--di-graphite)]">
              {compass.body}
            </p>
            <Link
              href={compass.href}
              className="di-link mt-7 inline-flex min-h-[44px] items-center border-b border-[var(--di-red)] font-[family-name:var(--di-mono)] text-[14px] uppercase tracking-[0.08em] text-[var(--di-red)]"
            >
              {secondaryCtas.compass.label} ▸
            </Link>
          </div>

          <dl className="grid grid-cols-1 gap-px bg-[var(--di-rule)] sm:grid-cols-2">
            {compassReadouts.map((r, i) => (
              <div key={r.key} className="bg-[var(--di-black)] p-5">
                <Tag>{String(i + 1).padStart(2, '0')}</Tag>
                <dt className="mt-2 text-[16px] font-bold uppercase tracking-[-0.01em]">{r.label}</dt>
                <dd className="mt-1.5 font-[family-name:var(--di-mono)] text-[14px] leading-[1.55] text-[var(--di-graphite)]">
                  {r.note}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* ── Method ──────────────────────────────────────────────── */}
      <section className="px-5 py-20 sm:px-8">
        <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-[var(--di-bone)] pb-3">
          <h2 className="text-[clamp(1.7rem,3.6vw,2.6rem)] font-bold uppercase leading-[1.02] tracking-[-0.03em]">
            {method.heading}
          </h2>
          <Tag>SEC 03</Tag>
        </div>
        <ol className="mt-10">
          {method.steps.map((step) => (
            <li
              key={step.n}
              className="di-row grid grid-cols-1 gap-x-8 gap-y-2 py-7 md:grid-cols-[5rem_minmax(0,0.6fr)_minmax(0,1.4fr)]"
            >
              <span className="font-[family-name:var(--di-mono)] text-[13px] text-[var(--di-red)]">
                {step.n}
              </span>
              <h3 className="text-[21px] font-bold uppercase tracking-[-0.025em]">{step.title}</h3>
              <p className="max-w-[60ch] font-[family-name:var(--di-mono)] text-[15px] leading-[1.65] text-[var(--di-graphite)]">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </section>

      {/* ── Capabilities + mid-page conversion ──────────────────── */}
      <section className="di-band grid grid-cols-1 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)]">
        <div className="border-b border-[var(--di-rule)] px-5 py-16 sm:px-8 lg:border-b-0 lg:border-r">
          <Tag>SEC 04 · CAPABILITIES</Tag>
          <ul className="mt-8">
            {capabilities.map((c) => (
              <li
                key={c.id}
                className="di-row grid grid-cols-[4.5rem_minmax(0,1fr)] items-baseline gap-x-5 py-4"
              >
                <Tag>{c.id}</Tag>
                <div>
                  <h3 className="text-[16px] font-bold uppercase tracking-[-0.01em]">{c.title}</h3>
                  <p className="mt-1 max-w-[58ch] font-[family-name:var(--di-mono)] text-[14px] leading-[1.55] text-[var(--di-graphite)]">
                    {c.body}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <aside className="flex flex-col justify-center px-5 py-16 sm:px-8">
          <Tag className="!text-[var(--di-red)]">▸ START</Tag>
          <p className="mt-4 text-[clamp(1.5rem,3vw,2.1rem)] font-extrabold uppercase leading-[1.03] tracking-[-0.035em]">
            Positioning first. Everything follows.
          </p>
          <p className="mt-4 font-[family-name:var(--di-mono)] text-[15px] leading-[1.6] text-[var(--di-graphite)]">
            Intake returns a ranked sequence, not a score to feel good about.
          </p>
          <PrimaryCta className="mt-7 justify-center" />
        </aside>
      </section>

      {/* ── Evidence ────────────────────────────────────────────── */}
      <section id="sample" className="px-5 py-20 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--di-bone)] pb-3">
          <span className="bg-[var(--di-red)] px-2.5 py-1 font-[family-name:var(--di-mono)] text-[11px] uppercase tracking-[0.14em] text-[var(--di-black)]">
            {sampleProfile.label}
          </span>
          <Tag>
            {sampleProfile.ref} · {sampleProfile.student}
          </Tag>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-20">
          <div>
            <div className="flex items-baseline gap-4">
              <span className="text-[clamp(4rem,10vw,6rem)] font-extrabold leading-none tracking-[-0.05em] text-[var(--di-red)]">
                {sampleProfile.stage.value}
              </span>
              <span className="font-[family-name:var(--di-mono)] text-[16px] uppercase tracking-[0.08em] text-[var(--di-graphite)]">
                {sampleProfile.stage.label}
              </span>
            </div>
            <dl className="mt-9">
              {sampleProfile.metrics.map((m) => (
                <div key={m.label} className="di-row py-4">
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="font-[family-name:var(--di-mono)] text-[15px] uppercase tracking-[0.04em]">
                      {m.label}
                    </dt>
                    <dd className="font-[family-name:var(--di-mono)] text-[15px] tabular-nums">
                      {m.value}
                    </dd>
                  </div>
                  {/* Measured bar drawn as hard blocks, not a soft meter. */}
                  <div
                    className="mt-2 flex gap-[3px]"
                    role="img"
                    aria-label={`${m.value} of 100`}
                  >
                    {Array.from({ length: 20 }).map((_, i) => (
                      <span
                        key={i}
                        className="h-2.5 flex-1"
                        style={{
                          background:
                            i < Math.round(m.value / 5) ? 'var(--di-bone)' : 'var(--di-rule)',
                        }}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </dl>
          </div>

          <div>
            <Tag>RANKED ACTIONS</Tag>
            <ol className="mt-6">
              {sampleProfile.actions.map((a) => (
                <li
                  key={a.rank}
                  className="di-row grid grid-cols-[2rem_minmax(0,1fr)_auto] items-baseline gap-x-4 py-4"
                >
                  <span className="font-[family-name:var(--di-mono)] text-[14px] text-[var(--di-red)]">
                    {String(a.rank).padStart(2, '0')}
                  </span>
                  <span className="text-[16px] leading-snug">{a.action}</span>
                  <Tag className="text-right">{a.window}</Tag>
                </li>
              ))}
            </ol>
            <p className="mt-6 max-w-[60ch] font-[family-name:var(--di-mono)] text-[13px] leading-[1.65] text-[var(--di-graphite)]">
              {sampleProfile.disclaimer}
            </p>
          </div>
        </div>
      </section>

      {/* ── Close ───────────────────────────────────────────────── */}
      <section className="di-band px-5 py-20 sm:px-8">
        <h2 className="max-w-[16ch] text-[clamp(2.2rem,6vw,4.25rem)] font-extrabold uppercase leading-[0.95] tracking-[-0.04em]">
          {close.heading}
        </h2>
        <p className="mt-7 max-w-[52ch] font-[family-name:var(--di-mono)] text-[16px] leading-[1.7] text-[var(--di-graphite)]">
          {close.body}
        </p>
        <div className="mt-9 flex flex-wrap items-center gap-3">
          <PrimaryCta />
          <Link
            href={secondaryCtas.sample.href}
            className="di-cta-2 di-link inline-flex min-h-[54px] items-center px-6 font-[family-name:var(--di-mono)] text-[14px] uppercase tracking-[0.08em]"
          >
            {secondaryCtas.sample.label}
          </Link>
        </div>
      </section>

      {/* Oversized wordmark, cropped by the viewport edge on purpose. */}
      <footer className="mt-16 overflow-hidden px-5 sm:px-8">
        <div className="flex items-baseline justify-between gap-6 border-b border-[var(--di-rule)] pb-4">
          <Tag>{brand.name} · CONCEPT V4</Tag>
          <Tag>DITHERED INTELLIGENCE</Tag>
        </div>
        <p
          className="di-crop -ml-[0.06em] mt-8 select-none whitespace-nowrap font-extrabold uppercase text-[var(--di-rule)]"
          aria-hidden="true"
        >
          MappedLabs
        </p>
      </footer>

      <ConceptSwitcher current="v4" />
    </div>
  );
}
