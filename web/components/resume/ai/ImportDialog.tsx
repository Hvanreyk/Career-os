'use client';

import { useState } from 'react';
import { ResumeDocumentSchema, type ResumeDocument } from '@trajectoryos/core/resume/document';
import { AlertTriangle, FileUp, Loader2 } from 'lucide-react';
import { api, RESUME_API } from '../api';
import { useResumeAiJob } from '../useResumeAiJob';
import { Dialog } from './Dialog';
import { DocumentProposal } from './ProposalReview';
import type { WorkspaceRows } from '../ResumeBuilder';

interface Props {
  onClose: () => void;
  onApplied: (workspace: WorkspaceRows) => void;
}

/**
 * Import an existing resume: upload a PDF/DOCX (parsed server-side and
 * discarded) or paste text; the AI converts it into a structured proposal
 * that the user explicitly applies.
 */
export function ImportDialog({ onClose, onApplied }: Props) {
  const [tab, setTab] = useState<'upload' | 'paste'>('upload');
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const { state, run, reset } = useResumeAiJob();

  const proposal = state.phase === 'completed'
    ? ResumeDocumentSchema.safeParse(state.output?.document)
    : null;

  async function start() {
    await run(async () => {
      if (tab === 'upload') {
        if (!file) throw new Error('Choose a PDF or Word file first');
        const form = new FormData();
        form.append('file', file);
        const response = await fetch(`${RESUME_API}/import`, { method: 'POST', body: form });
        const payload = await response.json().catch(() => ({})) as { jobId?: string; error?: string };
        if (!response.ok || !payload.jobId) throw new Error(payload.error ?? 'Upload failed');
        return { jobId: payload.jobId };
      }
      return api<{ jobId: string }>('/import', 'POST', { text });
    });
  }

  async function apply(document: ResumeDocument) {
    setApplying(true); setApplyError(null);
    try {
      // The user may not have created a resume row yet — imports can run first.
      await api('/resume', 'POST', {}).catch(() => undefined);
      const result = await api<{ workspace: WorkspaceRows }>('/document', 'PUT', document);
      onApplied(result.workspace);
      onClose();
    } catch (error) {
      setApplyError(error instanceof Error ? error.message : 'Could not apply the import');
    } finally {
      setApplying(false);
    }
  }

  const working = state.phase === 'creating' || state.phase === 'processing';

  return (
    <Dialog
      title="Import an existing resume"
      subtitle="Upload your current resume or paste its text. The file is read once to extract the text and never stored. AI restructures it — nothing is saved until you apply."
      wide={Boolean(proposal?.success)}
      onClose={onClose}
    >
      {proposal?.success ? (
        <DocumentProposal
          document={proposal.data}
          applying={applying}
          confirmLabel="Replace my resume with this import"
          replaceWarning
          onApply={() => void apply(proposal.data)}
          onCancel={() => { reset(); }}
        />
      ) : (
        <div className="space-y-4">
          <div className="flex gap-2">
            <button onClick={() => setTab('upload')} className={`px-3 py-1.5 rounded-lg text-xs ${tab === 'upload' ? 'bg-gold-400 text-navy-950 font-semibold' : 'border border-white/10 text-slate-400'}`}>Upload file</button>
            <button onClick={() => setTab('paste')} className={`px-3 py-1.5 rounded-lg text-xs ${tab === 'paste' ? 'bg-gold-400 text-navy-950 font-semibold' : 'border border-white/10 text-slate-400'}`}>Paste text</button>
          </div>

          {tab === 'upload' ? (
            <label className="block rounded-xl border border-dashed border-white/20 p-8 text-center cursor-pointer hover:border-gold-400/40">
              <FileUp className="w-8 h-8 text-gold-400 mx-auto mb-2" />
              <span className="text-slate-300 text-sm block">{file ? file.name : 'Choose a PDF or Word (.docx) file'}</span>
              <span className="text-slate-600 text-xs">Max 4.5 MB. Scanned PDFs are not supported — use the paste tab instead.</span>
              <input
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
          ) : (
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={10}
              maxLength={40000}
              placeholder="Paste the full text of your resume here…"
              className="w-full px-3 py-3 rounded-xl bg-white/[0.04] border border-white/10 text-white text-sm resize-y"
            />
          )}

          {state.phase === 'error' && (
            <div role="alert" className="rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-red-300 text-sm flex gap-2"><AlertTriangle className="w-4 h-4 shrink-0" />{state.error}</div>
          )}
          {applyError && (
            <div role="alert" className="rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-red-300 text-sm flex gap-2"><AlertTriangle className="w-4 h-4 shrink-0" />{applyError}</div>
          )}

          <button
            onClick={() => void start()}
            disabled={working || (tab === 'upload' ? !file : text.trim().length < 200)}
            className="w-full px-5 py-3 bg-gold-400 text-navy-950 font-semibold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {working ? <><Loader2 className="w-4 h-4 animate-spin" />{state.phase === 'creating' ? 'Reading your file…' : 'Structuring your resume…'}</> : 'Import with AI'}
          </button>
        </div>
      )}
    </Dialog>
  );
}
