import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ChevronLeft, Clock } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import {
  getCourseStructure,
  getLesson,
  getCompletedLessonIds,
  flattenLessons,
} from '@/lib/courses/queries';
import { LessonRenderer } from '@/components/courses/LessonRenderer';
import { MarkCompleteButton } from '@/components/courses/MarkCompleteButton';
import { CourseProgressBar } from '@/components/courses/CourseProgressBar';
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

  return (
    <div className="min-h-screen bg-navy-950 px-6 pt-28 pb-24">
      <TrackProductEvent
        eventName="lesson_viewed"
        resourceSlug={courseSlug}
        properties={{ moduleSlug, lessonSlug }}
      />
      <div className="max-w-3xl mx-auto">
        {/* Breadcrumb + progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between gap-4 mb-3">
            <Link
              href={`/resources/${courseSlug}`}
              className="text-sm text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              {course.title}
            </Link>
            <span className="text-xs text-slate-600 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              {lesson.est_minutes} min
            </span>
          </div>
          <CourseProgressBar percent={progressPercent} />
        </div>

        {/* Title */}
        <div className="mb-8">
          <p className="text-xs font-semibold text-gold-400 uppercase tracking-widest mb-2">
            {module.title}
          </p>
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-white">
            {lesson.title}
          </h1>
          {lesson.last_reviewed_at && (
            <p className="text-xs text-slate-600 mt-3">
              Last reviewed{' '}
              {new Date(lesson.last_reviewed_at).toLocaleDateString('en-AU', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          )}
        </div>

        {/* Content */}
        <LessonRenderer blocks={lesson.content} />

        {/* Sources */}
        {lesson.sources.length > 0 && (
          <div className="mt-10 pt-6 border-t border-white/8">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
              Sources & further reading
            </h3>
            <ul className="space-y-1.5 text-sm">
              {lesson.sources.map((src, i) => (
                <li key={i}>
                  {src.url ? (
                    <a
                      href={src.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gold-400 hover:text-gold-300 transition-colors"
                    >
                      {src.label}
                    </a>
                  ) : (
                    <span className="text-slate-400">{src.label}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Navigation */}
        <div className="mt-12 pt-6 border-t border-white/8 flex items-center justify-between gap-4">
          {prev ? (
            <Link
              href={`/resources/${courseSlug}/${prev.moduleSlug}/${prev.lesson.slug}`}
              className="text-sm text-slate-400 hover:text-white transition-colors flex items-center gap-1.5 min-w-0"
            >
              <ChevronLeft className="w-4 h-4 shrink-0" />
              <span className="truncate">{prev.lesson.title}</span>
            </Link>
          ) : (
            <span />
          )}
          <MarkCompleteButton
            lessonId={lesson.id}
            alreadyCompleted={completed.has(lesson.id)}
            nextHref={nextHref}
            nextLabel={nextLabel}
          />
        </div>
      </div>
    </div>
  );
}
