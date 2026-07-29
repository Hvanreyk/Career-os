import Link from 'next/link';
import { HeroImage } from '@/components/lab/HeroImage';
import { ConceptSwitcher } from '@/components/lab/ConceptSwitcher';
import { Wordmark } from '@/components/lab/Wordmark';
import { PlateMotion, Reveal, ScrollProgress } from './interactions';
import type { Concept } from '@/lib/lab/concepts';
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
 * DITHERED INTELLIGENCE — the selected direction.
 *
 * One page, five hero plates. /v1–/v5 each render this with a different
 * `concept`, so the only remaining decision is which image ships.
 *
 * Depth: the page runs on three ground values (black → surface → raised) rather
 * than one flat black, alternating band by band. That, plus a full-height hero
 * that parallaxes away and per-section reveals, is what stops the scroll
 * reading as a single uniform sheet.
 */

function Tag({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <span
      className={`font-[family-name:var(--di-mono)] text-[12px] uppercase tracking-[0.16em] text-[var(--di-graphite)] ${className}`}
    >
      {children}
    </span>
  );
}

function PrimaryCta({ className = '' }: { className?: string }) {
  return (
    <Link
      href={primaryCta.href}
      className={`di-cta inline-flex min-h-[56px] items-center gap-3 px-8 font-[family-name:var(--di-display)] text-[16px] font-bold uppercase tracking-[0.04em] ${className}`}
    >
      {primaryCta.label}
      <span aria-hidden="true">▸</span>
    </Link>
  );
}

/** Section opener: oversized index numeral against the title. */
function SectionHead({ n, title, kicker }: { n: string; title: string; kicker?: string }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3 border-b border-[var(--di-bone)] pb-4">
      <div className="flex items-end gap-5 sm:gap-7">
        <span
          className="font-[family-name:var(--di-display)] text-[clamp(2.5rem,7vw,5rem)] font-extrabold leading-[0.78] tracking-[-0.05em] text-[var(--di-rule-bright)]"
          aria-hidden="true"
        >
          {n}
        </span>
        <h2 className="max-w-[22ch] text-[clamp(1.6rem,3.4vw,2.5rem)] font-bold uppercase leading-[1.02] tracking-[-0.03em]">
          {title}
        </h2>
      </div>
      {kicker ? <Tag>{kicker}</Tag> : null}
    </div>
  );
}

