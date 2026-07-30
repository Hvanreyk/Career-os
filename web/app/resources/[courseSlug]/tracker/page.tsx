import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import type { BankTargetRow } from '@/lib/courses/types';
import { BankTrackerTable } from '@/components/courses/BankTrackerTable';
import { PageHeader, PageShell } from '@/components/ui/PageHeader';
import { resourceHasCapability } from '@/lib/resources/catalog';

export const metadata: Metadata = { title: 'Bank Target Tracker' };
export const dynamic = 'force-dynamic';

export default async function TrackerPage({
  params,
}: {
  params: Promise<{ courseSlug: string }>;
}) {
  const { courseSlug } = await params;
  if (!resourceHasCapability(courseSlug, 'bank-tracker')) notFound();
  const user = await requireUser(`/resources/${courseSlug}/tracker`);

  const supabase = await createClient();
  const { data: course } = await supabase
    .from('courses')
    .select('id, slug, title')
    .eq('slug', courseSlug)
    .maybeSingle();
  if (!course) notFound();

  // RLS scopes this to the signed-in user.
  const { data: targets } = await supabase
    .from('bank_targets')
    .select(
      'id, bank_name, division, tier, priority, apps_open, apps_close, status, notes, sort_order',
    )
    .order('priority')
    .order('sort_order');

  return (
    <PageShell>
      <Link
        href={`/resources/${courseSlug}`}
        className="ml-label inline-flex min-h-[44px] items-center hover:text-bone"
      >
        <span aria-hidden="true" className="mr-2">
          ◂
        </span>
        {course.title}
      </Link>

      <PageHeader
        className="mt-1"
        label="Module 8 workspace"
        title="Bank target tracker"
        lede="Build your target list: who you're applying to, why, when applications open, and where each relationship stands. There is no universal ranking — priorities are yours, based on your research."
      />

      <div className="mt-10">
        <BankTrackerTable
          initialTargets={(targets as BankTargetRow[] | null) ?? []}
          userId={user.id}
        />
      </div>
    </PageShell>
  );
}
