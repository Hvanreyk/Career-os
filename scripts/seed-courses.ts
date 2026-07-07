/**
 * Course content seed script.
 *
 * Parses every course under content/courses/ (strict validation — any
 * malformed file aborts before a single write) and idempotently upserts
 * into the course engine tables via the service role:
 *
 *   courses         on slug
 *   course_modules  on (course_id, slug)
 *   lessons         on (module_id, slug)
 *   quiz_questions  on (module_id, slug)
 *
 * Rows in the DB that no longer exist in the content files are REPORTED
 * as orphans, not deleted — pass --prune to delete them explicitly.
 *
 * Usage:
 *   tsx scripts/seed-courses.ts --dry-run   # parse + validate only (content lint)
 *   tsx scripts/seed-courses.ts             # validate + upsert
 *   tsx scripts/seed-courses.ts --prune     # also delete orphaned DB rows
 */

import { resolve } from 'node:path';
import { config as loadEnv } from 'dotenv';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { parseAllCourses, CourseParseError } from './lib/parse-course.js';
import type { ParsedCourse } from '../lib/courses/content.js';

loadEnv();

const argv = new Set(process.argv.slice(2));
const DRY_RUN = argv.has('--dry-run');
const PRUNE = argv.has('--prune');

const CONTENT_ROOT = resolve(import.meta.dirname, '../content/courses');

function fail(message: string): never {
  console.error(`\n❌ ${message}`);
  process.exit(1);
}

function summarise(courses: ParsedCourse[]): void {
  for (const course of courses) {
    const lessons = course.modules.reduce((n, m) => n + m.lessons.length, 0);
    const questions = course.modules.reduce((n, m) => n + (m.quiz?.questions.length ?? 0), 0);
    const minutes = course.modules.reduce(
      (n, m) => n + m.lessons.reduce((s, l) => s + l.meta.est_minutes, 0),
      0,
    );
    console.log(
      `  ${course.meta.slug} [${course.meta.status}] — ` +
        `${course.modules.length} modules, ${lessons} lessons, ` +
        `${questions} quiz questions, ~${minutes} min`,
    );
  }
}

async function upsertCourse(supabase: SupabaseClient, course: ParsedCourse): Promise<void> {
  const totalMinutes = course.modules.reduce(
    (n, m) => n + m.lessons.reduce((s, l) => s + l.meta.est_minutes, 0),
    0,
  );

  const { data: courseRow, error: courseErr } = await supabase
    .from('courses')
    .upsert(
      {
        slug: course.meta.slug,
        title: course.meta.title,
        description: course.meta.description,
        icon: course.meta.icon,
        tag: course.meta.tag,
        region: course.meta.region,
        status: course.meta.status,
        est_minutes: totalMinutes,
        sort_order: course.meta.sort_order,
        last_reviewed_at: course.meta.last_reviewed ?? null,
      },
      { onConflict: 'slug' },
    )
    .select('id')
    .single();
  if (courseErr || !courseRow) fail(`courses upsert (${course.meta.slug}): ${courseErr?.message}`);
  const courseId = courseRow.id as string;

  const moduleIdsBySlug = new Map<string, string>();
  for (const [i, mod] of course.modules.entries()) {
    const { data: modRow, error: modErr } = await supabase
      .from('course_modules')
      .upsert(
        {
          course_id: courseId,
          slug: mod.meta.slug,
          title: mod.meta.title,
          summary: mod.meta.summary,
          status: mod.meta.status,
          sort_order: i,
          last_reviewed_at: mod.meta.last_reviewed ?? null,
        },
        { onConflict: 'course_id,slug' },
      )
      .select('id')
      .single();
    if (modErr || !modRow) {
      fail(`course_modules upsert (${course.meta.slug}/${mod.meta.slug}): ${modErr?.message}`);
    }
    const moduleId = modRow.id as string;
    moduleIdsBySlug.set(mod.meta.slug, moduleId);

    const lessonRows = mod.lessons.map((lesson, j) => ({
      module_id: moduleId,
      slug: lesson.meta.slug,
      title: lesson.meta.title,
      est_minutes: lesson.meta.est_minutes,
      region: lesson.meta.region,
      content: lesson.content,
      sources: lesson.meta.sources,
      status: lesson.meta.status,
      sort_order: j,
      last_reviewed_at: lesson.meta.last_reviewed ?? null,
    }));
    const { error: lessonErr } = await supabase
      .from('lessons')
      .upsert(lessonRows, { onConflict: 'module_id,slug' });
    if (lessonErr) {
      fail(`lessons upsert (${course.meta.slug}/${mod.meta.slug}): ${lessonErr.message}`);
    }

    if (mod.quiz) {
      const questionRows = mod.quiz.questions.map((q, k) => ({
        module_id: moduleId,
        slug: q.slug,
        prompt: q.prompt,
        options: q.options,
        correct_option_id: q.correct,
        explanation: q.explanation,
        status: mod.quiz!.status,
        sort_order: k,
      }));
      const { error: quizErr } = await supabase
        .from('quiz_questions')
        .upsert(questionRows, { onConflict: 'module_id,slug' });
      if (quizErr) {
        fail(`quiz_questions upsert (${course.meta.slug}/${mod.meta.slug}): ${quizErr.message}`);
      }
    }
  }

  await handleOrphans(supabase, course, courseId, moduleIdsBySlug);
}

