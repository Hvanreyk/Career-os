import type { Metadata } from 'next';
import { Button } from '@/components/ui/Button';
import { PageHeader, PageShell } from '@/components/ui/PageHeader';
import { StatusLabel } from '@/components/ui/Status';

export const metadata: Metadata = { title: 'Career Compass' };

/**
 * What Career Compass covers.
 *
 * The mock dashboard that used to sit at the top of this page has been removed
 * rather than restyled: every figure in it was invented, and the landing page
 * already carries a clearly-labelled illustrative sample.
 */
const readouts = [
  {
    id: 'R-01',
    title: 'Current stage',
    body: 'A stage classification from S0 to S5, derived from your experience, so you know which cohort you are actually competing against.',
  },
  {
    id: 'R-02',
    title: 'Profile strength',
    body: 'How your profile compares to professionals who broke into IB from a similar starting point — not against an abstract ideal candidate.',
  },
  {
    id: 'R-03',
    title: 'Interview readiness',
    body: 'Where you stand on the technical ground interviews actually cover, from accounting through to LBO mechanics.',
  },
  {
    id: 'R-04',
    title: 'Network coverage',
    body: 'Which firms and coverage groups your matched professionals came through, and where your own outreach has gaps.',
  },
  {
    id: 'R-05',
    title: 'Application pipeline',
    body: 'Penultimate and graduate programs in one register, with the structure to keep deadlines from passing unnoticed.',
  },
  {
    id: 'R-06',
    title: 'Priority actions',
    body: 'A ranked sequence rather than a checklist. Each action carries its effort and the deadline it has to land before.',
  },
  {
    id: 'R-07',
    title: 'Recruiting deadlines',
    body: 'The Australian windows that apply to your year of study, so you can plan backwards from a real date.',
  },
  {
    id: 'R-08',
    title: 'Deal knowledge',
    body: 'Structured tracking of live transactions, so you have something specific to say when you are asked what you have been following.',
  },
];

const method = [
  'You describe your university, degree, WAM and experience to date.',
  'Your profile is scored against a database of real IB professionals.',
  'The engine returns a stage classification and a fit assessment.',
  'Gaps are ranked, and the gaps become a prioritised sequence of actions.',
];

export default function CareerCompassPage() {
  return (
    <PageShell>
      <PageHeader
        label="Career Compass"
        title="A structured decision system"
        lede="Career Compass benchmarks your profile against real professional paths, scores you by firm tier, and turns the gaps into a ranked plan of what to do next. It tells you where you stand — including when the answer is uncomfortable."
        actions={
          <Button href="/onboard/goal" size="lg">
            Build My Career Map <span aria-hidden="true">▸</span>
          </Button>
        }
      />

      {/* ── What it returns ────────────────────────────────────── */}
      <section className="mt-12">
        <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-bone pb-3">
          <h2 className="text-[17px] font-bold uppercase tracking-[-0.015em] text-bone">
            What it returns
          </h2>
          <StatusLabel>8 readouts</StatusLabel>
        </div>

        <dl className="mt-2">
          {readouts.map((r) => (
            <div
              key={r.id}
              className="ml-row ml-row-hover grid grid-cols-[3.5rem_minmax(0,1fr)] items-baseline gap-x-4 py-4 md:grid-cols-[4.5rem_minmax(0,0.7fr)_minmax(0,1.3fr)] md:gap-x-6"
            >
              <dt className="ml-label" aria-hidden="true">
                {r.id}
              </dt>
              <dd className="text-[16px] font-bold uppercase tracking-[-0.01em] text-bone">
                {r.title}
              </dd>
              <dd className="col-start-2 mt-1.5 max-w-[62ch] text-[16px] leading-[1.62] text-graphite md:col-start-3 md:mt-0">
                {r.body}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* ── Method ─────────────────────────────────────────────── */}
      <section className="mt-14">
        <h2 className="border-b border-bone pb-3 text-[17px] font-bold uppercase tracking-[-0.015em] text-bone">
          Method
        </h2>
        <ol className="mt-2">
          {method.map((step, i) => (
            <li
              key={step}
              className="ml-row grid grid-cols-[2.5rem_minmax(0,1fr)] items-baseline gap-x-4 py-4"
            >
              <span className="ml-num text-[13px] text-red" aria-hidden="true">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="max-w-[70ch] text-[16px] leading-[1.6] text-bone/90">{step}</span>
            </li>
          ))}
        </ol>
      </section>

      <div className="mt-12 flex flex-wrap items-center gap-4 border-t border-rule pt-8">
        <Button href="/onboard/goal" size="lg">
          Build My Career Map <span aria-hidden="true">▸</span>
        </Button>
        <p className="text-[15px] text-graphite">Takes about five minutes. No payment up front.</p>
      </div>
    </PageShell>
  );
}
