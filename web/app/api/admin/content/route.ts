import { NextResponse } from 'next/server';
import { z } from 'zod';
import { LessonContent } from '@trajectoryos/core/courses/content';
import { getRequestUser, isAdminUser } from '@/lib/auth';
import { getResourceDefinition } from '@/lib/resources/catalog';
import { createServiceClient } from '@/lib/supabase/server';

const Status = z.enum(['draft', 'published']);
const Region = z.enum(['au', 'uk', 'us', 'global']);
const Slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100);
const ReviewDate = z.iso.date().nullable();

const CoursePatch = z
  .object({
    title: z.string().trim().min(1).max(160).optional(),
    description: z.string().trim().min(1).max(2000).optional(),
    icon: z.string().trim().min(1).max(80).optional(),
    tag: z.string().trim().max(80).optional(),
    region: Region.optional(),
    status: Status.optional(),
    sort_order: z.number().int().min(0).max(100).optional(),
    last_reviewed_at: ReviewDate.optional(),
  })
  .refine((patch) => Object.keys(patch).length > 0, 'No changes supplied');

const ModulePatch = z
  .object({
    title: z.string().trim().min(1).max(160).optional(),
    summary: z.string().trim().max(2000).optional(),
    status: Status.optional(),
    sort_order: z.number().int().min(0).max(1000).optional(),
    last_reviewed_at: ReviewDate.optional(),
  })
  .refine((patch) => Object.keys(patch).length > 0, 'No changes supplied');

const LessonBlock = z.object({ type: z.string().min(1) }).passthrough();
const SourceRef = z.object({
  label: z.string().trim().min(1).max(300),
  url: z.url().optional(),
});
const LessonPatch = z
  .object({
    title: z.string().trim().min(1).max(160).optional(),
    est_minutes: z.number().int().min(1).max(240).optional(),
    region: Region.optional(),
    content: z.array(LessonBlock).min(1).optional(),
    sources: z.array(SourceRef).max(50).optional(),
    status: Status.optional(),
    sort_order: z.number().int().min(0).max(1000).optional(),
    last_reviewed_at: ReviewDate.optional(),
  })
  .refine((patch) => Object.keys(patch).length > 0, 'No changes supplied');

const QuizOption = z.object({
  id: z.string().trim().min(1).max(40),
  text: z.string().trim().min(1).max(1000),
});
const QuizPatch = z
  .object({
    slug: Slug.optional(),
    prompt: z.string().trim().min(1).max(3000).optional(),
    options: z.array(QuizOption).min(2).max(8).optional(),
    correct_option_id: z.string().trim().min(1).max(40).optional(),
    explanation: z.string().trim().max(4000).optional(),
    status: Status.optional(),
    sort_order: z.number().int().min(0).max(1000).optional(),
  })
  .refine((patch) => Object.keys(patch).length > 0, 'No changes supplied');

const BodySchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('initialize_course'), resourceSlug: Slug }),
  z.object({
    action: z.literal('update_course'),
    courseId: z.uuid(),
    patch: CoursePatch,
    note: z.string().trim().max(500).optional(),
  }),
  z.object({
    action: z.literal('create_module'),
    courseId: z.uuid(),
    module: z.object({
      slug: Slug,
      title: z.string().trim().min(1).max(160),
      summary: z.string().trim().max(2000).default(''),
      sort_order: z.number().int().min(0).max(1000),
    }),
  }),
  z.object({
    action: z.literal('update_module'),
    courseId: z.uuid(),
    moduleId: z.uuid(),
    patch: ModulePatch,
    note: z.string().trim().max(500).optional(),
  }),
  z.object({
    action: z.literal('create_lesson'),
    courseId: z.uuid(),
    moduleId: z.uuid(),
    lesson: z.object({
      slug: Slug,
      title: z.string().trim().min(1).max(160),
      sort_order: z.number().int().min(0).max(1000),
    }),
  }),
  z.object({
    action: z.literal('update_lesson'),
    courseId: z.uuid(),
    lessonId: z.uuid(),
    patch: LessonPatch,
    note: z.string().trim().max(500).optional(),
  }),
  z.object({
    action: z.literal('create_quiz_question'),
    courseId: z.uuid(),
    moduleId: z.uuid(),
    question: z.object({
      slug: Slug,
      prompt: z.string().trim().min(1).max(3000),
      options: z.array(QuizOption).min(2).max(8),
      correct_option_id: z.string().trim().min(1).max(40),
      explanation: z.string().trim().max(4000).default(''),
      sort_order: z.number().int().min(0).max(1000),
    }),
  }),
  z.object({
    action: z.literal('update_quiz_question'),
    courseId: z.uuid(),
    questionId: z.uuid(),
    patch: QuizPatch,
    note: z.string().trim().max(500).optional(),
  }),
]);

