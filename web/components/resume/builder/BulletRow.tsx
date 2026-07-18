'use client';

import type { ResumeBulletRow } from '@trajectoryos/core/resume/types';
import { ArrowDown, ArrowUp, ChevronRight } from 'lucide-react';

interface Props {
  bullet: ResumeBulletRow;
  selected: boolean;
  first: boolean;
  last: boolean;
  onSelect: () => void;
  onMove: (delta: number) => void;
}

/** A single resume bullet: click to open in the critique panel, arrows to reorder. */
export function BulletRow({ bullet, selected, first, last, onSelect, onMove }: Props) {
  return (
    <div className="flex gap-2 items-center">
      <button onClick={onSelect} className={`flex-1 text-left p-3 rounded-xl border flex gap-3 items-start ${selected ? 'border-gold-400/40 bg-gold-400/5' : 'border-white/7 bg-white/[0.02]'}`}>
        <span className="text-gold-400 mt-0.5">•</span>
        <span className="text-slate-300 text-sm flex-1 line-clamp-3">{bullet.text}</span>
        <ChevronRight className="w-4 h-4 text-slate-600 shrink-0" />
      </button>
      <div className="flex flex-col gap-1">
        <button onClick={() => onMove(-1)} disabled={first} aria-label="Move bullet up" className="text-slate-600 hover:text-slate-300 disabled:opacity-20"><ArrowUp className="w-3.5 h-3.5" /></button>
        <button onClick={() => onMove(1)} disabled={last} aria-label="Move bullet down" className="text-slate-600 hover:text-slate-300 disabled:opacity-20"><ArrowDown className="w-3.5 h-3.5" /></button>
      </div>
    </div>
  );
}
