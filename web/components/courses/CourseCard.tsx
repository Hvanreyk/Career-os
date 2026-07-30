import Link from 'next/link';
import { Meter } from '@/components/ui/Status';
import type { CourseRow } from '@/lib/courses/types';

interface Props {
  course: CourseRow;
  /** 0–100, only shown when the viewer is signed in and enrolled. */
  progressPercent?: number | null;
}

function formatDuration(minutes: number): string {
  if (!minutes) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h}h ${m ? `${m}m` : ''}`.trim() : `${m}m`;
}

/**
 * A course entry. A hairline-ruled row rather than a floating card — the
 * resources register is the canonical presentation, and this matches it so a
 * course looks the same wherever it is listed.
 */
export function CourseCard({ course, progressPercent = null }: Props) {
  return (
    <Link
      href={`/resources/${course.slug}`}
      className="ml-row ml-row-hover flex h-full min-h-[56px] flex-col gap-3 py-5"
    >
      <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-[17px] font-bold uppercase tracking-[-0.015em] text-bone">
          {course.title}
        </span>
        {course.tag && <span className="ml-label">{course.tag}</span>}
      </span>

      <span className="block max-w-[72ch] flex-1 text-[16px] leading-[1.6] text-graphite">
        {course.description}
      </span>

      {progressPercent !== null ? (
        <span className="block max-w-[22rem]">
          <span className="flex items-baseline justify-between">
            <span className="ml-label">Progress</span>
            <span className="ml-num text-[13px] text-bone">{Math.round(progressPercent)}%</span>
          </span>
          <Meter
            value={progressPercent}
            accent
            className="mt-1.5"
            label={`${course.title}: ${Math.round(progressPercent)}% complete`}
          />
        </span>
      ) : (
        <span className="flex items-center gap-4">
          <span className="ml-num text-[13px] text-graphite">
            ~{formatDuration(course.est_minutes)}
          </span>
          <span className="text-[14px] font-semibold text-red">
            Start course <span aria-hidden="true">▸</span>
          </span>
        </span>
      )}
    </Link>
  );
}
