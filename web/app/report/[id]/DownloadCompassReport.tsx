'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';

// Bottom-of-report CTA: generates the longer AI deep-dive on demand (one LLM
// call, cached server-side), then streams it down as a PDF. Re-downloads skip
// straight to the export once the deep-dive is cached.
export default function DownloadCompassReport({ reportId }: { reportId: string }) {
  const [status, setStatus] = useState<'idle' | 'preparing' | 'ready' | 'error'>('idle');

  // Fetch the PDF as a blob so an export error (409/500) lands in the catch/
  // retry state instead of navigating the page to raw JSON.
  const download = async () => {
    const res = await fetch(`/api/reports/${reportId}/export?format=pdf`);
    if (!res.ok) throw new Error('PDF export failed');
    const url = URL.createObjectURL(await res.blob());
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Career-Compass-Report.pdf';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const prepare = async () => {
    setStatus('preparing');
    try {
      if (status !== 'ready') {
        const res = await fetch(`/api/reports/${reportId}/deep-dive`, { method: 'POST' });
        const data = (await res.json().catch(() => ({}))) as { status?: string; error?: string };
        if (!res.ok || data.status !== 'completed') {
          throw new Error(data.error ?? 'Deep-dive generation failed');
        }
      }
      await download();
      setStatus('ready');
    } catch {
      setStatus('error');
    }
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <Button onClick={() => void prepare()} loading={status === 'preparing'}>
        {status === 'preparing'
          ? 'Preparing your in-depth report…'
          : status === 'ready'
            ? 'Download again (PDF)'
            : 'Download your full report (PDF)'}
      </Button>
      <p className="max-w-[52ch] text-center text-[15px] leading-snug text-graphite">
        A 2–3 page personalised deep-dive: how investment banking really works, exactly where to
        improve, your highest-leverage moves, and the one resource to start with next.
      </p>
      {status === 'error' && (
        <p className="text-[14px] text-red">
          We couldn&apos;t build your report just now.{' '}
          <button onClick={() => void prepare()} className="underline hover:text-red-300">Try again</button>.
        </p>
      )}
    </div>
  );
}
