/**
 * Status labels and meters.
 *
 * Status is always carried by the word first. The tint is reinforcement, which
 * is what keeps these readable for colour-blind users and in greyscale print.
 */

type Tone = 'neutral' | 'accent' | 'ok' | 'warn';

const toneStyles: Record<Tone, string> = {
  neutral: 'border-rule-bright text-graphite',
  accent: 'border-red text-red',
  ok: 'border-ok/50 text-ok',
  warn: 'border-warn/50 text-warn',
};

export function StatusLabel({
  children,
  tone = 'neutral',
  className = '',
}: {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={`ml-num inline-flex items-center border px-2 py-0.5 text-[11px] uppercase tracking-[0.12em] ${toneStyles[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

/**
 * A horizontal meter. Off-white by default, accent only when the value is the
 * point being made — a page full of red bars says nothing.
 */
export function Meter({
  value,
  max = 100,
  accent = false,
  label,
  className = '',
}: {
  value: number;
  max?: number;
  accent?: boolean;
  /** Required when the meter is not adjacent to its own printed figure. */
  label?: string;
  className?: string;
}) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  return (
    <div
      className={`h-1.5 w-full bg-raised ${className}`}
      role="meter"
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={label}
    >
      <div
        className={`h-full ${accent ? 'bg-red' : 'bg-bone'}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
