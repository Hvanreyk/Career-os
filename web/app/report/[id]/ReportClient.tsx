import type { ScoringOutput, FitBand } from '@trajectoryos/core/scoring/types';
import type { LLMReport } from '@trajectoryos/core/llm/types';
import Link from 'next/link';
import { Meter, StatusLabel } from '@/components/ui/Status';
import { Panel, Stat } from '@/components/ui/Panel';

/**
 * Career Compass output.
 *
 * The ranked actions carry the most visual weight on the page — they are the
 * only part a student can act on. Scores are reported plainly and never given a
 * gradient, a ring or a colour ramp.
 *
 * No scoring value is recomputed here; every figure comes straight from
 * ScoringOutput.
 */

const FIT_LABEL: Record<FitBand, string> = {
  strong_fit: 'Strong fit',
  stretch_but_achievable: 'Stretch — achievable',
  reach: 'Reach',
  long_shot: 'Long shot',
};

/* Tone reinforces the label; the label is what carries the meaning. */
const FIT_TONE: Record<FitBand, 'ok' | 'accent' | 'warn' | 'neutral'> = {
  strong_fit: 'ok',
  stretch_but_achievable: 'accent',
  reach: 'warn',
  long_shot: 'neutral',
};

const STAGE_LABELS: Record<string, string> = {
  S0: 'No finance experience',
  S1: 'Early — one entry role',
  S2: 'Building — some relevant experience',
  S3: 'Strong — penultimate ready',
  S4: 'Elite — multi-internship',
  S5: 'Lateral candidate',
};

function Prose({ text }: { text: string }) {
  return (
    <div className="space-y-4">
      {text
        .split('\n\n')
        .filter(Boolean)
        .map((para, i) => (
          <p key={i} className="max-w-[70ch] text-[16px] leading-[1.68] text-bone/90">
            {para}
          </p>
        ))}
    </div>
  );
}

