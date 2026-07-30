import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
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
import { PageHeader, PageShell } from '@/components/ui/PageHeader';
import { StatusLabel } from '@/components/ui/Status';
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
    <PageShell width="narrow">
      <Link
        href={`/resources/${courseSlug}`}
        className="ml-label inline-flex min-h-[44px] items-center hover:text-bone"
      >
        <span aria-hidden="true" className="mr-2">
          ◂
        </span>
        {structure.course.title}
      </Link>

      <PageHeader
        className="mt-1"
        label="Diagnostic"
        title="Where are you starting from?"
        lede="Two minutes, twelve questions. Your answers produce a readiness score and a recommended order for the course — answer honestly, not aspirationally."
        actions={<StatusLabel>{questions.length} questions</StatusLabel>}
      />

      <div className="mt-10">
        <DiagnosticWizard
          courseSlug={courseSlug}
          courseTitle={structure.course.title}
          questions={questions}
          prefill={prefill}
          dimensionLabels={DIMENSION_LABELS}
          moduleTitles={moduleTitles}
        />
      </div>
    </PageShell>
  );
}
