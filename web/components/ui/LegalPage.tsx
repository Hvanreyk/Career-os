import { PageHeader, PageShell } from '@/components/ui/PageHeader';

/**
 * Shared frame for the legal pages.
 *
 * These are long-form reading, so the body stays in the sans at 16px with a
 * generous measure — mono and uppercase are confined to the numbering and the
 * eyebrow.
 */
export function LegalPage({
  title,
  notice,
  sections,
}: {
  title: string;
  /** The placeholder-content warning. Kept prominent on purpose. */
  notice: string;
  sections: { title: string; body: string }[];
}) {
  const updated = new Date().toLocaleDateString('en-AU', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <PageShell width="narrow">
      <PageHeader label="Legal" title={title} />

      <p className="ml-label mt-4">Last updated: {updated}</p>

      <p
        className="mt-6 border-l-2 border-red bg-surface px-4 py-3 text-[15px] leading-[1.6] text-bone"
        role="note"
      >
        <span className="ml-label text-red">▲ Placeholder</span>
        <span className="mt-1.5 block">{notice}</span>
      </p>

      <div className="mt-10">
        {sections.map((s, i) => (
          <section key={s.title} className="ml-row py-7">
            <h2 className="flex gap-3 text-[16px] font-bold uppercase tracking-[-0.01em] text-bone">
              <span className="ml-num text-rule-bright" aria-hidden="true">
                {String(i + 1).padStart(2, '0')}
              </span>
              {s.title}
            </h2>
            <p className="mt-3 max-w-[72ch] text-[16px] leading-[1.7] text-graphite">{s.body}</p>
          </section>
        ))}
      </div>
    </PageShell>
  );
}
