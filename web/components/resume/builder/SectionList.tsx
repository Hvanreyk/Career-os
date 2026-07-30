'use client';

import { useState } from 'react';
import type {
  ResumeBulletRow,
  ResumeEntryRow,
  ResumeSectionKind,
  ResumeSectionRow,
} from '@trajectoryos/core/resume/types';
import { BulletRow } from './BulletRow';
import { EntryCard } from './EntryCard';
import { StateBlock } from '@/components/ui/StateBlock';

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

const iconBtn =
  'flex h-11 w-11 shrink-0 items-center justify-center text-graphite hover:text-bone disabled:opacity-25';

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
        <StateBlock kind="empty" title="No sections yet">
          Add your first resume section, or use Auto-create / Import to start from your existing
          details.
        </StateBlock>
      )}
      {orderedSections.map((section, sectionIndex) => {
        const sectionEntries = entries
          .filter((entry) => entry.section_id === section.id)
          .sort((a, b) => a.sort_order - b.sort_order);
        const looseBullets = bullets
          .filter((bullet) => bullet.section_id === section.id && bullet.entry_id === null)
          .sort((a, b) => a.sort_order - b.sort_order);
        return (
          <section key={section.id} className="ml-panel">
            <div className="flex flex-wrap items-center gap-1 border-b border-rule px-4 py-3">
              <select
                value={section.kind}
                onChange={(e) => onUpdateSection(section.id, { kind: e.target.value as ResumeSectionKind })}
                aria-label="Section type"
                className="ml-field min-h-[44px] w-36 py-2 text-[14px]"
              >
                {SECTION_KINDS.map((kind) => <option key={kind.value} value={kind.value}>{kind.label}</option>)}
              </select>
              <input
                defaultValue={section.heading}
                onBlur={(e) => e.target.value.trim() && e.target.value !== section.heading && onUpdateSection(section.id, { heading: e.target.value })}
                maxLength={80}
                className="ml-field min-h-[44px] flex-1 border-transparent bg-transparent text-[16px] font-bold uppercase tracking-[-0.01em]"
                aria-label="Section heading"
              />
              <button onClick={() => onMoveSection(section, -1)} disabled={sectionIndex === 0} aria-label="Move section up" className={iconBtn}>
                <span aria-hidden="true">▲</span>
              </button>
              <button onClick={() => onMoveSection(section, 1)} disabled={sectionIndex === orderedSections.length - 1} aria-label="Move section down" className={iconBtn}>
                <span aria-hidden="true">▼</span>
              </button>
              <button onClick={() => onDeleteSection(section.id)} aria-label={`Delete ${section.heading}`} className={`${iconBtn} hover:text-red`}>
                <span aria-hidden="true">✕</span>
              </button>
            </div>

            <div className="space-y-3 p-4">
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

              <div className="flex gap-2">
                <input
                  value={newEntryOrg[section.id] ?? ''}
                  onChange={(e) => setNewEntryOrg((values) => ({ ...values, [section.id]: e.target.value }))}
                  maxLength={120}
                  placeholder="Add an entry (organisation, e.g. Macquarie Group)"
                  className="ml-field min-h-[44px] flex-1 py-2"
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
                  className="ml-btn ml-btn-secondary min-h-[44px] px-4 text-[13px]"
                >
                  <span aria-hidden="true">+</span> Entry
                </button>
              </div>

              {(looseBullets.length > 0 || sectionEntries.length === 0) && (
                <div className="space-y-2">
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
                      className="ml-field min-h-[44px] flex-1 resize-none py-2"
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
                      className="ml-btn ml-btn-secondary min-h-[44px] px-4 text-[13px]"
                    >
                      <span aria-hidden="true">+</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>
        );
      })}
    </>
  );
}
