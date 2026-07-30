import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { DIMENSION_LABELS } from '@trajectoryos/core/courses/diagnostic';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { getEnrollment } from '@/lib/courses/queries';
import { ReadinessGauge } from '@/components/courses/ReadinessGauge';
import { RoadmapClient, type RoadmapSectionsView } from '@/components/courses/RoadmapClient';
import { PageHeader, PageShell } from '@/components/ui/PageHeader';
import { StateBlock } from '@/components/ui/StateBlock';
import { Button } from '@/components/ui/Button';
import { resourceHasCapability } from '@/lib/resources/catalog';

export const metadata: Metadata = { title: 'Recruiting Roadmap' };
export const dynamic = 'force-dynamic';

interface RoadmapRow {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  roadmap: { sections: RoadmapSectionsView } | null;
  error_message: string | null;
  created_at: string;
}

export default async function RoadmapPage({
  params,
}: {
  params: Promise<{ courseSlug: string }>;
}) {
  const { courseSlug } = await params;
  if (!resourceHasCapability(courseSlug, 'roadmap')) notFound();
  await requireUser(`/resources/${courseSlug}/roadmap`);

  const supabase = await createClient();
  const { data: course } = await supabase
    .from('courses')
    .select('id, slug, title')
    .eq('slug', courseSlug)
    .maybeSingle();
  if (!course) notFound();

  const enrollment = await getEnrollment(course.id);
  const readiness = enrollment?.readiness ?? null;

  const { data: roadmapRows } = await supabase
    .from('course_roadmaps')
    .select('id, status, roadmap, error_message, created_at')
    .eq('course_id', course.id)
    .order('created_at', { ascending: false })
    .limit(1);
  const latest = (roadmapRows?.[0] as RoadmapRow | undefined) ?? null;

  const finalReadiness = enrollment?.final_readiness ?? null;

  return (
    <PageShell width="narrow">
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
        label="Module 9 output"
        title="Personalised recruiting roadmap"
        lede="Built from your diagnostic, quiz results, lesson progress and bank target list — regenerate it as your preparation moves."
      />

      <div className="mt-10">
        {!readiness ? (
          <StateBlock
            kind="empty"
            title="Take the diagnostic first"
            action={
              <Button href={`/resources/${courseSlug}/diagnostic`} size="lg">
                Start the diagnostic <span aria-hidden="true">▸</span>
              </Button>
            }
          >
            The roadmap is generated from your readiness profile. Two minutes of honest answers
            and you&apos;re back here.
          </StateBlock>
        ) : (
          <div className="space-y-10">
            <ReadinessGauge
              score={(finalReadiness ?? readiness).score}
              dimensions={(finalReadiness ?? readiness).dimensions}
              dimensionLabels={DIMENSION_LABELS}
              heading={finalReadiness ? 'Readiness (updated by your course work)' : 'Readiness score'}
              compareTo={finalReadiness ? readiness.score : null}
            />
            <RoadmapClient
              courseSlug={courseSlug}
              initial={
                latest
                  ? {
                      id: latest.id,
                      status: latest.status,
                      errorMessage: latest.error_message,
                      sections: latest.roadmap?.sections ?? null,
                      createdAt: latest.created_at,
                    }
                  : null
              }
            />
          </div>
        )}
      </div>
    </PageShell>
  );
}
