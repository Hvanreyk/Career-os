/**
 * The standard head of every application page.
 *
 * Deliberately a fraction of the landing hero's scale — an interface someone
 * opens daily should not shout its own name at them.
 */
export function PageHeader({
  label,
  title,
  lede,
  actions,
  className = '',
}: {
  /** Mono eyebrow: the section this page belongs to. */
  label?: string;
  title: string;
  lede?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header className={`border-b border-rule pb-6 ${className}`}>
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          {label && <span className="ml-label">{label}</span>}
          <h1 className={`ml-title text-bone ${label ? 'mt-2.5' : ''}`}>{title}</h1>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
      </div>
      {lede && (
        <p className="mt-4 max-w-[68ch] text-[16px] leading-[1.65] text-graphite">{lede}</p>
      )}
    </header>
  );
}

/** Standard page container. One measure everywhere so pages line up. */
export function PageShell({
  children,
  className = '',
  width = 'default',
}: {
  children: React.ReactNode;
  className?: string;
  width?: 'default' | 'narrow' | 'wide';
}) {
  const measure =
    width === 'narrow' ? 'max-w-[52rem]' : width === 'wide' ? 'max-w-[90rem]' : 'max-w-[72rem]';
  return (
    <div className={`mx-auto w-full ${measure} px-5 py-10 sm:px-8 sm:py-12 ${className}`}>
      {children}
    </div>
  );
}
