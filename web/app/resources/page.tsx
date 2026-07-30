import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader, PageShell } from '@/components/ui/PageHeader';
import { Meter, StatusLabel } from '@/components/ui/Status';
import { createClient } from '@/lib/supabase/server';
import type { CourseRow } from '@/lib/courses/types';
import { RESOURCE_CATALOG } from '@/lib/resources/catalog';

export const metadata: Metadata = { title: 'Resources' };

// Live course + per-user progress state.
export const dynamic = 'force-dynamic';

function formatDuration(minutes: number): string {
  if (!minutes) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h}h ${m ? `${m}m` : ''}`.trim() : `${m}m`;
}

export default async function ResourcesPage() {
  const supabase = await createClient();

  // RLS returns published courses only (draft courses stay placeholders).
  const [{ data: courseRows }, { data: { user } }] = await Promise.all([
    supabase.from('courses').select('*').order('sort_order'),
    supabase.auth.getUser(),
  ]);
  const courses = new Map((courseRows as CourseRow[] | null ?? []).map((c) => [c.slug, c]));

  // Signed-in: compute progress % per published course in one query pair.
  const progressByCourse = new Map<string, number>();
  if (user && courses.size > 0) {
    const courseIds = [...courses.values()].map((c) => c.id);
    const [{ data: modules }, { data: progress }] = await Promise.all([
      supabase.from('course_modules').select('id, course_id').in('course_id', courseIds),
      supabase.from('lesson_progress').select('lesson_id, course_id').in('course_id', courseIds),
    ]);
    const moduleIds = (modules ?? []).map((m) => m.id);
    const { data: lessons } = moduleIds.length
      ? await supabase.from('lessons').select('id, module_id').in('module_id', moduleIds)
      : { data: [] };
    const courseOfModule = new Map((modules ?? []).map((m) => [m.id, m.course_id as string]));
    const lessonCount = new Map<string, number>();
    for (const l of lessons ?? []) {
      const courseId = courseOfModule.get(l.module_id);
      if (courseId) lessonCount.set(courseId, (lessonCount.get(courseId) ?? 0) + 1);
    }
    const doneCount = new Map<string, number>();
    for (const p of progress ?? []) {
      doneCount.set(p.course_id, (doneCount.get(p.course_id) ?? 0) + 1);
    }
    for (const c of courses.values()) {
      const total = lessonCount.get(c.id) ?? 0;
      const done = doneCount.get(c.id) ?? 0;
      if (done > 0 && total > 0) {
        progressByCourse.set(c.slug, Math.min(100, (done / total) * 100));
      }
    }
  }

  const liveCount = RESOURCE_CATALOG.filter((r) => courses.has(r.slug)).length;

  return (
    <PageShell>
      <PageHeader
        label="Resources"
        title="Field manuals"
        lede="Interactive courses, workspaces and frameworks for students serious about breaking into investment banking. Each one carries its own practice tools and saved outputs."
        actions={<StatusLabel>{liveCount} of {RESOURCE_CATALOG.length} live</StatusLabel>}
      />

      {/* A register of courses — hairline rows, not a grid of cards. */}
      <div className="mt-10 border-t border-rule">
        {RESOURCE_CATALOG.map((resource, i) => {
          const course = courses.get(resource.slug);
          const progress = progressByCourse.get(resource.slug) ?? null;
          const live = !!course;
          const body = (
            <>
              <span className="ml-label shrink-0" aria-hidden="true">
                {String(i + 1).padStart(2, '0')}
              </span>

              <span className="min-w-0">
                <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="text-[17px] font-bold uppercase tracking-[-0.015em] text-bone">
                    {course?.title ?? resource.title}
                  </span>
                  <StatusLabel>{resource.tag}</StatusLabel>
                  {!live && <StatusLabel>Not published</StatusLabel>}
                </span>
                <span className="mt-2 block max-w-[72ch] text-[16px] leading-[1.6] text-graphite">
                  {course?.description ?? resource.description}
                </span>

                {progress !== null && (
                  <span className="mt-3 block max-w-[22rem]">
                    <span className="flex items-baseline justify-between">
                      <span className="ml-label">Progress</span>
                      <span className="ml-num text-[13px] text-bone">{Math.round(progress)}%</span>
                    </span>
                    <Meter
                      value={progress}
                      accent
                      className="mt-1.5"
                      label={`${course?.title ?? resource.title}: ${Math.round(progress)}% complete`}
                    />
                  </span>
                )}
              </span>

              <span className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 md:flex-col md:items-end md:gap-1">
                {live && (
                  <span className="ml-num text-[13px] text-graphite">
                    {formatDuration(course.est_minutes)}
                  </span>
                )}
                <span className={`text-[14px] font-semibold ${live ? 'text-red' : 'text-graphite'}`}>
                  {live ? (
                    <>
                      {progress !== null ? 'Resume' : 'Start'} <span aria-hidden="true">▸</span>
                    </>
                  ) : (
                    'Coming soon'
                  )}
                </span>
              </span>
            </>
          );

          const layout =
            'ml-row grid grid-cols-[2.5rem_minmax(0,1fr)] items-start gap-x-4 gap-y-3 py-6 md:grid-cols-[3rem_minmax(0,1fr)_9rem] md:gap-x-6';

          return live ? (
            <Link
              key={resource.slug}
              href={`/resources/${resource.slug}`}
              className={`${layout} ml-row-hover transition-colors`}
            >
              {body}
            </Link>
          ) : (
            <div key={resource.slug} className={layout}>
              {body}
            </div>
          );
        })}
      </div>

      <p className="mt-8 max-w-[70ch] border-l-2 border-red pl-4 text-[15px] leading-[1.6] text-graphite">
        The library is still being built out. Each section becomes a complete interactive course
        with practice tools and saved outputs as it lands.
      </p>
    </PageShell>
  );
}
