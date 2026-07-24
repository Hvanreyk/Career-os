'use client';

import { motion } from 'framer-motion';
import type { ScoringOutput, FitBand } from '@trajectoryos/core/scoring/types';
import type { LLMReport } from '@trajectoryos/core/llm/types';
import Link from 'next/link';

// ─── Helpers ──────────────────────────────────────────────────

const FIT_CONFIG: Record<FitBand, { label: string; colour: string; bg: string; bar: string }> = {
  strong_fit: {
    label: 'Strong Fit',
    colour: 'text-emerald-400',
    bg: 'border-emerald-400/20 bg-emerald-400/5',
    bar: '#34d399',
  },
  stretch_but_achievable: {
    label: 'Stretch — Achievable',
    colour: 'text-gold-400',
    bg: 'border-gold-400/20 bg-gold-400/5',
    bar: '#d4af37',
  },
  reach: {
    label: 'Reach',
    colour: 'text-orange-400',
    bg: 'border-orange-400/20 bg-orange-400/5',
    bar: '#fb923c',
  },
  long_shot: {
    label: 'Long Shot',
    colour: 'text-red-400',
    bg: 'border-red-400/20 bg-red-400/5',
    bar: '#f87171',
  },
};

const STAGE_LABELS: Record<string, string> = {
  S0: 'No Finance Experience',
  S1: 'Early — One Entry Role',
  S2: 'Building — Some Relevant XP',
  S3: 'Strong — Penultimate Ready',
  S4: 'Elite — Multi-Internship',
  S5: 'Lateral Candidate',
};

const EFFORT_COLOUR: Record<string, string> = {
  low: 'text-emerald-400',
  medium: 'text-gold-400',
  high: 'text-orange-400',
};

const PRIORITY_LABEL: Record<number, string> = { 1: '#1', 2: '#2', 3: '#3' };


function SectionCard({
  title,
  eyebrow,
  children,
  delay = 0,
}: {
  title: string;
  eyebrow?: string;
  children: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-[1.7rem] border border-slate-700/70 bg-slate-900/70 shadow-2xl shadow-navy-950/40 overflow-hidden"
    >
      <div className="px-6 sm:px-8 py-7 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <h2 className="font-serif text-3xl font-bold text-white tracking-tight">{title}</h2>
        {eyebrow && <p className="text-sm text-slate-500 sm:text-right sm:max-w-xs leading-relaxed">{eyebrow}</p>}
      </div>
      <div className="px-6 sm:px-8 pb-7">{children}</div>
    </motion.div>
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
        <p key={i} className="text-slate-300 text-base leading-8">{block}</p>
      ))}
    </div>
  );
}

// ─── Competitiveness (primary report lens) ────────────────────

