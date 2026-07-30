/**
 * Shared pieces for the networking workspace.
 *
 * Six views need the same inline banner, the same labelled field wrapper
 * and the same square toggle. These live here so they cannot drift apart.
 * Anything genuinely app-wide belongs in components/ui instead.
 */

type NoticeTone = 'error' | 'ok' | 'warn' | 'neutral';

const NOTICE_BORDER: Record<NoticeTone, string> = {
  error: 'border-red',
  ok: 'border-ok/50',
  warn: 'border-warn/50',
  neutral: 'border-rule-bright',
};

const NOTICE_LABEL_COLOUR: Record<NoticeTone, string> = {
  error: 'text-red',
  ok: 'text-ok',
  warn: 'text-warn',
  neutral: '',
};

const NOTICE_DEFAULT_LABEL: Record<NoticeTone, string> = {
  error: 'Error',
  ok: 'Done',
  warn: 'Check this',
  neutral: 'Note',
};

/**
 * Inline status banner. The state is always written out as a word — the
 * border tint only reinforces it.
 */
export function Notice({
  tone = 'error',
  label,
  children,
  className = '',
}: {
  tone?: NoticeTone;
  label?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={`border ${NOTICE_BORDER[tone]} bg-surface px-4 py-3 ${className}`}
    >
      <span className={`ml-label ${NOTICE_LABEL_COLOUR[tone]}`}>
        {tone === 'error' ? '▲ ' : '· '}
        {label ?? NOTICE_DEFAULT_LABEL[tone]}
      </span>
      <div className="mt-1.5 text-[15px] leading-[1.55] text-bone">{children}</div>
    </div>
  );
}

/**
 * Square toggle for filters and multi-select links. Selected state inverts
 * rather than spending the accent, which a row of ten of them would waste.
 */
export function Toggle({
  active,
  children,
  onClick,
  disabled = false,
  className = '',
  ...rest
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`ml-num inline-flex min-h-[44px] items-center border px-3 text-[11px] uppercase tracking-[0.12em] transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${
        active
          ? 'border-bone bg-bone text-ink'
          : 'border-rule-bright text-graphite hover:border-bone hover:text-bone'
      } ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

/** Section heading inside a view — a rule and a name, no box. */
export function SectionHeading({
  title,
  label,
  action,
  className = '',
}: {
  title: React.ReactNode;
  label?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 border-b border-bone pb-3 ${className}`}
    >
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="text-[16px] font-bold uppercase tracking-[-0.015em] text-bone">{title}</h2>
        {label && <span className="ml-label">{label}</span>}
      </div>
      {action}
    </div>
  );
}

/** Wraps a wide table so the page body never scrolls sideways at 375px. */
export function TableScroll({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`w-full overflow-x-auto ${className}`}>{children}</div>;
}

/** Compact register table header cell. */
export function Th({
  children,
  className = '',
  scope = 'col',
}: {
  children: React.ReactNode;
  className?: string;
  scope?: 'col' | 'row';
}) {
  return (
    <th
      scope={scope}
      className={`ml-label whitespace-nowrap border-b border-rule px-3 py-2.5 text-left font-normal ${className}`}
    >
      {children}
    </th>
  );
}
