'use client';

import { useState } from 'react';
import type {
  ResumeBulletRow,
  ResumeEntryRow,
  ResumeSectionKind,
  ResumeSectionRow,
} from '@trajectoryos/core/resume/types';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { BulletRow } from './BulletRow';
import { EntryCard } from './EntryCard';

export const SECTION_KINDS: { value: ResumeSectionKind; label: string }[] = [
  { value: 'education', label: 'Education' },
  { value: 'experience', label: 'Experience' },
  { value: 'leadership', label: 'Leadership' },
  { value: 'extracurricular', label: 'Extracurricular' },
  { value: 'skills', label: 'Skills' },
  { value: 'other', label: 'Other' },
];

interface Props {
  sections: ResumeSectionRow[];
  entries: ResumeEntryRow[];
  bullets: ResumeBulletRow[];
  selectedBulletId: string | null;
  busy: boolean;
  onUpdateSection: (id: string, patch: { heading?: string; kind?: ResumeSectionKind; sortOrder?: number }) => void;
  onDeleteSection: (id: string) => void;
  onMoveSection: (section: ResumeSectionRow, delta: number) => void;
  onAddEntry: (sectionId: string, org: string) => Promise<boolean>;
  onUpdateEntry: (id: string, patch: { org?: string; roleTitle?: string | null; location?: string | null; dateRange?: string | null; sortOrder?: number }) => void;
  onDeleteEntry: (id: string) => void;
  onMoveEntry: (entry: ResumeEntryRow, siblings: ResumeEntryRow[], delta: number) => void;
  onAddBullet: (sectionId: string, entryId: string | null, text: string) => Promise<boolean>;
  onSelectBullet: (bullet: ResumeBulletRow) => void;
  onMoveBullet: (bullet: ResumeBulletRow, siblings: ResumeBulletRow[], delta: number) => void;
}

/**
 * Renders every resume section with its entries and bullets, with inline
 * editing, reordering, and add forms.
 */
