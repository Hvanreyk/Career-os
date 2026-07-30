'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { StateBlock, StatePage } from '@/components/ui/StateBlock';

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
  // `working` is the whole state machine: true while processing, false once it
  // has failed. A success navigates away via router.refresh().
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
    if (status !== 'error') void process();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <StatePage>
      {working ? (
        <StateBlock kind="loading" title="Finishing your report">
          We&apos;re writing up your Career Compass analysis. This only takes a few seconds.
        </StateBlock>
      ) : (
        <StateBlock
          kind="error"
          title="We couldn't finish your report"
          action={
            <Button onClick={() => void process()} disabled={working}>
              Try again
            </Button>
          }
        >
          {errorMessage ?? 'Something went wrong while generating your report.'}
        </StateBlock>
      )}
    </StatePage>
  );
}
