import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import {
  getCourseStructure,
  getCompletedLessonIds,
  getEnrollment,
  flattenLessons,
} from '@/lib/courses/queries';
import { ModuleList } from '@/components/courses/ModuleList';
import { PageHeader, PageShell } from '@/components/ui/PageHeader';
import { Button } from '@/components/ui/Button';
import { Meter, StatusLabel } from '@/components/ui/Status';
import { TrackProductEvent } from '@/components/analytics/TrackProductEvent';
import {
  getResourceDefinition,
  resourceHasCapability,
} from '@/lib/resources/catalog';
import { getResourceActions } from '@/lib/resources/actions';

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

/** Front-matter figure: a mono value under a mono label. */
function Spec({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="border-l border-rule px-4 py-3 first:border-l-0 first:pl-0">
      <div className="ml-label">{label}</div>
      <div className="ml-num mt-1 text-[15px] text-bone">{value}</div>
    </div>
  );
}

/**
 * Renders the course overview with course details, lesson progress, available actions, and diagnostic options.
 *
 * @param params - Route parameters containing the course slug.
 */
export default async function CourseOverviewPage({
  params,
}: {
  params: Promise<{ courseSlug: string }>;
}) {
  const { courseSlug } = await params;
  const resource = getResourceDefinition(courseSlug);
  if (!resource) notFound();
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
  const canUseDiagnostic = resourceHasCapability(resource, 'diagnostic');
  const resourceActions = getResourceActions(resource);

  // "Continue" goes to the first incomplete lesson.
  const nextUp = allLessons.find(({ lesson }) => !completed.has(lesson.id));
  const continueHref = nextUp
    ? `/resources/${course.slug}/${nextUp.moduleSlug}/${nextUp.lesson.slug}`
    : resourceActions[0]
      ? `/resources/${course.slug}/${resourceActions[0].path}`
      : `/resources/${course.slug}`;

  const readiness = enrollment?.readiness ?? null;
  const hasDiagnostic = Boolean(enrollment?.diagnostic_answers);
  const hours = Math.floor(course.est_minutes / 60);
  const mins = course.est_minutes % 60;

  return (
    <PageShell>
      <TrackProductEvent eventName="resource_viewed" resourceSlug={courseSlug} />

      <Link
        href="/resources"
        className="ml-label inline-flex min-h-[44px] items-center hover:text-bone"
      >
        <span aria-hidden="true" className="mr-2">
          ◂
        </span>
        Resources
      </Link>

      <PageHeader
        className="mt-1"
        label={course.tag || 'Field manual'}
        title={course.title}
        lede={course.description}
        actions={
          user ? (
            <Button href={continueHref} size="lg">
              {done > 0 ? 'Continue course' : 'Start course'} <span aria-hidden="true">▸</span>
            </Button>
          ) : (
            <Button href={`/login?next=${encodeURIComponent(`/resources/${course.slug}`)}`} size="lg">
              Sign in to start <span aria-hidden="true">▸</span>
            </Button>
          )
        }
      />

      {/* ── Front matter: the manual's specifications ──────────── */}
      <div className="mt-6 flex flex-wrap border-b border-rule pb-1">
        <Spec label="Modules" value={structure.modules.length} />
        <Spec label="Lessons" value={allLessons.length} />
        <Spec
          label="Reading time"
          value={
            course.est_minutes
              ? `~${hours ? `${hours}h ` : ''}${mins ? `${mins}m` : ''}`.trim()
              : '—'
          }
        />
        {canUseDiagnostic && readiness && (
          <Spec label="Readiness" value={`${readiness.score}/100`} />
        )}
        {course.last_reviewed_at && (
          <Spec
            label="Last reviewed"
            value={new Date(course.last_reviewed_at).toLocaleDateString('en-AU', {
              month: 'long',
              year: 'numeric',
            })}
          />
        )}
      </div>

      {/* ── Progress ───────────────────────────────────────────── */}
      {user && done > 0 && (
        <div className="mt-6 max-w-[26rem]">
          <div className="flex items-baseline justify-between gap-4">
            <span className="ml-label">
              <span className="ml-num text-bone">{done}</span> of{' '}
              <span className="ml-num">{allLessons.length}</span> lessons read
            </span>
            <span className="ml-num text-[13px] text-bone">{Math.round(progressPercent)}%</span>
          </div>
          <Meter
            value={progressPercent}
            accent
            className="mt-2"
            label={`${course.title}: ${Math.round(progressPercent)}% complete`}
          />
        </div>
      )}

      {canUseDiagnostic && user && (
        <div className="mt-6">
          <Button href={`/resources/${course.slug}/diagnostic`} variant="secondary">
            {hasDiagnostic ? 'Retake diagnostic' : 'Take the diagnostic'}
          </Button>
        </div>
      )}

      {/* ── Workspaces ─────────────────────────────────────────── */}
      {user && resourceActions.length > 0 && (
        <section className="mt-12">
          <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-bone pb-3">
            <h2 className="text-[17px] font-bold uppercase tracking-[-0.015em] text-bone">
              Workspaces
            </h2>
            <StatusLabel>
              {resourceActions.length} {resourceActions.length === 1 ? 'tool' : 'tools'}
            </StatusLabel>
          </div>
          <div className="mt-2">
            {resourceActions.map((action, i) => (
              <Link
                key={action.capability}
                href={`/resources/${course.slug}/${action.path}`}
                className="ml-row ml-row-hover grid min-h-[56px] grid-cols-[2.5rem_minmax(0,1fr)_auto] items-baseline gap-x-4 py-4"
              >
                <span className="ml-label" aria-hidden="true">
                  W{String(i + 1).padStart(2, '0')}
                </span>
                <span className="min-w-0">
                  <span className="block text-[16px] font-bold uppercase tracking-[-0.01em] text-bone">
                    {action.title}
                  </span>
                  <span className="mt-1 block max-w-[64ch] text-[15px] leading-[1.55] text-graphite">
                    {action.description}
                  </span>
                </span>
                <span className="ml-label shrink-0" aria-hidden="true">
                  ▸
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ── Contents ───────────────────────────────────────────── */}
      <section className="mt-12">
        <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-rule pb-3">
          <h2 className="ml-label text-bone">Contents</h2>
          {!user && <StatusLabel>Sign in to read</StatusLabel>}
        </div>
        <div className="mt-8">
          <ModuleList
            structure={structure}
            completedLessonIds={completed}
            signedIn={Boolean(user)}
            priorityOrder={canUseDiagnostic ? readiness?.module_priorities ?? null : null}
          />
        </div>
      </section>
    </PageShell>
  );
}