export function SectionList({
  sections, entries, bullets, selectedBulletId, busy,
  onUpdateSection, onDeleteSection, onMoveSection,
  onAddEntry, onUpdateEntry, onDeleteEntry, onMoveEntry,
  onAddBullet, onSelectBullet, onMoveBullet,
}: Props) {
  const [newEntryOrg, setNewEntryOrg] = useState<Record<string, string>>({});
  const [newLooseBullet, setNewLooseBullet] = useState<Record<string, string>>({});

  const orderedSections = [...sections].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <>
      {orderedSections.length === 0 && (
        <div className="glass rounded-2xl border border-white/8 p-8 text-center text-slate-500 text-sm">
          Add your first resume section, or use Auto-create / Import to start from your existing details.
        </div>
      )}
      {orderedSections.map((section, sectionIndex) => {
        const sectionEntries = entries
          .filter((entry) => entry.section_id === section.id)
          .sort((a, b) => a.sort_order - b.sort_order);
        const looseBullets = bullets
          .filter((bullet) => bullet.section_id === section.id && bullet.entry_id === null)
          .sort((a, b) => a.sort_order - b.sort_order);
        return (
          <section key={section.id} className="glass rounded-2xl border border-white/8 p-5">
            <div className="flex gap-2 items-center mb-4">
              <select value={section.kind} onChange={(e) => onUpdateSection(section.id, { kind: e.target.value as ResumeSectionKind })} aria-label="Section type" className="max-w-32 px-2 py-1 rounded-lg bg-navy-950 border border-white/10 text-slate-400 text-xs">
                {SECTION_KINDS.map((kind) => <option key={kind.value} value={kind.value}>{kind.label}</option>)}
              </select>
              <input defaultValue={section.heading} onBlur={(e) => e.target.value.trim() && e.target.value !== section.heading && onUpdateSection(section.id, { heading: e.target.value })} maxLength={80} className="flex-1 bg-transparent text-white font-semibold border-b border-transparent focus:border-gold-400/40 outline-none" aria-label="Section heading" />
              <button onClick={() => onMoveSection(section, -1)} disabled={sectionIndex === 0} aria-label="Move section up" className="text-slate-500 disabled:opacity-20"><ArrowUp className="w-4 h-4" /></button>
              <button onClick={() => onMoveSection(section, 1)} disabled={sectionIndex === orderedSections.length - 1} aria-label="Move section down" className="text-slate-500 disabled:opacity-20"><ArrowDown className="w-4 h-4" /></button>
              <button onClick={() => onDeleteSection(section.id)} aria-label={`Delete ${section.heading}`} className="text-slate-600 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
            </div>

            <div className="space-y-3">
              {sectionEntries.map((entry, entryIndex) => (
                <EntryCard
                  key={entry.id}
                  entry={entry}
                  bullets={bullets
                    .filter((bullet) => bullet.entry_id === entry.id)
                    .sort((a, b) => a.sort_order - b.sort_order)}
                  selectedBulletId={selectedBulletId}
                  first={entryIndex === 0}
                  last={entryIndex === sectionEntries.length - 1}
                  busy={busy}
                  onUpdate={(patch) => onUpdateEntry(entry.id, patch)}
                  onDelete={() => onDeleteEntry(entry.id)}
                  onMove={(delta) => onMoveEntry(entry, sectionEntries, delta)}
                  onAddBullet={(text) => onAddBullet(section.id, entry.id, text)}
                  onSelectBullet={onSelectBullet}
                  onMoveBullet={(bullet, delta) => onMoveBullet(
                    bullet,
                    bullets.filter((b) => b.entry_id === entry.id).sort((a, b) => a.sort_order - b.sort_order),
                    delta,
                  )}
                />
              ))}
            </div>

            <div className="mt-3 flex gap-2">
              <input
                value={newEntryOrg[section.id] ?? ''}
                onChange={(e) => setNewEntryOrg((values) => ({ ...values, [section.id]: e.target.value }))}
                maxLength={120}
                placeholder="Add an entry (organisation, e.g. Macquarie Group)"
                className="flex-1 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-white text-sm"
              />
              <button
                onClick={() => {
                  const org = newEntryOrg[section.id]?.trim();
                  if (!org) return;
                  void (async () => {
                    if (await onAddEntry(section.id, org)) {
                      setNewEntryOrg((values) => ({ ...values, [section.id]: '' }));
                    }
                  })();
                }}
                disabled={!newEntryOrg[section.id]?.trim() || busy}
                aria-label={`Add entry to ${section.heading}`}
                className="px-4 py-2 rounded-lg border border-gold-400/30 text-gold-300 text-sm flex gap-1 items-center"
              ><Plus className="w-4 h-4" />Entry</button>
            </div>

            {(looseBullets.length > 0 || sectionEntries.length === 0) && (
              <div className="mt-3 space-y-2">
                {looseBullets.map((bullet, bulletIndex) => (
                  <BulletRow
                    key={bullet.id}
                    bullet={bullet}
                    selected={selectedBulletId === bullet.id}
                    first={bulletIndex === 0}
                    last={bulletIndex === looseBullets.length - 1}
                    onSelect={() => onSelectBullet(bullet)}
                    onMove={(delta) => onMoveBullet(bullet, looseBullets, delta)}
                  />
                ))}
                <div className="flex gap-2">
                  <textarea
                    value={newLooseBullet[section.id] ?? ''}
                    onChange={(e) => setNewLooseBullet((values) => ({ ...values, [section.id]: e.target.value }))}
                    maxLength={1000}
                    rows={2}
                    placeholder={section.kind === 'skills' ? 'Add a skills line (e.g. Excel, PowerPoint, financial modelling)' : 'Add a section-level bullet'}
                    className="flex-1 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-white text-sm resize-none"
                  />
                  <button
                    onClick={() => {
                      const text = newLooseBullet[section.id]?.trim();
                      if (!text) return;
                      void (async () => {
                        if (await onAddBullet(section.id, null, text)) {
                          setNewLooseBullet((values) => ({ ...values, [section.id]: '' }));
                        }
                      })();
                    }}
                    disabled={!newLooseBullet[section.id]?.trim() || busy}
                    aria-label={`Add bullet to ${section.heading}`}
                    className="px-3 rounded-lg border border-gold-400/30 text-gold-300"
                  ><Plus className="w-4 h-4" /></button>
                </div>
              </div>
            )}
          </section>
        );
      })}
    </>
  );
}
