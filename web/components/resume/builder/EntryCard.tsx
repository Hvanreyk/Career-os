'use client';

import { useState } from 'react';
import type { ResumeBulletRow, ResumeEntryRow } from '@trajectoryos/core/resume/types';
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
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
  onAddBullet: (text: string) => void;
  onSelectBullet: (bullet: ResumeBulletRow) => void;
  onMoveBullet: (bullet: ResumeBulletRow, delta: number) => void;
}

const META_FIELDS = [
  { key: 'role_title', patchKey: 'roleTitle', placeholder: 'Role title', max: 120 },
  { key: 'location', patchKey: 'location', placeholder: 'Location', max: 80 },
  { key: 'date_range', patchKey: 'dateRange', placeholder: 'Nov 2024 – Feb 2025', max: 60 },
] as const;

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
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4">
      <div className="flex gap-2 items-center mb-2">
        <input
          defaultValue={entry.org}
          onBlur={(e) => e.target.value.trim() && e.target.value !== entry.org && onUpdate({ org: e.target.value.trim() })}
          maxLength={120}
          placeholder="Organisation"
          aria-label="Organisation"
          className="flex-1 bg-transparent text-white font-medium text-sm border-b border-transparent focus:border-gold-400/40 outline-none"
        />
        <button onClick={() => onMove(-1)} disabled={first} aria-label="Move entry up" className="text-slate-500 disabled:opacity-20"><ArrowUp className="w-4 h-4" /></button>
        <button onClick={() => onMove(1)} disabled={last} aria-label="Move entry down" className="text-slate-500 disabled:opacity-20"><ArrowDown className="w-4 h-4" /></button>
        <button onClick={onDelete} aria-label={`Delete entry ${entry.org}`} className="text-slate-600 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
      </div>
      <div className="grid sm:grid-cols-3 gap-2 mb-3">
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
            className="px-2 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 text-slate-300 text-xs"
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
      <div className="mt-2 flex gap-2">
        <textarea
          value={newBullet}
          onChange={(e) => setNewBullet(e.target.value)}
          maxLength={1000}
          rows={2}
          placeholder="Add a truthful achievement bullet"
          className="flex-1 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/10 text-white text-sm resize-none"
        />
        <button
          onClick={() => { if (newBullet.trim()) { onAddBullet(newBullet.trim()); setNewBullet(''); } }}
          disabled={!newBullet.trim() || busy}
          aria-label={`Add bullet to ${entry.org}`}
          className="px-3 rounded-lg border border-gold-400/30 text-gold-300"
        ><Plus className="w-4 h-4" /></button>
      </div>
    </div>
  );
}
