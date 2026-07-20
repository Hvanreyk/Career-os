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

function SectionCard({ title, children, delay = 0 }: { title: string; children: React.ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      className="glass border border-white/8 rounded-2xl overflow-hidden"
    >
      <div className="px-6 py-4 border-b border-white/6">
        <h2 className="font-serif text-lg font-bold text-white">{title}</h2>
      </div>
      <div className="px-6 py-5">{children}</div>
    </motion.div>
  );
}

function Prose({ text }: { text: string }) {
  return (
    <div className="space-y-3">
      {text.split('\n\n').filter(Boolean).map((para, i) => (
        <p key={i} className="text-slate-300 text-sm leading-relaxed">{para}</p>
      ))}
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

      <div className="relative z-10 max-w-3xl mx-auto px-4 py-12 space-y-6">

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

        {/* ── Stage + Fit band ── */}
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
        <SectionCard title="People Who Made It" delay={0.25}>
          <Prose text={llm.sections.matched_paths} />

          {report.top_paths.length > 0 && (
            <div className="mt-5 space-y-3">
              {report.top_paths.slice(0, 3).map((path, i) => (
                <motion.div
                  key={path.anonymised_profile_id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.35 + i * 0.08 }}
                  className="flex gap-4 p-4 rounded-xl bg-white/3 border border-white/6"
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gold-400/10 border border-gold-400/20 flex items-center justify-center text-gold-400 text-xs font-bold">
                    {i + 1}
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
                      {gap.match_pct}% have this
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
                      animate={{ width: `${gap.match_pct}%` }}
                      transition={{ duration: 0.8, delay: 0.4, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {/* ── What To Do Next ── */}
        <SectionCard title="Your Action Plan" delay={0.35}>
          <Prose text={llm.sections.what_to_do_next} />

          {report.actions.length > 0 && (
            <div className="mt-5 space-y-3">
              {report.actions.slice(0, 5).map((action, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.45 + i * 0.07 }}
                  className="flex gap-4 p-4 rounded-xl border border-white/8 bg-white/2"
                >
                  <div className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                    action.priority === 1 ? 'bg-gold-400/15 text-gold-400 border border-gold-400/25' :
                    action.priority === 2 ? 'bg-slate-700/50 text-slate-300 border border-white/10' :
                    'bg-slate-800/50 text-slate-500 border border-white/6'
                  }`}>
                    {PRIORITY_LABEL[action.priority]}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-sm font-semibold text-white">{action.title}</span>
                      <span className={`text-xs flex-shrink-0 ${EFFORT_COLOUR[action.estimated_effort]}`}>
                        {action.estimated_effort} effort
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
