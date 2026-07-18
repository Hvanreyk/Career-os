'use client';

import type { CoverageReport as Coverage } from '@trajectoryos/core/resume/coverage';
import type { TailorOutput } from '@trajectoryos/core/resume/document';

interface Props {
  coverage: Coverage;
  tailored: TailorOutput;
}

const MATCH_BADGES = {
  direct: { label: 'Direct', className: 'bg-emerald-400/15 text-emerald-300 border-emerald-400/30' },
  stretch: { label: 'Stretch', className: 'bg-amber-400/15 text-amber-300 border-amber-400/30' },
  gap: { label: 'Gap', className: 'bg-red-400/15 text-red-300 border-red-400/30' },
} as const;

/**
 * The honest JD-coverage report: deterministic coverage %, per-requirement
 * match verdicts, and gaps with truthful suggestions — never papered over.
 */
export function CoverageReport({ coverage, tailored }: Props) {
  const matchByRequirement = new Map(tailored.matches.map((match) => [match.requirement_id, match]));
  const gapByRequirement = new Map(tailored.gaps.map((gap) => [gap.requirement_id, gap]));

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-gold-400">JD coverage</p>
          <p className="text-white text-2xl font-bold">{coverage.percent}%</p>
        </div>
        <p className="text-slate-400 text-xs text-right">
          {coverage.direct} direct · {coverage.stretch} stretch · {coverage.gaps} gap{coverage.gaps === 1 ? '' : 's'}
          {(tailored.jd_analysis.role_title || tailored.jd_analysis.firm) && (
            <><br />{[tailored.jd_analysis.role_title, tailored.jd_analysis.firm].filter(Boolean).join(' — ')}</>
          )}
        </p>
      </div>
      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
        <div className="h-full bg-gold-400" style={{ width: `${coverage.percent}%` }} />
      </div>
      <ul className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
        {tailored.jd_analysis.requirements.map((requirement) => {
          const match = matchByRequirement.get(requirement.id);
          const verdict = MATCH_BADGES[match?.match ?? 'gap'];
          return (
            <li key={requirement.id} className="flex items-start gap-2 text-xs">
              <span className={`shrink-0 mt-0.5 px-1.5 py-0.5 rounded border text-[10px] font-semibold ${verdict.className}`}>{verdict.label}</span>
              <span className="text-slate-300">
                {requirement.text}
                {requirement.kind === 'must_have' && <span className="text-slate-500"> (must-have)</span>}
                {match && match.match !== 'gap' && match.note && <span className="block text-slate-500 mt-0.5">{match.note}</span>}
              </span>
            </li>
          );
        })}
      </ul>
      {tailored.gaps.length > 0 && (
        <div className="rounded-lg border border-red-400/20 bg-red-400/[0.06] p-3">
          <p className="text-red-300 text-xs font-semibold mb-1.5">Honest gaps — do not claim these unless true</p>
          <ul className="space-y-1">
            {tailored.gaps.map((gap) => (
              <li key={gap.requirement_id} className="text-red-200/80 text-xs">{gap.honest_suggestion}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