/** Report (or with --prune, delete) DB rows absent from the content files. */
async function handleOrphans(
  supabase: SupabaseClient,
  course: ParsedCourse,
  courseId: string,
  moduleIdsBySlug: Map<string, string>,
): Promise<void> {
  const orphans: { table: string; id: string; label: string }[] = [];

  const { data: dbModules, error } = await supabase
    .from('course_modules')
    .select('id, slug')
    .eq('course_id', courseId);
  if (error) fail(`orphan check (modules): ${error.message}`);

  const fileModuleSlugs = new Set(course.modules.map((m) => m.meta.slug));
  for (const m of dbModules ?? []) {
    if (!fileModuleSlugs.has(m.slug)) {
      orphans.push({ table: 'course_modules', id: m.id, label: `module ${m.slug}` });
    }
  }

  for (const mod of course.modules) {
    const moduleId = moduleIdsBySlug.get(mod.meta.slug)!;

    const { data: dbLessons, error: lErr } = await supabase
      .from('lessons')
      .select('id, slug')
      .eq('module_id', moduleId);
    if (lErr) fail(`orphan check (lessons): ${lErr.message}`);
    const fileLessonSlugs = new Set(mod.lessons.map((l) => l.meta.slug));
    for (const l of dbLessons ?? []) {
      if (!fileLessonSlugs.has(l.slug)) {
        orphans.push({ table: 'lessons', id: l.id, label: `lesson ${mod.meta.slug}/${l.slug}` });
      }
    }

    const { data: dbQuestions, error: qErr } = await supabase
      .from('quiz_questions')
      .select('id, slug')
      .eq('module_id', moduleId);
    if (qErr) fail(`orphan check (quiz): ${qErr.message}`);
    const fileQuestionSlugs = new Set((mod.quiz?.questions ?? []).map((q) => q.slug));
    for (const q of dbQuestions ?? []) {
      if (!fileQuestionSlugs.has(q.slug)) {
        orphans.push({
          table: 'quiz_questions',
          id: q.id,
          label: `question ${mod.meta.slug}/${q.slug}`,
        });
      }
    }
  }

  if (orphans.length === 0) return;

  if (PRUNE) {
    for (const o of orphans) {
      const { error: dErr } = await supabase.from(o.table).delete().eq('id', o.id);
      if (dErr) fail(`prune ${o.label}: ${dErr.message}`);
      console.log(`  🗑  pruned ${o.label}`);
    }
  } else {
    console.warn(`  ⚠ ${orphans.length} orphaned DB row(s) not in content files (use --prune to delete):`);
    for (const o of orphans) console.warn(`     - ${o.label}`);
  }
}

async function main(): Promise<void> {
  console.log(`Parsing content from ${CONTENT_ROOT} ...`);
  let courses: ParsedCourse[];
  try {
    courses = parseAllCourses(CONTENT_ROOT);
  } catch (err) {
    if (err instanceof CourseParseError) fail(err.message);
    throw err;
  }
  console.log(`✓ ${courses.length} course(s) parsed and validated:`);
  summarise(courses);

  if (DRY_RUN) {
    console.log('\nDry run — no DB writes.');
    return;
  }

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    fail(
      'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. ' +
        'Set them in .env or the environment (see .env.example).',
    );
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  for (const course of courses) {
    console.log(`\nSeeding ${course.meta.slug} ...`);
    await upsertCourse(supabase, course);
    console.log(`✓ ${course.meta.slug} seeded`);
  }
  console.log('\nDone.');
}

main().catch((err) => fail(err instanceof Error ? err.message : String(err)));
