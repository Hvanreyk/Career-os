'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { StateBlock } from '@/components/ui/StateBlock';

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
  // The reason for *this* session's failure. The `errorMessage` prop was
  // captured when the server rendered the page, so on a retry it describes the
  // previous attempt, not the one the user just watched fail.
  const [failure, setFailure] = useState<string | null>(null);
  const started = useRef(false);

  const process = async () => {
    setWorking(true);
    setFailure(null);
    try {
      const res = await fetch(`/api/reports/${id}/process`, { method: 'POST' });
      if (!res.ok) {
        // The endpoint answers with { error, status } — surface the real reason.
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? 'Processing failed.');
      }
      router.refresh();
    } catch (err) {
      setFailure(err instanceof Error ? err.message : 'Processing failed.');
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

  const reason =
    failure ?? errorMessage ?? 'Something went wrong while generating your report.';

  return (
    <div className="mx-auto w-full max-w-[36rem] px-5 py-14 sm:py-20">
      {working ? (
        <StateBlock kind="loading" title="Finishing your report">
          <p>
            We&apos;re writing up your personalised Career Compass analysis. This only takes a
            few seconds.
          </p>
        </StateBlock>
      ) : (
        <StateBlock
          kind="error"
          title="We couldn't finish your report"
          action={<Button onClick={() => void process()}>Try again</Button>}
        >
          <p>{reason}</p>
          <p className="ml-label mt-4">Report {id}</p>
        </StateBlock>
      )}
    </div>
  );
}
