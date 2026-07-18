'use client';

import { useState } from 'react';
import { applyChanges } from '@trajectoryos/core/resume/apply';
import { computeCoverage } from '@trajectoryos/core/resume/coverage';
import {
  TailorOutputSchema,
  type ResumeChange,
  type ResumeDocument,
} from '@trajectoryos/core/resume/document';
import { AlertTriangle, Crosshair, Loader2 } from 'lucide-react';
import { api } from '../api';
import { useResumeAiJob } from '../useResumeAiJob';
import { Dialog } from './Dialog';
import { ChangeProposal } from './ProposalReview';
import { CoverageReport } from './CoverageReport';
import { ExportMenu } from '../ExportMenu';
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
          <div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
            <p className="text-slate-400 text-xs">Download the tailored version without changing your master resume:</p>
            {state.jobId && <ExportMenu jobId={state.jobId} compact />}
          </div>
          <ChangeProposal
            changes={tailored.data.changes}
            applying={applying}
            header={<p className="text-slate-300 text-sm">Or apply selected changes to your master resume:</p>}
            onApply={(accepted) => void apply(accepted)}
            onCancel={onClose}
          />
        </div>
      ) : state.phase === 'completed' ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-red-400/20 bg-red-400/10 p-4 text-red-300 text-sm flex gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            The AI returned a tailoring result we couldn&apos;t validate. Nothing was applied — you can try again.
          </div>
          <button onClick={() => reset()} className="px-4 py-2 rounded-lg border border-white/10 text-slate-300 text-sm">Try again</button>
        </div>
      ) : (
        <div className="space-y-4">
          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            rows={10}
            maxLength={15000}
            placeholder="Paste the full job description here — responsibilities, requirements, the lot…"
            className="w-full px-3 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-white text-sm resize-y"
          />
          {state.phase === 'error' && (
            <div role="alert" className="rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-red-300 text-sm flex gap-2"><AlertTriangle className="w-4 h-4 shrink-0" />{state.error}</div>
          )}
          <button
            onClick={() => void run(() => api<{ jobId: string }>('/tailor', 'POST', { jobDescription }))}
            disabled={state.phase === 'creating' || state.phase === 'processing' || jobDescription.trim().length < 100}
            className="w-full px-5 py-3 bg-gold-400 text-navy-950 font-semibold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {state.phase === 'creating' || state.phase === 'processing'
              ? <><Loader2 className="w-4 h-4 animate-spin" />Analysing the JD and matching your experience…</>
              : <><Crosshair className="w-4 h-4" />Tailor my resume to this JD</>}
          </button>
        </div>
      )}
      {applyError && (
        <div role="alert" className="mt-3 rounded-xl border border-amber-400/25 bg-amber-400/10 p-3 text-amber-200 text-sm flex gap-2"><AlertTriangle className="w-4 h-4 shrink-0" />{applyError}</div>
      )}
    </Dialog>
  );
}
