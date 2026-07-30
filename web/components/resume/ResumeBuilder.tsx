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
import { api } from './api';
import { CritiquePanel } from './CritiquePanel';
import { ExportMenu } from './ExportMenu';
import { ImportDialog } from './ai/ImportDialog';
import { AutoCreateDialog } from './ai/AutoCreateDialog';
import { ImproveDialog } from './ai/ImproveDialog';
import { TailorDialog } from './ai/TailorDialog';
import { Notice } from './ai/Notice';
import { SectionList, SECTION_KINDS } from './builder/SectionList';
import { ContactHeader } from './builder/ContactHeader';
import { Button } from '@/components/ui/Button';
import { Panel } from '@/components/ui/Panel';
import { StateBlock } from '@/components/ui/StateBlock';

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
 * The next sort_order for a new sibling. Uses max(sibling)+1 rather than
 * sibling count, so a gap left by a prior deletion (e.g. [0, 2]) never
 * produces a duplicate position.
 */
function nextSortOrder(siblings: { sort_order: number }[]): number {
  return siblings.length === 0 ? 0 : Math.max(...siblings.map((row) => row.sort_order)) + 1;
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
  const [critiqueDirty, setCritiqueDirty] = useState(false);

  const selected = bullets.find((bullet) => bullet.id === selectedId) ?? null;

  /** Switches the selected bullet, confirming first if the critique panel has unsaved edits. */
  function selectBullet(bullet: ResumeBulletRow) {
    if (critiqueDirty && bullet.id !== selectedId) {
      if (!window.confirm('You have unsaved changes to the current bullet. Discard them and switch?')) return;
    }
    setCritiqueDirty(false);
    setSelectedId(bullet.id);
  }

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
        resumeId: resume.id, kind: newKind, heading: newHeading, sortOrder: nextSortOrder(sections),
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

  async function addEntry(sectionId: string, org: string): Promise<boolean> {
    setBusy('entry'); setError(null);
    try {
      const siblings = entries.filter((entry) => entry.section_id === sectionId);
      const result = await api<{ entry: ResumeEntryRow }>('/entries', 'POST', {
        sectionId, org, sortOrder: nextSortOrder(siblings),
      });
      setEntries((rows) => [...rows, result.entry]);
      return true;
    } catch (value) { fail(value); return false; } finally { setBusy(null); }
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

  async function addBullet(sectionId: string, entryId: string | null, text: string): Promise<boolean> {
    setBusy('bullet'); setError(null);
    try {
      const siblings = bullets.filter((bullet) =>
        entryId ? bullet.entry_id === entryId : bullet.section_id === sectionId && bullet.entry_id === null,
      );
      const result = await api<{ bullet: ResumeBulletRow }>('/bullets', 'POST', {
        sectionId, entryId, text, status: 'draft', sortOrder: nextSortOrder(siblings),
      });
      setBullets((rows) => [...rows, result.bullet]);
      selectBullet(result.bullet);
      return true;
    } catch (value) { fail(value); return false; } finally { setBusy(null); }
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
      <div className="mx-auto max-w-2xl">
        <StateBlock
          kind="empty"
          title="Create your master resume"
          action={
            <>
              <Button onClick={() => setDialog('autocreate')} disabled={busy !== null}>
                Auto-create from my profile
              </Button>
              <Button
                variant="secondary"
                onClick={() => setDialog('import')}
                disabled={busy !== null}
              >
                Import PDF / Word
              </Button>
              <Button
                variant="secondary"
                onClick={() => void createResume()}
                disabled={busy !== null}
                loading={busy === 'resume'}
              >
                {busy === 'resume' ? 'Creating…' : 'Start from scratch'}
              </Button>
            </>
          }
        >
          Build a structured resume, auto-create one from your profile, import an existing PDF or
          Word file, and export a polished document — with AI help only when you ask for it.
        </StateBlock>
        {error && (
          <div className="mt-4">
            <Notice tone="error" alert>{error}</Notice>
          </div>
        )}
        {dialog === 'import' && <ImportDialog onClose={() => setDialog(null)} onApplied={setWorkspace} />}
        {dialog === 'autocreate' && <AutoCreateDialog hasExistingContent={false} onClose={() => setDialog(null)} onApplied={setWorkspace} />}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Panel>
        <div className="flex flex-wrap items-end gap-4 border-b border-rule p-4 sm:p-5">
          <div className="min-w-64 flex-1">
            <label htmlFor="resume-title" className="block text-[13px] font-semibold text-bone">
              Resume title
            </label>
            <input
              id="resume-title"
              value={resume.title}
              onChange={(e) => setResume({ ...resume, title: e.target.value })}
              maxLength={120}
              className="ml-field mt-2"
            />
          </div>
          <div>
            <label htmlFor="resume-status" className="block text-[13px] font-semibold text-bone">
              Status
            </label>
            <select
              id="resume-status"
              value={resume.status}
              onChange={(e) => setResume({ ...resume, status: e.target.value as ResumeRow['status'] })}
              className="ml-field mt-2 w-auto"
            >
              <option value="draft">Draft</option><option value="current">Current</option>
            </select>
          </div>
          <Button
            variant="secondary"
            onClick={() => void (async () => {
              setBusy('resume'); setError(null);
              try {
                const result = await api<{ resume: ResumeRow }>('/resume', 'PATCH', { title: resume.title, status: resume.status });
                setResume(result.resume);
              } catch (value) { fail(value); } finally { setBusy(null); }
            })()}
            disabled={busy === 'resume'}
            loading={busy === 'resume'}
          >
            Save details
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2 p-4 sm:p-5">
          <span className="ml-label mr-1">Tools</span>
          <Button variant="secondary" size="sm" onClick={() => setDialog('autocreate')}>
            Auto-create
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setDialog('import')}>
            Import
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setDialog('improve')}
            disabled={sections.length === 0}
          >
            Improve
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setDialog('tailor')}
            disabled={sections.length === 0}
          >
            Tailor to JD
          </Button>
          <ExportMenu compact />
          <button
            onClick={() => void deleteAll()}
            disabled={busy !== null}
            className="ml-btn ml-btn-text min-h-[44px] px-2 text-[13px] disabled:opacity-40"
          >
            Delete all data
          </button>
        </div>
      </Panel>

      {dialog === 'import' && <ImportDialog onClose={() => setDialog(null)} onApplied={setWorkspace} />}
      {dialog === 'autocreate' && <AutoCreateDialog hasExistingContent={sections.length > 0} onClose={() => setDialog(null)} onApplied={setWorkspace} />}
      {dialog === 'improve' && <ImproveDialog onClose={() => setDialog(null)} onApplied={setWorkspace} />}
      {dialog === 'tailor' && <TailorDialog onClose={() => setDialog(null)} onApplied={setWorkspace} />}

      <ContactHeader key={resume.updated_at} resume={resume} busy={busy === 'contact'} onSave={(patch) => void saveContact(patch)} />

      <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] gap-6 items-start">
        <div className="space-y-4">
          <Panel className="p-4">
            <span className="ml-label">Add a section</span>
            <div className="mt-2 grid gap-2 sm:grid-cols-[10rem_1fr_auto]">
              <select
                value={newKind}
                onChange={(e) => setNewKind(e.target.value as ResumeSectionKind)}
                aria-label="New section type"
                className="ml-field"
              >
                {SECTION_KINDS.map((kind) => <option key={kind.value} value={kind.value}>{kind.label}</option>)}
              </select>
              <input
                value={newHeading}
                onChange={(e) => setNewHeading(e.target.value)}
                maxLength={80}
                placeholder="Section heading"
                aria-label="New section heading"
                className="ml-field"
              />
              <Button
                variant="secondary"
                onClick={() => void addSection()}
                disabled={!newHeading.trim() || busy !== null}
              >
                <span aria-hidden="true">+</span> Section
              </Button>
            </div>
          </Panel>

          <SectionList
            sections={sections}
            entries={entries}
            bullets={bullets}
            selectedBulletId={selectedId}
            busy={busy !== null}
            onUpdateSection={(id, patch) => void updateSection(id, patch)}
            onDeleteSection={(id) => void deleteSection(id)}
            onMoveSection={(section, delta) => void moveSection(section, delta)}
            onAddEntry={(sectionId, org) => addEntry(sectionId, org)}
            onUpdateEntry={(id, patch) => void updateEntry(id, patch)}
            onDeleteEntry={(id) => void deleteEntry(id)}
            onMoveEntry={(entry, siblings, delta) => void moveEntry(entry, siblings, delta)}
            onAddBullet={(sectionId, entryId, text) => addBullet(sectionId, entryId, text)}
            onSelectBullet={selectBullet}
            onMoveBullet={(bullet, siblings, delta) => void moveBullet(bullet, siblings, delta)}
          />
        </div>

        <div className="lg:sticky lg:top-24 space-y-4">
          {!selected ? (
            <StateBlock kind="empty" title="No bullet selected">
              Select or add a bullet to open the AI critique workshop.
            </StateBlock>
          ) : (
            <CritiquePanel
              bullet={selected}
              revisions={revisions.filter((revision) => revision.bullet_id === selected.id)}
              remaining={remaining}
              onRemainingChange={setRemaining}
              onDirtyChange={setCritiqueDirty}
              onBulletChanged={(bullet) => setBullets((rows) => rows.map((row) => row.id === bullet.id ? bullet : row))}
              onRevisionSaved={(revision, bulletText) => {
                setBullets((rows) => rows.map((row) => row.id === revision.bullet_id ? { ...row, text: bulletText } : row));
                setRevisions((rows) => [revision, ...rows]);
              }}
              onDeleteBullet={(id) => void deleteBullet(id)}
            />
          )}
          {error && <Notice tone="error" alert>{error}</Notice>}
        </div>
      </div>
    </div>
  );
}
