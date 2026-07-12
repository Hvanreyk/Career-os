'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

// Shown when a report exists but the LLM step hasn't completed. This covers the
// case where the loading page was interrupted (tab closed / refresh) or the LLM
// call errored. It (re)triggers processing, then refreshes to reveal the report.
export default function ReportPending({
  id,
  status,
  errorMessage,
}: {
  id: string;
  status: string;
  errorMessage: string | null;
}) {
  const router = useRouter();
  const [working, setWorking] = useState(status !== 'error');
  const started = useRef(false);

  const process = async () => {
    setWorking(true);
    try {
      const res = await fetch(`/api/reports/${id}/process`, { method: 'POST' });
      if (!res.ok) throw new Error('processing failed');
      router.refresh();
    } catch {
      setWorking(false);
    }
  };

  // Auto-resume processing once on mount, but not for already-errored reports —
  // those wait for an explicit retry so we don't hammer a failing LLM call.
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const timer = status !== 'error' ? window.setTimeout(() => void process(), 0) : null;
    return () => {
      if (timer !== null) window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center p-6">
      <div className="glass border border-white/10 rounded-2xl p-8 max-w-md text-center">
        {working ? (
          <>
            <Loader2 className="w-8 h-8 text-gold-400 animate-spin mx-auto mb-5" />
            <h2 className="font-serif text-xl font-bold text-white mb-2">
              Finishing your report
            </h2>
            <p className="text-slate-400 text-sm">
              We&apos;re writing up your personalised Career Compass analysis. This only takes a few seconds.
            </p>
          </>
        ) : (
          <>
            <div className="w-14 h-14 rounded-full bg-red-400/10 border border-red-400/20 flex items-center justify-center mx-auto mb-5">
              <span className="text-red-400 text-2xl">!</span>
            </div>
            <h2 className="font-serif text-xl font-bold text-white mb-2">
              We couldn&apos;t finish your report
            </h2>
            <p className="text-slate-400 text-sm mb-6">
              {errorMessage ?? 'Something went wrong while generating your report.'}
            </p>
            <button
              onClick={() => void process()}
              disabled={working}
              className="px-6 py-3 bg-gold-400 text-navy-950 font-semibold rounded-xl hover:bg-gold-300 transition-all text-sm disabled:opacity-50"
            >
              Try again
            </button>
          </>
        )}
      </div>
    </div>
  );
}