const COMP_BAND: Record<string, { label: string; colour: string; bg: string; bar: string }> = {
  strong:      { label: 'Strong',      colour: 'text-emerald-400', bg: 'border-emerald-400/20 bg-emerald-400/5', bar: '#34d399' },
  competitive: { label: 'Competitive', colour: 'text-gold-400',    bg: 'border-gold-400/20 bg-gold-400/5',       bar: '#d4af37' },
  developing:  { label: 'Developing',  colour: 'text-orange-400',  bg: 'border-orange-400/20 bg-orange-400/5',   bar: '#fb923c' },
  reach:       { label: 'Reach',       colour: 'text-red-400',     bg: 'border-red-400/20 bg-red-400/5',         bar: '#f87171' },
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
  const projectedImpact = actions.reduce((total, action) => total + (action.index_impact ?? 0), 0);
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

  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="relative overflow-hidden rounded-[2rem] border border-slate-800 bg-navy-950/80 p-7 sm:p-9 shadow-2xl shadow-black/30"
      >
        <div className="absolute -top-28 -right-24 h-80 w-80 rounded-full bg-gold-400/10 blur-3xl" />
        <div className="absolute -bottom-28 -left-24 h-80 w-80 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="relative">
          <div className="mb-7 text-gold-400 text-xs font-bold tracking-[0.45em] uppercase">Career Compass</div>
          <h1 className="font-serif text-4xl sm:text-6xl font-bold leading-[0.95] text-white tracking-tight">
            You&apos;re {band.label.toLowerCase()} for {targetLabel} — and closer than most.
          </h1>
          <div className="mt-7 grid gap-8 lg:grid-cols-[380px_1fr] lg:items-center">
            <div
              className="relative mx-auto h-72 w-72 sm:h-80 sm:w-80"
              role="img"
              aria-label={`${comp.index} out of 100 for ${targetLabel}`}
            >
              <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
                <circle cx="18" cy="18" r="15.9155" fill="none" stroke="rgba(148,163,184,0.14)" strokeWidth="2.4" />
                <motion.circle cx="18" cy="18" r="15.9155" fill="none" stroke={band.bar} strokeWidth="2.4"
                  strokeDasharray={`${comp.index}, 100`} strokeLinecap="butt" initial={{ strokeDasharray: '0, 100' }} animate={{ strokeDasharray: `${comp.index}, 100` }} transition={{ duration: 1.1, ease: 'easeOut' }} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center rounded-full bg-slate-900/30">
                <span className="font-serif text-7xl text-white leading-none">{comp.index}</span>
                <span className="mt-2 font-mono text-slate-500">/ 100</span>
                <span className="mt-5 text-xs uppercase tracking-[0.35em] text-slate-400">{targetLabel} Index</span>
              </div>
            </div>
            <div className="space-y-6">
              <div className="flex flex-wrap items-center gap-3">
                <span className={`rounded-full px-6 py-2 text-sm font-bold tracking-wide ${band.bg} ${band.colour}`}>{band.label}</span>
                <span className="text-slate-400">for <strong className="text-white">{targetLabel}</strong></span>
              </div>
              <p className="text-xl leading-9 text-slate-300">
                {COMP_GUIDANCE[comp.band]}
              </p>
              <div className="rounded-2xl border border-slate-700/80 bg-slate-950/35 p-6 flex gap-5">
                <div className={`font-serif text-5xl ${band.colour}`}>~{pctText(comp.estimated_probability)}</div>
                <p className="text-slate-400 leading-7">
                  shot at a <em>front-office IB</em> outcome this cycle — roughly <strong className="text-slate-200">{comp.multiplier_vs_field.toFixed(1)}×</strong> the typical serious candidate. Across the broader ladder, your front-office probability is ~{pctText(comp.any_front_office_probability)}.
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <SectionCard title="Where you stand, by tier" eyebrow="One score isn't the whole story — you're stronger the moment you widen the aim." delay={0.15}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {comp.per_tier.map((t) => {
            const b = COMP_BAND[t.band] ?? COMP_BAND.developing;
            return (
              <div key={t.tier} className="rounded-2xl border border-slate-700 bg-slate-900/70 p-5">
                <div className="text-slate-400 mb-6">{tierLabel(t.tier)}</div>
                <div className={`font-serif text-5xl leading-none ${b.colour}`}>{t.index}</div>
                <div className={`mt-4 text-xs font-bold uppercase tracking-[0.24em] ${b.colour}`}>{b.label}</div>
                <div className="mt-7 h-1.5 rounded-full bg-slate-800 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${t.index}%`, background: b.bar }} /></div>
                <div className="mt-5 text-sm text-slate-500">≈ {pctText(t.estimated_probability)} shot</div>
              </div>
            );
          })}
        </div>
        <p className="mt-7 border-l-4 border-gold-400 pl-5 text-lg leading-8 text-slate-300">
          <strong className="text-white">Recommended aim:</strong> anchor applications at <strong className="text-white">{tierLabel(comp.recommended_target)}</strong> and keep <strong className="text-white">{tierLabel(comp.stretch_target)}</strong> live as a stretch.
        </p>
      </SectionCard>

      {comp.contributions.length > 0 && (
        <SectionCard title={`What's driving your ${targetLabel} score`} eyebrow="Every point traces to something real." delay={0.2}>
          <div className="space-y-0">
            {comp.contributions.map((f, i) => {
              const pos = f.points >= 0;
              return (
                <div key={i} className="grid grid-cols-[1fr_54px_44%] items-center gap-4 border-b border-slate-800 py-4 last:border-b-0">
                  <span className="text-lg text-slate-200 leading-8">{f.label}</span>
                  <span className={`text-xl font-bold ${pos ? 'text-emerald-400' : 'text-red-400'}`}>{pos ? '+' : ''}{f.points}</span>
                  <div className="h-7 rounded-md overflow-hidden bg-transparent flex items-center">
                    <div className={`h-full rounded-md ${pos ? 'bg-linear-to-r from-emerald-700 to-emerald-400' : 'bg-linear-to-r from-red-400 to-red-900'}`} style={{ width: `${(Math.abs(f.points) / maxMag) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-5 flex justify-between font-mono text-sm text-slate-500"><span>← holds you back</span><span>lifts you →</span></div>
        </SectionCard>
      )}

      <div className="rounded-[1.7rem] border border-slate-700/70 bg-slate-900/70 p-6 sm:p-8">
        <h2 className="font-serif text-3xl font-bold text-white">If you close the top moves</h2>
        <div className="mt-6 flex items-center gap-5">
          <span className="font-serif text-3xl text-gold-400">{comp.index}</span><span className="text-slate-400">→</span><span className="font-serif text-3xl text-emerald-400">{finalIndex}</span>
          <div className="h-3 flex-1 rounded-full bg-slate-800 overflow-hidden"><div className="h-full bg-linear-to-r from-gold-400 via-gold-400 to-emerald-400" style={{ width: `${finalIndex}%` }} /></div>
          <span className="text-slate-300">{projectedBand.label} for {targetLabel}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────

export default function ReportClient({
  report,
  llm,
  createdAt,
}: {
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
    <div className="min-h-screen bg-navy-950 relative">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full opacity-8"
          style={{ background: 'radial-gradient(circle, rgba(212,175,55,0.25) 0%, transparent 70%)', filter: 'blur(80px)' }} />
        <div className="absolute bottom-1/3 right-0 w-96 h-96 rounded-full opacity-6"
          style={{ background: 'radial-gradient(circle, rgba(29,78,216,0.4) 0%, transparent 70%)', filter: 'blur(100px)' }} />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 py-12 space-y-6">

        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <Link href="/" className="inline-flex items-center gap-2 mb-6 text-slate-500 hover:text-gold-400 transition-colors text-sm">
            ← Back to TrajectoryOS
          </Link>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-gold-400/25 bg-gold-400/6 mb-4">
            <span className="w-1.5 h-1.5 rounded-full bg-gold-400" />
            <span className="text-gold-400 text-xs font-medium tracking-wider uppercase">Career Compass Report</span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-white mb-2">
            Your Career Compass
          </h1>
          <p className="text-slate-500 text-sm">Generated {createdDate}</p>
        </motion.div>

        {/* ── Competitiveness (primary lens) ── */}
        {report.competitiveness && <CompetitivenessSection comp={report.competitiveness} actions={report.actions} />}

        {/* ── Stage + Fit band (fallback for reports predating competitiveness) ── */}
        {!report.competitiveness && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-2 gap-4"
        >
          {/* Stage */}
          <div className="glass border border-white/8 rounded-2xl p-5">
            <div className="text-xs text-slate-500 uppercase tracking-widest mb-1">Career Stage</div>
            <div className="text-2xl font-bold text-white font-serif mb-1">{report.stage}</div>
            <div className="text-sm text-slate-400">{STAGE_LABELS[report.stage] ?? report.stage_description}</div>
          </div>

          {/* Fit band */}
          <div className={`glass border rounded-2xl p-5 ${fitCfg.bg}`}>
            <div className="text-xs text-slate-500 uppercase tracking-widest mb-1">Fit Assessment</div>
            <div className={`text-xl font-bold font-serif mb-1 ${fitCfg.colour}`}>{fitCfg.label}</div>
            <div className="text-xs text-slate-400">
              {successPct}% of matched profiles reached your target
            </div>
            {fitDetailParts.length > 0 && (
              <div className="text-[11px] text-slate-500 mt-1">
                {fitDetailParts.join(' · ')}
              </div>
            )}
          </div>
        </motion.div>
        )}


        {/* ── You vs cohort median ── */}
        {report.gaps.length > 0 && (
          <SectionCard title={`You vs. the median ${tierLabel(report.target.tier)} analyst`} eyebrow="Measured against the matched professional cohort." delay={0.18}>
            <div className="overflow-hidden rounded-2xl border border-slate-800">
              <div className="grid grid-cols-[1.3fr_0.8fr_0.8fr_0.5fr] gap-3 border-b border-slate-800 px-4 py-3 text-xs uppercase tracking-[0.25em] text-slate-500">
                <span>Dimension</span><span>You</span><span>Cohort signal</span><span className="text-right">Status</span>
              </div>
              {report.gaps.slice(0, 6).map((gap) => (
                <div key={gap.gap_key} className="grid grid-cols-[1.3fr_0.8fr_0.8fr_0.5fr] gap-3 border-b border-slate-800 px-4 py-4 last:border-b-0">
                  <span className="text-slate-200">{gap.display_name}</span>
                  <span className="font-semibold text-white">{gap.student_has ? 'Yes' : 'Not yet'}</span>
                  <span className="text-slate-400">{Math.round(gap.match_pct * 100)}% have this</span>
                  <span className={`text-right text-xs font-bold tracking-[0.18em] uppercase ${gap.student_has ? 'text-emerald-400' : gap.actionability === 'high' ? 'text-orange-400' : 'text-slate-400'}`}>
                    {gap.student_has ? 'On par' : gap.actionability === 'high' ? 'Gap' : 'Build'}
                  </span>
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {/* ── Match stats ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="glass border border-white/8 rounded-2xl p-5"
        >
          <div className="text-xs text-slate-500 uppercase tracking-widest mb-4">Match Statistics</div>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Profiles analysed', value: report.match_summary.total_professionals ?? report.match_summary.pool_size },
              { label: 'Similar to you', value: report.match_summary.matched_count },
              { label: 'Reached target', value: report.match_summary.reached_target_count },
            ].map(({ label, value }) => (
              <div key={label} className="text-center">
                <div className="text-2xl font-bold text-white font-serif">{value}</div>
                <div className="text-xs text-slate-500 mt-1">{label}</div>
              </div>
            ))}
          </div>

          {/* Bar */}
          <div className="mt-5">
            <div className="flex justify-between text-xs text-slate-500 mb-1.5">
              <span>Success rate</span>
              <span className={fitCfg.colour}>{successPct}%</span>
            </div>
            <div className="h-2 rounded-full bg-white/6 overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: fitCfg.bar }}
                initial={{ width: 0 }}
                animate={{ width: `${successPct}%` }}
                transition={{ duration: 1, delay: 0.6, ease: 'easeOut' }}
              />
            </div>
          </div>

          {report.match_summary.low_data_warning && (
            <p className="mt-3 text-xs text-amber-400/70 bg-amber-400/5 border border-amber-400/15 rounded-lg px-3 py-2">
              Limited data for your exact profile — results are directional.
            </p>
          )}
        </motion.div>

        {/* ── Where You Stand ── */}
        <SectionCard title="Where You Stand" delay={0.2}>
          <Prose text={llm.sections.where_you_stand} />
        </SectionCard>

        {/* ── Matched Paths ── */}
        <SectionCard title="People who started like you — and made it" eyebrow="Closest real trajectories, anonymised." delay={0.25}>
          <Prose text={llm.sections.matched_paths} />

          {report.top_paths.length > 0 && (
            <div className="mt-5 space-y-3">
              {report.top_paths.slice(0, 3).map((path, i) => (
                <motion.div
                  key={path.anonymised_profile_id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.35 + i * 0.08 }}
                  className="flex items-center gap-4 p-5 rounded-2xl bg-slate-900/80 border border-slate-700/70"
                >
                  <div className="flex-shrink-0 w-16 h-10 rounded-xl bg-gold-400/10 border border-gold-400/25 flex items-center justify-center text-gold-300 text-sm font-mono font-bold">
                    P{String(i + 1).padStart(3, '0')}
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs text-slate-500 mb-1">
                      Now at <span className="text-slate-300">{path.reached_tier.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</span>
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed">{path.path_summary}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* ── Gaps ── */}
        {report.gaps.length > 0 && (
          <SectionCard title="Profile Gaps" delay={0.3}>
            <p className="text-slate-400 text-sm mb-4">
              Based on your matched cohort, here&apos;s what&apos;s missing from your profile.
            </p>
            <div className="space-y-3">
              {report.gaps.slice(0, 6).map((gap) => (
                <div key={gap.gap_key} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white">{gap.display_name}</span>
                    <span className={`text-xs ${
                      gap.actionability === 'high' ? 'text-emerald-400' :
                      gap.actionability === 'medium' ? 'text-gold-400' : 'text-slate-500'
                    }`}>
                      {Math.round(gap.match_pct * 100)}% have this
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/6 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{
                        background: gap.actionability === 'high' ? '#34d399' :
                          gap.actionability === 'medium' ? '#d4af37' : '#64748b'
                      }}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.round(gap.match_pct * 100)}%` }}
                      transition={{ duration: 0.8, delay: 0.4, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {/* ── What To Do Next ── */}
        <SectionCard title="Your highest-leverage moves" eyebrow="Ranked by actual point-impact — not a generic checklist." delay={0.35}>
          <Prose text={llm.sections.what_to_do_next} />

          {report.actions.length > 0 && (
            <div className="mt-5 space-y-3">
              {report.actions.slice(0, 5).map((action, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.45 + i * 0.07 }}
                  className="flex gap-5 p-6 rounded-2xl border border-slate-700/70 bg-slate-900/80"
                >
                  <div className={`flex-shrink-0 w-20 h-20 rounded-2xl flex flex-col items-center justify-center text-xl font-bold ${
                    action.priority === 1 ? 'bg-gold-400/15 text-gold-400 border border-gold-400/25' :
                    action.priority === 2 ? 'bg-slate-700/50 text-slate-300 border border-white/10' :
                    'bg-slate-800/50 text-slate-500 border border-white/6'
                  }`}>
                    {PRIORITY_LABEL[action.priority]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-sm font-semibold text-white">{action.title}</span>
                      <span className="flex items-center gap-2 flex-shrink-0">
                        {(() => {
                          const impact = (action as { index_impact?: number }).index_impact;
                          if (impact == null) return null;
                          return (
                            <span className={`text-xs font-mono ${impact >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                              {impact >= 0 ? '+' : ''}{impact} pts
                            </span>
                          );
                        })()}
                        <span className={`text-xs ${EFFORT_COLOUR[action.estimated_effort]}`}>
                          {action.estimated_effort} effort
                        </span>
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">{action.description}</p>
                    {action.deadline && (
                      <p className="text-xs text-slate-600 mt-1.5">
                        By {new Date(action.deadline).toLocaleDateString('en-AU', { month: 'short', year: 'numeric' })}
                      </p>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* ── Next recruiting window ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="glass border border-gold-400/15 rounded-2xl p-5 flex items-center justify-between gap-4"
        >
          <div>
            <div className="text-xs text-slate-500 uppercase tracking-widest mb-1">Next Recruiting Window</div>
            <div className="text-white font-semibold">{report.context.next_recruiting_window}</div>
          </div>
          <div className="w-10 h-10 rounded-full bg-gold-400/10 border border-gold-400/20 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-gold-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        </motion.div>

        {/* ── Footer CTA ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center pt-4 pb-8 space-y-3"
        >
          <p className="text-slate-500 text-xs">
            Report generated with TrajectoryOS scoring engine · {new Date(createdAt).toLocaleDateString('en-AU')}
          </p>
          <Link
            href="/tools/career-compass"
            className="inline-block text-gold-400 hover:text-gold-300 transition-colors text-sm font-medium"
          >
            Learn how Career Compass works →
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