type RevisionEntity = 'course' | 'module' | 'lesson' | 'quiz_question';

function revisionAction(beforeStatus: unknown, afterStatus: unknown) {
  if (beforeStatus !== 'published' && afterStatus === 'published') return 'publish';
  if (beforeStatus === 'published' && afterStatus !== 'published') return 'unpublish';
  return 'update';
}

async function recordRevision(
  service: ReturnType<typeof createServiceClient>,
  values: {
    courseId: string;
    entityType: RevisionEntity;
    entityId: string;
    action: 'create' | 'update' | 'publish' | 'unpublish';
    revision: number;
    beforeData: unknown;
    afterData: unknown;
    note?: string;
    actorUserId: string;
  },
) {
  // The migration trigger already created the immutable snapshot in the same
  // transaction as the content write. This follow-up only annotates it.
  if (!values.note) return;
  const { error } = await service
    .from('course_content_revisions')
    .update({ note: values.note })
    .eq('course_id', values.courseId)
    .eq('entity_type', values.entityType)
    .eq('entity_id', values.entityId)
    .eq('revision', values.revision);
  if (error) throw new Error(`Could not annotate content revision: ${error.message}`);
}

async function requireModuleInCourse(
  service: ReturnType<typeof createServiceClient>,
  moduleId: string,
  courseId: string,
) {
  const { data } = await service
    .from('course_modules')
    .select('*')
    .eq('id', moduleId)
    .eq('course_id', courseId)
    .maybeSingle();
  return data;
}

