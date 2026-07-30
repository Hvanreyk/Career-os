import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ChevronLeft } from 'lucide-react';
import {
  DIAGNOSTIC_QUESTIONS,
  DIMENSION_LABELS,
  prefillFromProfile,
} from '@trajectoryos/core/courses/diagnostic';
import type { StudentProfile } from '@trajectoryos/core/scoring/types';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { getCourseStructure } from '@/lib/courses/queries';
import { DiagnosticWizard } from '@/components/courses/DiagnosticWizard';
import { resourceHasCapability } from '@/lib/resources/catalog';

export const metadata: Metadata = { title: 'Diagnostic' };
export const dynamic = 'force-dynamic';

export default async function DiagnosticPage({
  params,
}: {
  params: Promise<{ courseSlug: string }>;
}) {
  const { courseSlug } = await params;
  if (!resourceHasCapability(courseSlug, 'diagnostic')) notFound();
  await requireUser(`/resources/${courseSlug}/diagnostic`);

  const structure = await getCourseStructure(courseSlug);
  if (!structure) notFound();

  // Prefill suggestions from the latest onboarding profile, if one exists.
  const supabase = await createClient();
  const { data: profileRow } = await supabase
    .from('student_profiles')
    .select('profile')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  let prefill: Record<string, string> = {};
  if (profileRow?.profile) {
    try {
      const suggested = prefillFromProfile(profileRow.profile as StudentProfile);
      prefill = Object.fromEntries(
        Object.entries(suggested).filter(([, v]) => typeof v === 'string'),
      ) as Record<string, string>;
    } catch {
      // A malformed stored profile just means no prefill.
    }
  }

  // Plain-data props so the engine module stays out of the client bundle.
  const questions = DIAGNOSTIC_QUESTIONS.map((q) => ({
    id: q.id,
    prompt: q.prompt,
    options: q.options.map((o) => ({ id: o.id, text: o.text })),
  }));
  const moduleTitles = Object.fromEntries(
    structure.modules.map((m) => [m.slug, m.title]),
  );

  return (
    <div className="min-h-screen bg-navy-950 px-6 pt-28 pb-24">
      <div className="max-w-lg mx-auto">
        <Link
          href={`/resources/${courseSlug}`}
          className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-300 text-sm mb-6 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> {structure.course.title}
        </Link>
        <div className="mb-8">
          <p className="text-xs font-semibold text-gold-400 uppercase tracking-widest mb-2">
            Diagnostic
          </p>
          <h1 className="font-serif text-3xl font-bold text-white mb-2">
            Where are you starting from?
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            Two minutes, twelve questions. Your answers produce a readiness score and a
            recommended order for the course — answer honestly, not aspirationally.
          </p>
        </div>

        <DiagnosticWizard
          courseSlug={courseSlug}
          courseTitle={structure.course.title}
          questions={questions}
          prefill={prefill}
          dimensionLabels={DIMENSION_LABELS}
          moduleTitles={moduleTitles}
        />
      </div>
    </div>
  );
}
