import Link from 'next/link';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { ChevronLeft } from 'lucide-react';
import type { ResumeWorkspaceData } from '@trajectoryos/core/resume/types';
import { TrackProductEvent } from '@/components/analytics/TrackProductEvent';
import { ResumeWorkshop } from '@/components/resume/ResumeWorkshop';
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
    .select('id, title, status, created_at, updated_at').maybeSingle();
  let sections: ResumeWorkspaceData['sections'] = [];
  let bullets: ResumeWorkspaceData['bullets'] = [];
  let revisions: ResumeWorkspaceData['revisions'] = [];
  if (resume) {
    const { data: sectionRows } = await supabase.from('resume_sections')
      .select('id, resume_id, kind, heading, sort_order, created_at, updated_at')
      .eq('resume_id', resume.id).order('sort_order');
    sections = (sectionRows ?? []) as ResumeWorkspaceData['sections'];
    const sectionIds = sections.map((section) => section.id);
    if (sectionIds.length > 0) {
      const { data: bulletRows } = await supabase.from('resume_bullets')
        .select('id, section_id, text, status, sort_order, created_at, updated_at')
        .in('section_id', sectionIds).order('sort_order');
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
    <div className="min-h-screen bg-navy-950 px-6 pt-28 pb-24">
      <TrackProductEvent eventName="resume_workshop_opened" resourceSlug={courseSlug} />
      <div className="max-w-7xl mx-auto">
        <Link href={`/resources/${courseSlug}`} className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-300 text-sm mb-6">
          <ChevronLeft className="w-4 h-4" /> {course.title}
        </Link>
        <div className="mb-8">
          <p className="text-xs font-semibold text-gold-400 uppercase tracking-widest mb-2">Private workspace</p>
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-white mb-2">AI Resume Workshop</h1>
          <p className="text-slate-400 text-sm leading-relaxed max-w-3xl">Build one structured master resume, improve individual bullets with qualitative AI critique, and save only the revisions you choose.</p>
        </div>
        <ResumeWorkshop initialData={{ resume: resume as ResumeWorkspaceData['resume'], sections, bullets, revisions }} />
      </div>
    </div>
  );
}
