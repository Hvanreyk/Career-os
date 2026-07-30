'use client';

import type { ResumeBulletRow } from '@trajectoryos/core/resume/types';

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
    <div className="flex items-stretch gap-2">
      <button
        onClick={onSelect}
        aria-current={selected ? 'true' : undefined}
        className={`flex min-h-[44px] flex-1 items-start gap-3 border p-3 text-left ${
          selected ? 'border-red bg-raised' : 'border-rule bg-surface hover:border-rule-bright'
        }`}
      >
        <span className={selected ? 'text-red' : 'text-graphite'} aria-hidden="true">
          ▪
        </span>
        <span className="line-clamp-3 flex-1 text-[15px] leading-snug text-bone">
          {bullet.text}
        </span>
        <span className="shrink-0 text-graphite" aria-hidden="true">
          ▸
        </span>
      </button>
      <div className="flex flex-col">
        <button
          onClick={() => onMove(-1)}
          disabled={first}
          aria-label="Move bullet up"
          className="flex h-[22px] w-11 items-center justify-center text-graphite hover:text-bone disabled:opacity-25"
        >
          <span aria-hidden="true">▲</span>
        </button>
        <button
          onClick={() => onMove(1)}
          disabled={last}
          aria-label="Move bullet down"
          className="flex h-[22px] w-11 items-center justify-center text-graphite hover:text-bone disabled:opacity-25"
        >
          <span aria-hidden="true">▼</span>
        </button>
      </div>
    </div>
  );
}
