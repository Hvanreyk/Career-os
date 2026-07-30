import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AdminQuizEditor } from '@/components/admin/AdminQuizEditor';
import { PageHeader, PageShell } from '@/components/ui/PageHeader';
import { requireAdmin } from '@/lib/auth';
import { getResourceDefinition } from '@/lib/resources/catalog';
import { createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function AdminQuizPage({ params }: { params: Promise<{ courseSlug: string; moduleId: string }> }) {
  const { courseSlug, moduleId } = await params;
  await requireAdmin(`/admin/resources/${courseSlug}/modules/${moduleId}/quiz`);
  if (!getResourceDefinition(courseSlug)) notFound();
  const service = createServiceClient();
  const { data: course } = await service.from('courses').select('id, title').eq('slug', courseSlug).maybeSingle();
  if (!course) notFound();
  const { data: module } = await service.from('course_modules').select('id, title').eq('id', moduleId).eq('course_id', course.id).maybeSingle();
  if (!module) notFound();
  const { data: questions } = await service.from('quiz_questions').select('*').eq('module_id', module.id).order('sort_order');

  return (
    <div className="min-h-screen bg-ink pt-16">
      <PageShell>
        <Link
          href={`/admin/resources/${courseSlug}`}
          className="ml-label inline-flex min-h-[44px] items-center gap-2 hover:text-bone"
        >
          <span aria-hidden="true">◂</span> {course.title}
        </Link>
        <PageHeader label="Module quiz" title={module.title} className="mt-2" />
        <div className="mt-8">
          <AdminQuizEditor courseId={course.id} moduleId={module.id} questions={questions ?? []} />
        </div>
      </PageShell>
    </div>
  );
}

