/**
 * Structural primitives.
 *
 * The rule for the application is that a box has to earn itself. Prefer
 * Register/Row for lists of like things, and reserve Panel for genuinely
 * separate regions — otherwise every screen turns into a grid of cards.
 */

export function Panel({
  children,
  className = '',
  raised = false,
  as: Tag = 'section',
}: {
  children: React.ReactNode;
  className?: string;
  raised?: boolean;
  as?: 'section' | 'div' | 'article' | 'aside';
}) {
  return (
    <Tag className={`${raised ? 'ml-panel-raised' : 'ml-panel'} ${className}`}>{children}</Tag>
  );
}

export function PanelHeader({
  title,
  label,
  action,
  className = '',
}: {
  title: React.ReactNode;
  /** Mono eyebrow — a section index, a count, a source. */
  label?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-rule px-4 py-3 sm:px-5 ${className}`}
    >
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        {label && <span className="ml-label">{label}</span>}
        <h2 className="text-[15px] font-bold uppercase tracking-[-0.01em] text-bone">{title}</h2>
      </div>
      {action}
    </div>
  );
}

/** A list of like things, separated by hairlines rather than boxed individually. */
export function Register({
  children,
  className = '',
  as: Tag = 'div',
}: {
  children: React.ReactNode;
  className?: string;
  as?: 'div' | 'ul' | 'ol' | 'dl';
}) {
  return <Tag className={className}>{children}</Tag>;
}

export function Row({
  children,
  className = '',
  hover = false,
  as: Tag = 'div',
}: {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  as?: 'div' | 'li' | 'tr';
}) {
  return (
    <Tag className={`ml-row ${hover ? 'ml-row-hover' : ''} ${className}`}>{children}</Tag>
  );
}

/** Label/value pair for compact metadata blocks. */
export function Stat({
  label,
  value,
  sub,
  accent = false,
  className = '',
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  sub?: React.ReactNode;
  accent?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="ml-label">{label}</div>
      <div
        className={`ml-num mt-1.5 text-[26px] font-bold leading-none tracking-[-0.03em] ${
          accent ? 'text-red' : 'text-bone'
        }`}
      >
        {value}
      </div>
      {sub && <div className="mt-1.5 text-[13px] leading-snug text-graphite">{sub}</div>}
    </div>
  );
}
