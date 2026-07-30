'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { submitAdminContent } from '@/lib/admin/client';

interface QuizOption {
  id: string;
  text: string;
}

interface QuestionData {
  id: string;
  slug: string;
  prompt: string;
  options: QuizOption[];
  correct_option_id: string;
  explanation: string;
  status: 'draft' | 'published';
  sort_order: number;
  editorial_source: 'file' | 'admin';
  editorial_revision: number;
}

const inputClass =
  'w-full px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-gold-400/50';

function QuestionEditor({ courseId, question }: { courseId: string; question: QuestionData }) {
  const router = useRouter();
  const [form, setForm] = useState(question);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateOption(index: number, patch: Partial<QuizOption>) {
    setForm({
      ...form,
      options: form.options.map((option, i) => (i === index ? { ...option, ...patch } : option)),
    });
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    if (
      question.status !== 'published' &&
      form.status === 'published' &&
      !window.confirm('Publish this question? Correct answers remain server-only.')
    ) return;
    setBusy(true);
    setError(null);
    try {
      await submitAdminContent({
        action: 'update_quiz_question',
        courseId,
        questionId: question.id,
        patch: {
          slug: form.slug,
          prompt: form.prompt,
          options: form.options,
          correct_option_id: form.correct_option_id,
          explanation: form.explanation,
          status: form.status,
          sort_order: Number(form.sort_order),
        },
      });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save question');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={(event) => void save(event)} className="glass rounded-2xl border border-white/8 p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-gold-400 uppercase tracking-wider">{question.slug}</p>
          <p className="text-xs text-slate-600 mt-1">{question.editorial_source} source · revision {question.editorial_revision}</p>
        </div>
        <button type="submit" disabled={busy} className="px-3 py-2 rounded-lg border border-white/10 text-slate-300 hover:text-white text-sm flex items-center gap-2 disabled:opacity-50">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
        </button>
      </div>
      <div className="grid sm:grid-cols-[1fr_9rem_7rem] gap-3">
        <input className={inputClass} value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} aria-label="Question slug" />
        <select className={inputClass} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as QuestionData['status'] })}>
          <option value="draft">Draft</option><option value="published">Published</option>
        </select>
        <input type="number" min={0} className={inputClass} value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} aria-label="Question order" />
      </div>
      <textarea className={`${inputClass} min-h-24`} value={form.prompt} onChange={(e) => setForm({ ...form, prompt: e.target.value })} placeholder="Question prompt" />
      <div className="space-y-2">
        {form.options.map((option, index) => (
          <div key={index} className="grid grid-cols-[5rem_1fr_auto] gap-2">
            <input className={inputClass} value={option.id} onChange={(e) => updateOption(index, { id: e.target.value })} aria-label={`Option ${index + 1} ID`} />
            <input className={inputClass} value={option.text} onChange={(e) => updateOption(index, { text: e.target.value })} aria-label={`Option ${index + 1} text`} />
            <button type="button" onClick={() => setForm({ ...form, options: form.options.filter((_, i) => i !== index) })} disabled={form.options.length <= 2} className="p-2 text-slate-500 hover:text-red-400 disabled:opacity-25"><Trash2 className="w-4 h-4" /></button>
          </div>
        ))}
        <button type="button" onClick={() => setForm({ ...form, options: [...form.options, { id: String.fromCharCode(97 + form.options.length), text: '' }] })} className="text-xs text-gold-400 flex items-center gap-1.5"><Plus className="w-3.5 h-3.5" /> Add option</button>
      </div>
      <label className="block">
        <span className="text-xs text-slate-500 block mb-1.5">Correct option ID</span>
        <select className={inputClass} value={form.correct_option_id} onChange={(e) => setForm({ ...form, correct_option_id: e.target.value })}>
          {form.options.map((option) => <option key={option.id} value={option.id}>{option.id || '(blank)'}</option>)}
        </select>
      </label>
      <textarea className={`${inputClass} min-h-24`} value={form.explanation} onChange={(e) => setForm({ ...form, explanation: e.target.value })} placeholder="Answer explanation" />
      {error && <p className="text-red-400 text-sm">{error}</p>}
    </form>
  );
}

export function AdminQuizEditor({
  courseId,
  moduleId,
  questions,
}: {
  courseId: string;
  moduleId: string;
  questions: QuestionData[];
}) {
  const router = useRouter();
  const [slug, setSlug] = useState('');
  const [prompt, setPrompt] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await submitAdminContent({
        action: 'create_quiz_question',
        courseId,
        moduleId,
        question: {
          slug,
          prompt,
          options: [{ id: 'a', text: 'Option A' }, { id: 'b', text: 'Option B' }],
          correct_option_id: 'a',
          explanation: '',
          sort_order: questions.length,
        },
      });
      setSlug('');
      setPrompt('');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create question');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      {questions.map((question) => <QuestionEditor key={question.id} courseId={courseId} question={question} />)}
      <form onSubmit={(event) => void create(event)} className="glass rounded-2xl border border-dashed border-white/12 p-5 space-y-3">
        <h2 className="text-white font-semibold">Add quiz question</h2>
        <div className="grid sm:grid-cols-[12rem_1fr_auto] gap-2">
          <input className={inputClass} value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="question-slug" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" />
          <input className={inputClass} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Question prompt" />
          <button type="submit" disabled={busy || !slug || !prompt} className="px-4 py-2 rounded-xl bg-gold-400 text-navy-950 font-semibold text-sm flex items-center gap-2 disabled:opacity-50">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Add
          </button>
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
      </form>
    </div>
  );
}

