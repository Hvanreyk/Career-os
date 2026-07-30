'use client';

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
    ? 'ml-btn ml-btn-secondary min-h-[36px] px-3.5 text-[12px]'
    : 'ml-btn ml-btn-secondary min-h-[44px] px-4 text-[13px]';
  return (
    <div className="flex gap-2">
      <a href={query('pdf')} download className={base}>
        <span aria-hidden="true">↓</span> PDF
      </a>
      <a href={query('docx')} download className={base}>
        <span aria-hidden="true">↓</span> Word
      </a>
    </div>
  );
}