function Section({
  n,
  title,
  children,
}: {
  n: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-rule pt-8">
      <div className="flex items-baseline gap-4">
        <span className="ml-num text-[13px] text-rule-bright" aria-hidden="true">
          {n}
        </span>
        <h2 className="text-[17px] font-bold uppercase tracking-[-0.015em] text-bone">{title}</h2>
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default function ReportClient({
  report,
  llm,
  createdAt,
}: {
  report: ScoringOutput;
  llm: LLMReport;
  createdAt: string;
}) {
  const fitBand = report.match_summary.fit_band;
  const successPct =
    report.match_summary.pool_size > 0
      ? Math.round(
          (report.match_summary.reached_target_count / report.match_summary.pool_size) * 100,
        )
      : 0;
  const createdDate = new Date(createdAt).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="mx-auto w-full max-w-[64rem] px-5 py-10 sm:px-8 sm:py-12">
      {/* ── Masthead ─────────────────────────────────────────── */}
      <header className="border-b border-rule pb-6">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <span className="ml-label text-red">Career Compass · Report</span>
          <span className="ml-label">
            <time dateTime={createdAt}>{createdDate}</time>
          </span>
        </div>
        <h1 className="ml-title mt-3 text-bone">Where you stand</h1>
      </header>

      {/* ── Headline readout ─────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-px border-b border-rule bg-rule sm:grid-cols-3">
        <div className="bg-ink py-6 sm:pr-6">
          <Stat
            label="Career stage"
            value={report.stage}
            sub={STAGE_LABELS[report.stage] ?? report.stage_description}
          />
        </div>
        <div className="bg-ink py-6 sm:px-6">
          <div className="ml-label">Fit assessment</div>
          <div className="mt-2.5">
            <StatusLabel tone={FIT_TONE[fitBand]}>{FIT_LABEL[fitBand]}</StatusLabel>
          </div>
          <p className="mt-2.5 text-[13px] leading-snug text-graphite">
            Against professionals with a comparable starting point.
          </p>
        </div>
        <div className="bg-ink py-6 sm:pl-6">
          <Stat
            label="Reached your target"
            value={`${successPct}%`}
            accent
            sub={`${report.match_summary.reached_target_count} of ${report.match_summary.pool_size} profiles analysed`}
          />
          <Meter
            value={successPct}
            accent
            className="mt-3"
            label={`${successPct}% of analysed profiles reached your target`}
          />
        </div>
      </div>

      {report.match_summary.low_data_warning && (
        <p
          className="mt-5 border-l-2 border-red bg-surface py-3 pl-4 pr-4 text-[14px] leading-snug text-bone"
          role="note"
        >
          <span className="ml-label text-red">▲ Limited data</span>
          <span className="mt-1.5 block">
            There are few close matches for your exact profile, so these results are directional
            rather than precise.
          </span>
        </p>
      )}

      <div className="mt-10 space-y-10">
        {/* ── 01 Where you stand ─────────────────────────────── */}
        <Section n="01" title="Where you stand">
          <Prose text={llm.sections.where_you_stand} />
        </Section>

        {/* ── 02 Highest-leverage moves — the point of the page ── */}
        <Section n="02" title="What to do next">
          <Prose text={llm.sections.what_to_do_next} />

          {report.actions.length > 0 && (
            <ol className="mt-7 grid grid-cols-1 gap-px bg-rule">
              {report.actions.slice(0, 5).map((action, i) => (
                <li
                  key={i}
                  className="grid grid-cols-[2.5rem_minmax(0,1fr)] gap-x-4 bg-raised p-5 sm:grid-cols-[3.5rem_minmax(0,1fr)] sm:p-6"
                >
                  <span
                    className="ml-num text-[26px] font-bold leading-none tracking-[-0.04em] text-rule-bright"
                    aria-hidden="true"
                  >
                    #{action.priority}
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-[16px] font-bold uppercase leading-snug tracking-[-0.01em] text-bone">
                      <span className="sr-only">Priority {action.priority}: </span>
                      {action.title}
                    </h3>
                    <p className="mt-2 max-w-[68ch] text-[16px] leading-[1.62] text-graphite">
                      {action.description}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <StatusLabel>Effort: {action.estimated_effort}</StatusLabel>
                      {action.deadline && (
                        <StatusLabel tone="accent">
                          By{' '}
                          {new Date(action.deadline).toLocaleDateString('en-AU', {
                            month: 'short',
                            year: 'numeric',
                          })}
                        </StatusLabel>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Section>

        {/* ── 03 Gaps ────────────────────────────────────────── */}
        {report.gaps.length > 0 && (
          <Section n="03" title="Which gaps matter">
            <p className="max-w-[70ch] text-[16px] leading-[1.62] text-graphite">
              The share of your matched cohort that has each of these. The further from 100%, the
              less it separates you.
            </p>
            <dl className="mt-5">
              {report.gaps.slice(0, 6).map((gap) => (
                <div key={gap.gap_key} className="ml-row py-3.5">
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-[15px] text-bone">{gap.display_name}</dt>
                    <dd className="ml-num shrink-0 text-[14px] text-graphite">
                      {gap.match_pct}% have this
                      <span className="sr-only">
                        , actionability {gap.actionability}
                      </span>
                    </dd>
                  </div>
                  <Meter
                    value={gap.match_pct}
                    accent={gap.actionability === 'high'}
                    className="mt-2.5"
                    label={`${gap.display_name}: ${gap.match_pct}% of matched profiles have this`}
                  />
                </div>
              ))}
            </dl>
          </Section>
        )}

        {/* ── 04 Matched paths ───────────────────────────────── */}
        <Section n="04" title="People who made it">
          <Prose text={llm.sections.matched_paths} />

          {report.top_paths.length > 0 && (
            <ol className="mt-7 border-t border-rule">
              {report.top_paths.slice(0, 3).map((path, i) => (
                <li
                  key={path.anonymised_profile_id}
                  className="ml-row grid grid-cols-[2rem_minmax(0,1fr)] gap-x-4 py-5"
                >
                  <span className="ml-num text-[13px] text-rule-bright" aria-hidden="true">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="min-w-0">
                    <div className="ml-label">
                      Now at{' '}
                      <span className="text-bone">
                        {path.reached_tier.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p className="mt-2 max-w-[70ch] text-[16px] leading-[1.62] text-bone/90">
                      {path.path_summary}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Section>

        {/* ── 05 Deadline ────────────────────────────────────── */}
        <Section n="05" title="Recruiting deadline">
          <Panel raised className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 p-5">
            <div>
              <div className="ml-label">Next recruiting window</div>
              <p className="mt-2 text-[19px] font-bold uppercase tracking-[-0.015em] text-bone">
                {report.context.next_recruiting_window}
              </p>
            </div>
            <StatusLabel tone="accent">Plan backwards from here</StatusLabel>
          </Panel>
        </Section>
      </div>

      {/* ── Colophon ─────────────────────────────────────────── */}
      <footer className="mt-12 flex flex-wrap items-center justify-between gap-4 border-t border-rule pt-6">
        <span className="ml-label">
          Generated by the MappedLabs scoring engine · {report.match_summary.pool_size} profiles
        </span>
        <Link href="/tools/career-compass" className="ml-btn ml-btn-text min-h-[44px] text-[14px]">
          How Career Compass works <span aria-hidden="true">▸</span>
        </Link>
      </footer>
    </div>
  );
}
