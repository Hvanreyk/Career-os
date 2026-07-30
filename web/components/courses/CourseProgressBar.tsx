interface Props {
  /** 0–100 */
  percent: number;
  className?: string;
}

/** Gold gradient progress bar (visual language of the onboarding wizard). */
export function CourseProgressBar({ percent, className = '' }: Props) {
  const clamped = Math.min(100, Math.max(0, Math.round(percent)));
  return (
    <div className={`h-1.5 rounded-full bg-white/8 overflow-hidden ${className}`}>
      <div
        className="h-full rounded-full bg-gradient-to-r from-gold-500 to-gold-300 transition-all duration-500"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
