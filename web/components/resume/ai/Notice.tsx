import type { ReactNode } from 'react';

type Tone = 'error' | 'warn' | 'ok' | 'info';

const TONE: Record<Tone, { border: string; text: string; mark: string; word: string }> = {
  error: { border: 'border-red', text: 'text-red', mark: '▲', word: 'Error' },
  warn: { border: 'border-warn/50', text: 'text-warn', mark: '▲', word: 'Warning' },
  ok: { border: 'border-ok/50', text: 'text-ok', mark: '✓', word: 'Done' },
  info: { border: 'border-rule-bright', text: 'text-graphite', mark: '·', word: 'Note' },
};

/**
 * A flat, square inline notice. The kind is always spelled out in a mono label
 * so status never rests on colour alone.
 */
export function Notice({
  tone,
  title,
  children,
  alert = false,
}: {
  tone: Tone;
  /** Overrides the default word for this tone. */
  title?: string;
  children: ReactNode;
  alert?: boolean;
}) {
  const t = TONE[tone];
  return (
    <div
      role={alert ? 'alert' : undefined}
      className={`border-l-2 ${t.border} bg-raised px-3 py-2.5`}
    >
      <span className={`ml-label ${t.text}`}>
        <span aria-hidden="true">{t.mark} </span>
        {title ?? t.word}
      </span>
      <div className="mt-1.5 text-[14px] leading-[1.55] text-bone">{children}</div>
    </div>
  );
}
