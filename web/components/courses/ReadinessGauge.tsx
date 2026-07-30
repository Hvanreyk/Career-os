import { Meter } from '@/components/ui/Status';

// Plain-data mirror of lib/courses DIMENSION_LABELS (passed in) so this
// stays a purely presentational component.

interface Props {
  score: number;
  dimensions: Record<string, number>;
  dimensionLabels: Record<string, string>;
  /** Optional smaller heading, e.g. "Initial readiness". */
  heading?: string;
  /** Previous score for a before/after comparison. */
  compareTo?: number | null;
}

export function ReadinessGauge({
  score,
  dimensions,
  dimensionLabels,
  heading = 'Readiness score',
  compareTo = null,
}: Props) {
  const delta = compareTo === null ? null : score - compareTo;
  return (
    <section className="ml-panel">
      <div className="border-b border-rule px-4 py-3 sm:px-5">
        <span className="ml-label">{heading}</span>
      </div>

      <div className="px-4 py-6 sm:px-5">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="ml-num text-[44px] font-bold leading-none tracking-[-0.04em] text-bone">
            {score}
          </span>
          <span className="ml-num text-[18px] text-graphite">/ 100</span>
          {delta !== null && delta !== 0 && (
            /* Direction is spelled out, not left to the sign's colour. */
            <span className={`ml-num text-[13px] ${delta > 0 ? 'text-ok' : 'text-red'}`}>
              {delta > 0 ? '▲ Up ' : '▼ Down '}
              {Math.abs(delta)} since your diagnostic
            </span>
          )}
        </div>

        <dl className="mt-7 border-t border-rule">
          {Object.entries(dimensions).map(([key, value]) => {
            const label = dimensionLabels[key] ?? key;
            return (
              <div key={key} className="ml-row py-3.5">
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-[14px] text-graphite">{label}</dt>
                  <dd className="ml-num text-[13px] text-bone">{value}</dd>
                </div>
                <Meter value={value} className="mt-2" label={`${label}: ${value} of 100`} />
              </div>
            );
          })}
        </dl>
      </div>
    </section>
  );
}
