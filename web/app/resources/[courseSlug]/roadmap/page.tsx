import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ChevronLeft, Gauge } from 'lucide-react';
import { DIMENSION_LABELS } from '@trajectoryos/core/courses/diagnostic';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { getEnrollment } from '@/lib/courses/queries';
import { ReadinessGauge } from '@/components/courses/ReadinessGauge';
import { RoadmapClient, type RoadmapSectionsView } from '@/components/courses/RoadmapClient';
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
    <div className="min-h-screen bg-navy-950 px-6 pt-28 pb-24">
      <div className="max-w-3xl mx-auto">
        <Link
          href={`/resources/${courseSlug}`}
          className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-300 text-sm mb-6 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> {course.title}
        </Link>
        <div className="mb-8">
          <p className="text-xs font-semibold text-gold-400 uppercase tracking-widest mb-2">
            Module 9 output
          </p>
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-white mb-2">
            Personalised Recruiting Roadmap
          </h1>
          <p className="text-slate-400 text-sm leading-relaxed max-w-2xl">
            Built from your diagnostic, quiz results, lesson progress and bank target
            list — regenerate it as your preparation moves.
          </p>
        </div>

        {!readiness ? (
          <div className="glass rounded-2xl border border-white/8 p-10 text-center">
            <Gauge className="w-8 h-8 text-gold-400 mx-auto mb-5" />
            <h2 className="font-serif text-xl font-bold text-white mb-2">
              Take the diagnostic first
            </h2>
            <p className="text-slate-400 text-sm mb-6 max-w-md mx-auto">
              The roadmap is generated from your readiness profile. Two minutes of honest
              answers and you&apos;re back here.
            </p>
            <Link
              href={`/resources/${courseSlug}/diagnostic`}
              className="inline-flex px-6 py-3 bg-gold-400 text-navy-950 font-semibold rounded-xl hover:bg-gold-300 transition-all text-sm shadow-[0_0_20px_rgba(212,175,55,0.25)]"
            >
              Start the diagnostic
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
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
    </div>
  );
}
