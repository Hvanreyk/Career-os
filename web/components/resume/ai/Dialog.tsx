'use client';

import type { ReactNode } from 'react';
import { X } from 'lucide-react';

interface Props {
  title: string;
  subtitle?: string;
  wide?: boolean;
  onClose: () => void;
  children: ReactNode;
}

/** Simple centered modal shell used by the resume AI flows. */
export function Dialog({ title, subtitle, wide, onClose, children }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-navy-950/80 backdrop-blur-sm p-4 pt-16" role="dialog" aria-modal="true" aria-label={title}>
      <div className={`glass rounded-2xl border border-white/10 bg-navy-950 p-6 w-full ${wide ? 'max-w-3xl' : 'max-w-xl'}`}>
        <div className="flex items-start justify-between gap-4 mb-1">
          <h2 className="text-white font-serif text-xl font-bold">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="text-slate-500 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        {subtitle && <p className="text-slate-400 text-sm mb-4">{subtitle}</p>}
        {children}
      </div>
    </div>
  );
}
