'use client';

import { useEffect, useMemo, useState } from 'react';
import type {
  ResumeBulletRevisionRow,
  ResumeBulletRow,
  ResumeCritique,
  ResumeRow,
  ResumeSectionKind,
  ResumeSectionRow,
  ResumeWorkspaceData,
} from '@trajectoryos/core/resume/types';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Check,
  ChevronRight,
  FileText,
  Loader2,
  Plus,
  Sparkles,
  Trash2,
} from 'lucide-react';

const API = '/api/resources/resume-cover-letter';
const SECTION_KINDS: { value: ResumeSectionKind; label: string }[] = [
  { value: 'education', label: 'Education' },
  { value: 'experience', label: 'Experience' },
  { value: 'leadership', label: 'Leadership' },
  { value: 'extracurricular', label: 'Extracurricular' },
  { value: 'skills', label: 'Skills' },
  { value: 'other', label: 'Other' },
];

interface CritiqueState {
  critique: ResumeCritique;
  receipt: string;
  receiptExpiresAt: string;
}

interface Props {
  initialData: ResumeWorkspaceData;
}

/**
 * Sends a request to the resume and cover letter API.
 *
 * @param path - The API endpoint path.
 * @param method - The HTTP method.
 * @param body - Optional request payload serialized as JSON.
 * @returns The parsed response data, or `undefined` for a `204 No Content` response.
 * @throws An error containing the server message when the response is unsuccessful.
 */
