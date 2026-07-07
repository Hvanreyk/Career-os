import type { LessonBlock, SourceRef } from '@trajectoryos/core/courses/content';
import type { Readiness, FinalReadiness } from '@trajectoryos/core/courses/readiness';

// Row shapes as read from Supabase (course engine tables, migration 0006).

export interface CourseRow {
  id: string;
  slug: string;
  title: string;
  description: string;
  icon: string;
  tag: string;
  region: string;
  status: 'draft' | 'published';
  est_minutes: number;
  sort_order: number;
  last_reviewed_at: string | null;
}

export interface ModuleRow {
  id: string;
  course_id: string;
  slug: string;
  title: string;
  summary: string;
  status: 'draft' | 'published';
  sort_order: number;
  last_reviewed_at: string | null;
}

export interface LessonRow {
  id: string;
  module_id: string;
  slug: string;
  title: string;
  est_minutes: number;
  region: string;
  content: LessonBlock[];
  sources: SourceRef[];
  status: 'draft' | 'published';
  sort_order: number;
  last_reviewed_at: string | null;
}

/** Lesson list entry (no content payload). */
export type LessonSummary = Omit<LessonRow, 'content' | 'sources'>;

export interface EnrollmentRow {
  id: string;
  course_id: string;
  diagnostic_answers: Record<string, string> | null;
  readiness: Readiness | null;
  final_readiness: FinalReadiness | null;
}

export interface BankTargetRow {
  id: string;
  bank_name: string;
  division: string;
  tier: string | null;
  priority: number;
  apps_open: string | null;
  apps_close: string | null;
  status: string;
  notes: string;
  sort_order: number;
}
