import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import type { ResumeWorkspaceData } from '@trajectoryos/core/resume/types';
import { TrackProductEvent } from '@/components/analytics/TrackProductEvent';
import { ResumeBuilder } from '@/components/resume/ResumeBuilder';
import { PageHeader, PageShell } from '@/components/ui/PageHeader';
import { requireUser } from '@/lib/auth';
import { resourceHasCapability } from '@/lib/resources/catalog';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'AI Resume Workshop' };
export const dynamic = 'force-dynamic';

/**
 * Renders the authenticated AI resume workshop for a course.
 *
 * @param params - Route parameters containing the course slug.
 */
export default async function ResumeWorkshopPage({ params }: { params: Promise<{ courseSlug: string }> }) {
  const { courseSlug } = await params;
  if (!resourceHasCapability(courseSlug, 'resume-workshop')) notFound();
  await requireUser(`/resources/${courseSlug}/workshop`);
  const supabase = await createClient();
  const { data: course } = await supabase.from('courses').select('id, title').eq('slug', courseSlug).maybeSingle();
  if (!course) notFound();

  const { data: resume } = await supabase.from('resumes')
    .select('id, title, status, full_name, email, phone, linkedin_url, location, created_at, updated_at').maybeSingle();
  let sections: ResumeWorkspaceData['sections'] = [];
  let entries: ResumeWorkspaceData['entries'] = [];
  let bullets: ResumeWorkspaceData['bullets'] = [];
  let revisions: ResumeWorkspaceData['revisions'] = [];
  if (resume) {
    const { data: sectionRows } = await supabase.from('resume_sections')
      .select('id, resume_id, kind, heading, sort_order, created_at, updated_at')
      .eq('resume_id', resume.id).order('sort_order');
    sections = (sectionRows ?? []) as ResumeWorkspaceData['sections'];
    const sectionIds = sections.map((section) => section.id);
    if (sectionIds.length > 0) {
      const { data: entryRows, error: entriesError } = await supabase.from('resume_entries')
        .select('id, section_id, org, role_title, location, date_range, sort_order, created_at, updated_at')
        .in('section_id', sectionIds).order('sort_order');
      if (entriesError) throw new Error(`Could not load resume entries: ${entriesError.message}`);
      entries = (entryRows ?? []) as ResumeWorkspaceData['entries'];
      const { data: bulletRows, error: bulletsError } = await supabase.from('resume_bullets')
        .select('id, section_id, entry_id, text, status, sort_order, created_at, updated_at')
        .in('section_id', sectionIds).order('sort_order');
      if (bulletsError) throw new Error(`Could not load resume bullets: ${bulletsError.message}`);
      bullets = (bulletRows ?? []) as ResumeWorkspaceData['bullets'];
      const bulletIds = bullets.map((bullet) => bullet.id);
      if (bulletIds.length > 0) {
        const { data: revisionRows } = await supabase.from('resume_bullet_revisions')
          .select('id, bullet_id, original_text, revised_text, critique, input_hash, model, prompt_version, input_tokens, output_tokens, created_at')
          .in('bullet_id', bulletIds).order('created_at', { ascending: false });
        revisions = (revisionRows ?? []) as ResumeWorkspaceData['revisions'];
      }
    }
  }

  return (
    <div className="min-h-screen bg-ink pt-16">
      <TrackProductEvent eventName="resume_workshop_opened" resourceSlug={courseSlug} />
      <PageShell width="wide">
        <Link
          href={`/resources/${courseSlug}`}
          className="ml-label inline-flex min-h-[44px] items-center gap-2 hover:text-bone"
        >
          <span aria-hidden="true">◂</span> {course.title}
        </Link>
        <PageHeader
          label="Private workspace"
          title="Resume Builder"
          lede="Build one structured master resume — auto-create it from your profile, import an existing PDF or Word resume, refine it with AI critique and tailoring, and export a polished document."
          className="mt-2"
        />
        <div className="mt-8">
          <ResumeBuilder initialData={{ resume: resume as ResumeWorkspaceData['resume'], sections, entries, bullets, revisions }} />
        </div>
      </PageShell>
    </div>
  );
}