async function api<T>(path: string, method: string, body?: unknown): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({})) as { error?: string; resetsAt?: string };
    const reset = payload.resetsAt
      ? ` Resets ${new Date(payload.resetsAt).toLocaleString('en-AU')}.`
      : '';
    throw new Error(`${payload.error ?? 'Something went wrong'}${reset}`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

/**
 * Renders the resume editor and AI-assisted bullet critique workspace.
 *
 * @param initialData - The initial resume, sections, bullets, and saved revisions to display.
 */
export function ResumeWorkshop({ initialData }: Props) {
  const initialSelected = initialData.bullets[0] ?? null;
  const [resume, setResume] = useState<ResumeRow | null>(initialData.resume);
  const [sections, setSections] = useState(initialData.sections);
  const [bullets, setBullets] = useState(initialData.bullets);
  const [revisions, setRevisions] = useState(initialData.revisions);
  const [selectedId, setSelectedId] = useState<string | null>(initialSelected?.id ?? null);
  const [critique, setCritique] = useState<CritiqueState | null>(null);
  const [revisedText, setRevisedText] = useState(initialSelected?.text ?? '');
  const [baseText, setBaseText] = useState(initialSelected?.text ?? '');
  const [remaining, setRemaining] = useState<number | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [newHeading, setNewHeading] = useState('Experience');
  const [newKind, setNewKind] = useState<ResumeSectionKind>('experience');
  const [newBullet, setNewBullet] = useState<Record<string, string>>({});

  const selected = bullets.find((bullet) => bullet.id === selectedId) ?? null;
  const selectedRevisions = useMemo(
    () => revisions.filter((revision) => revision.bullet_id === selectedId),
    [revisions, selectedId],
  );
  const dirtyRevision = Boolean(critique && selected && revisedText.trim() !== selected.text.trim());

  useEffect(() => {
    void api<{ remaining: number }>('/critique', 'GET')
      .then((value) => setRemaining(value.remaining))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!dirtyRevision) return;
      event.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirtyRevision]);

  function fail(value: unknown) {
    setError(value instanceof Error ? value.message : 'Something went wrong');
    setNotice(null);
  }

  function openBullet(bullet: ResumeBulletRow) {
    setSelectedId(bullet.id);
    setBaseText(bullet.text);
    setRevisedText(bullet.text);
    setCritique(null);
    setError(null);
    setNotice(null);
  }

  function clearSelection() {
    setSelectedId(null);
    setBaseText('');
    setRevisedText('');
    setCritique(null);
  }

  async function createResume() {
    setBusy('resume'); setError(null);
    try {
      const result = await api<{ resume: ResumeRow }>('/resume', 'POST', { title: 'Master resume' });
      setResume(result.resume);
    } catch (value) { fail(value); } finally { setBusy(null); }
  }

  async function updateResume(patch: Partial<Pick<ResumeRow, 'title' | 'status'>>) {
    if (!resume) return;
    setBusy('resume'); setError(null);
    try {
      const result = await api<{ resume: ResumeRow }>('/resume', 'PATCH', patch);
      setResume(result.resume); setNotice('Resume details saved.');
    } catch (value) { fail(value); } finally { setBusy(null); }
  }

  async function deleteAll() {
    if (!window.confirm('Delete your resume, every bullet, and all saved critique history? This cannot be undone.')) return;
    setBusy('delete-all'); setError(null);
    try {
      await api('/resume', 'DELETE');
      setResume(null); setSections([]); setBullets([]); setRevisions([]); clearSelection();
    } catch (value) { fail(value); } finally { setBusy(null); }
  }

  async function addSection() {
    if (!resume || !newHeading.trim()) return;
    setBusy('section'); setError(null);
    try {
      const result = await api<{ section: ResumeSectionRow }>('/sections', 'POST', {
        resumeId: resume.id, kind: newKind, heading: newHeading, sortOrder: sections.length,
      });
      setSections((rows) => [...rows, result.section]); setNewHeading('');
    } catch (value) { fail(value); } finally { setBusy(null); }
  }

  async function updateSection(id: string, patch: { heading?: string; kind?: ResumeSectionKind; sortOrder?: number }) {
    try {
      const result = await api<{ section: ResumeSectionRow }>(`/sections/${id}`, 'PATCH', patch);
      setSections((rows) => rows.map((row) => row.id === id ? result.section : row));
    } catch (value) { fail(value); }
  }

  async function deleteSection(id: string) {
    if (!window.confirm('Delete this section and all of its bullets and saved feedback?')) return;
    try {
      await api(`/sections/${id}`, 'DELETE');
      const removedIds = new Set(bullets.filter((bullet) => bullet.section_id === id).map((bullet) => bullet.id));
      setSections((rows) => rows.filter((row) => row.id !== id));
      setBullets((rows) => rows.filter((row) => !removedIds.has(row.id)));
      setRevisions((rows) => rows.filter((row) => !removedIds.has(row.bullet_id)));
      if (selectedId && removedIds.has(selectedId)) clearSelection();
    } catch (value) { fail(value); }
  }

  async function moveSection(section: ResumeSectionRow, delta: number) {
    const ordered = [...sections].sort((a, b) => a.sort_order - b.sort_order);
    const index = ordered.findIndex((row) => row.id === section.id);
    const other = ordered[index + delta];
    if (!other) return;
    await Promise.all([
      updateSection(section.id, { sortOrder: other.sort_order }),
      updateSection(other.id, { sortOrder: section.sort_order }),
    ]);
  }

  async function addBullet(section: ResumeSectionRow) {
    const text = newBullet[section.id]?.trim();
    if (!text) return;
    setBusy(`bullet-${section.id}`); setError(null);
    try {
      const count = bullets.filter((bullet) => bullet.section_id === section.id).length;
      const result = await api<{ bullet: ResumeBulletRow }>('/bullets', 'POST', {
        sectionId: section.id, text, status: 'draft', sortOrder: count,
      });
      setBullets((rows) => [...rows, result.bullet]); setNewBullet((values) => ({ ...values, [section.id]: '' }));
      openBullet(result.bullet);
    } catch (value) { fail(value); } finally { setBusy(null); }
  }

  async function updateBullet(id: string, patch: { text?: string; status?: 'draft' | 'final'; sortOrder?: number }) {
    const result = await api<{ bullet: ResumeBulletRow }>(`/bullets/${id}`, 'PATCH', patch);
    setBullets((rows) => rows.map((row) => row.id === id ? result.bullet : row));
    return result.bullet;
  }

  async function moveBullet(bullet: ResumeBulletRow, sectionBullets: ResumeBulletRow[], delta: number) {
    const index = sectionBullets.findIndex((row) => row.id === bullet.id);
    const other = sectionBullets[index + delta];
    if (!other) return;
    try {
      await Promise.all([
        updateBullet(bullet.id, { sortOrder: other.sort_order }),
        updateBullet(other.id, { sortOrder: bullet.sort_order }),
      ]);
    } catch (value) { fail(value); }
  }

  async function saveBaseBullet() {
    if (!selected || !baseText.trim()) return;
    setBusy('save-bullet'); setError(null);
    try {
      const updated = await updateBullet(selected.id, { text: baseText.trim() });
      setBaseText(updated.text); setRevisedText(updated.text); setCritique(null); setNotice('Bullet saved.');
    } catch (value) { fail(value); } finally { setBusy(null); }
  }

  async function deleteBullet(id: string) {
    if (!window.confirm('Delete this bullet and its saved revision history?')) return;
    try {
      await api(`/bullets/${id}`, 'DELETE');
      setBullets((rows) => rows.filter((row) => row.id !== id));
      setRevisions((rows) => rows.filter((row) => row.bullet_id !== id));
      if (selectedId === id) clearSelection();
    } catch (value) { fail(value); }
  }

  async function requestCritique() {
    if (!selected) return;
    if (baseText.trim() !== selected.text.trim()) {
      setError('Save the current bullet before requesting critique.'); return;
    }
    setBusy('critique'); setError(null); setNotice(null);
    try {
      const result = await api<CritiqueState & { remaining: number }>('/critique', 'POST', { bulletId: selected.id });
      setCritique(result); setRevisedText(selected.text); setRemaining(result.remaining);
    } catch (value) { fail(value); } finally { setBusy(null); }
  }

  async function saveRevision() {
    if (!selected || !critique) return;
    setBusy('revision'); setError(null);
    try {
      const result = await api<{ revision: ResumeBulletRevisionRow; bulletText: string }>(
        `/bullets/${selected.id}/revisions`, 'POST', { revisedText, receipt: critique.receipt },
      );
      setBullets((rows) => rows.map((row) => row.id === selected.id ? { ...row, text: result.bulletText } : row));
      setRevisions((rows) => [result.revision, ...rows]);
      setBaseText(result.bulletText); setRevisedText(result.bulletText); setCritique(null);
      setNotice('AI-assisted revision saved to your resume.');
    } catch (value) { fail(value); } finally { setBusy(null); }
  }

  if (!resume) {
    return (
      <div className="glass rounded-2xl border border-gold-400/20 p-10 text-center max-w-2xl mx-auto">
        <FileText className="w-10 h-10 text-gold-400 mx-auto mb-4" />
        <h2 className="font-serif text-2xl font-bold text-white mb-3">Create your master resume</h2>
        <p className="text-slate-400 text-sm mb-6">Build a private section-and-bullet workspace, then request AI critique only when you choose.</p>
        <button onClick={() => void createResume()} disabled={busy !== null} className="px-5 py-3 bg-gold-400 text-navy-950 font-semibold rounded-xl disabled:opacity-50">
          {busy === 'resume' ? 'Creating…' : 'Create master resume'}
        </button>
        {error && <p className="text-red-400 text-sm mt-4">{error}</p>}
      </div>
    );
  }

  const orderedSections = [...sections].sort((a, b) => a.sort_order - b.sort_order);
  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl border border-white/8 p-5 flex flex-wrap gap-4 items-end">
        <label className="flex-1 min-w-64 text-xs text-slate-500">Resume title
          <input value={resume.title} onChange={(e) => setResume({ ...resume, title: e.target.value })} maxLength={120}
            className="mt-1 w-full px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-white text-sm" />
        </label>
        <label className="text-xs text-slate-500">Status
          <select value={resume.status} onChange={(e) => setResume({ ...resume, status: e.target.value as ResumeRow['status'] })}
            className="mt-1 block px-3 py-2 rounded-lg bg-navy-950 border border-white/10 text-white text-sm">
            <option value="draft">Draft</option><option value="current">Current</option>
          </select>
        </label>
        <button onClick={() => void updateResume({ title: resume.title, status: resume.status })} disabled={busy === 'resume'} className="px-4 py-2 rounded-lg bg-white/10 text-white text-sm">Save details</button>
        <button onClick={() => void deleteAll()} disabled={busy !== null} className="px-3 py-2 text-red-300 text-sm hover:bg-red-400/10 rounded-lg flex gap-2 items-center"><Trash2 className="w-4 h-4" />Delete all data</button>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] gap-6 items-start">
        <div className="space-y-4">
          <div className="glass rounded-2xl border border-white/8 p-4">
            <div className="grid sm:grid-cols-[10rem_1fr_auto] gap-2">
              <select value={newKind} onChange={(e) => setNewKind(e.target.value as ResumeSectionKind)} className="px-3 py-2 rounded-lg bg-navy-950 border border-white/10 text-white text-sm">
                {SECTION_KINDS.map((kind) => <option key={kind.value} value={kind.value}>{kind.label}</option>)}
              </select>
              <input value={newHeading} onChange={(e) => setNewHeading(e.target.value)} maxLength={80} placeholder="Section heading" className="px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-white text-sm" />
              <button onClick={() => void addSection()} disabled={!newHeading.trim() || busy !== null} className="px-4 py-2 bg-gold-400 text-navy-950 font-semibold text-sm rounded-lg flex gap-1 items-center"><Plus className="w-4 h-4" />Section</button>
            </div>
          </div>

          {orderedSections.length === 0 && <div className="glass rounded-2xl border border-white/8 p-8 text-center text-slate-500 text-sm">Add your first resume section.</div>}
          {orderedSections.map((section, sectionIndex) => {
            const sectionBullets = bullets.filter((bullet) => bullet.section_id === section.id).sort((a, b) => a.sort_order - b.sort_order);
            return (
              <section key={section.id} className="glass rounded-2xl border border-white/8 p-5">
                <div className="flex gap-2 items-center mb-4">
                  <select value={section.kind} onChange={(e) => void updateSection(section.id, { kind: e.target.value as ResumeSectionKind })} aria-label="Section type" className="max-w-32 px-2 py-1 rounded-lg bg-navy-950 border border-white/10 text-slate-400 text-xs">
                    {SECTION_KINDS.map((kind) => <option key={kind.value} value={kind.value}>{kind.label}</option>)}
                  </select>
                  <input defaultValue={section.heading} onBlur={(e) => e.target.value.trim() && e.target.value !== section.heading && void updateSection(section.id, { heading: e.target.value })} maxLength={80} className="flex-1 bg-transparent text-white font-semibold border-b border-transparent focus:border-gold-400/40 outline-none" aria-label="Section heading" />
                  <button onClick={() => void moveSection(section, -1)} disabled={sectionIndex === 0} aria-label="Move section up" className="text-slate-500 disabled:opacity-20"><ArrowUp className="w-4 h-4" /></button>
                  <button onClick={() => void moveSection(section, 1)} disabled={sectionIndex === orderedSections.length - 1} aria-label="Move section down" className="text-slate-500 disabled:opacity-20"><ArrowDown className="w-4 h-4" /></button>
                  <button onClick={() => void deleteSection(section.id)} aria-label={`Delete ${section.heading}`} className="text-slate-600 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                </div>
                <div className="space-y-2">
                  {sectionBullets.map((bullet, bulletIndex) => (
                    <div key={bullet.id} className="flex gap-2 items-center">
                      <button onClick={() => openBullet(bullet)} className={`flex-1 text-left p-3 rounded-xl border flex gap-3 items-start ${selectedId === bullet.id ? 'border-gold-400/40 bg-gold-400/5' : 'border-white/7 bg-white/[0.02]'}`}>
                        <span className="text-gold-400 mt-0.5">•</span><span className="text-slate-300 text-sm flex-1 line-clamp-3">{bullet.text}</span><ChevronRight className="w-4 h-4 text-slate-600 shrink-0" />
                      </button>
                      <div className="flex flex-col gap-1">
                        <button onClick={() => void moveBullet(bullet, sectionBullets, -1)} disabled={bulletIndex === 0} aria-label="Move bullet up" className="text-slate-600 hover:text-slate-300 disabled:opacity-20"><ArrowUp className="w-3.5 h-3.5" /></button>
                        <button onClick={() => void moveBullet(bullet, sectionBullets, 1)} disabled={bulletIndex === sectionBullets.length - 1} aria-label="Move bullet down" className="text-slate-600 hover:text-slate-300 disabled:opacity-20"><ArrowDown className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex gap-2">
                  <textarea value={newBullet[section.id] ?? ''} onChange={(e) => setNewBullet((values) => ({ ...values, [section.id]: e.target.value }))} maxLength={1000} rows={2} placeholder="Add a truthful resume bullet" className="flex-1 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-white text-sm resize-none" />
                  <button onClick={() => void addBullet(section)} disabled={!newBullet[section.id]?.trim() || busy !== null} aria-label={`Add bullet to ${section.heading}`} className="px-3 rounded-lg border border-gold-400/30 text-gold-300"><Plus className="w-4 h-4" /></button>
                </div>
              </section>
            );
          })}
        </div>

        <div className="lg:sticky lg:top-24 space-y-4">
          {!selected ? <div className="glass rounded-2xl border border-white/8 p-10 text-center text-slate-500 text-sm">Select or add a bullet to open the AI workshop.</div> : <>
            <div className="glass rounded-2xl border border-white/8 p-5">
              <div className="flex justify-between gap-3 mb-3"><h2 className="text-white font-semibold">Current bullet</h2><button onClick={() => void deleteBullet(selected.id)} className="text-slate-600 hover:text-red-400" aria-label="Delete selected bullet"><Trash2 className="w-4 h-4" /></button></div>
              <textarea value={baseText} onChange={(e) => setBaseText(e.target.value)} maxLength={1000} rows={4} className="w-full px-3 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-white text-sm resize-y" />
              <div className="mt-3 flex flex-wrap gap-3 items-center justify-between">
                <span className="text-xs text-slate-600">{baseText.length}/1,000</span>
                <div className="flex gap-2">
                  <select value={selected.status} onChange={(e) => void updateBullet(selected.id, { status: e.target.value as 'draft' | 'final' }).catch(fail)} className="px-3 py-2 rounded-lg bg-navy-950 border border-white/10 text-white text-xs"><option value="draft">Draft</option><option value="final">Final</option></select>
                  <button onClick={() => void saveBaseBullet()} disabled={!baseText.trim() || baseText.trim() === selected.text.trim() || busy !== null} className="px-3 py-2 rounded-lg bg-white/10 text-white text-xs disabled:opacity-40">Save bullet</button>
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
              <div className="flex gap-3"><button onClick={() => { setCritique(null); setRevisedText(selected.text); }} disabled={busy !== null} className="px-4 py-2 rounded-lg border border-white/10 text-slate-300 text-sm">Discard</button><button onClick={() => void saveRevision()} disabled={!dirtyRevision || busy !== null} className="flex-1 px-4 py-2 rounded-lg bg-gold-400 text-navy-950 font-semibold text-sm disabled:opacity-50">{busy === 'revision' ? 'Saving…' : 'Save revision'}</button></div>
            </div>}

            {selectedRevisions.length > 0 && <div className="glass rounded-2xl border border-white/8 p-5"><h3 className="text-white font-semibold text-sm mb-3">Saved revision history</h3><div className="space-y-4">{selectedRevisions.map((revision) => <div key={revision.id} className="border-l border-gold-400/25 pl-4"><p className="text-slate-600 text-xs line-through">{revision.original_text}</p><p className="text-slate-300 text-sm mt-1">{revision.revised_text}</p><p className="text-slate-600 text-xs mt-2">{new Date(revision.created_at).toLocaleString('en-AU')} · {revision.model} · {revision.prompt_version}</p></div>)}</div></div>}
          </>}
          {error && <div role="alert" className="rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-red-300 text-sm flex gap-2"><AlertTriangle className="w-4 h-4 shrink-0" />{error}</div>}
          {notice && <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 text-emerald-300 text-sm">{notice}</div>}
        </div>
      </div>
    </div>
  );
}
