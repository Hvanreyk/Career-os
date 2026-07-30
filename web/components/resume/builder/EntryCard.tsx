'use client';

import { useState } from 'react';
import type { ResumeBulletRow, ResumeEntryRow } from '@trajectoryos/core/resume/types';
import { BulletRow } from './BulletRow';

interface Props {
  entry: ResumeEntryRow;
  bullets: ResumeBulletRow[];
  selectedBulletId: string | null;
  first: boolean;
  last: boolean;
  busy: boolean;
  onUpdate: (patch: { org?: string; roleTitle?: string | null; location?: string | null; dateRange?: string | null }) => void;
  onDelete: () => void;
  onMove: (delta: number) => void;
  onAddBullet: (text: string) => Promise<boolean>;
  onSelectBullet: (bullet: ResumeBulletRow) => void;
  onMoveBullet: (bullet: ResumeBulletRow, delta: number) => void;
}

const META_FIELDS = [
  { key: 'role_title', patchKey: 'roleTitle', placeholder: 'Role title', max: 120 },
  { key: 'location', patchKey: 'location', placeholder: 'Location', max: 80 },
  { key: 'date_range', patchKey: 'dateRange', placeholder: 'Nov 2024 – Feb 2025', max: 60 },
] as const;

const iconBtn =
  'flex h-11 w-11 shrink-0 items-center justify-center text-graphite hover:text-bone disabled:opacity-25';

/**
 * One resume entry: organisation, role, location and dates, plus the entry's
 * achievement bullets.
 */
export function EntryCard({
  entry, bullets, selectedBulletId, first, last, busy,
  onUpdate, onDelete, onMove, onAddBullet, onSelectBullet, onMoveBullet,
}: Props) {
  const [newBullet, setNewBullet] = useState('');

  return (
    <div className="ml-panel-raised p-4">
      <div className="mb-3 flex items-center gap-1">
        <input
          defaultValue={entry.org}
          onBlur={(e) => e.target.value.trim() && e.target.value !== entry.org && onUpdate({ org: e.target.value.trim() })}
          maxLength={120}
          placeholder="Organisation"
          aria-label="Organisation"
          className="ml-field min-h-[44px] flex-1 border-transparent bg-transparent font-bold"
        />
        <button onClick={() => onMove(-1)} disabled={first} aria-label="Move entry up" className={iconBtn}>
          <span aria-hidden="true">▲</span>
        </button>
        <button onClick={() => onMove(1)} disabled={last} aria-label="Move entry down" className={iconBtn}>
          <span aria-hidden="true">▼</span>
        </button>
        <button onClick={onDelete} aria-label={`Delete entry ${entry.org}`} className={`${iconBtn} hover:text-red`}>
          <span aria-hidden="true">✕</span>
        </button>
      </div>
      <div className="mb-4 grid gap-2 sm:grid-cols-3">
        {META_FIELDS.map(({ key, patchKey, placeholder, max }) => (
          <input
            key={key}
            defaultValue={entry[key] ?? ''}
            onBlur={(e) => {
              const value = e.target.value.trim();
              if (value !== (entry[key] ?? '')) onUpdate({ [patchKey]: value || null });
            }}
            maxLength={max}
            placeholder={placeholder}
            aria-label={placeholder}
            className="ml-field min-h-[44px] py-2 text-[15px]"
          />
        ))}
      </div>
      <div className="space-y-2">
        {bullets.map((bullet, index) => (
          <BulletRow
            key={bullet.id}
            bullet={bullet}
            selected={selectedBulletId === bullet.id}
            first={index === 0}
            last={index === bullets.length - 1}
            onSelect={() => onSelectBullet(bullet)}
            onMove={(delta) => onMoveBullet(bullet, delta)}
          />
        ))}
      </div>
      <div className="mt-3 flex gap-2">
        <textarea
          value={newBullet}
          onChange={(e) => setNewBullet(e.target.value)}
          maxLength={1000}
          rows={2}
          placeholder="Add a truthful achievement bullet"
          className="ml-field min-h-[44px] flex-1 resize-none py-2"
        />
        <button
          onClick={() => {
            const text = newBullet.trim();
            if (!text) return;
            void (async () => {
              if (await onAddBullet(text)) setNewBullet('');
            })();
          }}
          disabled={!newBullet.trim() || busy}
          aria-label={`Add bullet to ${entry.org}`}
          className="ml-btn ml-btn-secondary min-h-[44px] px-4 text-[13px]"
        >
          <span aria-hidden="true">+</span>
        </button>
      </div>
    </div>
  );
}
