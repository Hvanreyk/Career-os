'use client';

import { useCallback, useRef, useState } from 'react';
import type { ResumeAiJobRow } from '@trajectoryos/core/resume/document';
import { api } from './api';

const POLL_INTERVAL_MS = 2_500;
const POLL_TIMEOUT_MS = 180_000;

export type ResumeAiJobPhase = 'idle' | 'creating' | 'processing' | 'completed' | 'error';

export interface ResumeAiJobState {
  phase: ResumeAiJobPhase;
  jobId: string | null;
  output: Record<string, unknown> | null;
  error: string | null;
}

const IDLE: ResumeAiJobState = { phase: 'idle', jobId: null, output: null, error: null };

/**
 * Drives one resume AI job through the two-phase rail: create → process →
 * poll until completed/error. `create` performs the kind-specific creation
 * request and returns the job id.
 */
export function useResumeAiJob() {
  const [state, setState] = useState<ResumeAiJobState>(IDLE);
  const activeRun = useRef(0);

  const reset = useCallback(() => {
    activeRun.current += 1;
    setState(IDLE);
  }, []);

  const run = useCallback(async (create: () => Promise<{ jobId: string }>) => {
    const runId = activeRun.current + 1;
    activeRun.current = runId;
    setState({ phase: 'creating', jobId: null, output: null, error: null });
    try {
      const { jobId } = await create();
      if (activeRun.current !== runId) return;
      setState({ phase: 'processing', jobId, output: null, error: null });

      // Kick processing; a 202/502 here still leaves the job pollable and
      // retryable, so failures fall through to the poll loop.
      await api(`/ai-jobs/${jobId}/process`, 'POST').catch(() => undefined);

      const deadline = Date.now() + POLL_TIMEOUT_MS;
      for (;;) {
        if (activeRun.current !== runId) return;
        const { job } = await api<{ job: ResumeAiJobRow }>(`/ai-jobs/${jobId}`, 'GET');
        if (job.status === 'completed') {
          setState({ phase: 'completed', jobId, output: job.output, error: null });
          return;
        }
        if (job.status === 'error') {
          setState({ phase: 'error', jobId, output: null, error: job.error_message ?? 'AI generation failed' });
          return;
        }
        if (Date.now() > deadline) {
          setState({ phase: 'error', jobId, output: null, error: 'Timed out waiting for the AI — try again' });
          return;
        }
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
        // A stalled pending/processing job (e.g. interrupted invocation) is
        // re-kicked; the server lease makes this safe.
        void api(`/ai-jobs/${jobId}/process`, 'POST').catch(() => undefined);
      }
    } catch (error) {
      if (activeRun.current !== runId) return;
      setState({
        phase: 'error',
        jobId: null,
        output: null,
        error: error instanceof Error ? error.message : 'Something went wrong',
      });
    }
  }, []);

  return { state, run, reset };
}
