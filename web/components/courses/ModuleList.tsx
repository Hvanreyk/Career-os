import Link from 'next/link';
import { CheckCircle2, ChevronRight, Circle, ClipboardCheck, Lock } from 'lucide-react';
import type { CourseWithStructure } from '@/lib/courses/queries';

interface Props {
  structure: CourseWithStructure;
  completedLessonIds: Set<string>;
  /** Signed-out viewers see the structure but lessons link to login. */
  signedIn: boolean;
  /** Module slugs in recommended order (from the diagnostic), if any. */
  priorityOrder?: string[] | null;
}

export function ModuleList({ structure, completedLessonIds, signedIn, priorityOrder }: Props) {
  const { course, modules } = structure;
  const priorityRank = new Map((priorityOrder ?? []).map((slug, i) => [slug, i + 1]));

  return (
    <div className="space-y-4">
      {modules.map((mod, i) => {
        const done = mod.lessons.filter((l) => completedLessonIds.has(l.id)).length;
        const rank = priorityRank.get(mod.slug);
        return (
          <div key={mod.id} className="glass rounded-2xl border border-white/8 p-6">
            <div className="flex flex-wrap items-center gap-3 mb-1.5">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
                Module {i + 1}
              </span>
              {rank !== undefined && rank <= 3 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-gold-400/15 text-gold-400 font-medium uppercase tracking-wider">
                  Priority #{rank}
                </span>
              )}
              {done === mod.lessons.length && mod.lessons.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-400/15 text-emerald-400 font-medium uppercase tracking-wider">
                  Complete
                </span>
              )}
            </div>
            <h3 className="font-serif text-xl font-bold text-white mb-1">{mod.title}</h3>
            {mod.summary && <p className="text-slate-400 text-sm mb-4">{mod.summary}</p>}

            <ul className="space-y-1">
              {mod.lessons.map((lesson) => {
                const href = signedIn
                  ? `/resources/${course.slug}/${mod.slug}/${lesson.slug}`
                  : `/login?next=${encodeURIComponent(`/resources/${course.slug}/${mod.slug}/${lesson.slug}`)}`;
                const isDone = completedLessonIds.has(lesson.id);
                return (
                  <li key={lesson.id}>
                    <Link
                      href={href}
                      className="flex items-center gap-3 px-3 py-2.5 -mx-3 rounded-lg hover:bg-white/[0.04] transition-colors group"
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : signedIn ? (
                        <Circle className="w-4 h-4 text-slate-600 shrink-0" />
                      ) : (
                        <Lock className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                      )}
                      <span
                        className={`text-sm flex-1 ${isDone ? 'text-slate-400' : 'text-slate-300'} group-hover:text-white transition-colors`}
                      >
                        {lesson.title}
                      </span>
                      <span className="text-xs text-slate-600">{lesson.est_minutes} min</span>
                      <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-gold-400 transition-colors" />
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
                  className="flex items-center gap-3 px-3 py-2.5 -mx-3 rounded-lg hover:bg-white/[0.04] transition-colors group"
                >
                  <ClipboardCheck className="w-4 h-4 text-gold-400/70 shrink-0" />
                  <span className="text-sm flex-1 text-slate-300 group-hover:text-white transition-colors">
                    Module quiz
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-gold-400 transition-colors" />
                </Link>
              </li>
            </ul>
          </div>
        );
      })}
    </div>
  );
}
