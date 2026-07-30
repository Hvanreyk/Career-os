'use client';

import { useState } from 'react';
import type { ResumeChange, ResumeDocument } from '@trajectoryos/core/resume/document';
import { AlertTriangle, Check, Loader2 } from 'lucide-react';
import { renderWithPlaceholders } from './placeholders';

// User-checkpoint review UIs for AI proposals — nothing is applied silently.

interface DocumentProposalProps {
  document: ResumeDocument;
  applying: boolean;
  confirmLabel: string;
  // Import/auto-create replace the whole document, which also clears saved
  // per-bullet critique history.
  replaceWarning: boolean;
  onApply: () => void;
  onCancel: () => void;
}

/** Full-document proposal preview (import / auto-create) with explicit apply. */
export function DocumentProposal({
  document, applying, confirmLabel, replaceWarning, onApply, onCancel,
}: DocumentProposalProps) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 max-h-96 overflow-y-auto space-y-4">
        <div>
          <p className="text-white font-semibold">{document.contact.full_name ?? 'No name yet'}</p>
          <p className="text-slate-500 text-xs">
            {[document.contact.email, document.contact.phone, document.contact.linkedin_url, document.contact.location]
              .filter(Boolean).join(' • ') || 'No contact details'}
          </p>
        </div>
        {document.sections.map((section, sectionIndex) => (
          <div key={sectionIndex}>
            <p className="text-gold-400 text-xs font-semibold uppercase tracking-widest border-b border-white/10 pb-1 mb-2">{section.heading}</p>
            {section.entries.map((entry, entryIndex) => (
              <div key={entryIndex} className="mb-2">
                <div className="flex justify-between gap-2 text-sm">
                  <span className="text-white font-medium">{entry.org}</span>
                  <span className="text-slate-500 text-xs">{entry.date_range}</span>
                </div>
                <div className="flex justify-between gap-2 text-xs text-slate-400">
                  <span className="italic">{entry.role_title}</span>
                  <span>{entry.location}</span>
                </div>
                <ul className="mt-1 space-y-0.5">
                  {entry.bullets.map((bullet, bulletIndex) => (
                    <li key={bulletIndex} className="text-slate-300 text-sm flex gap-2"><span className="text-gold-400">•</span><span>{renderWithPlaceholders(bullet)}</span></li>
                  ))}
                </ul>
              </div>
            ))}
            {section.loose_bullets.length > 0 && (
              <ul className="space-y-0.5">
                {section.loose_bullets.map((bullet, bulletIndex) => (
                  <li key={bulletIndex} className="text-slate-300 text-sm flex gap-2"><span className="text-gold-400">•</span><span>{renderWithPlaceholders(bullet)}</span></li>
                ))}
              </ul>
            )}
          </div>
        ))}
        {document.sections.length === 0 && (
          <p className="text-slate-500 text-sm">The AI could not find resume content. Try pasting the text instead.</p>
        )}
      </div>
      <p className="text-xs text-slate-500">Amber highlights are placeholders — fill them in only if they are true for you.</p>
      {replaceWarning && (
        <div className="rounded-xl border border-amber-400/25 bg-amber-400/10 p-3 text-amber-200 text-xs flex gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          Applying replaces your entire current resume, including saved per-bullet critique history.
        </div>
      )}
      <div className="flex gap-3">
        <button onClick={onCancel} disabled={applying} className="px-4 py-2 rounded-lg border border-white/10 text-slate-300 text-sm">Discard</button>
        <button
          onClick={onApply}
          disabled={applying || document.sections.length === 0}
          className="flex-1 px-4 py-2 rounded-lg bg-gold-400 text-navy-950 font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
        >{applying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}{confirmLabel}</button>
      </div>
    </div>
  );
}

interface ChangeProposalProps {
  changes: ResumeChange[];
  applying: boolean;
  // Extra content rendered above the change list (summary, coverage report).
  header?: React.ReactNode;
  discoveryQuestions?: string[];
  onApply: (accepted: ResumeChange[]) => void;
  onCancel: () => void;
}

/** Per-change accept/reject review (improve / tailor). */
export function ChangeProposal({
  changes, applying, header, discoveryQuestions, onApply, onCancel,
}: ChangeProposalProps) {
  const [accepted, setAccepted] = useState<boolean[]>(() => changes.map(() => true));
  const acceptedCount = accepted.filter(Boolean).length;

  return (
    <div className="space-y-4">
      {header}
      {changes.length === 0 ? (
        <p className="text-slate-400 text-sm">No changes proposed — your resume already covers this well.</p>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-slate-400 text-xs">{acceptedCount} of {changes.length} changes selected</p>
            <div className="flex gap-2 text-xs">
              <button onClick={() => setAccepted(changes.map(() => true))} className="text-gold-300 hover:underline">Accept all</button>
              <button onClick={() => setAccepted(changes.map(() => false))} className="text-slate-500 hover:underline">Clear</button>
            </div>
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
            {changes.map((change, index) => (
              <label key={index} className={`block rounded-xl border p-3 cursor-pointer ${accepted[index] ? 'border-gold-400/30 bg-gold-400/[0.04]' : 'border-white/10 bg-white/[0.02]'}`}>
                <div className="flex gap-3">
                  <input
                    type="checkbox"
                    checked={accepted[index] ?? false}
                    onChange={(e) => setAccepted((values) => values.map((value, i) => i === index ? e.target.checked : value))}
                    className="mt-1 accent-amber-400"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-slate-600 text-xs line-through break-words">{change.original}</p>
                    <p className="text-slate-200 text-sm mt-1 break-words">{renderWithPlaceholders(change.proposed)}</p>
                    <p className="text-slate-500 text-xs mt-1.5 italic">{change.rationale}</p>
                  </div>
                </div>
              </label>
            ))}
          </div>
        </>
      )}
      {discoveryQuestions && discoveryQuestions.length > 0 && (
        <div className="rounded-xl border border-sky-400/20 bg-sky-400/[0.05] p-3">
          <p className="text-sky-200 text-xs font-semibold mb-1.5">Worth thinking about — do any of these apply to you?</p>
          <ul className="space-y-1">
            {discoveryQuestions.map((question) => (
              <li key={question} className="text-sky-100/80 text-xs flex gap-2"><span>?</span>{question}</li>
            ))}
          </ul>
        </div>
      )}
      <p className="text-xs text-slate-500">Amber highlights are placeholders — fill them in only if they are true for you.</p>
      <div className="flex gap-3">
        <button onClick={onCancel} disabled={applying} className="px-4 py-2 rounded-lg border border-white/10 text-slate-300 text-sm">Discard</button>
        <button
          onClick={() => onApply(changes.filter((_, index) => accepted[index]))}
          disabled={applying || acceptedCount === 0}
          className="flex-1 px-4 py-2 rounded-lg bg-gold-400 text-navy-950 font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
        >{applying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}Apply {acceptedCount} change{acceptedCount === 1 ? '' : 's'}</button>
      </div>
    </div>
  );
}
