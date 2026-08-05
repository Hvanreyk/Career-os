'use client';

import { useEffect, useState } from 'react';
import type {
  ResumeBulletRevisionRow,
  ResumeBulletRow,
  ResumeCritique,
} from '@trajectoryos/core/resume/types';
import { api } from './api';
import { Notice } from './ai/Notice';
import { Panel, PanelHeader } from '@/components/ui/Panel';
import { Button } from '@/components/ui/Button';

interface CritiqueState {
  critique: ResumeCritique;
  receipt: string;
  receiptExpiresAt: string;
}

interface Props {
  bullet: ResumeBulletRow;
  revisions: ResumeBulletRevisionRow[];
  onBulletChanged: (bullet: ResumeBulletRow) => void;
  onRevisionSaved: (revision: ResumeBulletRevisionRow, bulletText: string) => void;
  onDeleteBullet: (id: string) => void;
  /** Reports whether this panel has unsaved edits, so the parent can guard switching bullets. */
  onDirtyChange?: (dirty: boolean) => void;
}

/**
 * The per-bullet AI critique workspace: edit the bullet, request a signed
 * critique, choose a rewrite, and save an immutable revision. Extracted from
 * the original ResumeWorkshop right-hand panel.
 */
export function CritiquePanel({
  bullet, revisions,
  onBulletChanged, onRevisionSaved, onDeleteBullet, onDirtyChange,
}: Props) {
  const [baseText, setBaseText] = useState(bullet.text);
  const [revisedText, setRevisedText] = useState(bullet.text);
  const [critique, setCritique] = useState<CritiqueState | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const baseDirty = baseText.trim() !== bullet.text.trim();
  const dirtyRevision = Boolean(critique && revisedText.trim() !== bullet.text.trim());
  const dirty = baseDirty || dirtyRevision;

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  function fail(value: unknown) {
    setError(value instanceof Error ? value.message : 'Something went wrong');
    setNotice(null);
  }

  async function saveBaseBullet() {
    if (!baseText.trim()) return;
    setBusy('save-bullet'); setError(null);
    try {
      const result = await api<{ bullet: ResumeBulletRow }>(`/bullets/${bullet.id}`, 'PATCH', { text: baseText.trim() });
      onBulletChanged(result.bullet);
      setBaseText(result.bullet.text); setRevisedText(result.bullet.text); setCritique(null);
      setNotice('Bullet saved.');
    } catch (value) { fail(value); } finally { setBusy(null); }
  }

  async function setStatus(status: 'draft' | 'final') {
    try {
      const result = await api<{ bullet: ResumeBulletRow }>(`/bullets/${bullet.id}`, 'PATCH', { status });
      onBulletChanged(result.bullet);
    } catch (value) { fail(value); }
  }

  async function requestCritique() {
    if (baseText.trim() !== bullet.text.trim()) {
      setError('Save the current bullet before requesting critique.'); return;
    }
    setBusy('critique'); setError(null); setNotice(null);
    try {
      const result = await api<CritiqueState>('/critique', 'POST', { bulletId: bullet.id });
      setCritique(result); setRevisedText(bullet.text);
    } catch (value) { fail(value); } finally { setBusy(null); }
  }

  async function saveRevision() {
    if (!critique) return;
    setBusy('revision'); setError(null);
    try {
      const result = await api<{ revision: ResumeBulletRevisionRow; bulletText: string }>(
        `/bullets/${bullet.id}/revisions`, 'POST', { revisedText, receipt: critique.receipt },
      );
      onRevisionSaved(result.revision, result.bulletText);
      setBaseText(result.bulletText); setRevisedText(result.bulletText); setCritique(null);
      setNotice('AI-assisted revision saved to your resume.');
    } catch (value) { fail(value); } finally { setBusy(null); }
  }

  return (
    <div className="space-y-4">
      <Panel>
        <PanelHeader
          title="Current bullet"
          action={
            <button
              onClick={() => onDeleteBullet(bullet.id)}
              className="-mr-2 flex h-11 w-11 items-center justify-center text-graphite hover:text-red"
              aria-label="Delete selected bullet"
            >
              <span aria-hidden="true">✕</span>
            </button>
          }
        />
        <div className="p-4 sm:p-5">
          <label htmlFor="critique-base-text" className="sr-only">
            Bullet text
          </label>
          <textarea
            id="critique-base-text"
            value={baseText}
            onChange={(e) => setBaseText(e.target.value)}
            maxLength={1000}
            rows={4}
            className="ml-field resize-y"
          />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <span className="ml-num text-[12px] text-graphite">{baseText.length}/1,000</span>
            <div className="flex gap-2">
              <label htmlFor="critique-status" className="sr-only">
                Bullet status
              </label>
              <select
                id="critique-status"
                value={bullet.status}
                onChange={(e) => void setStatus(e.target.value as 'draft' | 'final')}
                className="ml-field min-h-[44px] w-auto py-2 text-[14px]"
              >
                <option value="draft">Draft</option>
                <option value="final">Final</option>
              </select>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void saveBaseBullet()}
                disabled={!baseText.trim() || baseText.trim() === bullet.text.trim() || busy !== null}
              >
                Save bullet
              </Button>
            </div>
          </div>
        </div>
      </Panel>

      <Notice tone="info" title="How AI is used">
        Your bullet is sent to OpenAI only when you request critique. AI can improve wording but
        cannot verify truth or guarantee recruiter outcomes. Feedback is not saved unless you save
        a revision.
      </Notice>

      {!critique && (
        <Button
          onClick={() => void requestCritique()}
          disabled={busy !== null}
          loading={busy === 'critique'}
          className="w-full"
        >
          Request AI critique
        </Button>
      )}

      {critique && (
        <Panel className="space-y-6 p-4 sm:p-5">
          <div>
            <p className="ml-label text-red">AI critique</p>
            <p className="mt-2 text-[15px] leading-[1.6] text-bone">{critique.critique.summary}</p>
          </div>

          <div>
            <h3 className="border-b border-rule pb-2 text-[13px] font-bold uppercase tracking-[0.06em] text-bone">
              What is working
            </h3>
            <ul className="mt-2">
              {critique.critique.strengths.map((item) => (
                <li key={item} className="ml-row flex gap-2.5 py-2.5 text-[15px] leading-snug text-graphite">
                  <span className="shrink-0 text-ok" aria-hidden="true">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {critique.critique.improvements.length > 0 && (
            <div>
              <h3 className="border-b border-rule pb-2 text-[13px] font-bold uppercase tracking-[0.06em] text-bone">
                What to reconsider
              </h3>
              <div className="mt-3 space-y-3">
                {critique.critique.improvements.map((item, index) => (
                  <div key={`${item.area}-${index}`} className="ml-panel-raised p-3">
                    <div className="ml-label">{item.area}</div>
                    <p className="mt-1.5 text-[15px] leading-snug text-bone">{item.observation}</p>
                    <p className="mt-1.5 text-[13px] leading-snug text-graphite">
                      {item.why_it_matters}
                    </p>
                    <p className="mt-2 text-[13px] leading-snug text-bone">
                      Ask yourself: {item.revision_question}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h3 className="border-b border-rule pb-2 text-[13px] font-bold uppercase tracking-[0.06em] text-bone">
              Rewrite starting points
            </h3>
            <div className="mt-3 space-y-2">
              {critique.critique.rewrite_options.map((option, index) => (
                <button
                  key={index}
                  onClick={() => setRevisedText(option.text)}
                  className="block w-full border border-rule p-3 text-left hover:border-rule-bright hover:bg-raised"
                >
                  <p className="text-[15px] leading-snug text-bone">{option.text}</p>
                  <p className="mt-2 text-[13px] leading-snug text-graphite">
                    {option.change_summary}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="critique-revised-text" className="block text-[13px] font-semibold text-bone">
              Your revision
            </label>
            <textarea
              id="critique-revised-text"
              value={revisedText}
              onChange={(e) => setRevisedText(e.target.value)}
              maxLength={1000}
              rows={5}
              className="ml-field mt-2 resize-y"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              variant="secondary"
              onClick={() => { setCritique(null); setRevisedText(bullet.text); }}
              disabled={busy !== null}
            >
              Discard
            </Button>
            <Button
              onClick={() => void saveRevision()}
              disabled={!dirtyRevision || busy !== null}
              loading={busy === 'revision'}
              className="flex-1"
            >
              {busy === 'revision' ? 'Saving…' : 'Save revision'}
            </Button>
          </div>
        </Panel>
      )}

      {revisions.length > 0 && (
        <Panel>
          <PanelHeader title="Saved revision history" label={`${revisions.length} saved`} />
          <div className="px-4 sm:px-5">
            {revisions.map((revision) => (
              <div key={revision.id} className="ml-row py-4">
                <p className="text-[13px] text-graphite line-through">{revision.original_text}</p>
                <p className="mt-1.5 text-[15px] leading-snug text-bone">{revision.revised_text}</p>
                <p className="ml-num mt-2 text-[12px] text-graphite">
                  {new Date(revision.created_at).toLocaleString('en-AU')} · {revision.model} ·{' '}
                  {revision.prompt_version}
                </p>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {error && <Notice tone="error" alert>{error}</Notice>}
      {notice && <Notice tone="ok" title="Saved">{notice}</Notice>}
    </div>
  );
}
