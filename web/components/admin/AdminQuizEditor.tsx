'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { submitAdminContent } from '@/lib/admin/client';
import { Button } from '@/components/ui/Button';
import { Field } from '@/components/ui/Field';

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

  const publishing = question.status !== 'published' && form.status === 'published';

  return (
    <form onSubmit={(event) => void save(event)} className="ml-panel">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-rule px-4 py-3 sm:px-5">
        <div>
          <p className="ml-label text-bone">{question.slug}</p>
          <p className="ml-num mt-1 text-[12px] text-graphite">
            {question.editorial_source} source · revision {question.editorial_revision}
          </p>
        </div>
        <Button type="submit" variant="secondary" disabled={busy} loading={busy}>
          Save question
        </Button>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        <div className="grid gap-4 sm:grid-cols-[1fr_9rem_7rem]">
          <Field label="Question slug">
            {(props) => (
              <input
                {...props}
                className="ml-field ml-num"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
              />
            )}
          </Field>
          <Field label="Status">
            {(props) => (
              <select
                {...props}
                className="ml-field"
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as QuestionData['status'] })}
              >
                <option value="draft">Draft</option><option value="published">Published</option>
              </select>
            )}
          </Field>
          <Field label="Order">
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

        <Field label="Question prompt">
          {(props) => (
            <textarea
              {...props}
              className="ml-field min-h-24"
              value={form.prompt}
              onChange={(e) => setForm({ ...form, prompt: e.target.value })}
              placeholder="Question prompt"
            />
          )}
        </Field>

        <div>
          <span className="ml-label">Options</span>
          <div className="mt-2 space-y-2">
            {form.options.map((option, index) => (
              <div key={index} className="grid grid-cols-[5rem_1fr_auto] gap-2">
                <input
                  className="ml-field ml-num"
                  value={option.id}
                  onChange={(e) => updateOption(index, { id: e.target.value })}
                  aria-label={`Option ${index + 1} ID`}
                />
                <input
                  className="ml-field"
                  value={option.text}
                  onChange={(e) => updateOption(index, { text: e.target.value })}
                  aria-label={`Option ${index + 1} text`}
                />
                <button
                  type="button"
                  onClick={() => setForm({ ...form, options: form.options.filter((_, i) => i !== index) })}
                  disabled={form.options.length <= 2}
                  aria-label={`Delete option ${index + 1}`}
                  className="flex h-11 w-11 items-center justify-center text-graphite hover:text-red disabled:opacity-25"
                >
                  <span aria-hidden="true">✕</span>
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setForm({ ...form, options: [...form.options, { id: String.fromCharCode(97 + form.options.length), text: '' }] })}
              className="ml-btn ml-btn-text min-h-[44px] text-[13px]"
            >
              <span aria-hidden="true">+</span> Add option
            </button>
          </div>
        </div>

        <Field label="Correct option ID" hint="Never sent to the browser on the student side.">
          {(props) => (
            <select
              {...props}
              className="ml-field ml-num"
              value={form.correct_option_id}
              onChange={(e) => setForm({ ...form, correct_option_id: e.target.value })}
            >
              {form.options.map((option) => <option key={option.id} value={option.id}>{option.id || '(blank)'}</option>)}
            </select>
          )}
        </Field>

        <Field label="Answer explanation">
          {(props) => (
            <textarea
              {...props}
              className="ml-field min-h-24"
              value={form.explanation}
              onChange={(e) => setForm({ ...form, explanation: e.target.value })}
              placeholder="Answer explanation"
            />
          )}
        </Field>

        {publishing && (
          <p className="border-l-2 border-warn bg-raised px-3 py-2.5 text-[14px] leading-snug text-bone">
            <span className="ml-label text-warn">
              <span aria-hidden="true">▲ </span>Warning
            </span>
            <span className="mt-1 block">
              Saving will publish this question. Correct answers remain server-only.
            </span>
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
      <form onSubmit={(event) => void create(event)} className="border border-dashed border-rule-bright bg-surface p-4 sm:p-5">
        <h2 className="text-[13px] font-bold uppercase tracking-[0.06em] text-bone">
          Add quiz question
        </h2>
        <div className="mt-3 grid gap-2 sm:grid-cols-[12rem_1fr_auto]">
          <input
            className="ml-field ml-num"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="question-slug"
            aria-label="New question slug"
            pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
          />
          <input
            className="ml-field"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Question prompt"
            aria-label="New question prompt"
          />
          <Button type="submit" disabled={busy || !slug || !prompt} loading={busy}>
            <span aria-hidden="true">+</span> Add
          </Button>
        </div>
        {error && (
          <p role="alert" className="mt-3 text-[14px] text-red">
            <span aria-hidden="true">▲ </span>
            {error}
          </p>
        )}
      </form>
    </div>
  );
}
