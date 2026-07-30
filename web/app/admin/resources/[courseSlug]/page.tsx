import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, History } from 'lucide-react';
import { AdminCourseEditor } from '@/components/admin/AdminCourseEditor';
import { AdminModuleEditor, NewModuleForm } from '@/components/admin/AdminModuleEditor';
import { requireAdmin } from '@/lib/auth';
import { getResourceDefinition } from '@/lib/resources/catalog';
import { createServiceClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function AdminCoursePage({ params }: { params: Promise<{ courseSlug: string }> }) {
  const { courseSlug } = await params;
  await requireAdmin(`/admin/resources/${courseSlug}`);
  const resource = getResourceDefinition(courseSlug);
  if (!resource) notFound();

  const service = createServiceClient();
  const { data: course } = await service.from('courses').select('*').eq('slug', courseSlug).maybeSingle();
  if (!course) notFound();
  const [{ data: modules }, { data: revisions }] = await Promise.all([
    service.from('course_modules').select('*').eq('course_id', course.id).order('sort_order'),
    service
      .from('course_content_revisions')
      .select('id, entity_type, action, revision, note, created_at')
      .eq('course_id', course.id)
      .order('created_at', { ascending: false })
      .limit(12),
  ]);
  const moduleIds = (modules ?? []).map((module) => module.id);
  const [{ data: lessons }, { data: questions }] = moduleIds.length
    ? await Promise.all([
        service.from('lessons').select('id, module_id, slug, title, status, sort_order').in('module_id', moduleIds).order('sort_order'),
        service.from('quiz_questions').select('id, module_id').in('module_id', moduleIds),
      ])
    : [{ data: [] }, { data: [] }];

  return (
    <div className="min-h-screen bg-navy-950 px-6 pt-28 pb-24">
      <div className="max-w-5xl mx-auto">
        <Link href="/admin/resources" className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-300 text-sm mb-6">
          <ArrowLeft className="w-4 h-4" /> Resource admin
        </Link>
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-gold-400 mb-2">{resource.mode}</p>
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-white">{course.title}</h1>
          <p className="text-slate-500 text-sm mt-2">/{course.slug}</p>
        </div>

        <AdminCourseEditor course={course} />

        <div className="mt-10 mb-5 flex items-center justify-between">
          <h2 className="font-serif text-2xl font-bold text-white">Modules and lessons</h2>
          <span className="text-xs text-slate-500">{modules?.length ?? 0} modules</span>
        </div>
        <div className="space-y-5">
          {(modules ?? []).map((module) => (
            <AdminModuleEditor
              key={module.id}
              courseId={course.id}
              courseSlug={course.slug}
              module={{
                ...module,
                lessons: (lessons ?? []).filter((lesson) => lesson.module_id === module.id),
                quizCount: (questions ?? []).filter((question) => question.module_id === module.id).length,
              }}
            />
          ))}
          <NewModuleForm courseId={course.id} />
        </div>

        <div className="mt-10 glass rounded-2xl border border-white/8 p-6">
          <h2 className="text-white font-semibold flex items-center gap-2 mb-4"><History className="w-4 h-4 text-gold-400" /> Recent revisions</h2>
          <div className="space-y-3">
            {(revisions ?? []).length === 0 && <p className="text-sm text-slate-500">No Admin UI revisions yet.</p>}
            {(revisions ?? []).map((revision) => (
              <div key={revision.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm border-b border-white/6 pb-3 last:border-0 last:pb-0">
                <span className="text-white">{revision.entity_type}</span>
                <span className="text-gold-400">{revision.action}</span>
                <span className="text-slate-500">revision {revision.revision}</span>
                <span className="text-slate-600 ml-auto">{new Date(revision.created_at).toLocaleString('en-AU')}</span>
                {revision.note && <p className="basis-full text-slate-400">{revision.note}</p>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

