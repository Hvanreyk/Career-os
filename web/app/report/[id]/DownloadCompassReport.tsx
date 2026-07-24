'use client';

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';

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
      <button
        onClick={() => void prepare()}
        disabled={status === 'preparing'}
        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gold-400 text-navy-950 font-semibold text-sm hover:bg-gold-300 transition-all disabled:opacity-60"
      >
        {status === 'preparing' ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Preparing your in-depth report…
          </>
        ) : (
          <>
            <Download className="w-4 h-4" />
            {status === 'ready' ? 'Download again (PDF)' : 'Download your full report (PDF)'}
          </>
        )}
      </button>
      <p className="text-slate-500 text-xs max-w-md text-center">
        A 2–3 page personalised deep-dive: how investment banking really works, exactly where to
        improve, your highest-leverage moves, and the one resource to start with next.
      </p>
      {status === 'error' && (
        <p className="text-red-400 text-xs">
          We couldn&apos;t build your report just now.{' '}
          <button onClick={() => void prepare()} className="underline hover:text-red-300">Try again</button>.
        </p>
      )}
    </div>
  );
}
