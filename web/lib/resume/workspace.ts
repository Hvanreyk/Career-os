import type {
  ResumeBulletRow,
  ResumeEntryRow,
  ResumeRow,
  ResumeSectionRow,
} from '@trajectoryos/core/resume/types';
import {
  RESUME_BULLET_COLUMNS,
  RESUME_COLUMNS,
  RESUME_ENTRY_COLUMNS,
  type ResumeApiContext,
} from '@/lib/resume/server';

export interface ResumeWorkspaceRows {
  resume: ResumeRow;
  sections: ResumeSectionRow[];
  entries: ResumeEntryRow[];
  bullets: ResumeBulletRow[];
}

/**
 * Loads the authenticated user's full resume workspace (resume, sections,
 * entries, bullets) through the service client with explicit owner scoping.
 *
 * @returns The workspace rows, or `null` when the user has no resume yet.
 * @throws When any underlying query fails, so a transient database error
 * never presents as an incomplete-but-valid resume.
 */
export async function loadResumeWorkspace(
  context: ResumeApiContext,
): Promise<ResumeWorkspaceRows | null> {
  const { data: resume, error: resumeError } = await context.service.from('resumes')
    .select(RESUME_COLUMNS)
    .eq('user_id', context.user.id)
    .maybeSingle();
  if (resumeError) throw new Error(`Could not load resume: ${resumeError.message}`);
  if (!resume) return null;

  const { data: sections, error: sectionsError } = await context.service.from('resume_sections')
    .select('id, resume_id, kind, heading, sort_order, created_at, updated_at')
    .eq('user_id', context.user.id)
    .eq('resume_id', resume.id)
    .order('sort_order');
  if (sectionsError) throw new Error(`Could not load resume sections: ${sectionsError.message}`);
  const sectionIds = (sections ?? []).map((section) => section.id);

  let entries: ResumeEntryRow[] = [];
  let bullets: ResumeBulletRow[] = [];
  if (sectionIds.length > 0) {
    const [entryResult, bulletResult] = await Promise.all([
      context.service.from('resume_entries')
        .select(RESUME_ENTRY_COLUMNS)
        .eq('user_id', context.user.id)
        .in('section_id', sectionIds)
        .order('sort_order'),
      context.service.from('resume_bullets')
        .select(RESUME_BULLET_COLUMNS)
        .eq('user_id', context.user.id)
        .in('section_id', sectionIds)
        .order('sort_order'),
    ]);
    if (entryResult.error) throw new Error(`Could not load resume entries: ${entryResult.error.message}`);
    if (bulletResult.error) throw new Error(`Could not load resume bullets: ${bulletResult.error.message}`);
    entries = (entryResult.data ?? []) as ResumeEntryRow[];
    bullets = (bulletResult.data ?? []) as ResumeBulletRow[];
  }

  return {
    resume: resume as ResumeRow,
    sections: (sections ?? []) as ResumeSectionRow[],
    entries,
    bullets,
  };
}
