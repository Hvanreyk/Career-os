'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { submitAdminContent } from '@/lib/admin/client';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';
import { StatusLabel } from '@/components/ui/Status';

interface LessonSummary {
  id: string;
  slug: string;
  title: string;
  status: 'draft' | 'published';
  sort_order: number;
}

interface ModuleData {
  id: string;
  slug: string;
  title: string;
  summary: string;
  status: 'draft' | 'published';
  sort_order: number;
  last_reviewed_at: string | null;
  editorial_source: 'file' | 'admin';
  editorial_revision: number;
  lessons: LessonSummary[];
  quizCount: number;
}

export function AdminModuleEditor({
  courseId,
  courseSlug,
  module,
}: {
  courseId: string;
  courseSlug: string;
  module: ModuleData;
}) {
  const router = useRouter();
  const [form, setForm] = useState(module);
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonSlug, setLessonSlug] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (
      module.status !== 'published' &&
      form.status === 'published' &&
      !window.confirm('Publish this module? Only published lessons under a published course become public.')
    ) return;
    setBusy(true);
    setError(null);
    try {
      await submitAdminContent({
        action: 'update_module',
        courseId,
        moduleId: module.id,
        patch: {
          title: form.title,
          summary: form.summary,
          status: form.status,
          sort_order: Number(form.sort_order),
          last_reviewed_at: form.last_reviewed_at || null,
        },
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save module');
    } finally {
      setBusy(false);
    }
  }

  async function createLesson(event: FormEvent) {
    event.preventDefault();
    if (!lessonTitle.trim() || !lessonSlug.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const result = await submitAdminContent({
        action: 'create_lesson',
        courseId,
        moduleId: module.id,
        lesson: {
          title: lessonTitle,
          slug: lessonSlug,
          sort_order: module.lessons.length,
        },
      });
      setLessonTitle('');
      setLessonSlug('');
      if (result.id) router.push(`/admin/resources/${courseSlug}/lessons/${result.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create lesson');
    } finally {
      setBusy(false);
    }
  }

  const publishing = module.status !== 'published' && form.status === 'published';

  return (
    <div className="ml-panel">
      <form onSubmit={(event) => void save(event)}>
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-rule px-4 py-3 sm:px-5">
          <div>
            <p className="ml-label text-bone">{module.slug}</p>
            <p className="ml-num mt-1 text-[12px] text-graphite">
              {module.editorial_source} source · revision {module.editorial_revision}
            </p>
          </div>
          <Button type="submit" variant="secondary" disabled={busy} loading={busy}>
            Save module
          </Button>
        </div>

        <div className="space-y-4 p-4 sm:p-5">
          <Field label="Module title">
            {(props) => (
              <input
                {...props}
                className="ml-field"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            )}
          </Field>
          <Field label="Summary">
            {(props) => (
              <textarea
                {...props}
                className="ml-field min-h-20"
                value={form.summary}
                onChange={(e) => setForm({ ...form, summary: e.target.value })}
                placeholder="Module summary"
              />
            )}
          </Field>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Status">
              {(props) => (
                <select
                  {...props}
                  className="ml-field"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as ModuleData['status'] })}
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                </select>
              )}
            </Field>
            <Field label="Last reviewed">
              {(props) => (
                <input
                  {...props}
                  type="date"
                  className="ml-field ml-num [color-scheme:dark]"
                  value={form.last_reviewed_at ?? ''}
                  onChange={(e) => setForm({ ...form, last_reviewed_at: e.target.value || null })}
                />
              )}
            </Field>
            <Field label="Display order">
              {(props) => (
                <input
                  {...props}
                  type="number"
                  min={0}
                  className="ml-field ml-num"
                  value={form.sort_order}
                  onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
                />
              )}
            </Field>
          </div>
          {publishing && (
            <p className="border-l-2 border-warn bg-raised px-3 py-2.5 text-[14px] leading-snug text-bone">
              <span className="ml-label text-warn">
                <span aria-hidden="true">▲ </span>Warning
              </span>
              <span className="mt-1 block">
                Saving will publish this module. Only published lessons under a published course
                become public.
              </span>
            </p>
          )}
        </div>
      </form>

      <div className="border-t border-rule p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-[13px] font-bold uppercase tracking-[0.06em] text-bone">Lessons</h3>
          <Link
            href={`/admin/resources/${courseSlug}/modules/${module.id}/quiz`}
            className="ml-btn ml-btn-text min-h-[44px] text-[13px]"
          >
            Quiz ({module.quizCount})
          </Link>
        </div>

        <div className="mt-1">
          {module.lessons.map((lesson) => (
            <Link
              key={lesson.id}
              href={`/admin/resources/${courseSlug}/lessons/${lesson.id}`}
              className="ml-row ml-row-hover flex min-h-[44px] items-center justify-between gap-3 py-2.5"
            >
              <span className="text-[15px] text-bone">{lesson.title}</span>
              <StatusLabel tone={lesson.status === 'published' ? 'ok' : 'warn'}>
                {lesson.status}
              </StatusLabel>
            </Link>
          ))}
        </div>

        <form onSubmit={(event) => void createLesson(event)} className="mt-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <input
            className="ml-field"
            value={lessonTitle}
            onChange={(e) => setLessonTitle(e.target.value)}
            placeholder="New lesson title"
            aria-label="New lesson title"
          />
          <input
            className="ml-field ml-num"
            value={lessonSlug}
            onChange={(e) => setLessonSlug(e.target.value)}
            placeholder="lesson-slug"
            aria-label="New lesson slug"
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
          />
          <Button type="submit" variant="secondary" disabled={busy || !lessonTitle || !lessonSlug}>
            <span aria-hidden="true">+</span> Add lesson
          </Button>
        </form>
      </div>

      {error && (
        <p role="alert" className="border-t border-rule px-4 py-3 text-[14px] text-red sm:px-5">
          <span aria-hidden="true">▲ </span>
          {error}
        </p>
      )}
    </div>
  );
}

export function NewModuleForm({ courseId }: { courseId: string }) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await submitAdminContent({
        action: 'create_module',
        courseId,
        module: { title, slug, summary: '', sort_order: 999 },
      });
      setTitle('');
      setSlug('');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create module');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={(event) => void create(event)} className="border border-dashed border-rule-bright bg-surface p-4 sm:p-5">
      <h3 className="text-[13px] font-bold uppercase tracking-[0.06em] text-bone">Add module</h3>
      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <input
          className="ml-field"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Module title"
          aria-label="Module title"
        />
        <input
          className="ml-field ml-num"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="module-slug"
          aria-label="Module slug"
          pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
        />
        <Button type="submit" variant="secondary" disabled={busy || !title || !slug} loading={busy}>
          <span aria-hidden="true">+</span> Add module
        </Button>
      </div>
      {error && (
        <p role="alert" className="mt-3 text-[14px] text-red">
          <span aria-hidden="true">▲ </span>
          {error}
        </p>
      )}
    </form>
  );
}
