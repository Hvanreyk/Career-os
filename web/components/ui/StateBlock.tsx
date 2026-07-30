/**
 * Empty, loading and error states.
 *
 * All three share one frame so a failure never looks like a different product
 * from a success. The kind is stated in words, not signalled by colour alone.
 */

type Kind = 'loading' | 'error' | 'empty';

const KIND_LABEL: Record<Kind, string> = {
  loading: 'Working',
  error: 'Error',
  empty: 'Nothing here',
};

export function StateBlock({
  kind,
  title,
  children,
  action,
  className = '',
}: {
  kind: Kind;
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`border border-rule bg-surface p-6 sm:p-8 ${className}`}
      role={kind === 'error' ? 'alert' : 'status'}
      aria-live={kind === 'loading' ? 'polite' : undefined}
    >
      <span
        className={`ml-label ${kind === 'error' ? 'text-red' : ''}`}
      >
        {kind === 'error' ? '▲ ' : kind === 'loading' ? '▸ ' : '· '}
        {KIND_LABEL[kind]}
      </span>
      <h2 className="mt-3 text-[20px] font-bold uppercase leading-tight tracking-[-0.02em] text-bone">
        {title}
      </h2>
      {children && (
        <div className="mt-3 max-w-[60ch] text-[16px] leading-[1.6] text-graphite">{children}</div>
      )}
      {action && <div className="mt-6 flex flex-wrap gap-3">{action}</div>}
    </div>
  );
}

/** Centres a StateBlock in the viewport for full-page states. */
export function StatePage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink px-5 py-12">
      <div className="w-full max-w-[34rem]">{children}</div>
    </div>
  );
}
