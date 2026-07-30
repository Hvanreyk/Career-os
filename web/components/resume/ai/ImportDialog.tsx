'use client';

import { useState } from 'react';
import { ResumeDocumentSchema, type ResumeDocument } from '@trajectoryos/core/resume/document';
import { api, RESUME_API } from '../api';
import { useResumeAiJob } from '../useResumeAiJob';
import { Dialog } from './Dialog';
import { DocumentProposal } from './ProposalReview';
import { Notice } from './Notice';
import { Button } from '@/components/ui/Button';
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
  const tabClass = (active: boolean) =>
    `ml-btn min-h-[44px] px-4 text-[12px] ${active ? 'ml-btn-primary on-accent' : 'ml-btn-secondary'}`;

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
          <div className="flex gap-2" role="group" aria-label="Import source">
            <button
              onClick={() => setTab('upload')}
              aria-pressed={tab === 'upload'}
              className={tabClass(tab === 'upload')}
            >
              Upload file
            </button>
            <button
              onClick={() => setTab('paste')}
              aria-pressed={tab === 'paste'}
              className={tabClass(tab === 'paste')}
            >
              Paste text
            </button>
          </div>

          {tab === 'upload' ? (
            <label className="block cursor-pointer border border-dashed border-rule-bright p-8 text-center hover:border-bone">
              <span className="ml-label block">Source file</span>
              <span className="mt-2 block text-[16px] text-bone">
                {file ? file.name : 'Choose a PDF or Word (.docx) file'}
              </span>
              <span className="mt-1.5 block text-[13px] text-graphite">
                Max 4.5 MB. Scanned PDFs are not supported — use the paste tab instead.
              </span>
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
              aria-label="Resume text"
              className="ml-field resize-y"
            />
          )}

          {state.phase === 'error' && (
            <Notice tone="error" alert>{state.error}</Notice>
          )}
          {applyError && <Notice tone="error" alert>{applyError}</Notice>}

          <Button
            onClick={() => void start()}
            disabled={tab === 'upload' ? !file : text.trim().length < 200}
            loading={working}
            className="w-full"
          >
            {working
              ? state.phase === 'creating' ? 'Reading your file…' : 'Structuring your resume…'
              : 'Import with AI'}
          </Button>
        </div>
      )}
    </Dialog>
  );
}
