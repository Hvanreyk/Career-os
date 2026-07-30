'use client';

import type { CoverageReport as Coverage } from '@trajectoryos/core/resume/coverage';
import type { TailorOutput } from '@trajectoryos/core/resume/document';
import { Meter, StatusLabel } from '@/components/ui/Status';
import { Notice } from './Notice';

interface Props {
  coverage: Coverage;
  tailored: TailorOutput;
}

const MATCH_BADGES = {
  direct: { label: 'Direct', tone: 'ok' },
  stretch: { label: 'Stretch', tone: 'warn' },
  gap: { label: 'Gap', tone: 'accent' },
} as const;

/**
 * The honest JD-coverage report: deterministic coverage %, per-requirement
 * match verdicts, and gaps with truthful suggestions — never papered over.
 */
export function CoverageReport({ coverage, tailored }: Props) {
  const matchByRequirement = new Map(tailored.matches.map((match) => [match.requirement_id, match]));

  return (
    <div className="ml-panel-raised space-y-3 p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="ml-label">JD coverage</p>
          <p className="ml-num mt-1 text-[26px] font-bold leading-none tracking-[-0.03em] text-bone">
            {coverage.percent}%
          </p>
        </div>
        <p className="ml-num text-right text-[12px] leading-relaxed text-graphite">
          {coverage.direct} direct · {coverage.stretch} stretch · {coverage.gaps} gap
          {coverage.gaps === 1 ? '' : 's'}
          {(tailored.jd_analysis.role_title || tailored.jd_analysis.firm) && (
            <>
              <br />
              {[tailored.jd_analysis.role_title, tailored.jd_analysis.firm].filter(Boolean).join(' — ')}
            </>
          )}
        </p>
      </div>
      <Meter value={coverage.percent} label={`JD coverage ${coverage.percent} percent`} />
      <ul className="max-h-48 space-y-2 overflow-y-auto pr-1">
        {tailored.jd_analysis.requirements.map((requirement) => {
          const match = matchByRequirement.get(requirement.id);
          const verdict = MATCH_BADGES[match?.match ?? 'gap'];
          return (
            <li key={requirement.id} className="flex items-start gap-2.5">
              <StatusLabel tone={verdict.tone} className="mt-0.5 shrink-0">
                {verdict.label}
              </StatusLabel>
              <span className="text-[14px] leading-snug text-bone">
                {requirement.text}
                {requirement.kind === 'must_have' && (
                  <span className="text-graphite"> (must-have)</span>
                )}
                {match && match.match !== 'gap' && match.note && (
                  <span className="mt-0.5 block text-[13px] text-graphite">{match.note}</span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
      {tailored.gaps.length > 0 && (
        <Notice tone="error" title="Honest gaps">
          <p className="text-graphite">Do not claim these unless true.</p>
          <ul className="mt-1.5 space-y-1">
            {tailored.gaps.map((gap) => (
              <li key={gap.requirement_id}>{gap.honest_suggestion}</li>
            ))}
          </ul>
        </Notice>
      )}
    </div>
  );
}
