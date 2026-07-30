'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  LessonContent,
  type LessonBlock,
  type SourceRef,
} from '@trajectoryos/core/courses/content';
import { LessonRenderer } from '@/components/courses/LessonRenderer';
import { submitAdminContent } from '@/lib/admin/client';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';

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

const iconBtn =
  'flex h-11 w-11 items-center justify-center text-graphite hover:text-bone disabled:opacity-25';

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

  const publishing = lesson.status !== 'published' && form.status === 'published';

  return (
    <form onSubmit={(event) => void save(event)} className="space-y-6">
      <div className="ml-panel">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-rule px-4 py-3 sm:px-5">
          <div>
            <h2 className="text-[15px] font-bold uppercase tracking-[-0.01em] text-bone">
              Lesson settings
            </h2>
            <p className="ml-num mt-1 text-[12px] text-graphite">
              {lesson.editorial_source} source · revision {lesson.editorial_revision}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              onClick={() => setPreview((value) => !value)}
              aria-label={preview ? 'Switch to editing' : 'Switch to preview'}
            >
              {preview ? 'Edit' : 'Preview'}
            </Button>
            <Button type="submit" disabled={busy || !validation.success} loading={busy}>
              Save
            </Button>
          </div>
        </div>

        <div className="space-y-4 p-4 sm:p-5">
          <Field label="Lesson title">
            {(props) => (
              <input
                {...props}
                className="ml-field"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            )}
          </Field>
          <div className="grid gap-4 sm:grid-cols-4">
            <Field label="Status">
              {(props) => (
                <select
                  {...props}
                  className="ml-field"
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as LessonData['status'] })}
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
                  onChange={(e) => setForm({ ...form, region: e.target.value as LessonData['region'] })}
                >
                  <option value="au">Australia</option>
                  <option value="global">Global</option>
                  <option value="uk">United Kingdom</option>
                  <option value="us">United States</option>
                </select>
              )}
            </Field>
            <Field label="Estimated minutes">
              {(props) => (
                <input
                  {...props}
                  type="number"
                  min={1}
                  max={240}
                  className="ml-field ml-num"
                  value={form.est_minutes}
                  onChange={(e) => setForm({ ...form, est_minutes: Number(e.target.value) })}
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
          </div>
          {publishing && (
            <p className="border-l-2 border-warn bg-raised px-3 py-2.5 text-[14px] leading-snug text-bone">
              <span className="ml-label text-warn">
                <span aria-hidden="true">▲ </span>Warning
              </span>
              <span className="mt-1 block">
                Saving will publish this lesson. It becomes public when its course and module are
                also published.
              </span>
            </p>
          )}
        </div>
      </div>

      {preview ? (
        <div className="ml-panel p-6 sm:p-8">
          <span className="ml-label">Preview</span>
          <div className="mt-4">
            <LessonRenderer blocks={form.content} />
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {form.content.map((block, index) => (
            <div key={index} className="ml-panel">
              <div className="flex items-center justify-between gap-3 border-b border-rule px-4 py-2">
                <span className="ml-label text-bone">
                  {String(index + 1).padStart(2, '0')} · {block.type.replace('_', ' ')}
                </span>
                <div className="flex">
                  <button type="button" onClick={() => moveBlock(index, -1)} disabled={index === 0} aria-label={`Move block ${index + 1} up`} className={iconBtn}>
                    <span aria-hidden="true">▲</span>
                  </button>
                  <button type="button" onClick={() => moveBlock(index, 1)} disabled={index === form.content.length - 1} aria-label={`Move block ${index + 1} down`} className={iconBtn}>
                    <span aria-hidden="true">▼</span>
                  </button>
                  <button type="button" onClick={() => removeBlock(index)} disabled={form.content.length === 1} aria-label={`Delete block ${index + 1}`} className={`${iconBtn} hover:text-red`}>
                    <span aria-hidden="true">✕</span>
                  </button>
                </div>
              </div>
              <div className="p-4">
                {block.type === 'heading' && (
                  <input
                    className="ml-field"
                    value={block.text}
                    aria-label={`Block ${index + 1} heading text`}
                    onChange={(e) => updateBlock(index, { ...block, text: e.target.value })}
                  />
                )}
                {block.type === 'paragraph' && (
                  <textarea
                    className="ml-field min-h-32"
                    value={block.md}
                    aria-label={`Block ${index + 1} markdown`}
                    onChange={(e) => updateBlock(index, { ...block, md: e.target.value })}
                  />
                )}
                {block.type === 'callout' && (
                  <div className="space-y-2">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <select
                        className="ml-field"
                        value={block.variant}
                        aria-label={`Block ${index + 1} callout variant`}
                        onChange={(e) => updateBlock(index, { ...block, variant: e.target.value as 'tip' | 'warning' | 'note' })}
                      >
                        <option value="tip">Tip</option><option value="warning">Warning</option><option value="note">Note</option>
                      </select>
                      <input
                        className="ml-field"
                        value={block.title ?? ''}
                        aria-label={`Block ${index + 1} callout title`}
                        onChange={(e) => updateBlock(index, { ...block, title: e.target.value || undefined })}
                        placeholder="Optional title"
                      />
                    </div>
                    <textarea
                      className="ml-field min-h-24"
                      value={block.md}
                      aria-label={`Block ${index + 1} callout markdown`}
                      onChange={(e) => updateBlock(index, { ...block, md: e.target.value })}
                    />
                  </div>
                )}
                {!['heading', 'paragraph', 'callout'].includes(block.type) && (
                  <textarea
                    className="ml-field ml-num min-h-52 text-[13px]"
                    aria-label={`Block ${index + 1} raw JSON`}
                    value={complexDrafts[index] ?? JSON.stringify(block, null, 2)}
                    onChange={(e) => updateComplex(index, e.target.value)}
                  />
                )}
              </div>
            </div>
          ))}
          <div className="flex flex-wrap items-center gap-2">
            <span className="ml-label mr-1">Add block</span>
            {(['paragraph', 'heading', 'callout'] as const).map((type) => (
              <Button
                key={type}
                variant="secondary"
                size="sm"
                onClick={() => setForm({ ...form, content: [...form.content, newBlock(type)] })}
              >
                <span aria-hidden="true">+</span> {type}
              </Button>
            ))}
          </div>
        </div>
      )}

      <div className="ml-panel">
        <div className="border-b border-rule px-4 py-3 sm:px-5">
          <h2 className="text-[15px] font-bold uppercase tracking-[-0.01em] text-bone">Sources</h2>
          <p className="mt-1 text-[13px] text-graphite">
            JSON list of label and optional URL objects.
          </p>
        </div>
        <div className="space-y-4 p-4 sm:p-5">
          <Field label="Sources JSON">
            {(props) => (
              <textarea
                {...props}
                className="ml-field ml-num min-h-36 text-[13px]"
                value={sourcesJson}
                onChange={(e) => setSourcesJson(e.target.value)}
              />
            )}
          </Field>
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
        </div>
      </div>

      {!validation.success && (
        <p role="alert" className="text-[14px] leading-snug text-warn">
          <span aria-hidden="true">▲ </span>
          Content invalid — saving is blocked:{' '}
          {validation.error.issues.map((issue) => issue.message).join('; ')}
        </p>
      )}
      {message && (
        <p role="status" className="text-[14px] text-ok">
          <span aria-hidden="true">✓ </span>
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="text-[14px] leading-snug text-red">
          <span aria-hidden="true">▲ </span>
          {error}
        </p>
      )}
    </form>
  );
}
