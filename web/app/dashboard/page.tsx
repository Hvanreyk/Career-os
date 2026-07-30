import Link from 'next/link';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import type { StudentProfile } from '@trajectoryos/core/scoring/types';
import { isAdminUser } from '@/lib/auth';
import { Button } from '@/components/ui/Button';
import { PageHeader, PageShell } from '@/components/ui/PageHeader';
import { Panel, PanelHeader } from '@/components/ui/Panel';
import { StatusLabel } from '@/components/ui/Status';

export const metadata: Metadata = { title: 'Dashboard' };

// Always render fresh — this page reflects live auth + report state.
export const dynamic = 'force-dynamic';

interface ReportRow {
  id: string;
  status: string;
  created_at: string;
}

const TIER_LABELS: Record<string, string> = {
  bb: 'Bulge Bracket',
  elite_boutique_and_mm: 'Elite Boutique / MM',
  boutique: 'Boutique',
  any: 'Any Level',
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  // The proxy already guards this route; this is defence in depth.
  if (!user) redirect('/login?next=/dashboard');

  // RLS scopes both queries to the signed-in user.
  const [{ data: reportRows }, { data: profileRow }] = await Promise.all([
    supabase
      .from('reports')
      .select('id, status, created_at')
      .order('created_at', { ascending: false })
      .limit(1),
    supabase
      .from('student_profiles')
      .select('profile, updated_at')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const report = (reportRows?.[0] as ReportRow | undefined) ?? null;
  const profile = (profileRow?.profile as StudentProfile | undefined) ?? null;

  const firstName = user.email?.split('@')[0] ?? 'there';

  /* The report is the object this whole page is about, so its state decides
     the one prominent action. Status is carried by a word first — the tint
     only reinforces it. */
  const reportState: {
    word: string;
    tone: 'neutral' | 'ok' | 'warn';
    body: string;
    cta: string;
    href: string;
  } = !report
    ? {
        word: 'Not started',
        tone: 'neutral',
        body:
          "You haven't generated a report yet. Complete the assessment and we'll map your path into investment banking.",
        cta: 'Start Assessment',
        href: '/onboard/goal',
      }
    : report.status === 'completed'
      ? {
          word: 'Ready',
          tone: 'ok',
          body: 'Your report is complete — stage classification, profile fit and your ranked next actions.',
          cta: 'View Report',
          href: `/report/${report.id}`,
        }
      : report.status === 'error'
        ? {
            word: 'Needs retry',
            tone: 'warn',
            body: 'The write-up did not finish. Your scoring is saved — open the report to retry it.',
            cta: 'Resume Report',
            href: `/report/${report.id}`,
          }
        : {
            word: 'Finishing up',
            tone: 'warn',
            body: 'Scoring is done and the written report is still generating. Open it to pick up where it left off.',
            cta: 'Resume Report',
            href: `/report/${report.id}`,
          };

  const tools = [
    { label: 'Career Compass', href: '/tools/career-compass', admin: false },
    { label: 'Career Calculator', href: '/tools/career-calculator', admin: false },
    { label: 'Resources', href: '/resources', admin: false },
    ...(isAdminUser(user)
      ? [{ label: 'Resource Admin', href: '/admin/resources', admin: true }]
      : []),
  ];

  return (
    <PageShell>
      <PageHeader
        label="Dashboard"
        title={`Welcome back, ${firstName}`}
        actions={
          <>
            <span className="ml-num text-[12px] text-graphite">{user.email}</span>
            <form action="/auth/signout" method="post">
              <Button type="submit" variant="secondary">
                Sign out
              </Button>
            </form>
          </>
        }
      />

      {/* ── Status + the one action worth taking next ──────────── */}
      <Panel className="mt-8">
        <PanelHeader
          label="Career Compass"
          title="Your report"
          action={<StatusLabel tone={reportState.tone}>{reportState.word}</StatusLabel>}
        />
        <div className="flex flex-col gap-6 p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-10 sm:p-6">
          <div className="min-w-0">
            <p className="max-w-[58ch] text-[16px] leading-[1.6] text-bone/90">
              {reportState.body}
            </p>
            {report && (
              <p className="ml-label mt-3">
                Generated{' '}
                {new Date(report.created_at).toLocaleDateString('en-AU', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            )}
          </div>
          <Button href={reportState.href} size="lg" className="shrink-0 self-start sm:self-auto">
            {reportState.cta} <span aria-hidden="true">▸</span>
          </Button>
        </div>
      </Panel>

      {/* ── Pipeline and deadlines ─────────────────────────────── */}
      <section className="mt-12">
        <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-bone pb-3">
          <h2 className="text-[17px] font-bold uppercase tracking-[-0.015em] text-bone">
            Pipeline &amp; deadlines
          </h2>
          <StatusLabel>1 tracker</StatusLabel>
        </div>

        <div className="mt-2">
          <Link
            href="/dashboard/internships"
            className="ml-row ml-row-hover grid grid-cols-[2.5rem_minmax(0,1fr)] items-start gap-x-4 gap-y-3 py-5 transition-colors md:grid-cols-[3rem_minmax(0,1fr)_7rem] md:gap-x-6"
          >
            <span className="ml-label shrink-0" aria-hidden="true">
              P-01
            </span>
            <span className="min-w-0">
              <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-[17px] font-bold uppercase tracking-[-0.015em] text-bone">
                  Internship Application Tracker
                </span>
                <StatusLabel>Not live</StatusLabel>
              </span>
              <span className="mt-2 block max-w-[72ch] text-[16px] leading-[1.6] text-graphite">
                Track every application, deadline and interview stage across banks in one
                place — coming to your dashboard soon.
              </span>
            </span>
            <span className="text-[14px] font-semibold text-bone md:justify-self-end">
              Preview <span aria-hidden="true">▸</span>
            </span>
          </Link>
        </div>
      </section>

      {/* ── Supporting: profile and tools ──────────────────────── */}
      <div className="mt-12 grid gap-10 md:grid-cols-2 md:gap-12">
        <section>
          <h2 className="border-b border-rule pb-2.5 text-[13px] font-bold uppercase tracking-[0.08em] text-graphite">
            Your profile
          </h2>

          {profile ? (
            <dl className="mt-1">
              <div className="ml-row flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3">
                <dt className="ml-label">University</dt>
                <dd className="text-right text-[15px] font-semibold text-bone">
                  {profile.university}
                </dd>
              </div>
              <div className="ml-row flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3">
                <dt className="ml-label">Degree</dt>
                <dd className="text-right text-[15px] font-semibold text-bone">
                  {profile.degree}
                </dd>
              </div>
              <div className="ml-row flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3">
                <dt className="ml-label">Year</dt>
                <dd className="ml-num text-right text-[15px] font-semibold text-bone">
                  Year {profile.current_year}
                </dd>
              </div>
              <div className="ml-row flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3">
                <dt className="ml-label">Target</dt>
                <dd className="text-right text-[15px] font-semibold text-bone">
                  {TIER_LABELS[profile.target_firm_tier] ?? profile.target_firm_tier}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="mt-4 text-[16px] leading-[1.6] text-graphite">
              Complete the assessment to build your profile.
            </p>
          )}

          <Button href="/onboard/goal" variant="secondary" size="sm" className="mt-5">
            {profile ? 'Update profile & re-run assessment' : 'Start the assessment'}
          </Button>
        </section>

        <section>
          <h2 className="border-b border-rule pb-2.5 text-[13px] font-bold uppercase tracking-[0.08em] text-graphite">
            Tools
          </h2>
          <div className="mt-1">
            {tools.map((tool) => (
              <Link
                key={tool.href}
                href={tool.href}
                className="ml-row ml-row-hover flex min-h-[48px] items-center justify-between gap-4 py-3 transition-colors"
              >
                <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="text-[16px] font-semibold text-bone">{tool.label}</span>
                  {tool.admin && <StatusLabel>Admin</StatusLabel>}
                </span>
                <span className="text-[14px] text-graphite" aria-hidden="true">
                  ▸
                </span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </PageShell>
  );
}
