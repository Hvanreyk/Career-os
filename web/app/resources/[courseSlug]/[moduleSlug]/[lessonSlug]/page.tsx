import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth';
import {
  getCourseStructure,
  getLesson,
  getCompletedLessonIds,
  flattenLessons,
} from '@/lib/courses/queries';
import { LessonRenderer } from '@/components/courses/LessonRenderer';
import { MarkCompleteButton } from '@/components/courses/MarkCompleteButton';
import { PageShell } from '@/components/ui/PageHeader';
import { Meter } from '@/components/ui/Status';
import { TrackProductEvent } from '@/components/analytics/TrackProductEvent';
import { resourceHasCapability } from '@/lib/resources/catalog';

export const dynamic = 'force-dynamic';

interface Params {
  courseSlug: string;
  moduleSlug: string;
  lessonSlug: string;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { courseSlug, moduleSlug, lessonSlug } = await params;
  const data = await getLesson(courseSlug, moduleSlug, lessonSlug);
  return { title: data?.lesson.title ?? 'Lesson' };
}

export default async function LessonPage({ params }: { params: Promise<Params> }) {
  const { courseSlug, moduleSlug, lessonSlug } = await params;
  if (!resourceHasCapability(courseSlug, 'lessons')) notFound();
  await requireUser(`/resources/${courseSlug}/${moduleSlug}/${lessonSlug}`);

  const [data, structure] = await Promise.all([
    getLesson(courseSlug, moduleSlug, lessonSlug),
    getCourseStructure(courseSlug),
  ]);
  if (!data || !structure) notFound();
  const { course, module, lesson } = data;

  const completed = await getCompletedLessonIds(course.id);
  const allLessons = flattenLessons(structure);
  const index = allLessons.findIndex(({ lesson: l }) => l.id === lesson.id);
  const prev = index > 0 ? allLessons[index - 1] : null;
  const next = index >= 0 && index < allLessons.length - 1 ? allLessons[index + 1] : null;

  // After the last lesson of a module, continue to that module's quiz.
  const isLastInModule =
    next === null || next.moduleSlug !== moduleSlug;
  const nextHref = isLastInModule
    ? `/resources/${courseSlug}/${moduleSlug}/quiz`
    : `/resources/${courseSlug}/${next!.moduleSlug}/${next!.lesson.slug}`;
  const nextLabel = isLastInModule ? 'Take module quiz' : 'Next lesson';

  const done = allLessons.filter(({ lesson: l }) => completed.has(l.id)).length;
  const progressPercent = allLessons.length ? (done / allLessons.length) * 100 : 0;

  // Presentation-only: the manual's chapter/entry reference for this lesson.
  const moduleIndex = structure.modules.findIndex((m) => m.slug === moduleSlug);
  const lessonIndex =
    structure.modules[moduleIndex]?.lessons.findIndex((l) => l.id === lesson.id) ?? -1;
  const ref =
    moduleIndex >= 0 && lessonIndex >= 0
      ? `${String(moduleIndex + 1).padStart(2, '0')}.${String(lessonIndex + 1).padStart(2, '0')}`
      : null;

  return (
    <PageShell width="narrow">
      <TrackProductEvent
        eventName="lesson_viewed"
        resourceSlug={courseSlug}
        properties={{ moduleSlug, lessonSlug }}
      />

      {/* ── Where you are in the manual ────────────────────────── */}
      <div className="flex flex-wrap items-center justify-between gap-x-4">
        <Link
          href={`/resources/${courseSlug}`}
          className="ml-label inline-flex min-h-[44px] items-center hover:text-bone"
        >
          <span aria-hidden="true" className="mr-2">
            ◂
          </span>
          {course.title}
        </Link>
        <span className="ml-label">
          <span className="ml-num text-bone">{Math.round(progressPercent)}%</span> of course read
        </span>
      </div>
      <Meter
        value={progressPercent}
        className="mt-1"
        label={`Course progress: ${Math.round(progressPercent)}% complete`}
      />

      {/* ── Lesson head ────────────────────────────────────────── */}
      <header className="mt-10 border-b border-rule pb-6">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          {ref && (
            <span className="ml-num text-[11px] tracking-[0.14em] text-red" aria-hidden="true">
              {ref}
            </span>
          )}
          <span className="ml-label">{module.title}</span>
        </div>
        <h1 className="ml-title mt-3 text-bone">{lesson.title}</h1>
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1">
          <span className="ml-label">
            <span className="ml-num">{lesson.est_minutes}</span> min read
          </span>
          {completed.has(lesson.id) && <span className="ml-label text-ok">✓ Read</span>}
          {lesson.last_reviewed_at && (
            <span className="ml-label">
              Reviewed{' '}
              <span className="ml-num">
                {new Date(lesson.last_reviewed_at).toLocaleDateString('en-AU', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
            </span>
          )}
        </div>
      </header>

      {/* ── Body ───────────────────────────────────────────────── */}
      <article className="mt-10">
        <LessonRenderer blocks={lesson.content} />
      </article>

      {/* ── Sources ────────────────────────────────────────────── */}
      {lesson.sources.length > 0 && (
        <section className="mt-14 border-t border-rule pt-6">
          <h2 className="ml-label text-bone">Sources &amp; further reading</h2>
          <ul className="mt-3 max-w-[70ch]">
            {lesson.sources.map((src, i) => (
              <li
                key={i}
                className="ml-row grid grid-cols-[2.5rem_minmax(0,1fr)] items-baseline gap-x-4 py-3"
              >
                <span className="ml-num text-[12px] text-graphite" aria-hidden="true">
                  [{String(i + 1).padStart(2, '0')}]
                </span>
                {src.url ? (
                  <a
                    href={src.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[15px] leading-[1.55] text-bone underline underline-offset-2 hover:text-red"
                  >
                    {src.label}
                  </a>
                ) : (
                  <span className="text-[15px] leading-[1.55] text-graphite">{src.label}</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── Navigation ─────────────────────────────────────────── */}
      <nav
        aria-label="Lesson navigation"
        className="mt-14 flex flex-col gap-6 border-t border-rule pt-6 sm:flex-row sm:items-end sm:justify-between"
      >
        {prev ? (
          <Link
            href={`/resources/${courseSlug}/${prev.moduleSlug}/${prev.lesson.slug}`}
            className="group inline-flex min-h-[44px] min-w-0 flex-col justify-center"
          >
            <span className="ml-label">
              <span aria-hidden="true" className="mr-2">
                ◂
              </span>
              Previous
            </span>
            <span className="mt-1 truncate text-[15px] text-graphite group-hover:text-bone">
              {prev.lesson.title}
            </span>
          </Link>
        ) : (
          <span />
        )}

        <div className="shrink-0">
          {/* States what comes next before the button asks you to go there. */}
          <span className="ml-label block sm:text-right">
            Next: {isLastInModule ? 'Module quiz' : (next?.lesson.title ?? 'Module quiz')}
          </span>
          <div className="mt-2">
            <MarkCompleteButton
              lessonId={lesson.id}
              alreadyCompleted={completed.has(lesson.id)}
              nextHref={nextHref}
              nextLabel={nextLabel}
            />
          </div>
        </div>
      </nav>
    </PageShell>
  );
}
