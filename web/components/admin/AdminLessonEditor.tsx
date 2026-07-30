'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowUp, Eye, Loader2, Plus, Save, Trash2 } from 'lucide-react';
import {
  LessonContent,
  type LessonBlock,
  type SourceRef,
} from '@trajectoryos/core/courses/content';
import { LessonRenderer } from '@/components/courses/LessonRenderer';
import { submitAdminContent } from '@/lib/admin/client';

interface LessonData {
  id: string;
  title: string;
  est_minutes: number;
  region: 'au' | 'uk' | 'us' | 'global';
  content: LessonBlock[];
  sources: SourceRef[];
  status: 'draft' | 'published';
  sort_order: number;
  last_reviewed_at: string | null;
  editorial_source: 'file' | 'admin';
  editorial_revision: number;
}

const inputClass =
  'w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-gold-400/50';

function newBlock(type: 'paragraph' | 'heading' | 'callout'): LessonBlock {
  if (type === 'heading') return { type: 'heading', text: 'New section' };
  if (type === 'callout') return { type: 'callout', variant: 'tip', title: 'Tip', md: 'Add guidance.' };
  return { type: 'paragraph', md: 'Start writing.' };
}

export function AdminLessonEditor({
  courseId,
  lesson,
}: {
  courseId: string;
  lesson: LessonData;
}) {
  const router = useRouter();
  const [form, setForm] = useState(lesson);
  const [sourcesJson, setSourcesJson] = useState(JSON.stringify(lesson.sources, null, 2));
  const [complexDrafts, setComplexDrafts] = useState<Record<number, string>>({});
  const [note, setNote] = useState('');
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const validation = useMemo(() => LessonContent.safeParse(form.content), [form.content]);

  function updateBlock(index: number, block: LessonBlock) {
    setForm((current) => ({
      ...current,
      content: current.content.map((candidate, i) => (i === index ? block : candidate)),
    }));
  }

  function moveBlock(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= form.content.length) return;
    const content = [...form.content];
    [content[index], content[target]] = [content[target]!, content[index]!];
    setForm({ ...form, content });
    setComplexDrafts({});
  }

  function removeBlock(index: number) {
    if (form.content.length === 1) return;
    setForm({ ...form, content: form.content.filter((_, i) => i !== index) });
    setComplexDrafts({});
  }

  function updateComplex(index: number, raw: string) {
    setComplexDrafts((drafts) => ({ ...drafts, [index]: raw }));
    try {
      const parsed = JSON.parse(raw) as LessonBlock;
      updateBlock(index, parsed);
      setError(null);
    } catch {
      setError(`Block ${index + 1} contains invalid JSON`);
    }
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    const parsedContent = LessonContent.safeParse(form.content);
    if (!parsedContent.success) {
      setError(parsedContent.error.issues.map((issue) => issue.message).join('; '));
      return;
    }
    let sources: SourceRef[];
    try {
      const parsed = JSON.parse(sourcesJson) as unknown;
      if (!Array.isArray(parsed)) throw new Error('Sources must be an array');
      sources = parsed as SourceRef[];
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sources contain invalid JSON');
      return;
    }
    if (
      lesson.status !== 'published' &&
      form.status === 'published' &&
      !window.confirm('Publish this lesson? It becomes public when its course and module are also published.')
    ) return;

    setBusy(true);
    try {
      const result = await submitAdminContent({
        action: 'update_lesson',
        courseId,
        lessonId: lesson.id,
        patch: {
          title: form.title,
          est_minutes: Number(form.est_minutes),
          region: form.region,
          content: parsedContent.data,
          sources,
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
      setError(err instanceof Error ? err.message : 'Could not save lesson');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={(event) => void save(event)} className="space-y-6">
      <div className="glass rounded-2xl border border-white/8 p-6 space-y-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-white font-semibold text-lg">Lesson settings</h2>
            <p className="text-xs text-slate-500 mt-1">
              {lesson.editorial_source} source · revision {lesson.editorial_revision}
            </p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setPreview((value) => !value)} className="px-3 py-2.5 rounded-xl border border-white/10 text-slate-300 hover:text-white text-sm flex items-center gap-2">
              <Eye className="w-4 h-4" /> {preview ? 'Edit' : 'Preview'}
            </button>
            <button type="submit" disabled={busy || !validation.success} className="px-4 py-2.5 bg-gold-400 text-navy-950 font-semibold text-sm rounded-xl hover:bg-gold-300 flex items-center gap-2 disabled:opacity-50">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
            </button>
          </div>
        </div>
        <input className={inputClass} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <div className="grid sm:grid-cols-4 gap-3">
          <select className={inputClass} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as LessonData['status'] })}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
          </select>
          <select className={inputClass} value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value as LessonData['region'] })}>
            <option value="au">Australia</option>
            <option value="global">Global</option>
            <option value="uk">United Kingdom</option>
            <option value="us">United States</option>
          </select>
          <input type="number" min={1} max={240} className={inputClass} value={form.est_minutes} onChange={(e) => setForm({ ...form, est_minutes: Number(e.target.value) })} aria-label="Estimated minutes" />
          <input type="date" className={inputClass} value={form.last_reviewed_at ?? ''} onChange={(e) => setForm({ ...form, last_reviewed_at: e.target.value || null })} aria-label="Last reviewed" />
        </div>
      </div>

      {preview ? (
        <div className="glass rounded-2xl border border-gold-400/15 p-8">
          <LessonRenderer blocks={form.content} />
        </div>
      ) : (
        <div className="space-y-3">
          {form.content.map((block, index) => (
            <div key={index} className="glass rounded-xl border border-white/8 p-4">
              <div className="flex items-center justify-between gap-3 mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-gold-400">{index + 1}. {block.type.replace('_', ' ')}</span>
                <div className="flex gap-1">
                  <button type="button" onClick={() => moveBlock(index, -1)} disabled={index === 0} className="p-1.5 text-slate-500 hover:text-white disabled:opacity-25"><ArrowUp className="w-4 h-4" /></button>
                  <button type="button" onClick={() => moveBlock(index, 1)} disabled={index === form.content.length - 1} className="p-1.5 text-slate-500 hover:text-white disabled:opacity-25"><ArrowDown className="w-4 h-4" /></button>
                  <button type="button" onClick={() => removeBlock(index)} disabled={form.content.length === 1} className="p-1.5 text-slate-500 hover:text-red-400 disabled:opacity-25"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              {block.type === 'heading' && (
                <input className={inputClass} value={block.text} onChange={(e) => updateBlock(index, { ...block, text: e.target.value })} />
              )}
              {block.type === 'paragraph' && (
                <textarea className={`${inputClass} min-h-32`} value={block.md} onChange={(e) => updateBlock(index, { ...block, md: e.target.value })} />
              )}
              {block.type === 'callout' && (
                <div className="space-y-2">
                  <div className="grid sm:grid-cols-2 gap-2">
                    <select className={inputClass} value={block.variant} onChange={(e) => updateBlock(index, { ...block, variant: e.target.value as 'tip' | 'warning' | 'note' })}>
                      <option value="tip">Tip</option><option value="warning">Warning</option><option value="note">Note</option>
                    </select>
                    <input className={inputClass} value={block.title ?? ''} onChange={(e) => updateBlock(index, { ...block, title: e.target.value || undefined })} placeholder="Optional title" />
                  </div>
                  <textarea className={`${inputClass} min-h-24`} value={block.md} onChange={(e) => updateBlock(index, { ...block, md: e.target.value })} />
                </div>
              )}
              {!['heading', 'paragraph', 'callout'].includes(block.type) && (
                <textarea
                  className={`${inputClass} min-h-52 font-mono text-xs`}
                  value={complexDrafts[index] ?? JSON.stringify(block, null, 2)}
                  onChange={(e) => updateComplex(index, e.target.value)}
                />
              )}
            </div>
          ))}
          <div className="flex flex-wrap gap-2">
            {(['paragraph', 'heading', 'callout'] as const).map((type) => (
              <button key={type} type="button" onClick={() => setForm({ ...form, content: [...form.content, newBlock(type)] })} className="px-3 py-2 rounded-lg border border-white/10 text-sm text-slate-300 hover:border-gold-400/30 flex items-center gap-1.5">
                <Plus className="w-4 h-4" /> {type}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="glass rounded-2xl border border-white/8 p-6 space-y-4">
        <div>
          <h2 className="text-white font-semibold">Sources</h2>
          <p className="text-xs text-slate-500 mt-1">JSON list of label and optional URL objects.</p>
        </div>
        <textarea className={`${inputClass} min-h-36 font-mono text-xs`} value={sourcesJson} onChange={(e) => setSourcesJson(e.target.value)} />
        <input className={inputClass} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Revision note" />
      </div>
      {!validation.success && <p className="text-amber-400 text-sm">{validation.error.issues.map((issue) => issue.message).join('; ')}</p>}
      {message && <p className="text-emerald-400 text-sm">{message}</p>}
      {error && <p className="text-red-400 text-sm">{error}</p>}
    </form>
  );
}

