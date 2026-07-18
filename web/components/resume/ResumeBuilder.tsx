'use client';

import { useEffect, useState } from 'react';
import type {
  ResumeBulletRevisionRow,
  ResumeBulletRow,
  ResumeEntryRow,
  ResumeRow,
  ResumeSectionKind,
  ResumeSectionRow,
  ResumeWorkspaceData,
} from '@trajectoryos/core/resume/types';
import { AlertTriangle, FileText, FileUp, Plus, Sparkles, Trash2 } from 'lucide-react';
import { api } from './api';
import { CritiquePanel } from './CritiquePanel';
import { ExportMenu } from './ExportMenu';
import { ImportDialog } from './ai/ImportDialog';
import { AutoCreateDialog } from './ai/AutoCreateDialog';
import { SectionList, SECTION_KINDS } from './builder/SectionList';
import { ContactHeader } from './builder/ContactHeader';

interface Props {
  initialData: ResumeWorkspaceData;
}

export interface WorkspaceRows {
  resume: ResumeRow;
  sections: ResumeSectionRow[];
  entries: ResumeEntryRow[];
  bullets: ResumeBulletRow[];
}

/**
 * The resume builder workspace: contact header, structured sections /
 * entries / bullets editing, and the per-bullet AI critique panel.
 */
