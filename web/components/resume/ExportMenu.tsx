'use client';

import { Download } from 'lucide-react';
import { RESUME_API } from './api';

interface Props {
  // When set, exports render this completed AI job's proposal instead of
  // the saved master resume.
  jobId?: string;
  compact?: boolean;
}

/** Download buttons for the formatted PDF / Word exports. */
export function ExportMenu({ jobId, compact }: Props) {
  const query = (format: string) =>
    `${RESUME_API}/export?format=${format}${jobId ? `&jobId=${jobId}` : ''}`;
  const base = compact
    ? 'px-3 py-1.5 rounded-lg text-xs'
    : 'px-4 py-2 rounded-lg text-sm';
  return (
    <div className="flex gap-2">
      <a href={query('pdf')} download className={`${base} border border-gold-400/30 text-gold-300 flex items-center gap-1.5 hover:bg-gold-400/10`}>
        <Download className="w-3.5 h-3.5" />PDF
      </a>
      <a href={query('docx')} download className={`${base} border border-white/15 text-slate-300 flex items-center gap-1.5 hover:bg-white/5`}>
        <Download className="w-3.5 h-3.5" />Word
      </a>
    </div>
  );
}
