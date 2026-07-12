'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Save } from 'lucide-react';
import { submitAdminContent } from '@/lib/admin/client';

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

const inputClass =
  'w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-gold-400/50';

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

  return (
    <form onSubmit={(event) => void save(event)} className="glass rounded-2xl border border-white/8 p-6 space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-white font-semibold text-lg">Course settings</h2>
          <p className="text-xs text-slate-500 mt-1">
            {course.editorial_source} source · revision {course.editorial_revision}
          </p>
        </div>
        <button
          type="submit"
          disabled={busy}
          className="px-4 py-2.5 bg-gold-400 text-navy-950 font-semibold text-sm rounded-xl hover:bg-gold-300 flex items-center gap-2 disabled:opacity-50"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save
        </button>
      </div>

      <label className="block">
        <span className="text-xs text-slate-500 block mb-1.5">Title</span>
        <input className={inputClass} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
      </label>
      <label className="block">
        <span className="text-xs text-slate-500 block mb-1.5">Description</span>
        <textarea className={`${inputClass} min-h-28`} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </label>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <label>
          <span className="text-xs text-slate-500 block mb-1.5">Status</span>
          <select className={inputClass} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as CourseData['status'] })}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
        </label>
        <label>
          <span className="text-xs text-slate-500 block mb-1.5">Region</span>
          <select className={inputClass} value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value as CourseData['region'] })}>
            <option value="au">Australia</option>
            <option value="global">Global</option>
            <option value="uk">United Kingdom</option>
            <option value="us">United States</option>
          </select>
        </label>
        <label>
          <span className="text-xs text-slate-500 block mb-1.5">Tag</span>
          <input className={inputClass} value={form.tag} onChange={(e) => setForm({ ...form, tag: e.target.value })} />
        </label>
        <label>
          <span className="text-xs text-slate-500 block mb-1.5">Icon key</span>
          <input className={inputClass} value={form.icon} onChange={(e) => setForm({ ...form, icon: e.target.value })} />
        </label>
        <label>
          <span className="text-xs text-slate-500 block mb-1.5">Last reviewed</span>
          <input type="date" className={inputClass} value={form.last_reviewed_at ?? ''} onChange={(e) => setForm({ ...form, last_reviewed_at: e.target.value || null })} />
        </label>
        <label>
          <span className="text-xs text-slate-500 block mb-1.5">Display order</span>
          <input type="number" min={0} className={inputClass} value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} />
        </label>
      </div>
      <label className="block">
        <span className="text-xs text-slate-500 block mb-1.5">Revision note</span>
        <input className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What changed and why?" />
      </label>
      {message && <p className="text-emerald-400 text-sm">{message}</p>}
      {error && <p className="text-red-400 text-sm">{error}</p>}
    </form>
  );
}

