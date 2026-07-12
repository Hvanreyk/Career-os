'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BookOpen, HelpCircle, Loader2, Plus, Save } from 'lucide-react';
import { submitAdminContent } from '@/lib/admin/client';

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

const inputClass =
  'w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-gold-400/50';

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

  return (
    <div className="glass rounded-2xl border border-white/8 p-6 space-y-5">
      <form onSubmit={(event) => void save(event)} className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs text-gold-400 uppercase tracking-wider">{module.slug}</p>
            <p className="text-xs text-slate-600 mt-1">
              {module.editorial_source} source · revision {module.editorial_revision}
            </p>
          </div>
          <button type="submit" disabled={busy} className="px-3 py-2 rounded-lg border border-white/10 text-slate-300 hover:text-white flex items-center gap-2 text-sm disabled:opacity-50">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
          </button>
        </div>
        <input className={inputClass} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <textarea className={`${inputClass} min-h-20`} value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} placeholder="Module summary" />
        <div className="grid sm:grid-cols-3 gap-3">
          <select className={inputClass} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as ModuleData['status'] })}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
          <input type="date" className={inputClass} value={form.last_reviewed_at ?? ''} onChange={(e) => setForm({ ...form, last_reviewed_at: e.target.value || null })} />
          <input type="number" min={0} className={inputClass} value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} />
        </div>
      </form>

      <div className="border-t border-white/8 pt-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-gold-400" /> Lessons
          </h3>
          <Link href={`/admin/resources/${courseSlug}/modules/${module.id}/quiz`} className="text-xs text-slate-400 hover:text-gold-400 flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5" /> Quiz ({module.quizCount})
          </Link>
        </div>
        <div className="space-y-2 mb-4">
          {module.lessons.map((lesson) => (
            <Link key={lesson.id} href={`/admin/resources/${courseSlug}/lessons/${lesson.id}`} className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg bg-white/[0.025] border border-white/6 hover:border-gold-400/25">
              <span className="text-sm text-slate-300">{lesson.title}</span>
              <span className={lesson.status === 'published' ? 'text-xs text-emerald-400' : 'text-xs text-amber-400'}>{lesson.status}</span>
            </Link>
          ))}
        </div>
        <form onSubmit={(event) => void createLesson(event)} className="grid sm:grid-cols-[1fr_1fr_auto] gap-2">
          <input className={inputClass} value={lessonTitle} onChange={(e) => setLessonTitle(e.target.value)} placeholder="New lesson title" />
          <input className={inputClass} value={lessonSlug} onChange={(e) => setLessonSlug(e.target.value)} placeholder="lesson-slug" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" />
          <button type="submit" disabled={busy || !lessonTitle || !lessonSlug} className="px-3 py-2 rounded-lg bg-gold-400 text-navy-950 font-semibold text-sm flex items-center gap-1.5 disabled:opacity-50">
            <Plus className="w-4 h-4" /> Add
          </button>
        </form>
      </div>
      {error && <p className="text-red-400 text-sm">{error}</p>}
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
    <form onSubmit={(event) => void create(event)} className="glass rounded-2xl border border-dashed border-white/12 p-5">
      <h3 className="text-white font-semibold mb-3">Add module</h3>
      <div className="grid sm:grid-cols-[1fr_1fr_auto] gap-2">
        <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Module title" />
        <input className={inputClass} value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="module-slug" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" />
        <button type="submit" disabled={busy || !title || !slug} className="px-4 py-2 rounded-lg bg-gold-400 text-navy-950 font-semibold text-sm flex items-center gap-2 disabled:opacity-50">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Add
        </button>
      </div>
      {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
    </form>
  );
}