export async function POST(request: Request) {
  const user = await getRequestUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  if (!isAdminUser(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid content change', issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const body = parsed.data;
  const service = createServiceClient();

  try {
    if (body.action === 'initialize_course') {
      const resource = getResourceDefinition(body.resourceSlug);
      if (!resource) return NextResponse.json({ error: 'Unknown resource' }, { status: 404 });

      const { data: existing } = await service
        .from('courses')
        .select('id')
        .eq('slug', resource.slug)
        .maybeSingle();
      if (existing) return NextResponse.json({ id: existing.id, existing: true });

      const { data: created, error } = await service
        .from('courses')
        .insert({
          slug: resource.slug,
          title: resource.title,
          description: resource.description,
          icon: resource.icon,
          tag: resource.tag,
          region: 'au',
          status: 'draft',
          sort_order: 0,
          editorial_source: 'admin',
          editorial_revision: 1,
          last_edited_by: user.id,
        })
        .select('*')
        .single();
      if (error || !created) throw new Error(error?.message ?? 'Could not create course');
      await recordRevision(service, {
        courseId: created.id,
        entityType: 'course',
        entityId: created.id,
        action: 'create',
        revision: 1,
        beforeData: null,
        afterData: created,
        actorUserId: user.id,
      });
      return NextResponse.json({ id: created.id });
    }

    if (body.action === 'update_course') {
      const { data: before } = await service
        .from('courses')
        .select('*')
        .eq('id', body.courseId)
        .maybeSingle();
      if (!before) return NextResponse.json({ error: 'Course not found' }, { status: 404 });
      const revision = (before.editorial_revision as number) + 1;
      const { data: after, error } = await service
        .from('courses')
        .update({
          ...body.patch,
          editorial_source: 'admin',
          editorial_revision: revision,
          last_edited_by: user.id,
        })
        .eq('id', body.courseId)
        .select('*')
        .single();
      if (error || !after) throw new Error(error?.message ?? 'Could not update course');
      await recordRevision(service, {
        courseId: body.courseId,
        entityType: 'course',
        entityId: body.courseId,
        action: revisionAction(before.status, after.status),
        revision,
        beforeData: before,
        afterData: after,
        note: body.note,
        actorUserId: user.id,
      });
      return NextResponse.json({ ok: true, revision });
    }

    if (body.action === 'create_module') {
      const { data: course } = await service
        .from('courses')
        .select('id')
        .eq('id', body.courseId)
        .maybeSingle();
      if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 });
      const { data: created, error } = await service
        .from('course_modules')
        .insert({
          ...body.module,
          course_id: body.courseId,
          status: 'draft',
          editorial_source: 'admin',
          editorial_revision: 1,
          last_edited_by: user.id,
        })
        .select('*')
        .single();
      if (error || !created) throw new Error(error?.message ?? 'Could not create module');
      await recordRevision(service, {
        courseId: body.courseId,
        entityType: 'module',
        entityId: created.id,
        action: 'create',
        revision: 1,
        beforeData: null,
        afterData: created,
        actorUserId: user.id,
      });
      return NextResponse.json({ id: created.id });
    }

    if (body.action === 'update_module') {
      const before = await requireModuleInCourse(service, body.moduleId, body.courseId);
      if (!before) return NextResponse.json({ error: 'Module not found' }, { status: 404 });
      const revision = (before.editorial_revision as number) + 1;
      const { data: after, error } = await service
        .from('course_modules')
        .update({
          ...body.patch,
          editorial_source: 'admin',
          editorial_revision: revision,
          last_edited_by: user.id,
        })
        .eq('id', body.moduleId)
        .eq('course_id', body.courseId)
        .select('*')
        .single();
      if (error || !after) throw new Error(error?.message ?? 'Could not update module');
      await recordRevision(service, {
        courseId: body.courseId,
        entityType: 'module',
        entityId: body.moduleId,
        action: revisionAction(before.status, after.status),
        revision,
        beforeData: before,
        afterData: after,
        note: body.note,
        actorUserId: user.id,
      });
      return NextResponse.json({ ok: true, revision });
    }

    if (body.action === 'create_lesson') {
      const moduleRow = await requireModuleInCourse(service, body.moduleId, body.courseId);
      if (!moduleRow) return NextResponse.json({ error: 'Module not found' }, { status: 404 });
      const { data: created, error } = await service
        .from('lessons')
        .insert({
          ...body.lesson,
          module_id: body.moduleId,
          est_minutes: 7,
          region: 'au',
          content: [{ type: 'paragraph', md: 'Start writing this lesson.' }],
          sources: [],
          status: 'draft',
          editorial_source: 'admin',
          editorial_revision: 1,
          last_edited_by: user.id,
        })
        .select('*')
        .single();
      if (error || !created) throw new Error(error?.message ?? 'Could not create lesson');
      await recordRevision(service, {
        courseId: body.courseId,
        entityType: 'lesson',
        entityId: created.id,
        action: 'create',
        revision: 1,
        beforeData: null,
        afterData: created,
        actorUserId: user.id,
      });
      return NextResponse.json({ id: created.id });
    }

    if (body.action === 'update_lesson') {
      const { data: before } = await service
        .from('lessons')
        .select('*')
        .eq('id', body.lessonId)
        .maybeSingle();
      if (!before) return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
      const moduleRow = await requireModuleInCourse(service, before.module_id, body.courseId);
      if (!moduleRow) return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
      const validatedContent = body.patch.content
        ? LessonContent.safeParse(body.patch.content)
        : null;
      if (validatedContent && !validatedContent.success) {
        return NextResponse.json(
          {
            error: 'Lesson content is invalid',
            issues: validatedContent.error.issues,
          },
          { status: 400 },
        );
      }
      const revision = (before.editorial_revision as number) + 1;
      const { data: after, error } = await service
        .from('lessons')
        .update({
          ...body.patch,
          ...(validatedContent?.success ? { content: validatedContent.data } : {}),
          editorial_source: 'admin',
          editorial_revision: revision,
          last_edited_by: user.id,
        })
        .eq('id', body.lessonId)
        .eq('module_id', before.module_id)
        .select('*')
        .single();
      if (error || !after) throw new Error(error?.message ?? 'Could not update lesson');
      await recordRevision(service, {
        courseId: body.courseId,
        entityType: 'lesson',
        entityId: body.lessonId,
        action: revisionAction(before.status, after.status),
        revision,
        beforeData: before,
        afterData: after,
        note: body.note,
        actorUserId: user.id,
      });
      return NextResponse.json({ ok: true, revision });
    }

    if (body.action === 'create_quiz_question') {
      const moduleRow = await requireModuleInCourse(service, body.moduleId, body.courseId);
      if (!moduleRow) return NextResponse.json({ error: 'Module not found' }, { status: 404 });
      if (!body.question.options.some((option) => option.id === body.question.correct_option_id)) {
        return NextResponse.json({ error: 'Correct option must exist in options' }, { status: 400 });
      }
      const { data: created, error } = await service
        .from('quiz_questions')
        .insert({
          ...body.question,
          module_id: body.moduleId,
          status: 'draft',
          editorial_source: 'admin',
          editorial_revision: 1,
          last_edited_by: user.id,
        })
        .select('*')
        .single();
      if (error || !created) throw new Error(error?.message ?? 'Could not create question');
      await recordRevision(service, {
        courseId: body.courseId,
        entityType: 'quiz_question',
        entityId: created.id,
        action: 'create',
        revision: 1,
        beforeData: null,
        afterData: created,
        actorUserId: user.id,
      });
      return NextResponse.json({ id: created.id });
    }

    const { data: before } = await service
      .from('quiz_questions')
      .select('*')
      .eq('id', body.questionId)
      .maybeSingle();
    if (!before) return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    const moduleRow = await requireModuleInCourse(service, before.module_id, body.courseId);
    if (!moduleRow) return NextResponse.json({ error: 'Question not found' }, { status: 404 });
    const options = body.patch.options ?? (before.options as { id: string; text: string }[]);
    const correctOption = body.patch.correct_option_id ?? before.correct_option_id;
    if (!options.some((option) => option.id === correctOption)) {
      return NextResponse.json({ error: 'Correct option must exist in options' }, { status: 400 });
    }
    const revision = (before.editorial_revision as number) + 1;
    const { data: after, error } = await service
      .from('quiz_questions')
      .update({
        ...body.patch,
        editorial_source: 'admin',
        editorial_revision: revision,
        last_edited_by: user.id,
      })
      .eq('id', body.questionId)
      .eq('module_id', before.module_id)
      .select('*')
      .single();
    if (error || !after) throw new Error(error?.message ?? 'Could not update question');
    await recordRevision(service, {
      courseId: body.courseId,
      entityType: 'quiz_question',
      entityId: body.questionId,
      action: revisionAction(before.status, after.status),
      revision,
      beforeData: before,
      afterData: after,
      note: body.note,
      actorUserId: user.id,
    });
    return NextResponse.json({ ok: true, revision });
  } catch (error) {
    console.error('admin content mutation failed:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Content change failed' },
      { status: 500 },
    );
  }
}
