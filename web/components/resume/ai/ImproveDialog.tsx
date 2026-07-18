'use client';

import { useState } from 'react';
import { applyChanges } from '@trajectoryos/core/resume/apply';
import {
  ResumeImproveOutputSchema,
  type ResumeChange,
  type ResumeDocument,
} from '@trajectoryos/core/resume/document';
import { AlertTriangle, Loader2, Sparkles } from 'lucide-react';
import { api } from '../api';
import { useResumeAiJob } from '../useResumeAiJob';
import { Dialog } from './Dialog';
import { ChangeProposal } from './ProposalReview';
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
  const { state, run } = useResumeAiJob();

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
          header={<p className="text-slate-300 text-sm">{improvement.data.summary}</p>}
          discoveryQuestions={improvement.data.discovery_questions}
          onApply={(accepted) => void apply(accepted)}
          onCancel={onClose}
        />
      ) : (
        <div className="space-y-4">
          {state.phase === 'error' && (
            <div role="alert" className="rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-red-300 text-sm flex gap-2"><AlertTriangle className="w-4 h-4 shrink-0" />{state.error}</div>
          )}
          <button
            onClick={() => void run(() => api<{ jobId: string }>('/improve', 'POST'))}
            disabled={state.phase === 'creating' || state.phase === 'processing'}
            className="w-full px-5 py-3 bg-gold-400 text-navy-950 font-semibold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {state.phase === 'creating' || state.phase === 'processing'
              ? <><Loader2 className="w-4 h-4 animate-spin" />Reviewing your resume…</>
              : <><Sparkles className="w-4 h-4" />Review my whole resume</>}
          </button>
        </div>
      )}
      {applyError && (
        <div role="alert" className="mt-3 rounded-xl border border-amber-400/25 bg-amber-400/10 p-3 text-amber-200 text-sm flex gap-2"><AlertTriangle className="w-4 h-4 shrink-0" />{applyError}</div>
      )}
    </Dialog>
  );
}
