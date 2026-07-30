'use client';

import { useState } from 'react';
import type { ResumeChange, ResumeDocument } from '@trajectoryos/core/resume/document';
import { Button } from '@/components/ui/Button';
import { renderWithPlaceholders } from './placeholders';
import { Notice } from './Notice';

// User-checkpoint review UIs for AI proposals — nothing is applied silently.

const PLACEHOLDER_HINT =
  'Underlined text is a placeholder — fill it in only if it is true for you.';

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
      <div className="ml-panel-raised max-h-96 space-y-5 overflow-y-auto p-4">
        <div>
          <p className="text-[16px] font-bold text-bone">
            {document.contact.full_name ?? 'No name yet'}
          </p>
          <p className="ml-num mt-1 text-[12px] text-graphite">
            {[document.contact.email, document.contact.phone, document.contact.linkedin_url, document.contact.location]
              .filter(Boolean).join(' · ') || 'No contact details'}
          </p>
        </div>
        {document.sections.map((section, sectionIndex) => (
          <div key={sectionIndex}>
            <p className="ml-label mb-2 border-b border-rule pb-1.5 text-bone">{section.heading}</p>
            {section.entries.map((entry, entryIndex) => (
              <div key={entryIndex} className="mb-3">
                <div className="flex justify-between gap-3">
                  <span className="text-[15px] font-bold text-bone">{entry.org}</span>
                  <span className="ml-num shrink-0 text-[12px] text-graphite">{entry.date_range}</span>
                </div>
                <div className="flex justify-between gap-3 text-[13px] text-graphite">
                  <span>{entry.role_title}</span>
                  <span className="ml-num shrink-0">{entry.location}</span>
                </div>
                <ul className="mt-1.5 space-y-1">
                  {entry.bullets.map((bullet, bulletIndex) => (
                    <li key={bulletIndex} className="flex gap-2 text-[15px] leading-snug text-bone/90">
                      <span className="text-graphite" aria-hidden="true">▪</span>
                      <span>{renderWithPlaceholders(bullet)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {section.loose_bullets.length > 0 && (
              <ul className="space-y-1">
                {section.loose_bullets.map((bullet, bulletIndex) => (
                  <li key={bulletIndex} className="flex gap-2 text-[15px] leading-snug text-bone/90">
                    <span className="text-graphite" aria-hidden="true">▪</span>
                    <span>{renderWithPlaceholders(bullet)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
        {document.sections.length === 0 && (
          <p className="text-[15px] text-graphite">
            The AI could not find resume content. Try pasting the text instead.
          </p>
        )}
      </div>
      <p className="text-[13px] text-graphite">{PLACEHOLDER_HINT}</p>
      {replaceWarning && (
        <Notice tone="warn" title="Destructive">
          Applying replaces your entire current resume, including saved per-bullet critique
          history.
        </Notice>
      )}
      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" onClick={onCancel} disabled={applying}>
          Discard
        </Button>
        <Button
          onClick={onApply}
          disabled={document.sections.length === 0}
          loading={applying}
          className="flex-1"
        >
          {confirmLabel}
        </Button>
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
        <p className="text-[15px] text-graphite">
          No changes proposed — your resume already covers this well.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule pb-2">
            <p className="ml-label">
              {acceptedCount} of {changes.length} changes selected
            </p>
            <div className="flex gap-1">
              <button
                onClick={() => setAccepted(changes.map(() => true))}
                className="ml-btn ml-btn-text min-h-[44px] px-2 text-[13px]"
              >
                Accept all
              </button>
              <button
                onClick={() => setAccepted(changes.map(() => false))}
                className="ml-btn min-h-[44px] px-2 text-[13px] font-semibold normal-case tracking-normal text-graphite hover:text-bone"
              >
                Clear
              </button>
            </div>
          </div>
          <div className="max-h-96 space-y-2 overflow-y-auto pr-1">
            {changes.map((change, index) => (
              <label
                key={index}
                className={`block cursor-pointer border p-3 ${
                  accepted[index] ? 'border-red bg-raised' : 'border-rule bg-surface'
                }`}
              >
                <div className="flex gap-3">
                  <input
                    type="checkbox"
                    checked={accepted[index] ?? false}
                    onChange={(e) => setAccepted((values) => values.map((value, i) => i === index ? e.target.checked : value))}
                    className="ml-check mt-0.5"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-[13px] text-graphite line-through">{change.original}</p>
                    <p className="mt-1.5 break-words text-[15px] leading-snug text-bone">
                      {renderWithPlaceholders(change.proposed)}
                    </p>
                    <p className="mt-2 text-[13px] leading-snug text-graphite">{change.rationale}</p>
                  </div>
                </div>
              </label>
            ))}
          </div>
        </>
      )}
      {discoveryQuestions && discoveryQuestions.length > 0 && (
        <Notice tone="info" title="Worth thinking about">
          <p>Do any of these apply to you?</p>
          <ul className="mt-1.5 space-y-1">
            {discoveryQuestions.map((question) => (
              <li key={question} className="flex gap-2 text-graphite">
                <span aria-hidden="true">?</span>
                {question}
              </li>
            ))}
          </ul>
        </Notice>
      )}
      <p className="text-[13px] text-graphite">{PLACEHOLDER_HINT}</p>
      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" onClick={onCancel} disabled={applying}>
          Discard
        </Button>
        <Button
          onClick={() => onApply(changes.filter((_, index) => accepted[index]))}
          disabled={acceptedCount === 0}
          loading={applying}
          className="flex-1"
        >
          Apply {acceptedCount} change{acceptedCount === 1 ? '' : 's'}
        </Button>
      </div>
    </div>
  );
}
