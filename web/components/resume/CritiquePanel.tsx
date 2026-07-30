'use client';

import { useEffect, useState } from 'react';
import type {
  ResumeBulletRevisionRow,
  ResumeBulletRow,
  ResumeCritique,
} from '@trajectoryos/core/resume/types';
import { AlertTriangle, Check, Loader2, Sparkles, Trash2 } from 'lucide-react';
import { api } from './api';

interface CritiqueState {
  critique: ResumeCritique;
  receipt: string;
  receiptExpiresAt: string;
}

interface Props {
  bullet: ResumeBulletRow;
  revisions: ResumeBulletRevisionRow[];
  remaining: number | null;
  onRemainingChange: (remaining: number) => void;
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
  bullet, revisions, remaining, onRemainingChange,
  onBulletChanged, onRevisionSaved, onDeleteBullet, onDirtyChange,
}: Props) {
  const [baseText, setBaseText] = useState(bullet.text);
  const [revisedText, setRevisedText] = useState(bullet.text);
  const [critique, setCritique] = useState<CritiqueState | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    setBaseText(bullet.text);
    setRevisedText(bullet.text);
    setCritique(null);
    setError(null);
    setNotice(null);
  }, [bullet.id, bullet.text]);

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
      const result = await api<CritiqueState & { remaining: number }>('/critique', 'POST', { bulletId: bullet.id });
      setCritique(result); setRevisedText(bullet.text); onRemainingChange(result.remaining);
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
      <div className="glass rounded-2xl border border-white/8 p-5">
        <div className="flex justify-between gap-3 mb-3">
          <h2 className="text-white font-semibold">Current bullet</h2>
          <button onClick={() => onDeleteBullet(bullet.id)} className="text-slate-600 hover:text-red-400" aria-label="Delete selected bullet"><Trash2 className="w-4 h-4" /></button>
        </div>
        <textarea value={baseText} onChange={(e) => setBaseText(e.target.value)} maxLength={1000} rows={4} className="w-full px-3 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-white text-sm resize-y" />
        <div className="mt-3 flex flex-wrap gap-3 items-center justify-between">
          <span className="text-xs text-slate-600">{baseText.length}/1,000</span>
          <div className="flex gap-2">
            <select value={bullet.status} onChange={(e) => void setStatus(e.target.value as 'draft' | 'final')} className="px-3 py-2 rounded-lg bg-navy-950 border border-white/10 text-white text-xs"><option value="draft">Draft</option><option value="final">Final</option></select>
            <button onClick={() => void saveBaseBullet()} disabled={!baseText.trim() || baseText.trim() === bullet.text.trim() || busy !== null} className="px-3 py-2 rounded-lg bg-white/10 text-white text-xs disabled:opacity-40">Save bullet</button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-sky-400/20 bg-sky-400/[0.05] p-4 text-xs text-sky-100 leading-relaxed">
        Your bullet is sent to OpenAI only when you request critique. AI can improve wording but cannot verify truth or guarantee recruiter outcomes. Feedback is not saved unless you save a revision.
      </div>

      {!critique && <button onClick={() => void requestCritique()} disabled={busy !== null || remaining === 0} className="w-full px-5 py-3 bg-gold-400 text-navy-950 font-semibold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50">
        {busy === 'critique' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}Request AI critique {remaining !== null && `(${remaining} left today)`}
      </button>}

      {critique && <div className="glass rounded-2xl border border-gold-400/20 p-5 space-y-5">
        <div><div className="text-xs uppercase tracking-widest text-gold-400 mb-2">AI critique</div><p className="text-slate-300 text-sm leading-relaxed">{critique.critique.summary}</p></div>
        <div><h3 className="text-emerald-300 text-sm font-semibold mb-2">What is working</h3><ul className="space-y-2">{critique.critique.strengths.map((item) => <li key={item} className="text-slate-400 text-sm flex gap-2"><Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />{item}</li>)}</ul></div>
        {critique.critique.improvements.length > 0 && <div><h3 className="text-amber-300 text-sm font-semibold mb-2">What to reconsider</h3><div className="space-y-3">{critique.critique.improvements.map((item, index) => <div key={`${item.area}-${index}`} className="rounded-xl bg-white/[0.03] p-3"><div className="text-xs uppercase text-amber-300 mb-1">{item.area}</div><p className="text-slate-300 text-sm">{item.observation}</p><p className="text-slate-500 text-xs mt-1">{item.why_it_matters}</p><p className="text-gold-200 text-xs mt-2">Ask yourself: {item.revision_question}</p></div>)}</div></div>}
        <div><h3 className="text-white text-sm font-semibold mb-2">Rewrite starting points</h3><div className="space-y-2">{critique.critique.rewrite_options.map((option, index) => <button key={index} onClick={() => setRevisedText(option.text)} className="w-full text-left rounded-xl border border-white/8 p-3 hover:border-gold-400/30"><p className="text-slate-300 text-sm">{option.text}</p><p className="text-slate-600 text-xs mt-2">{option.change_summary}</p></button>)}</div></div>
        <label className="block text-sm text-white font-semibold">Your revision
          <textarea value={revisedText} onChange={(e) => setRevisedText(e.target.value)} maxLength={1000} rows={5} className="mt-2 w-full px-3 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-white text-sm resize-y font-normal" />
        </label>
        <div className="flex gap-3">
          <button onClick={() => { setCritique(null); setRevisedText(bullet.text); }} disabled={busy !== null} className="px-4 py-2 rounded-lg border border-white/10 text-slate-300 text-sm">Discard</button>
          <button onClick={() => void saveRevision()} disabled={!dirtyRevision || busy !== null} className="flex-1 px-4 py-2 rounded-lg bg-gold-400 text-navy-950 font-semibold text-sm disabled:opacity-50">{busy === 'revision' ? 'Saving…' : 'Save revision'}</button>
        </div>
      </div>}

      {revisions.length > 0 && <div className="glass rounded-2xl border border-white/8 p-5"><h3 className="text-white font-semibold text-sm mb-3">Saved revision history</h3><div className="space-y-4">{revisions.map((revision) => <div key={revision.id} className="border-l border-gold-400/25 pl-4"><p className="text-slate-600 text-xs line-through">{revision.original_text}</p><p className="text-slate-300 text-sm mt-1">{revision.revised_text}</p><p className="text-slate-600 text-xs mt-2">{new Date(revision.created_at).toLocaleString('en-AU')} · {revision.model} · {revision.prompt_version}</p></div>)}</div></div>}

      {error && <div role="alert" className="rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-red-300 text-sm flex gap-2"><AlertTriangle className="w-4 h-4 shrink-0" />{error}</div>}
      {notice && <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-emerald-300 text-sm">{notice}</div>}
    </div>
  );
}
