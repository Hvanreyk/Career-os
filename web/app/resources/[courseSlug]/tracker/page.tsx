import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ChevronLeft } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import type { BankTargetRow } from '@/lib/courses/types';
import { BankTrackerTable } from '@/components/courses/BankTrackerTable';

export const metadata: Metadata = { title: 'Bank Target Tracker' };
export const dynamic = 'force-dynamic';

export default async function TrackerPage({
  params,
}: {
  params: Promise<{ courseSlug: string }>;
}) {
  const { courseSlug } = await params;
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
    <div className="min-h-screen bg-navy-950 px-6 pt-28 pb-24">
      <div className="max-w-4xl mx-auto">
        <Link
          href={`/resources/${courseSlug}`}
          className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-300 text-sm mb-6 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> {course.title}
        </Link>
        <div className="mb-8">
          <p className="text-xs font-semibold text-gold-400 uppercase tracking-widest mb-2">
            Module 8 workspace
          </p>
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-white mb-2">
            Bank Target Tracker
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed max-w-2xl">
            Build your target list: who you&apos;re applying to, why, when applications open,
            and where each relationship stands. There is no universal ranking — priorities
            are yours, based on your research.
          </p>
        </div>

        <BankTrackerTable
          initialTargets={(targets as BankTargetRow[] | null) ?? []}
          userId={user.id}
        />
      </div>
    </div>
  );
}
