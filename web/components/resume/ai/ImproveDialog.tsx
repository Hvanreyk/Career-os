'use client';

import { useState } from 'react';
import { applyChanges } from '@trajectoryos/core/resume/apply';
import {
  ResumeImproveOutputSchema,
  type ResumeChange,
  type ResumeDocument,
} from '@trajectoryos/core/resume/document';
import { api } from '../api';
import { useResumeAiJob } from '../useResumeAiJob';
import { Dialog } from './Dialog';
import { ChangeProposal } from './ProposalReview';
import { Notice } from './Notice';
import { Button } from '@/components/ui/Button';
import type { WorkspaceRows } from '../ResumeBuilder';

interface Props {
  onClose: () => void;
  onApplied: (workspace: WorkspaceRows) => void;
}

/**
 * The general AI improve pass: proposes truth-preserving rewrites across the
 * whole resume as per-item accept/reject changes.
 */
export function ImproveDialog({ onClose, onApplied }: Props) {
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const { state, run, reset } = useResumeAiJob();

  const improvement = state.phase === 'completed'
    ? ResumeImproveOutputSchema.safeParse(state.output)
    : null;

  async function apply(accepted: ResumeChange[]) {
    setApplying(true); setApplyError(null);
    try {
      const { document } = await api<{ document: ResumeDocument }>('/document', 'GET');
      const applied = applyChanges(document, accepted);
      const result = await api<{ workspace: WorkspaceRows }>('/document', 'PUT', applied.document);
      onApplied(result.workspace);
      if (applied.skipped.length === 0) onClose();
      else setApplyError(`${applied.skipped.length} change(s) no longer matched your resume and were skipped — everything else was applied.`);
    } catch (error) {
      setApplyError(error instanceof Error ? error.message : 'Could not apply changes');
    } finally {
      setApplying(false);
    }
  }

  const working = state.phase === 'creating' || state.phase === 'processing';

  return (
    <Dialog
      title="Improve my resume"
      subtitle="AI reviews the whole resume and proposes rewrites you approve one by one. It only reframes what is already there — it never invents experience."
      wide
      onClose={onClose}
    >
      {improvement?.success ? (
        <ChangeProposal
          changes={improvement.data.changes}
          applying={applying}
          header={
            <p className="text-[15px] leading-[1.6] text-bone">{improvement.data.summary}</p>
          }
          discoveryQuestions={improvement.data.discovery_questions}
          onApply={(accepted) => void apply(accepted)}
          onCancel={onClose}
        />
      ) : state.phase === 'completed' ? (
        <div className="space-y-4">
          <Notice tone="error" title="Could not validate">
            The AI returned improvements we couldn&apos;t validate. Nothing was applied — you can
            try again.
          </Notice>
          <Button variant="secondary" onClick={() => reset()}>
            Try again
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {state.phase === 'error' && <Notice tone="error" alert>{state.error}</Notice>}
          <Button
            onClick={() => void run(() => api<{ jobId: string }>('/improve', 'POST'))}
            loading={working}
            className="w-full"
          >
            {working ? 'Reviewing your resume…' : 'Review my whole resume'}
          </Button>
        </div>
      )}
      {applyError && (
        <div className="mt-3">
          <Notice tone="warn" alert>{applyError}</Notice>
        </div>
      )}
    </Dialog>
  );
}
