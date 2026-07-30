import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AdminCourseEditor } from '@/components/admin/AdminCourseEditor';
import { AdminModuleEditor, NewModuleForm } from '@/components/admin/AdminModuleEditor';
import { PageHeader, PageShell } from '@/components/ui/PageHeader';
import { Panel, PanelHeader } from '@/components/ui/Panel';
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
    <div className="min-h-screen bg-ink pt-16">
      <PageShell>
        <Link
          href="/admin/resources"
          className="ml-label inline-flex min-h-[44px] items-center gap-2 hover:text-bone"
        >
          <span aria-hidden="true">◂</span> Resource admin
        </Link>
        <PageHeader
          label={resource.mode}
          title={course.title}
          lede={<span className="ml-num">/{course.slug}</span>}
          className="mt-2"
        />

        <div className="mt-8">
          <AdminCourseEditor course={course} />
        </div>

        <div className="mt-12 flex flex-wrap items-baseline justify-between gap-4 border-b border-bone pb-3">
          <h2 className="text-[17px] font-bold uppercase tracking-[-0.015em] text-bone">
            Modules and lessons
          </h2>
          <span className="ml-label">{modules?.length ?? 0} modules</span>
        </div>
        <div className="mt-5 space-y-5">
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

        <Panel className="mt-12">
          <PanelHeader title="Recent revisions" label="Audit trail" />
          <div className="px-4 sm:px-5">
            {(revisions ?? []).length === 0 && (
              <p className="py-4 text-[15px] text-graphite">No Admin UI revisions yet.</p>
            )}
            {(revisions ?? []).map((revision) => (
              <div key={revision.id} className="ml-row flex flex-wrap items-center gap-x-3 gap-y-1 py-3">
                <span className="ml-num text-[13px] text-bone">{revision.entity_type}</span>
                <span className="ml-label text-red">{revision.action}</span>
                <span className="ml-num text-[13px] text-graphite">revision {revision.revision}</span>
                <span className="ml-num ml-auto text-[12px] text-graphite">
                  {new Date(revision.created_at).toLocaleString('en-AU')}
                </span>
                {revision.note && (
                  <p className="basis-full text-[14px] leading-snug text-graphite">{revision.note}</p>
                )}
              </div>
            ))}
          </div>
        </Panel>
      </PageShell>
    </div>
  );
}

