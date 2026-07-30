import Link from 'next/link';
import { ArrowUpRight, Clock } from 'lucide-react';
import { GlassCard } from '@/components/ui/GlassCard';
import { CourseProgressBar } from './CourseProgressBar';
import { CourseIcon } from './icons';
import type { CourseRow } from '@/lib/courses/types';

interface Props {
  course: CourseRow;
  /** 0–100, only shown when the viewer is signed in and enrolled. */
  progressPercent?: number | null;
}

export function CourseCard({ course, progressPercent = null }: Props) {
  const hours = course.est_minutes >= 60;

  return (
    <Link href={`/resources/${course.slug}`} className="block h-full">
      <GlassCard className="h-full flex flex-col group cursor-pointer" gold>
        <div className="flex items-start justify-between mb-5">
          <div className="w-11 h-11 rounded-xl bg-gold-400/10 flex items-center justify-center">
            <CourseIcon name={course.icon} className="w-5 h-5 text-gold-400" />
          </div>
          <div className="flex items-center gap-2">
            {course.tag && (
              <span className="text-xs px-2.5 py-1 rounded-full glass border border-white/10 text-slate-400">
                {course.tag}
              </span>
            )}
            <ArrowUpRight className="w-4 h-4 text-slate-600 group-hover:text-gold-400 transition-colors" />
          </div>
        </div>
        <h3 className="text-white font-semibold text-lg mb-2">{course.title}</h3>
        <p className="text-slate-400 text-sm leading-relaxed flex-1">{course.description}</p>
        <div className="mt-5 pt-4 border-t border-white/6">
          {progressPercent !== null ? (
            <div>
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="text-slate-500">Progress</span>
                <span className="text-gold-400 font-medium">{Math.round(progressPercent)}%</span>
              </div>
              <CourseProgressBar percent={progressPercent} />
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Clock className="w-3.5 h-3.5" />
              {hours
                ? `~${Math.round(course.est_minutes / 60)}h ${course.est_minutes % 60 ? `${course.est_minutes % 60}m` : ''}`
                : `~${course.est_minutes} min`}
              <span className="ml-auto text-gold-400 group-hover:text-gold-300 transition-colors font-medium">
                Start course
              </span>
            </div>
          )}
        </div>
      </GlassCard>
    </Link>
  );
}
