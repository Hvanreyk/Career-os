import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ArrowRight, BookOpen, Clock, Gauge, Landmark, Map } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import {
  getCourseStructure,
  getCompletedLessonIds,
  getEnrollment,
  flattenLessons,
} from '@/lib/courses/queries';
import { CourseProgressBar } from '@/components/courses/CourseProgressBar';
import { ModuleList } from '@/components/courses/ModuleList';
import { courseIcon } from '@/components/courses/icons';

// Public overview page: anyone can see the course structure; progress,
// readiness and continue-links appear for signed-in users.
export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ courseSlug: string }>;
}): Promise<Metadata> {
  const { courseSlug } = await params;
  const structure = await getCourseStructure(courseSlug);
  return { title: structure?.course.title ?? 'Course' };
}

export default async function CourseOverviewPage({
  params,
}: {
  params: Promise<{ courseSlug: string }>;
}) {
  const { courseSlug } = await params;
  const structure = await getCourseStructure(courseSlug);
  if (!structure) notFound();

  const { course } = structure;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [completed, enrollment] = user
    ? await Promise.all([getCompletedLessonIds(course.id), getEnrollment(course.id)])
    : [new Set<string>(), null];

  const allLessons = flattenLessons(structure);
  const done = allLessons.filter(({ lesson }) => completed.has(lesson.id)).length;
  const progressPercent = allLessons.length ? (done / allLessons.length) * 100 : 0;

  // "Continue" goes to the first incomplete lesson.
  const nextUp = allLessons.find(({ lesson }) => !completed.has(lesson.id));
  const continueHref = nextUp
    ? `/resources/${course.slug}/${nextUp.moduleSlug}/${nextUp.lesson.slug}`
    : `/resources/${course.slug}/roadmap`;

  const readiness = enrollment?.readiness ?? null;
  const hasDiagnostic = Boolean(enrollment?.diagnostic_answers);
  const Icon = courseIcon(course.icon);
  const hours = Math.floor(course.est_minutes / 60);
  const mins = course.est_minutes % 60;

  return (
    <div className="min-h-screen bg-navy-950 px-6 pt-28 pb-24">
      <div className="max-w-4xl mx-auto">
        <Link
          href="/resources"
          className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
        >
          ← Resources
        </Link>

        {/* Header */}
        <div className="glass border border-gold-400/20 rounded-2xl p-8 mt-4 mb-8">
          <div className="flex items-start gap-5 flex-wrap">
            <div className="w-14 h-14 rounded-2xl bg-gold-400/10 flex items-center justify-center shrink-0">
              <Icon className="w-7 h-7 text-gold-400" />
            </div>
            <div className="flex-1 min-w-[16rem]">
              <div className="flex items-center gap-3 mb-2">
                {course.tag && (
                  <span className="text-xs px-2.5 py-1 rounded-full glass border border-white/10 text-slate-400">
                    {course.tag}
                  </span>
                )}
                {course.last_reviewed_at && (
                  <span className="text-xs text-slate-600">
                    Reviewed{' '}
                    {new Date(course.last_reviewed_at).toLocaleDateString('en-AU', {
                      month: 'long',
                      year: 'numeric',
                    })}
                  </span>
                )}
              </div>
              <h1 className="font-serif text-3xl md:text-4xl font-bold text-white mb-3">
                {course.title}
              </h1>
              <p className="text-slate-400 leading-relaxed mb-5">{course.description}</p>

              <div className="flex flex-wrap items-center gap-5 text-sm text-slate-400 mb-6">
                <span className="flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4 text-gold-400" />
                  {structure.modules.length} modules · {allLessons.length} lessons
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-gold-400" />~{hours ? `${hours}h ` : ''}
                  {mins ? `${mins}m` : ''}
                </span>
                {readiness && (
                  <span className="flex items-center gap-1.5">
                    <Gauge className="w-4 h-4 text-gold-400" />
                    Readiness {readiness.score}/100
                  </span>
                )}
              </div>

              {user ? (
                <div>
                  {done > 0 && (
                    <div className="mb-5 max-w-md">
                      <div className="flex items-center justify-between text-xs mb-2">
                        <span className="text-slate-500">
                          {done} of {allLessons.length} lessons complete
                        </span>
                        <span className="text-gold-400 font-medium">
                          {Math.round(progressPercent)}%
                        </span>
                      </div>
                      <CourseProgressBar percent={progressPercent} />
                    </div>
                  )}
                  <div className="flex flex-wrap gap-3">
                    <Link
                      href={continueHref}
                      className="px-5 py-3 bg-gold-400 text-navy-950 font-semibold text-sm rounded-xl hover:bg-gold-300 transition-all shadow-[0_0_20px_rgba(212,175,55,0.25)] flex items-center gap-2"
                    >
                      {done > 0 ? 'Continue course' : 'Start course'}
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                    <Link
                      href={`/resources/${course.slug}/diagnostic`}
                      className="px-5 py-3 rounded-xl border border-white/10 text-sm text-slate-300 hover:text-white hover:border-gold-400/40 transition-colors flex items-center gap-2"
                    >
                      <Gauge className="w-4 h-4" />
                      {hasDiagnostic ? 'Retake diagnostic' : 'Take the diagnostic'}
                    </Link>
                  </div>
                </div>
              ) : (
                <Link
                  href={`/login?next=${encodeURIComponent(`/resources/${course.slug}`)}`}
                  className="inline-flex px-5 py-3 bg-gold-400 text-navy-950 font-semibold text-sm rounded-xl hover:bg-gold-300 transition-all shadow-[0_0_20px_rgba(212,175,55,0.25)] items-center gap-2"
                >
                  Sign in to start <ArrowRight className="w-4 h-4" />
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Workspaces */}
        {user && (
          <div className="grid sm:grid-cols-2 gap-4 mb-8">
            <Link
              href={`/resources/${course.slug}/tracker`}
              className="glass border border-white/8 rounded-2xl p-5 hover:border-gold-400/25 transition-colors group flex items-center gap-4"
            >
              <div className="w-10 h-10 rounded-xl bg-white/5 text-slate-300 flex items-center justify-center group-hover:bg-gold-400/10 group-hover:text-gold-400 transition-colors shrink-0">
                <Landmark className="w-5 h-5" />
              </div>
              <div>
                <div className="text-white font-semibold text-sm">Bank target tracker</div>
                <p className="text-slate-500 text-xs mt-0.5">
                  Build and manage your target list (Module 8 workspace)
                </p>
              </div>
            </Link>
            <Link
              href={`/resources/${course.slug}/roadmap`}
              className="glass border border-white/8 rounded-2xl p-5 hover:border-gold-400/25 transition-colors group flex items-center gap-4"
            >
              <div className="w-10 h-10 rounded-xl bg-white/5 text-slate-300 flex items-center justify-center group-hover:bg-gold-400/10 group-hover:text-gold-400 transition-colors shrink-0">
                <Map className="w-5 h-5" />
              </div>
              <div>
                <div className="text-white font-semibold text-sm">Personalised roadmap</div>
                <p className="text-slate-500 text-xs mt-0.5">
                  Your week-by-week recruiting plan (unlocks after the diagnostic)
                </p>
              </div>
            </Link>
          </div>
        )}

        {/* Modules */}
        <ModuleList
          structure={structure}
          completedLessonIds={completed}
          signedIn={Boolean(user)}
          priorityOrder={readiness?.module_priorities ?? null}
        />
      </div>
    </div>
  );
}
