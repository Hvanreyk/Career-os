'use client';

import { useState } from 'react';
import { applyChanges } from '@trajectoryos/core/resume/apply';
import { computeCoverage } from '@trajectoryos/core/resume/coverage';
import {
  TailorOutputSchema,
  type ResumeChange,
  type ResumeDocument,
} from '@trajectoryos/core/resume/document';
import { api } from '../api';
import { useResumeAiJob } from '../useResumeAiJob';
import { Dialog } from './Dialog';
import { ChangeProposal } from './ProposalReview';
import { CoverageReport } from './CoverageReport';
import { Notice } from './Notice';
import { ExportMenu } from '../ExportMenu';
import { Button } from '@/components/ui/Button';
import type { WorkspaceRows } from '../ResumeBuilder';

interface Props {
  onClose: () => void;
  onApplied: (workspace: WorkspaceRows) => void;
}

/**
 * JD tailoring: paste a job description, get an honest coverage report
 * (requirements, evidence-cited matches, gaps) plus per-item tailored
 * changes. The tailored version can be exported directly without touching
 * the master resume, or accepted changes can be applied to it.
 */
export function TailorDialog({ onClose, onApplied }: Props) {
  const [jobDescription, setJobDescription] = useState('');
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const { state, run, reset } = useResumeAiJob();

  const tailored = state.phase === 'completed'
    ? TailorOutputSchema.safeParse(state.output)
    : null;
  const coverage = tailored?.success
    ? computeCoverage(tailored.data.jd_analysis.requirements, tailored.data.matches)
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
      title="Tailor to a job description"
      subtitle="Paste the JD. AI extracts its requirements, matches them honestly against your resume with cited evidence, reports the gaps, and proposes truthful rewrites."
      wide
      onClose={onClose}
    >
      {tailored?.success && coverage ? (
        <div className="space-y-4">
          <CoverageReport coverage={coverage} tailored={tailored.data} />
          <div className="flex flex-wrap items-center justify-between gap-3 border border-rule p-3">
            <p className="text-[13px] text-graphite">
              Download the tailored version without changing your master resume:
            </p>
            {state.jobId && <ExportMenu jobId={state.jobId} compact />}
          </div>
          <ChangeProposal
            changes={tailored.data.changes}
            applying={applying}
            header={
              <p className="text-[15px] leading-[1.6] text-bone">
                Or apply selected changes to your master resume:
              </p>
            }
            onApply={(accepted) => void apply(accepted)}
            onCancel={onClose}
          />
        </div>
      ) : state.phase === 'completed' ? (
        <div className="space-y-4">
          <Notice tone="error" title="Could not validate">
            The AI returned a tailoring result we couldn&apos;t validate. Nothing was applied —
            you can try again.
          </Notice>
          <Button variant="secondary" onClick={() => reset()}>
            Try again
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            rows={10}
            maxLength={15000}
            placeholder="Paste the full job description here — responsibilities, requirements, the lot…"
            aria-label="Job description"
            className="ml-field resize-y"
          />
          {state.phase === 'error' && <Notice tone="error" alert>{state.error}</Notice>}
          <Button
            onClick={() => void run(() => api<{ jobId: string }>('/tailor', 'POST', { jobDescription }))}
            disabled={jobDescription.trim().length < 100}
            loading={working}
            className="w-full"
          >
            {working
              ? 'Analysing the JD and matching your experience…'
              : 'Tailor my resume to this JD'}
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