export function DitheredHome({ concept }: { concept: Concept }) {
  return (
    <div className="di min-h-screen overflow-x-hidden">
      {/* ── Terminal bar ─────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 bg-[var(--di-black)]/92 backdrop-blur-[2px]">
        <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-3 sm:px-8">
          <Wordmark className="h-6 w-auto" ink="var(--di-bone)" accent="var(--di-red)" />
          <div className="flex items-center gap-5">
            <Tag className="hidden sm:inline">SYS · CAREER MAP</Tag>
            <Tag>
              PLATE {concept.id.toUpperCase()} · {concept.name.toUpperCase()}
            </Tag>
          </div>
        </div>
        <ScrollProgress />
      </header>

      {/* ── Hero: full-bleed plate, headline over the black left ─── */}
      <section className="relative min-h-[calc(100svh-3.25rem)] overflow-hidden border-b border-[var(--di-rule)]">
        <PlateMotion>
          <HeroImage
            slug={concept.slug}
            alt={concept.alt}
            className="h-full w-full object-cover"
            position={concept.position}
          />
        </PlateMotion>

        {/* Hold the left for type; clear by the midpoint so the plate reads. */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(97deg, var(--di-black) 0%, rgba(10,10,11,0.95) 26%, rgba(10,10,11,0.72) 42%, rgba(10,10,11,0.2) 62%, rgba(10,10,11,0) 80%)',
          }}
          aria-hidden="true"
        />
        <div
          className="absolute inset-x-0 bottom-0 h-40"
          style={{ background: 'linear-gradient(to top, var(--di-black), transparent)' }}
          aria-hidden="true"
        />
        <div className="di-scan pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true" />

        <div className="relative mx-auto flex min-h-[calc(100svh-3.25rem)] max-w-[1600px] flex-col px-5 sm:px-8">
          <div className="flex flex-1 items-center py-16">
            <div className="max-w-[40rem]">
              <Tag className="!text-[var(--di-red)]">{brand.eyebrow}</Tag>
              <h1 className="mt-6 max-w-[14ch] text-[clamp(2.6rem,7vw,5.5rem)] font-extrabold uppercase leading-[0.92] tracking-[-0.042em] [word-spacing:0.12em]">
                Map your route into investment banking
              </h1>
              <p className="mt-7 max-w-[48ch] font-[family-name:var(--di-mono)] text-[16px] leading-[1.68] text-[var(--di-graphite)]">
                {brand.support}
              </p>
              <div className="mt-10 flex flex-wrap items-center gap-3">
                <PrimaryCta />
                <Link
                  href={secondaryCtas.how.href}
                  className="di-cta-2 di-link inline-flex min-h-[56px] items-center px-6 font-[family-name:var(--di-mono)] text-[14px] uppercase tracking-[0.08em]"
                >
                  {secondaryCtas.how.label}
                </Link>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[var(--di-rule)] py-4">
            <Tag>{concept.caption}</Tag>
            <Tag className="hidden md:inline">ROUTE AU·IB — 01</Tag>
            <Tag>34°55′S 138°36′E</Tag>
          </div>
        </div>
      </section>

      {/* ── 01 Problem ───────────────────────────────────────────── */}
      <section className="di-tex relative px-5 py-24 sm:px-8">
        <div className="mx-auto max-w-[1600px]">
          <Reveal>
            <SectionHead n="01" title={problem.heading} kicker="OBSERVATION" />
            <p className="mt-7 max-w-[64ch] font-[family-name:var(--di-mono)] text-[16px] leading-[1.72] text-[var(--di-graphite)]">
              {problem.body}
            </p>
          </Reveal>

          <ul className="mt-14">
            {problem.unknowns.map((item, i) => (
              <Reveal as="li" key={item.q} delay={i * 55}>
                <div className="di-row grid grid-cols-[3rem_minmax(0,1fr)] items-baseline gap-x-5 gap-y-1 py-6 md:grid-cols-[3.5rem_minmax(0,0.8fr)_minmax(0,1.2fr)]">
                  <Tag className="!text-[var(--di-red)]">{String(i + 1).padStart(2, '0')}</Tag>
                  <h3 className="text-[19px] font-bold uppercase tracking-[-0.015em]">{item.q}</h3>
                  <p className="col-start-2 max-w-[56ch] font-[family-name:var(--di-mono)] text-[15px] leading-[1.62] text-[var(--di-graphite)] md:col-start-3">
                    {item.a}
                  </p>
                </div>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* ── 02 Career Compass — raised stratum ───────────────────── */}
      <section id="how" className="di-surface di-tex di-edge-top relative border-y border-[var(--di-rule)] px-5 py-24 sm:px-8">
        <div className="mx-auto max-w-[1600px]">
          <Reveal>
            <SectionHead n="02" title={compass.heading} kicker={compass.name.toUpperCase()} />
          </Reveal>
          <div className="mt-12 grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-16">
            <Reveal className="lg:sticky lg:top-24 lg:self-start">
              <p className="max-w-[48ch] font-[family-name:var(--di-mono)] text-[16px] leading-[1.72] text-[var(--di-graphite)]">
                {compass.body}
              </p>
              <Link
                href={compass.href}
                className="di-link mt-7 inline-flex min-h-[44px] items-center border-b border-[var(--di-red)] font-[family-name:var(--di-mono)] text-[14px] uppercase tracking-[0.08em] text-[var(--di-red)]"
              >
                {secondaryCtas.compass.label} ▸
              </Link>
            </Reveal>

            <dl className="grid grid-cols-1 gap-px bg-[var(--di-rule)] sm:grid-cols-2">
              {compassReadouts.map((r, i) => (
                <Reveal key={r.key} delay={i * 40}>
                  <div className="di-raised h-full p-6">
                    <Tag>{String(i + 1).padStart(2, '0')}</Tag>
                    <dt className="mt-2 text-[16px] font-bold uppercase tracking-[-0.01em]">
                      {r.label}
                    </dt>
                    <dd className="mt-2 font-[family-name:var(--di-mono)] text-[14px] leading-[1.58] text-[var(--di-graphite)]">
                      {r.note}
                    </dd>
                  </div>
                </Reveal>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* ── 03 Method ────────────────────────────────────────────── */}
      <section className="px-5 py-24 sm:px-8">
        <div className="mx-auto max-w-[1600px]">
          <Reveal>
            <SectionHead n="03" title={method.heading} kicker="METHOD" />
            <p className="mt-7 max-w-[60ch] font-[family-name:var(--di-mono)] text-[16px] leading-[1.72] text-[var(--di-graphite)]">
              {method.body}
            </p>
          </Reveal>
          <ol className="mt-12">
            {method.steps.map((step, i) => (
              <Reveal as="li" key={step.n} delay={i * 55}>
                <div className="di-row grid grid-cols-1 gap-x-10 gap-y-2 py-8 md:grid-cols-[5rem_minmax(0,0.55fr)_minmax(0,1.45fr)]">
                  <span className="font-[family-name:var(--di-mono)] text-[13px] text-[var(--di-red)]">
                    {step.n}
                  </span>
                  <h3 className="text-[21px] font-bold uppercase tracking-[-0.025em]">
                    {step.title}
                  </h3>
                  <p className="max-w-[62ch] font-[family-name:var(--di-mono)] text-[15px] leading-[1.68] text-[var(--di-graphite)]">
                    {step.body}
                  </p>
                </div>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* ── 04 Evidence — the sample readout, deepest stratum ─────── */}
      <section
        id="sample"
        className="di-surface di-tex di-edge-top relative border-y border-[var(--di-rule)] px-5 py-24 sm:px-8"
      >
        <div className="mx-auto max-w-[1600px]">
          <Reveal>
            <SectionHead n="04" title="What the output actually looks like" kicker="WORKED EXAMPLE" />
          </Reveal>

          <Reveal className="mt-10">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="bg-[var(--di-red)] px-2.5 py-1 font-[family-name:var(--di-mono)] text-[11px] uppercase tracking-[0.14em] text-[var(--di-black)]">
                {sampleProfile.label}
              </span>
              <Tag>
                {sampleProfile.ref} · {sampleProfile.student}
              </Tag>
            </div>
          </Reveal>

          {/* Headline verdict + index */}
          <Reveal className="mt-10">
            <div className="di-raised grid grid-cols-1 gap-8 border border-[var(--di-rule)] p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-14">
              <div>
                <h3 className="max-w-[18ch] text-[clamp(1.5rem,3vw,2.2rem)] font-bold uppercase leading-[1.04] tracking-[-0.03em]">
                  {sampleProfile.verdict}
                </h3>
                <div className="mt-7 flex items-end gap-5">
                  <span className="font-[family-name:var(--di-display)] text-[clamp(4rem,11vw,7rem)] font-extrabold leading-[0.8] tracking-[-0.05em] text-[var(--di-red)]">
                    {sampleProfile.headlineIndex}
                  </span>
                  <div className="pb-2">
                    <Tag>/ 100</Tag>
                    <div className="mt-1 font-[family-name:var(--di-mono)] text-[13px] uppercase tracking-[0.12em] text-[var(--di-bone)]">
                      {sampleProfile.headlineBand} · {sampleProfile.headlineTier}
                    </div>
                  </div>
                </div>
              </div>
              <div className="border-t border-[var(--di-rule)] pt-6 lg:border-l lg:border-t-0 lg:pl-14 lg:pt-0">
                <span className="font-[family-name:var(--di-display)] text-[clamp(2rem,5vw,3rem)] font-extrabold tracking-[-0.04em] text-[var(--di-red)]">
                  {sampleProfile.probability.value}
                </span>
                <p className="mt-3 max-w-[46ch] font-[family-name:var(--di-mono)] text-[15px] leading-[1.65] text-[var(--di-graphite)]">
                  {sampleProfile.probability.note}
                </p>
              </div>
            </div>
          </Reveal>

          {/* Per-tier indices */}
          <Reveal className="mt-12">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h3 className="text-[19px] font-bold uppercase tracking-[-0.02em]">
                Where you stand, by tier
              </h3>
              <Tag>ONE SCORE IS NEVER THE WHOLE STORY</Tag>
            </div>
            <dl className="mt-5 grid grid-cols-1 gap-px bg-[var(--di-rule)] sm:grid-cols-2 lg:grid-cols-4">
              {sampleProfile.tiers.map((t) => (
                <div key={t.tier} className="di-raised p-5">
                  <dt className="font-[family-name:var(--di-mono)] text-[13px] uppercase tracking-[0.1em] text-[var(--di-graphite)]">
                    {t.tier}
                  </dt>
                  <dd>
                    <div className="mt-3 font-[family-name:var(--di-display)] text-[44px] font-extrabold leading-none tracking-[-0.045em]">
                      {t.index}
                    </div>
                    <div
                      className="mt-2 font-[family-name:var(--di-mono)] text-[12px] uppercase tracking-[0.14em]"
                      style={{ color: t.band === 'Competitive' ? 'var(--di-bone)' : 'var(--di-red)' }}
                    >
                      {t.band}
                    </div>
                    {/* Hard block meter — no soft progress bars on this page. */}
                    <div className="mt-3 flex gap-[3px]" role="img" aria-label={`${t.index} of 100`}>
                      {Array.from({ length: 20 }).map((_, i) => (
                        <span
                          key={i}
                          className="h-2 flex-1"
                          style={{
                            background:
                              i < Math.round(t.index / 5)
                                ? t.band === 'Competitive'
                                  ? 'var(--di-bone)'
                                  : 'var(--di-red)'
                                : 'var(--di-rule)',
                          }}
                        />
                      ))}
                    </div>
                    <div className="mt-3 font-[family-name:var(--di-mono)] text-[12px] text-[var(--di-graphite)]">
                      ≈ {t.shot} shot
                    </div>
                  </dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 border-l-2 border-[var(--di-red)] pl-4 font-[family-name:var(--di-mono)] text-[14px] leading-[1.6] text-[var(--di-bone)]">
              Recommended aim: anchor applications at{' '}
              <strong className="font-bold">{sampleProfile.recommendedAim.anchor}</strong> and keep{' '}
              <strong className="font-bold">{sampleProfile.recommendedAim.stretch}</strong> live as a
              stretch.
            </p>
          </Reveal>

          {/* Signed drivers */}
          <Reveal className="mt-14">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h3 className="text-[19px] font-bold uppercase tracking-[-0.02em]">
                What&apos;s driving the score
              </h3>
              <Tag>EVERY POINT TRACES TO SOMETHING REAL</Tag>
            </div>
            <ul className="mt-5">
              {sampleProfile.drivers.map((d) => {
                const positive = d.points > 0;
                const width = `${(Math.abs(d.points) / 15) * 100}%`;
                return (
                  <li
                    key={d.factor}
                    className="grid grid-cols-[minmax(0,1fr)_3.5rem_minmax(0,1.1fr)] items-center gap-x-4 border-b border-[var(--di-rule)] py-3.5"
                  >
                    <span className="font-[family-name:var(--di-mono)] text-[15px] leading-snug">
                      {d.factor}
                    </span>
                    <span
                      className="text-right font-[family-name:var(--di-display)] text-[17px] font-bold tabular-nums"
                      style={{ color: positive ? 'var(--di-bone)' : 'var(--di-red)' }}
                    >
                      {positive ? '+' : ''}
                      {d.points}
                    </span>
                    <span className="hidden h-3 sm:block" aria-hidden="true">
                      <span
                        className="block h-full"
                        style={{
                          width,
                          background: positive ? 'var(--di-bone)' : 'var(--di-red)',
                        }}
                      />
                    </span>
                  </li>
                );
              })}
            </ul>
            <div className="mt-3 flex justify-between">
              <Tag>← HOLDS YOU BACK</Tag>
              <Tag>LIFTS YOU →</Tag>
            </div>
          </Reveal>

          {/* Ranked moves */}
          <Reveal className="mt-14">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h3 className="text-[19px] font-bold uppercase tracking-[-0.02em]">
                Highest-leverage moves
              </h3>
              <Tag>RANKED BY POINT-IMPACT, NOT A CHECKLIST</Tag>
            </div>
            <ol className="mt-5 grid grid-cols-1 gap-px bg-[var(--di-rule)]">
              {sampleProfile.actions.map((a) => (
                <li
                  key={a.rank}
                  className="di-raised grid grid-cols-[3rem_minmax(0,1fr)] gap-x-5 p-5 sm:grid-cols-[4rem_minmax(0,1fr)] sm:p-6"
                >
                  <span className="font-[family-name:var(--di-display)] text-[28px] font-extrabold leading-none tracking-[-0.04em] text-[var(--di-rule-bright)]">
                    #{a.rank}
                  </span>
                  <div>
                    <h4 className="text-[17px] font-bold uppercase tracking-[-0.015em]">
                      {a.action}
                    </h4>
                    <p className="mt-2 max-w-[68ch] font-[family-name:var(--di-mono)] text-[14px] leading-[1.62] text-[var(--di-graphite)]">
                      {a.detail}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="border border-[var(--di-rule-bright)] px-2.5 py-1 font-[family-name:var(--di-mono)] text-[12px] uppercase tracking-[0.1em] text-[var(--di-graphite)]">
                        Effort: {a.effort}
                      </span>
                      <span className="border border-[var(--di-rule-bright)] px-2.5 py-1 font-[family-name:var(--di-mono)] text-[12px] uppercase tracking-[0.1em] text-[var(--di-graphite)]">
                        by {a.by}
                      </span>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
            <p className="mt-5 max-w-[70ch] font-[family-name:var(--di-mono)] text-[13px] leading-[1.65] text-[var(--di-graphite)]">
              {sampleProfile.disclaimer}
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── 05 Capabilities + mid-page conversion ────────────────── */}
      <section className="px-5 py-24 sm:px-8">
        <div className="mx-auto max-w-[1600px]">
          <Reveal>
            <SectionHead n="05" title="Everything the map covers" kicker="CAPABILITIES" />
          </Reveal>
          <div className="mt-12 grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.65fr)] lg:gap-16">
            <ul>
              {capabilities.map((c, i) => (
                <Reveal as="li" key={c.id} delay={i * 35}>
                  <div className="di-row grid grid-cols-[4.5rem_minmax(0,1fr)] items-baseline gap-x-5 py-4">
                    <Tag>{c.id}</Tag>
                    <div>
                      <h3 className="text-[16px] font-bold uppercase tracking-[-0.01em]">
                        {c.title}
                      </h3>
                      <p className="mt-1.5 max-w-[58ch] font-[family-name:var(--di-mono)] text-[14px] leading-[1.58] text-[var(--di-graphite)]">
                        {c.body}
                      </p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </ul>

            <Reveal className="lg:sticky lg:top-24 lg:self-start">
              <aside className="di-raised border border-[var(--di-rule-bright)] p-7">
                <Tag className="!text-[var(--di-red)]">▸ START</Tag>
                <p className="mt-4 text-[clamp(1.5rem,3vw,2rem)] font-extrabold uppercase leading-[1.04] tracking-[-0.035em]">
                  Benchmark first. Everything follows.
                </p>
                <p className="mt-4 font-[family-name:var(--di-mono)] text-[15px] leading-[1.62] text-[var(--di-graphite)]">
                  Intake returns a per-tier index and a ranked sequence, not a score to feel good
                  about.
                </p>
                <PrimaryCta className="mt-7 w-full justify-center" />
              </aside>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── Close ────────────────────────────────────────────────── */}
      <section className="di-surface di-tex di-edge-top relative border-t border-[var(--di-rule)] px-5 py-28 sm:px-8">
        <div className="mx-auto max-w-[1600px]">
          <Reveal>
            <h2 className="max-w-[15ch] text-[clamp(2.4rem,7vw,5rem)] font-extrabold uppercase leading-[0.94] tracking-[-0.042em]">
              {close.heading}
            </h2>
            <p className="mt-7 max-w-[54ch] font-[family-name:var(--di-mono)] text-[16px] leading-[1.72] text-[var(--di-graphite)]">
              {close.body}
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-3">
              <PrimaryCta />
              <Link
                href={secondaryCtas.sample.href}
                className="di-cta-2 di-link inline-flex min-h-[56px] items-center px-6 font-[family-name:var(--di-mono)] text-[14px] uppercase tracking-[0.08em]"
              >
                {secondaryCtas.sample.label}
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Marquee footer ───────────────────────────────────────── */}
      <footer className="border-t border-[var(--di-rule)] pb-24 pt-8">
        <div className="mx-auto mb-7 flex max-w-[1600px] flex-wrap items-center justify-between gap-3 px-5 sm:px-8">
          <Tag>
            {brand.name} · PLATE {concept.id.toUpperCase()} · {concept.name.toUpperCase()}
          </Tag>
          <Tag>DITHERED INTELLIGENCE</Tag>
        </div>

        {/* Two identical tracks translating by exactly -50% → 0 loop seamlessly,
            travelling left to right. Paused on hover and for reduced motion. */}
        <div className="di-marquee-wrap w-full overflow-hidden" aria-hidden="true">
          <div className="di-marquee">
            {[0, 1].map((copy) => (
              <div key={copy} className="flex shrink-0">
                {Array.from({ length: 4 }).map((_, i) => (
                  <span
                    key={i}
                    className={`di-marquee-word whitespace-nowrap font-[family-name:var(--di-display)] font-extrabold uppercase ${
                      i % 2 === 0 ? 'is-solid' : ''
                    }`}
                  >
                    MappedLabs
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
        <span className="sr-only">MappedLabs</span>
      </footer>

      <ConceptSwitcher current={concept.id} />
    </div>
  );
}
