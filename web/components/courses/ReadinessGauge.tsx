import { CourseProgressBar } from './CourseProgressBar';

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
    <div className="glass rounded-2xl border border-gold-400/20 p-7">
      <p className="text-xs font-semibold text-gold-400 uppercase tracking-widest mb-4">
        {heading}
      </p>
      <div className="flex items-baseline gap-3 mb-6">
        <span className="font-serif text-5xl font-bold text-white">{score}</span>
        <span className="text-slate-500 text-lg">/100</span>
        {delta !== null && delta !== 0 && (
          <span
            className={`text-sm font-semibold ${delta > 0 ? 'text-emerald-400' : 'text-red-400'}`}
          >
            {delta > 0 ? '+' : ''}
            {delta} since your diagnostic
          </span>
        )}
      </div>
      <div className="space-y-3">
        {Object.entries(dimensions).map(([key, value]) => (
          <div key={key}>
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-slate-400">{dimensionLabels[key] ?? key}</span>
              <span className="text-slate-500">{value}</span>
            </div>
            <CourseProgressBar percent={value} />
          </div>
        ))}
      </div>
    </div>
  );
}