export function ResumeBuilder({ initialData }: Props) {
  const [resume, setResume] = useState<ResumeRow | null>(initialData.resume);
  const [sections, setSections] = useState(initialData.sections);
  const [entries, setEntries] = useState(initialData.entries);
  const [bullets, setBullets] = useState(initialData.bullets);
  const [revisions, setRevisions] = useState(initialData.revisions);
  const [selectedId, setSelectedId] = useState<string | null>(initialData.bullets[0]?.id ?? null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newHeading, setNewHeading] = useState('Experience');
  const [newKind, setNewKind] = useState<ResumeSectionKind>('experience');
  const [dialog, setDialog] = useState<'import' | 'autocreate' | 'improve' | 'tailor' | null>(null);

  const selected = bullets.find((bullet) => bullet.id === selectedId) ?? null;

  useEffect(() => {
    void api<{ remaining: number }>('/critique', 'GET')
      .then((value) => setRemaining(value.remaining))
      .catch(() => undefined);
  }, []);

  function fail(value: unknown) {
    setError(value instanceof Error ? value.message : 'Something went wrong');
  }

  /** Replaces the whole workspace state (after document PUT / AI apply). */
  function setWorkspace(workspace: WorkspaceRows) {
    setResume(workspace.resume);
    setSections(workspace.sections);
    setEntries(workspace.entries);
    setBullets(workspace.bullets);
    setRevisions([]);
    setSelectedId(null);
  }

  async function createResume() {
    setBusy('resume'); setError(null);
    try {
      const result = await api<{ resume: ResumeRow }>('/resume', 'POST', { title: 'Master resume' });
      setResume(result.resume);
    } catch (value) { fail(value); } finally { setBusy(null); }
  }

  async function saveContact(patch: {
    fullName: string | null; email: string | null; phone: string | null;
    linkedinUrl: string | null; location: string | null;
  }) {
    setBusy('contact'); setError(null);
    try {
      const result = await api<{ resume: ResumeRow }>('/resume', 'PATCH', patch);
      setResume(result.resume);
    } catch (value) { fail(value); } finally { setBusy(null); }
  }

  async function deleteAll() {
    if (!window.confirm('Delete your resume, every bullet, and all saved critique history? This cannot be undone.')) return;
    setBusy('delete-all'); setError(null);
    try {
      await api('/resume', 'DELETE');
      setResume(null); setSections([]); setEntries([]); setBullets([]); setRevisions([]); setSelectedId(null);
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
    if (!window.confirm('Delete this section and all of its entries, bullets and saved feedback?')) return;
    try {
      await api(`/sections/${id}`, 'DELETE');
      const removedIds = new Set(bullets.filter((bullet) => bullet.section_id === id).map((bullet) => bullet.id));
      setSections((rows) => rows.filter((row) => row.id !== id));
      setEntries((rows) => rows.filter((row) => row.section_id !== id));
      setBullets((rows) => rows.filter((row) => !removedIds.has(row.id)));
      setRevisions((rows) => rows.filter((row) => !removedIds.has(row.bullet_id)));
      if (selectedId && removedIds.has(selectedId)) setSelectedId(null);
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

  async function addEntry(sectionId: string, org: string) {
    setBusy('entry'); setError(null);
    try {
      const count = entries.filter((entry) => entry.section_id === sectionId).length;
      const result = await api<{ entry: ResumeEntryRow }>('/entries', 'POST', {
        sectionId, org, sortOrder: count,
      });
      setEntries((rows) => [...rows, result.entry]);
    } catch (value) { fail(value); } finally { setBusy(null); }
  }

  async function updateEntry(id: string, patch: { org?: string; roleTitle?: string | null; location?: string | null; dateRange?: string | null; sortOrder?: number }) {
    try {
      const result = await api<{ entry: ResumeEntryRow }>(`/entries/${id}`, 'PATCH', patch);
      setEntries((rows) => rows.map((row) => row.id === id ? result.entry : row));
    } catch (value) { fail(value); }
  }

  async function deleteEntry(id: string) {
    if (!window.confirm('Delete this entry and all of its bullets?')) return;
    try {
      await api(`/entries/${id}`, 'DELETE');
      const removedIds = new Set(bullets.filter((bullet) => bullet.entry_id === id).map((bullet) => bullet.id));
      setEntries((rows) => rows.filter((row) => row.id !== id));
      setBullets((rows) => rows.filter((row) => !removedIds.has(row.id)));
      setRevisions((rows) => rows.filter((row) => !removedIds.has(row.bullet_id)));
      if (selectedId && removedIds.has(selectedId)) setSelectedId(null);
    } catch (value) { fail(value); }
  }

  async function moveEntry(entry: ResumeEntryRow, siblings: ResumeEntryRow[], delta: number) {
    const index = siblings.findIndex((row) => row.id === entry.id);
    const other = siblings[index + delta];
    if (!other) return;
    await Promise.all([
      updateEntry(entry.id, { sortOrder: other.sort_order }),
      updateEntry(other.id, { sortOrder: entry.sort_order }),
    ]);
  }

  async function addBullet(sectionId: string, entryId: string | null, text: string) {
    setBusy('bullet'); setError(null);
    try {
      const count = bullets.filter((bullet) =>
        entryId ? bullet.entry_id === entryId : bullet.section_id === sectionId && bullet.entry_id === null,
      ).length;
      const result = await api<{ bullet: ResumeBulletRow }>('/bullets', 'POST', {
        sectionId, entryId, text, status: 'draft', sortOrder: count,
      });
      setBullets((rows) => [...rows, result.bullet]);
      setSelectedId(result.bullet.id);
    } catch (value) { fail(value); } finally { setBusy(null); }
  }

  async function moveBullet(bullet: ResumeBulletRow, siblings: ResumeBulletRow[], delta: number) {
    const index = siblings.findIndex((row) => row.id === bullet.id);
    const other = siblings[index + delta];
    if (!other) return;
    try {
      const [a, b] = await Promise.all([
        api<{ bullet: ResumeBulletRow }>(`/bullets/${bullet.id}`, 'PATCH', { sortOrder: other.sort_order }),
        api<{ bullet: ResumeBulletRow }>(`/bullets/${other.id}`, 'PATCH', { sortOrder: bullet.sort_order }),
      ]);
      setBullets((rows) => rows.map((row) => row.id === a.bullet.id ? a.bullet : row.id === b.bullet.id ? b.bullet : row));
    } catch (value) { fail(value); }
  }

  async function deleteBullet(id: string) {
    if (!window.confirm('Delete this bullet and its saved revision history?')) return;
    try {
      await api(`/bullets/${id}`, 'DELETE');
      setBullets((rows) => rows.filter((row) => row.id !== id));
      setRevisions((rows) => rows.filter((row) => row.bullet_id !== id));
      if (selectedId === id) setSelectedId(null);
    } catch (value) { fail(value); }
  }

  if (!resume) {
    return (
      <div className="glass rounded-2xl border border-gold-400/20 p-10 text-center max-w-2xl mx-auto">
        <FileText className="w-10 h-10 text-gold-400 mx-auto mb-4" />
        <h2 className="font-serif text-2xl font-bold text-white mb-3">Create your master resume</h2>
        <p className="text-slate-400 text-sm mb-6">Build a structured resume, auto-create one from your profile, import an existing PDF or Word file, and export a polished document — with AI help only when you ask for it.</p>
        <div className="flex flex-wrap gap-3 justify-center">
          <button onClick={() => setDialog('autocreate')} disabled={busy !== null} className="px-5 py-3 bg-gold-400 text-navy-950 font-semibold rounded-xl flex items-center gap-2 disabled:opacity-50">
            <Sparkles className="w-4 h-4" />Auto-create from my profile
          </button>
          <button onClick={() => setDialog('import')} disabled={busy !== null} className="px-5 py-3 border border-gold-400/30 text-gold-300 font-semibold rounded-xl flex items-center gap-2 disabled:opacity-50">
            <FileUp className="w-4 h-4" />Import PDF / Word
          </button>
          <button onClick={() => void createResume()} disabled={busy !== null} className="px-5 py-3 border border-white/15 text-slate-300 font-semibold rounded-xl disabled:opacity-50">
            {busy === 'resume' ? 'Creating…' : 'Start from scratch'}
          </button>
        </div>
        {error && <p className="text-red-400 text-sm mt-4">{error}</p>}
        {dialog === 'import' && <ImportDialog onClose={() => setDialog(null)} onApplied={setWorkspace} />}
        {dialog === 'autocreate' && <AutoCreateDialog hasExistingContent={false} onClose={() => setDialog(null)} onApplied={setWorkspace} />}
      </div>
    );
  }

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
        <button
          onClick={() => void (async () => {
            setBusy('resume'); setError(null);
            try {
              const result = await api<{ resume: ResumeRow }>('/resume', 'PATCH', { title: resume.title, status: resume.status });
              setResume(result.resume);
            } catch (value) { fail(value); } finally { setBusy(null); }
          })()}
          disabled={busy === 'resume'}
          className="px-4 py-2 rounded-lg bg-white/10 text-white text-sm"
        >Save details</button>
        <button onClick={() => setDialog('autocreate')} className="px-3 py-2 rounded-lg border border-gold-400/30 text-gold-300 text-sm flex gap-1.5 items-center"><Sparkles className="w-4 h-4" />Auto-create</button>
        <button onClick={() => setDialog('import')} className="px-3 py-2 rounded-lg border border-white/15 text-slate-300 text-sm flex gap-1.5 items-center"><FileUp className="w-4 h-4" />Import</button>
        <ExportMenu />
        <button onClick={() => void deleteAll()} disabled={busy !== null} className="px-3 py-2 text-red-300 text-sm hover:bg-red-400/10 rounded-lg flex gap-2 items-center"><Trash2 className="w-4 h-4" />Delete all data</button>
      </div>

      {dialog === 'import' && <ImportDialog onClose={() => setDialog(null)} onApplied={setWorkspace} />}
      {dialog === 'autocreate' && <AutoCreateDialog hasExistingContent={sections.length > 0} onClose={() => setDialog(null)} onApplied={setWorkspace} />}

      <ContactHeader resume={resume} busy={busy === 'contact'} onSave={(patch) => void saveContact(patch)} />

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

          <SectionList
            sections={sections}
            entries={entries}
            bullets={bullets}
            selectedBulletId={selectedId}
            busy={busy !== null}
            onUpdateSection={(id, patch) => void updateSection(id, patch)}
            onDeleteSection={(id) => void deleteSection(id)}
            onMoveSection={(section, delta) => void moveSection(section, delta)}
            onAddEntry={(sectionId, org) => void addEntry(sectionId, org)}
            onUpdateEntry={(id, patch) => void updateEntry(id, patch)}
            onDeleteEntry={(id) => void deleteEntry(id)}
            onMoveEntry={(entry, siblings, delta) => void moveEntry(entry, siblings, delta)}
            onAddBullet={(sectionId, entryId, text) => void addBullet(sectionId, entryId, text)}
            onSelectBullet={(bullet) => setSelectedId(bullet.id)}
            onMoveBullet={(bullet, siblings, delta) => void moveBullet(bullet, siblings, delta)}
          />
        </div>

        <div className="lg:sticky lg:top-24 space-y-4">
          {!selected ? (
            <div className="glass rounded-2xl border border-white/8 p-10 text-center text-slate-500 text-sm">
              Select or add a bullet to open the AI critique workshop.
            </div>
          ) : (
            <CritiquePanel
              bullet={selected}
              revisions={revisions.filter((revision) => revision.bullet_id === selected.id)}
              remaining={remaining}
              onRemainingChange={setRemaining}
              onBulletChanged={(bullet) => setBullets((rows) => rows.map((row) => row.id === bullet.id ? bullet : row))}
              onRevisionSaved={(revision, bulletText) => {
                setBullets((rows) => rows.map((row) => row.id === revision.bullet_id ? { ...row, text: bulletText } : row));
                setRevisions((rows) => [revision, ...rows]);
              }}
              onDeleteBullet={(id) => void deleteBullet(id)}
            />
          )}
          {error && <div role="alert" className="rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-red-300 text-sm flex gap-2"><AlertTriangle className="w-4 h-4 shrink-0" />{error}</div>}
        </div>
      </div>
    </div>
  );
}
