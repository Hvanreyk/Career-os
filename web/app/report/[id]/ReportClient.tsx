'use client';

import type { ScoringOutput, FitBand } from '@trajectoryos/core/scoring/types';
import type { LLMReport } from '@trajectoryos/core/llm/types';
import Link from 'next/link';
import { PageHeader, PageShell } from '@/components/ui/PageHeader';
import { Panel, PanelHeader, Row, Stat } from '@/components/ui/Panel';
import { Meter, StatusLabel } from '@/components/ui/Status';
import DownloadCompassReport from './DownloadCompassReport';

// ─── Helpers ──────────────────────────────────────────────────

type Tone = 'neutral' | 'accent' | 'ok' | 'warn';

/* Bands are stated as words first. The tint only reinforces the word, which is
   what keeps the report readable in greyscale and for colour-blind readers. */
const FIT_CONFIG: Record<FitBand, { label: string; tone: Tone }> = {
  strong_fit: { label: 'Strong Fit', tone: 'ok' },
  stretch_but_achievable: { label: 'Stretch — Achievable', tone: 'warn' },
  reach: { label: 'Reach', tone: 'warn' },
  long_shot: { label: 'Long Shot', tone: 'neutral' },
};

const STAGE_LABELS: Record<string, string> = {
  S0: 'No Finance Experience',
  S1: 'Early — One Entry Role',
  S2: 'Building — Some Relevant XP',
  S3: 'Strong — Penultimate Ready',
  S4: 'Elite — Multi-Internship',
  S5: 'Lateral Candidate',
};

const PRIORITY_LABEL: Record<number, string> = { 1: '#1', 2: '#2', 3: '#3' };

// action.deadline is a YYYY-MM-DD date-only value; parsing it with `new Date()`
// reads it as UTC midnight, which renders as the prior month/year west of UTC.
function formatLocalDate(isoDate: string) {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('en-AU', { month: 'short', year: 'numeric' });
}

/**
 * A titled region of the report.
 *
 * Deliberately not a card: the report is a document, so sections are separated
 * by a rule and a heading rather than boxed one after another.
 */
