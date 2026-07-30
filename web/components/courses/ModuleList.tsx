import Link from 'next/link';
import type { CourseWithStructure } from '@/lib/courses/queries';

interface Props {
  structure: CourseWithStructure;
  completedLessonIds: Set<string>;
  /** Signed-out viewers see the structure but lessons link to login. */
  signedIn: boolean;
  /** Module slugs in recommended order (from the diagnostic), if any. */
  priorityOrder?: string[] | null;
}

/**
 * The contents page of the manual.
 *
 * Modules are numbered chapters and lessons are numbered entries within them,
 * so a student can say "3.2" and mean something. Exactly one lesson carries the
 * accent — the first incomplete one — which is what makes "where was I?"
 * answerable at a glance.
 */
export function ModuleList({ structure, completedLessonIds, signedIn, priorityOrder }: Props) {
  const { course, modules } = structure;
  const priorityRank = new Map((priorityOrder ?? []).map((slug, i) => [slug, i + 1]));

  // First unread lesson across the whole course: the one "current" marker.
  let currentLessonId: string | null = null;
  for (const mod of modules) {
    const found = mod.lessons.find((l) => !completedLessonIds.has(l.id));
    if (found) {
      currentLessonId = found.id;
      break;
    }
  }

  return (
    <div>
      {modules.map((mod, i) => {
        const done = mod.lessons.filter((l) => completedLessonIds.has(l.id)).length;
        const rank = priorityRank.get(mod.slug);
        const moduleComplete = done === mod.lessons.length && mod.lessons.length > 0;
        const chapter = String(i + 1).padStart(2, '0');

        return (
          <section key={mod.id} className="mt-10 first:mt-0">
            {/* ── Chapter head ───────────────────────────────── */}
            <div className="border-b border-bone pb-3">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="ml-label text-bone">Module {chapter}</span>
                {rank !== undefined && rank <= 3 && (
                  <span className="ml-label text-red">Priority #{rank}</span>
                )}
                {moduleComplete && <span className="ml-label text-ok">✓ Complete</span>}
                {!moduleComplete && signedIn && mod.lessons.length > 0 && (
                  <span className="ml-label">
                    <span className="ml-num">{done}</span>/
                    <span className="ml-num">{mod.lessons.length}</span> lessons
                  </span>
                )}
              </div>
              <h3 className="mt-2 text-[19px] font-bold uppercase leading-tight tracking-[-0.02em] text-bone">
                {mod.title}
              </h3>
            </div>

            {mod.summary && (
              <p className="mt-3 max-w-[70ch] text-[15px] leading-[1.6] text-graphite">
                {mod.summary}
              </p>
            )}

            {/* ── Lessons ────────────────────────────────────── */}
            <ol className="mt-3">
              {mod.lessons.map((lesson, j) => {
                const href = signedIn
                  ? `/resources/${course.slug}/${mod.slug}/${lesson.slug}`
                  : `/login?next=${encodeURIComponent(`/resources/${course.slug}/${mod.slug}/${lesson.slug}`)}`;
                const isDone = completedLessonIds.has(lesson.id);
                const isCurrent = lesson.id === currentLessonId;
                return (
                  <li key={lesson.id}>
                    <Link
                      href={href}
                      aria-current={isCurrent ? 'step' : undefined}
                      className={`ml-row ml-row-hover grid min-h-[56px] grid-cols-[3.5rem_minmax(0,1fr)_auto] items-baseline gap-x-3 border-l-2 py-3.5 pr-3 pl-3 sm:gap-x-4 ${
                        isCurrent ? 'border-l-red bg-surface' : 'border-l-transparent'
                      }`}
                    >
                      <span className="ml-num text-[12px] text-graphite" aria-hidden="true">
                        {chapter}.{String(j + 1).padStart(2, '0')}
                      </span>

                      <span className="min-w-0">
                        <span
                          className={`block text-[15px] leading-snug ${
                            isDone ? 'text-graphite' : 'text-bone'
                          }`}
                        >
                          {lesson.title}
                        </span>
                        {/* State is a word. Colour alone would not survive
                            greyscale, and "read" vs "next" is the whole point. */}
                        <span className="mt-1 flex flex-wrap items-center gap-x-3">
                          {isDone && <span className="ml-label text-ok">✓ Read</span>}
                          {isCurrent && <span className="ml-label text-red">▸ Start here</span>}
                          {!signedIn && <span className="ml-label">Sign in</span>}
                        </span>
                      </span>

                      <span className="ml-num shrink-0 text-[12px] text-graphite">
                        {lesson.est_minutes} min
                      </span>
                    </Link>
                  </li>
                );
              })}

              <li>
                <Link
                  href={
                    signedIn
                      ? `/resources/${course.slug}/${mod.slug}/quiz`
                      : `/login?next=${encodeURIComponent(`/resources/${course.slug}/${mod.slug}/quiz`)}`
                  }
                  className="ml-row ml-row-hover grid min-h-[56px] grid-cols-[3.5rem_minmax(0,1fr)_auto] items-baseline gap-x-3 border-l-2 border-l-transparent py-3.5 pr-3 pl-3 sm:gap-x-4"
                >
                  <span className="ml-label" aria-hidden="true">
                    QZ
                  </span>
                  <span className="text-[15px] leading-snug text-bone">Module quiz</span>
                  <span className="ml-label shrink-0">Graded</span>
                </Link>
              </li>
            </ol>
          </section>
        );
      })}
    </div>
  );
}
