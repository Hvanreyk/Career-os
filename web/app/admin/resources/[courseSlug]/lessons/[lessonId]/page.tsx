import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { AdminLessonEditor } from '@/components/admin/AdminLessonEditor';
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
    <div className="min-h-screen bg-navy-950 px-6 pt-28 pb-24">
      <div className="max-w-4xl mx-auto">
        <Link href={`/admin/resources/${courseSlug}`} className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-300 text-sm mb-6"><ArrowLeft className="w-4 h-4" /> {course.title}</Link>
        <p className="text-xs text-gold-400 uppercase tracking-widest mb-2">{module.title}</p>
        <h1 className="font-serif text-3xl font-bold text-white mb-8">{lesson.title}</h1>
        <AdminLessonEditor courseId={course.id} lesson={lesson} />
      </div>
    </div>
  );
}

