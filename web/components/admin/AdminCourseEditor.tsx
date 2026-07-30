'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { submitAdminContent } from '@/lib/admin/client';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';

interface CourseData {
  id: string;
  title: string;
  description: string;
  icon: string;
  tag: string;
  region: 'au' | 'uk' | 'us' | 'global';
  status: 'draft' | 'published';
  sort_order: number;
  last_reviewed_at: string | null;
  editorial_source: 'file' | 'admin';
  editorial_revision: number;
}

export function AdminCourseEditor({ course }: { course: CourseData }) {
  const router = useRouter();
  const [form, setForm] = useState(course);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (
      course.status !== 'published' &&
      form.status === 'published' &&
      !window.confirm('Publish this course and make its published modules and lessons public?')
    ) return;

    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await submitAdminContent({
        action: 'update_course',
        courseId: course.id,
        patch: {
          title: form.title,
          description: form.description,
          icon: form.icon,
          tag: form.tag,
          region: form.region,
          status: form.status,
          sort_order: Number(form.sort_order),
          last_reviewed_at: form.last_reviewed_at || null,
        },
        note,
      });
      setMessage(`Saved revision ${result.revision ?? ''}`.trim());
      setNote('');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save course');
    } finally {
      setBusy(false);
    }
  }

  const publishing = course.status !== 'published' && form.status === 'published';

  return (
    <form onSubmit={(event) => void save(event)} className="ml-panel">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-rule px-4 py-3 sm:px-5">
        <div>
          <h2 className="text-[15px] font-bold uppercase tracking-[-0.01em] text-bone">
            Course settings
          </h2>
          <p className="ml-num mt-1 text-[12px] text-graphite">
            {course.editorial_source} source · revision {course.editorial_revision}
          </p>
        </div>
        <Button type="submit" disabled={busy} loading={busy}>
          Save
        </Button>
      </div>

      <div className="space-y-5 p-4 sm:p-5">
        <Field label="Title">
          {(props) => (
            <input
              {...props}
              className="ml-field"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          )}
        </Field>
        <Field label="Description">
          {(props) => (
            <textarea
              {...props}
              className="ml-field min-h-28"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          )}
        </Field>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Status">
            {(props) => (
              <select
                {...props}
                className="ml-field"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as CourseData['status'] })}
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>
            )}
          </Field>
          <Field label="Region">
            {(props) => (
              <select
                {...props}
                className="ml-field"
                value={form.region}
                onChange={(e) => setForm({ ...form, region: e.target.value as CourseData['region'] })}
              >
                <option value="au">Australia</option>
                <option value="global">Global</option>
                <option value="uk">United Kingdom</option>
                <option value="us">United States</option>
              </select>
            )}
          </Field>
          <Field label="Tag">
            {(props) => (
              <input
                {...props}
                className="ml-field"
                value={form.tag}
                onChange={(e) => setForm({ ...form, tag: e.target.value })}
              />
            )}
          </Field>
          <Field label="Icon key">
            {(props) => (
              <input
                {...props}
                className="ml-field"
                value={form.icon}
                onChange={(e) => setForm({ ...form, icon: e.target.value })}
              />
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

        <Field label="Revision note" hint="Recorded in the audit trail with this save.">
          {(props) => (
            <input
              {...props}
              className="ml-field"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What changed and why?"
            />
          )}
        </Field>

        {publishing && (
          <p className="border-l-2 border-warn bg-raised px-3 py-2.5 text-[14px] leading-snug text-bone">
            <span className="ml-label text-warn">
              <span aria-hidden="true">▲ </span>Warning
            </span>
            <span className="mt-1 block">
              Saving will publish this course and make its published modules and lessons public.
            </span>
          </p>
        )}
        {message && (
          <p role="status" className="text-[14px] text-ok">
            <span aria-hidden="true">✓ </span>
            {message}
          </p>
        )}
        {error && (
          <p role="alert" className="text-[14px] text-red">
            <span aria-hidden="true">▲ </span>
            {error}
          </p>
        )}
      </div>
    </form>
  );
}
