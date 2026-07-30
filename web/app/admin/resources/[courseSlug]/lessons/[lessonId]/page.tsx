import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AdminLessonEditor } from '@/components/admin/AdminLessonEditor';
import { PageHeader, PageShell } from '@/components/ui/PageHeader';
import { requireAdmin } from '@/lib/auth';
import { getResourceDefinition } from '@/lib/resources/catalog';
import { createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function AdminLessonPage({ params }: { params: Promise<{ courseSlug: string; lessonId: string }> }) {
  const { courseSlug, lessonId } = await params;
  await requireAdmin(`/admin/resources/${courseSlug}/lessons/${lessonId}`);
  if (!getResourceDefinition(courseSlug)) notFound();
  const service = createServiceClient();
  const { data: course } = await service.from('courses').select('id, title').eq('slug', courseSlug).maybeSingle();
  if (!course) notFound();
  const { data: lesson } = await service.from('lessons').select('*').eq('id', lessonId).maybeSingle();
  if (!lesson) notFound();
  const { data: module } = await service.from('course_modules').select('id, title, course_id').eq('id', lesson.module_id).eq('course_id', course.id).maybeSingle();
  if (!module) notFound();

  return (
    <div className="min-h-screen bg-ink pt-16">
      <PageShell>
        <Link
          href={`/admin/resources/${courseSlug}`}
          className="ml-label inline-flex min-h-[44px] items-center gap-2 hover:text-bone"
        >
          <span aria-hidden="true">◂</span> {course.title}
        </Link>
        <PageHeader label={module.title} title={lesson.title} className="mt-2" />
        <div className="mt-8">
          <AdminLessonEditor courseId={course.id} lesson={lesson} />
        </div>
      </PageShell>
    </div>
  );
}

