import type { Metadata } from 'next';
import { PageHeader, PageShell } from '@/components/ui/PageHeader';
import { StatusLabel } from '@/components/ui/Status';

export const metadata: Metadata = { title: 'Resources' };

const categories = [
  {
    id: 'RES-01',
    title: 'Investment banking guides',
    description:
      'IB recruiting timelines, how deals work, coverage groups, and what banks look for at each hiring stage.',
    count: 12,
    tag: 'Guides',
  },
  {
    id: 'RES-02',
    title: 'Resume & cover letter',
    description:
      'What MDs and analysts actually read, and how to present your experience so it survives a ten-second scan.',
    count: 8,
    tag: 'Templates',
  },
  {
    id: 'RES-03',
    title: 'Interview preparation',
    description:
      'Accounting walk-throughs, DCF practice, LBO questions and fit frameworks, scoped to IB rather than finance generally.',
    count: 20,
    tag: 'Practice',
  },
  {
    id: 'RES-04',
    title: 'Networking strategy',
    description:
      'Cold outreach that gets replies, what to say in a coffee chat, how to follow up, and how conversations become referrals.',
    count: 6,
    tag: 'Strategy',
  },
  {
    id: 'RES-05',
    title: 'Market awareness',
    description:
      'M&A activity, capital markets trends and deal flow — the commercial awareness interviewers assume you have.',
    count: 10,
    tag: 'Intel',
  },
  {
    id: 'RES-06',
    title: 'Deal breakdown templates',
    description:
      'Frameworks for dissecting a real transaction: rationale, financing structure, valuation approach and buyer logic.',
    count: 5,
    tag: 'Templates',
  },
];

export default function ResourcesPage() {
  return (
    <PageShell>
      <PageHeader
        label="Resources"
        title="Field manuals"
        lede="Practical guides, templates and frameworks for students serious about breaking into investment banking. The library is still being written — none of these are published yet."
      />

      {/* A register with counts as metadata, not six cards with icon tiles. */}
      <div className="mt-10 border-t border-rule">
        {categories.map((cat) => (
          <article
            key={cat.id}
            className="ml-row grid grid-cols-1 gap-x-6 gap-y-2 py-5 md:grid-cols-[7rem_minmax(0,1fr)_9rem]"
          >
            <span className="ml-label" aria-hidden="true">
              {cat.id}
            </span>
            <div className="min-w-0">
              <h2 className="text-[16px] font-bold uppercase tracking-[-0.01em] text-bone">
                {cat.title}
              </h2>
              <p className="mt-1.5 max-w-[68ch] text-[16px] leading-[1.6] text-graphite">
                {cat.description}
              </p>
            </div>
            <div className="flex flex-wrap items-start gap-2 md:justify-end">
              <StatusLabel>{cat.tag}</StatusLabel>
              <StatusLabel>{cat.count} planned</StatusLabel>
            </div>
          </article>
        ))}
      </div>

      <p className="mt-8 max-w-[68ch] border-l-2 border-red pl-4 text-[15px] leading-[1.6] text-graphite">
        Counts are the planned scope of each section, not published items. Nothing in this library is
        readable yet.
      </p>
    </PageShell>
  );
}