function SectionCard({
  title,
  eyebrow,
  label,
  children,
}: {
  title: string;
  eyebrow?: string;
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-12">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-bone pb-3">
        <h2 className="text-[17px] font-bold uppercase tracking-[-0.015em] text-bone">{title}</h2>
        {label && <span className="ml-label">{label}</span>}
      </div>
      {eyebrow && (
        <p className="mt-3 max-w-[72ch] text-[15px] leading-[1.6] text-graphite">{eyebrow}</p>
      )}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function cleanMarkdown(text: string) {
  return text
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/^\s*[-*]\s+/gm, '\n\n')
    .trim();
}

function Prose({ text }: { text: string }) {
  const blocks = cleanMarkdown(text).split(/\n\s*\n/).map((block) => block.trim()).filter(Boolean);

  return (
    <div className="space-y-4">
      {blocks.map((block, i) => (
        <p key={i} className="max-w-[72ch] text-[16px] leading-[1.7] text-bone/90">
          {block}
        </p>
      ))}
    </div>
  );
}

// ─── Competitiveness (primary report lens) ────────────────────

const COMP_BAND: Record<string, { label: string; tone: Tone }> = {
  strong: { label: 'Strong', tone: 'ok' },
  competitive: { label: 'Competitive', tone: 'ok' },
  developing: { label: 'Developing', tone: 'warn' },
  reach: { label: 'Reach', tone: 'warn' },
};
const TIER_LABEL: Record<string, string> = {
  bb: 'Bulge Bracket', elite_boutique: 'Elite Boutique', mid_market: 'Mid-Market', boutique: 'Boutique', any: 'Any Tier',
};
const tierLabel = (t: string) => TIER_LABEL[t] ?? t;
const pctText = (p: number) => `${(p * 100).toFixed(p < 0.1 ? 1 : 0)}%`;

type Competitiveness = NonNullable<ScoringOutput['competitiveness']>;

const COMP_GUIDANCE: Record<Competitiveness['band'], string> = {
  strong:
    'Your profile is already credible for front-office recruiting. Focus on converting that strength into interviews and closing the few visible gaps before applications matter.',
  competitive:
    'Your profile can credibly compete for front-office roles. The highest-leverage unlock is closing the few visible gaps before applications matter.',
  developing:
    'Your profile is still developing for front-office recruiting. Closing the highest-impact gaps now will make your applications materially more credible.',
  reach:
    'This target is currently a reach. Build the highest-impact signals first, then use a wider application strategy while you strengthen your profile.',
};

function CompetitivenessSection({
  comp,
  actions,
}: {
  comp: Competitiveness;
  actions: ScoringOutput['actions'];
}) {
  const band = COMP_BAND[comp.band] ?? COMP_BAND.developing;
  const maxMag = Math.max(1, ...comp.contributions.map((c) => Math.abs(c.points)));
  const topActions = actions.slice(0, 8);
  const projectedImpact = topActions.reduce((total, action) => total + (action.index_impact ?? 0), 0);
  const finalIndex = Math.max(0, Math.min(100, comp.index + projectedImpact));
  const targetLabel = tierLabel(comp.primary_tier);
  const projectedBandKey = finalIndex >= 80
    ? 'strong'
    : finalIndex >= 65
      ? 'competitive'
      : finalIndex >= 45
        ? 'developing'
        : 'reach';
  const projectedBand = COMP_BAND[projectedBandKey];
  const runningIndex = topActions.reduce<number[]>(
    (acc, action) => [...acc, Math.max(0, Math.min(100, acc[acc.length - 1] + (action.index_impact ?? 0)))],
    [comp.index],
  );

  return (
    <>
      {/* ── The headline figure ───────────────────────────────── */}
      <Panel className="mt-10">
        <PanelHeader
          label="Competitiveness"
          title={`${targetLabel} index`}
          action={<StatusLabel tone={band.tone}>{band.label}</StatusLabel>}
        />
        <div className="grid gap-8 p-5 sm:p-6 md:grid-cols-[minmax(0,19rem)_minmax(0,1fr)] md:gap-10">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="ml-num text-[60px] font-bold leading-none tracking-[-0.04em] text-bone">
                {comp.index}
              </span>
              <span className="ml-num text-[15px] text-graphite">/ 100</span>
            </div>
            {/* Accent here and nowhere else on the page: this number is the
                single figure the whole report is organised around. */}
            <Meter
              value={comp.index}
              accent
              className="mt-4"
              label={`${targetLabel} index: ${comp.index} out of 100`}
            />
            <div className="mt-6 grid grid-cols-2 gap-5">
              <Stat
                label="Shot this cycle"
                value={`~${pctText(comp.estimated_probability)}`}
                sub={`Front-office IB at ${targetLabel}`}
              />
              <Stat
                label="Vs. the field"
                value={`${comp.multiplier_vs_field.toFixed(1)}×`}
                sub="The typical serious candidate"
              />
            </div>
          </div>

          <div>
            <p className="max-w-[62ch] text-[16px] leading-[1.7] text-bone/90">
              {COMP_GUIDANCE[comp.band]}
            </p>
            <p className="mt-4 max-w-[62ch] text-[15px] leading-[1.6] text-graphite">
              Across the broader ladder, your front-office probability is{' '}
              <span className="ml-num text-bone">~{pctText(comp.any_front_office_probability)}</span>.
            </p>
          </div>
        </div>
      </Panel>

      {/* ── Actions: the only part of the report you can act on ── */}
      {actions.length > 0 && (
        <SectionCard
          title="Your highest-leverage moves"
          label={`${topActions.length} ranked`}
          eyebrow="Ranked by actual point-impact on your index — not a generic checklist."
        >
          <ol>
            {topActions.map((action, i) => {
              const impact = action.index_impact;
              const prevIndex = runningIndex[i];
              const nextIndex = runningIndex[i + 1];
              const first = i === 0;
              return (
                <Row
                  as="li"
                  key={i}
                  className={`grid grid-cols-[2.5rem_minmax(0,1fr)] items-start gap-x-4 gap-y-3 py-6 sm:grid-cols-[3rem_minmax(0,1fr)_7rem] sm:gap-x-6 ${
                    first ? 'border-l-2 border-l-red pl-4 sm:pl-5' : ''
                  }`}
                >
                  <span className="ml-num text-[20px] font-bold leading-none text-graphite">
                    {String(i + 1).padStart(2, '0')}
                  </span>

                  <div className="min-w-0">
                    <h3 className="text-[18px] font-bold uppercase leading-tight tracking-[-0.015em] text-bone">
                      {action.title}
                    </h3>
                    <p className="mt-2 max-w-[70ch] text-[16px] leading-[1.6] text-graphite">
                      {action.description}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {first && <StatusLabel tone="accent">Start here</StatusLabel>}
                      <StatusLabel>
                        Effort:{' '}
                        {action.estimated_effort.charAt(0).toUpperCase() +
                          action.estimated_effort.slice(1)}
                      </StatusLabel>
                      {action.deadline && (
                        <StatusLabel>By {formatLocalDate(action.deadline)}</StatusLabel>
                      )}
                    </div>
                    {impact != null && (
                      <p className="ml-num mt-3 text-[13px] text-graphite">
                        {targetLabel} index {prevIndex} → <span className="text-bone">{nextIndex}</span>
                      </p>
                    )}
                  </div>

                  <div className="col-start-2 sm:col-start-3 sm:justify-self-end sm:text-right">
                    {impact != null ? (
                      <>
                        <span className="ml-num text-[26px] font-bold leading-none text-bone">
                          {impact >= 0 ? '+' : ''}
                          {impact}
                        </span>
                        <span className="ml-label mt-1 block sm:text-right">index pts</span>
                      </>
                    ) : (
                      <>
                        <span className="ml-num text-[26px] font-bold leading-none text-bone">
                          {PRIORITY_LABEL[action.priority]}
                        </span>
                        <span className="ml-label mt-1 block sm:text-right">priority</span>
                      </>
                    )}
                  </div>
                </Row>
              );
            })}
          </ol>

          {/* Where those moves land you */}
          <div className="mt-6 border border-rule p-5">
            <span className="ml-label">If you close the moves above</span>
            <div className="mt-3 flex flex-wrap items-baseline gap-3">
              <span className="ml-num text-[28px] font-bold leading-none text-graphite">
                {comp.index}
              </span>
              <span className="text-graphite" aria-hidden="true">
                →
              </span>
              <span className="ml-num text-[28px] font-bold leading-none text-bone">
                {finalIndex}
              </span>
              <span className="text-[15px] text-graphite">
                {projectedBand.label} for {targetLabel}
              </span>
            </div>
            <Meter
              value={finalIndex}
              className="mt-4"
              label={`Projected ${targetLabel} index: ${finalIndex} out of 100`}
            />
          </div>
        </SectionCard>
      )}

      {/* ── Where you stand, by tier ──────────────────────────── */}
      <SectionCard
        title="Where you stand, by tier"
        label={`${comp.per_tier.length} tiers`}
        eyebrow="One score isn't the whole story — the same profile reads differently at each tier."
      >
        <div className="border-t border-rule">
          {comp.per_tier.map((t) => {
            const b = COMP_BAND[t.band] ?? COMP_BAND.developing;
            return (
              <Row
                key={t.tier}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 py-4 sm:grid-cols-[11rem_3rem_minmax(0,1fr)_7rem] sm:gap-x-5"
              >
                <span className="text-[15px] text-bone">{tierLabel(t.tier)}</span>
                <span className="ml-num text-right text-[18px] font-bold text-bone sm:text-left">
                  {t.index}
                </span>
                <Meter
                  value={t.index}
                  className="col-span-2 sm:col-span-1"
                  label={`${tierLabel(t.tier)}: ${t.index} out of 100`}
                />
                <span className="col-span-2 flex items-center justify-between gap-3 sm:col-span-1 sm:justify-end">
                  <span className="ml-num text-[13px] text-graphite">
                    ≈ {pctText(t.estimated_probability)}
                  </span>
                  <StatusLabel tone={b.tone}>{b.label}</StatusLabel>
                </span>
              </Row>
            );
          })}
        </div>

        <p className="mt-6 max-w-[72ch] border-l-2 border-rule-bright pl-4 text-[16px] leading-[1.6] text-graphite">
          <span className="text-bone">Recommended aim:</span> anchor applications at{' '}
          <span className="text-bone">{tierLabel(comp.recommended_target)}</span> and keep{' '}
          <span className="text-bone">{tierLabel(comp.stretch_target)}</span> live as a stretch.
        </p>
      </SectionCard>

      {/* ── What drives the score ─────────────────────────────── */}
      {comp.contributions.length > 0 && (
        <SectionCard
          title={`What's driving your ${targetLabel} score`}
          label={`${comp.contributions.length} factors`}
          eyebrow="Every point traces to something real in your profile."
        >
          <div className="border-t border-rule">
            {comp.contributions.map((f, i) => {
              const pos = f.points >= 0;
              const width = `${(Math.abs(f.points) / maxMag) * 100}%`;
              return (
                <Row
                  key={i}
                  className="grid grid-cols-[minmax(0,1fr)_3.5rem] items-center gap-x-4 py-3.5 sm:grid-cols-[minmax(0,1fr)_3.5rem_minmax(0,42%)] sm:gap-x-5"
                >
                  <span className="text-[15px] leading-snug text-bone">{f.label}</span>
                  <span
                    className={`ml-num text-right text-[15px] font-bold ${
                      pos ? 'text-bone' : 'text-graphite'
                    }`}
                  >
                    {pos ? '+' : ''}
                    {f.points}
                  </span>
                  {/* Diverging bar around a centre line. Direction is stated by
                      the sign next to it, so it never relies on the bar alone. */}
                  <span className="hidden h-3 items-stretch sm:flex" aria-hidden="true">
                    <span className="flex w-1/2 justify-end">
                      {!pos && <span className="bg-rule-bright" style={{ width }} />}
                    </span>
                    <span className="w-px bg-rule" />
                    <span className="flex w-1/2 justify-start">
                      {pos && <span className="bg-bone" style={{ width }} />}
                    </span>
                  </span>
                </Row>
              );
            })}
          </div>
          <div className="ml-label mt-3 flex justify-between">
            <span>◂ Holds you back</span>
            <span>Lifts you ▸</span>
          </div>
        </SectionCard>
      )}
    </>
  );
}

// ─── Main component ───────────────────────────────────────────

export default function ReportClient({
  reportId,
  report,
  llm,
  createdAt,
}: {
  reportId: string;
  report: ScoringOutput;
  llm: LLMReport;
  createdAt: string;
}) {
  const fitCfg = FIT_CONFIG[report.match_summary.fit_band];
  const successPct = report.match_summary.matched_count > 0
    ? Math.round((report.match_summary.reached_target_count / report.match_summary.matched_count) * 100)
    : 0;
  const { fit_lift, avg_top5_distance } = report.match_summary;
  // Older stored reports predate these fields — only render what we have.
  const fitDetailParts = [
    fit_lift != null ? `${fit_lift.toFixed(1)}x the pool base rate` : null,
    avg_top5_distance != null ? `${Math.round((1 - avg_top5_distance) * 100)}% match confidence` : null,
  ].filter((p): p is string => p !== null);
  const createdDate = new Date(createdAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <PageShell>
      <PageHeader
        label="Career Compass"
        title="Your Career Compass"
        lede="Your profile scored against real investment-banking career paths, with the moves that shift it most."
        actions={<StatusLabel>Generated {createdDate}</StatusLabel>}
      />

      {/* ── Competitiveness (primary lens) ── */}
      {report.competitiveness && (
        <CompetitivenessSection comp={report.competitiveness} actions={report.actions} />
      )}

      {/* ── Stage + Fit band (fallback for reports predating competitiveness) ── */}
      {!report.competitiveness && (
        <Panel className="mt-10">
          <PanelHeader
            label="Assessment"
            title="Stage and fit"
            action={<StatusLabel tone={fitCfg.tone}>{fitCfg.label}</StatusLabel>}
          />
          <div className="grid gap-6 p-5 sm:grid-cols-2 sm:p-6">
            <Stat
              label="Career stage"
              value={report.stage}
              sub={STAGE_LABELS[report.stage] ?? report.stage_description}
            />
            <Stat
              label="Reached your target"
              value={`${successPct}%`}
              sub={
                <>
                  of matched profiles reached your target
                  {fitDetailParts.length > 0 && (
                    <span className="ml-num mt-1 block">{fitDetailParts.join(' · ')}</span>
                  )}
                </>
              }
            />
          </div>
        </Panel>
      )}

      {/* ── You vs cohort median ── */}
      {report.gaps.length > 0 && (
        <SectionCard
          title={`You vs. the median ${tierLabel(report.target.tier)} analyst`}
          label={`${report.gaps.slice(0, 6).length} dimensions`}
          eyebrow="Measured against the matched professional cohort."
        >
          <div className="border-t border-rule">
            <div className="ml-label hidden grid-cols-[1.4fr_0.7fr_0.9fr_5rem] gap-3 border-b border-rule py-2.5 sm:grid">
              <span>Dimension</span>
              <span>You</span>
              <span>Cohort signal</span>
              <span className="text-right">Status</span>
            </div>
            {report.gaps.slice(0, 6).map((gap) => (
              <Row
                key={gap.gap_key}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 py-3.5 sm:grid-cols-[1.4fr_0.7fr_0.9fr_5rem]"
              >
                <span className="text-[15px] text-bone">{gap.display_name}</span>
                <span className="text-right text-[14px] font-semibold text-bone sm:text-left">
                  {gap.student_has ? 'Yes' : 'Not yet'}
                </span>
                <span className="ml-num text-[13px] text-graphite">
                  {Math.round(gap.match_pct * 100)}% have this
                </span>
                <span className="justify-self-end">
                  <StatusLabel
                    tone={gap.student_has ? 'ok' : gap.actionability === 'high' ? 'warn' : 'neutral'}
                  >
                    {gap.student_has ? 'On par' : gap.actionability === 'high' ? 'Gap' : 'Build'}
                  </StatusLabel>
                </span>
              </Row>
            ))}
          </div>
        </SectionCard>
      )}

      {/* ── Match stats ── */}
      <SectionCard
        title="Match statistics"
        label="Scoring engine"
        eyebrow="How large the comparable pool was, and how much of it reached your target."
      >
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {[
            { label: 'Profiles analysed', value: report.match_summary.total_professionals ?? report.match_summary.pool_size },
            { label: 'Similar to you', value: report.match_summary.matched_count },
            { label: 'Reached target', value: report.match_summary.reached_target_count },
          ].map(({ label, value }) => (
            <Stat key={label} label={label} value={value} />
          ))}
        </div>

        <div className="mt-6 max-w-[32rem]">
          <div className="flex items-baseline justify-between">
            <span className="ml-label">Success rate</span>
            <span className="ml-num text-[13px] text-bone">{successPct}%</span>
          </div>
          <Meter
            value={successPct}
            className="mt-1.5"
            label={`Success rate: ${successPct}%`}
          />
          <p className="mt-2 text-[14px] text-graphite">
            <StatusLabel tone={fitCfg.tone} className="mr-2">
              {fitCfg.label}
            </StatusLabel>
            {fitDetailParts.length > 0 && (
              <span className="ml-num">{fitDetailParts.join(' · ')}</span>
            )}
          </p>
        </div>

        {report.match_summary.low_data_warning && (
          <p className="mt-5 flex flex-wrap items-center gap-2 border border-warn/40 px-4 py-3 text-[15px] text-graphite">
            <StatusLabel tone="warn">Limited data</StatusLabel>
            Limited data for your exact profile — results are directional.
          </p>
        )}
      </SectionCard>

      {/* ── Where You Stand ── */}
      <SectionCard title="Where you stand" label="Analysis">
        <Prose text={llm.sections.where_you_stand} />
      </SectionCard>

      {/* ── Matched Paths ── */}
      <SectionCard
        title="People who started like you — and made it"
        label={`${report.top_paths.slice(0, 3).length} paths`}
        eyebrow="Closest real trajectories, anonymised."
      >
        <Prose text={llm.sections.matched_paths} />

        {report.top_paths.length > 0 && (
          <div className="mt-6 border-t border-rule">
            {report.top_paths.slice(0, 3).map((path, i) => (
              <Row
                key={path.anonymised_profile_id}
                className="grid grid-cols-[3.5rem_minmax(0,1fr)] items-start gap-x-4 py-4"
              >
                <span className="ml-num text-[13px] font-bold text-graphite">
                  P{String(i + 1).padStart(3, '0')}
                </span>
                <span className="min-w-0">
                  <span className="ml-label block">
                    Now at{' '}
                    {path.reached_tier.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                  </span>
                  <span className="mt-1.5 block max-w-[72ch] text-[15px] leading-[1.6] text-bone/90">
                    {path.path_summary}
                  </span>
                </span>
              </Row>
            ))}
          </div>
        )}
      </SectionCard>

      {/* ── Gaps ── */}
      {report.gaps.length > 0 && (
        <SectionCard
          title="Profile gaps"
          label={`${report.gaps.slice(0, 6).length} tracked`}
          eyebrow="Based on your matched cohort, here's what's missing from your profile."
        >
          <div className="border-t border-rule">
            {report.gaps.slice(0, 6).map((gap) => (
              <Row key={gap.gap_key} className="py-4">
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-[15px] text-bone">{gap.display_name}</span>
                  <span className="ml-num shrink-0 text-[13px] text-graphite">
                    {Math.round(gap.match_pct * 100)}% have this
                  </span>
                </div>
                <Meter
                  value={Math.round(gap.match_pct * 100)}
                  className="mt-2"
                  label={`${gap.display_name}: ${Math.round(gap.match_pct * 100)}% of the cohort have this`}
                />
              </Row>
            ))}
          </div>
        </SectionCard>
      )}

      {/* ── Why these moves matter ── */}
      <SectionCard
        title="Why these moves matter"
        label="Analysis"
        eyebrow="The reasoning behind your roadmap."
      >
        <Prose text={llm.sections.what_to_do_next} />
      </SectionCard>

      {/* ── Next recruiting window ── */}
      <div className="mt-10 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-y border-rule py-4">
        <span className="ml-label">Next recruiting window</span>
        <span className="text-[16px] font-semibold text-bone">
          {report.context.next_recruiting_window}
        </span>
      </div>

      {/* ── Download the full deep-dive ── */}
      <SectionCard title="Full written deep-dive" label="PDF">
        <DownloadCompassReport reportId={reportId} />
      </SectionCard>

      {/* ── Footer ── */}
      <div className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-rule pt-6">
        <p className="ml-label">
          TrajectoryOS scoring engine · {new Date(createdAt).toLocaleDateString('en-AU')}
        </p>
        <Link href="/tools/career-compass" className="text-[15px] font-semibold text-red hover:underline">
          How Career Compass works <span aria-hidden="true">▸</span>
        </Link>
      </div>
    </PageShell>
  );
}
