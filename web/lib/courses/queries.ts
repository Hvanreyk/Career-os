import { createClient } from '@/lib/supabase/server';
import type {
  CourseRow,
  ModuleRow,
  LessonRow,
  LessonSummary,
  EnrollmentRow,
} from './types';

// Server-side course data access. All reads go through the RLS client:
// anonymous and signed-in users only ever see status='published'
// content rows, and user tables are scoped to the owner automatically.
// (Quiz questions are NOT readable this way by design — see the quiz
// page, which uses the service client and strips answers.)

export interface CourseWithStructure {
  course: CourseRow;
  modules: (ModuleRow & { lessons: LessonSummary[] })[];
}

/** A published course + its published modules/lessons (no lesson bodies). */
export async function getCourseStructure(
  courseSlug: string,
): Promise<CourseWithStructure | null> {
  const supabase = await createClient();

  const { data: course } = await supabase
    .from('courses')
    .select('*')
    .eq('slug', courseSlug)
    .maybeSingle();
  if (!course) return null;

  const { data: modules } = await supabase
    .from('course_modules')
    .select('*')
    .eq('course_id', course.id)
    .order('sort_order');

  const moduleIds = (modules ?? []).map((m) => m.id);
  const { data: lessons } = moduleIds.length
    ? await supabase
        .from('lessons')
        .select(
          'id, module_id, slug, title, est_minutes, region, status, sort_order, last_reviewed_at',
        )
        .in('module_id', moduleIds)
        .order('sort_order')
    : { data: [] };

  return {
    course: course as CourseRow,
    modules: (modules as ModuleRow[] ?? []).map((m) => ({
      ...m,
      lessons: ((lessons ?? []) as LessonSummary[]).filter((l) => l.module_id === m.id),
    })),
  };
}

/** One published lesson with its content, or null. */
export async function getLesson(
  courseSlug: string,
  moduleSlug: string,
  lessonSlug: string,
): Promise<{ course: CourseRow; module: ModuleRow; lesson: LessonRow } | null> {
  const supabase = await createClient();

  const { data: course } = await supabase
    .from('courses')
    .select('*')
    .eq('slug', courseSlug)
    .maybeSingle();
  if (!course) return null;

  const { data: module } = await supabase
    .from('course_modules')
    .select('*')
    .eq('course_id', course.id)
    .eq('slug', moduleSlug)
    .maybeSingle();
  if (!module) return null;

  const { data: lesson } = await supabase
    .from('lessons')
    .select('*')
    .eq('module_id', module.id)
    .eq('slug', lessonSlug)
    .maybeSingle();
  if (!lesson) return null;

  return {
    course: course as CourseRow,
    module: module as ModuleRow,
    lesson: lesson as LessonRow,
  };
}

/** Lesson ids the signed-in user has completed for a course (RLS-scoped). */
export async function getCompletedLessonIds(courseId: string): Promise<Set<string>> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('lesson_progress')
    .select('lesson_id')
    .eq('course_id', courseId);
  return new Set((data ?? []).map((r) => r.lesson_id as string));
}

/** The signed-in user's enrollment row for a course, if any. */
export async function getEnrollment(courseId: string): Promise<EnrollmentRow | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('course_enrollments')
    .select('id, course_id, diagnostic_answers, readiness, final_readiness')
    .eq('course_id', courseId)
    .maybeSingle();
  return (data as EnrollmentRow | null) ?? null;
}

/** Flat ordered lesson list for prev/next navigation + progress math. */
export function flattenLessons(
  structure: CourseWithStructure,
): { moduleSlug: string; lesson: LessonSummary }[] {
  return structure.modules.flatMap((m) =>
    m.lessons.map((lesson) => ({ moduleSlug: m.slug, lesson })),
  );
}
