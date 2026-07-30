'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { StepShell } from '@/components/onboard/StepShell';
import { StepActions } from '@/components/onboard/StepParts';
import { useOnboard } from '@/lib/onboard/context';
import type { ExperienceEntry, ExpType, FirmTier, Industry, HowObtained } from '@/lib/onboard/types';

const EXP_TYPES: { value: ExpType; label: string }[] = [
  { value: 'summer_internship', label: 'Summer Internship' },
  { value: 'winter_internship', label: 'Winter Internship' },
  { value: 'penultimate_internship', label: 'Penultimate Internship' },
  { value: 'part_time', label: 'Part-time Role' },
  { value: 'full_time', label: 'Full-time Role' },
  { value: 'grad_program', label: 'Graduate Program' },
];

const FIRM_TIERS: { value: FirmTier; label: string }[] = [
  { value: 'bb', label: 'Bulge Bracket (BB)' },
  { value: 'elite_boutique_and_mm', label: 'Elite Boutique / Mid-Market' },
  { value: 'boutique', label: 'Boutique' },
  { value: 'big4', label: 'Big 4' },
  { value: 'private_equity', label: 'Private Equity' },
  { value: 'corporate', label: 'Corporate / Other' },
  { value: 'government', label: 'Government' },
  { value: 'other', label: 'Other' },
];

const INDUSTRIES: { value: Industry; label: string }[] = [
  { value: 'ib', label: 'Investment Banking' },
  { value: 'big4_advisory', label: 'Big 4 Advisory / M&A' },
  { value: 'big4_audit', label: 'Big 4 Audit' },
  { value: 'private_equity', label: 'Private Equity' },
  { value: 'capital_markets', label: 'Capital Markets' },
  { value: 'consulting', label: 'Consulting' },
  { value: 'corporate', label: 'Corporate Finance' },
  { value: 'law', label: 'Law' },
  { value: 'government', label: 'Government' },
  { value: 'other', label: 'Other' },
];

const HOW_OBTAINED: { value: HowObtained; label: string }[] = [
  { value: 'online_application', label: 'Online application' },
  { value: 'cold_email', label: 'Cold email / networking' },
  { value: 'ocr', label: 'Campus recruitment (OCR)' },
  { value: 'society_referral', label: 'Finance society referral' },
  { value: 'internal_referral', label: 'Internal / personal referral' },
  { value: 'co_op_program', label: 'Co-op program placement' },
  { value: 'unknown', label: 'Other / not sure' },
];

const DURATIONS = [1, 2, 3, 4, 6, 12];

const BLANK_EXP: ExperienceEntry = {
  type: 'summer_internship',
  firm: '',
  firm_tier: 'bb',
  industry: 'ib',
  year: new Date().getFullYear() - 1,
  duration_months: 3,
  how_obtained: 'online_application',
  converted_to_ft: 'NA',
};

function ExperienceCard({
  exp,
  index,
  onUpdate,
  onDelete,
}: {
  exp: ExperienceEntry;
  index: number;
  onUpdate: (e: ExperienceEntry) => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(true);
  const isInternship = ['summer_internship', 'winter_internship', 'penultimate_internship', 'internship'].includes(exp.type);
  const currentYear = new Date().getFullYear();

  return (
    <div className="border border-rule bg-surface">
      <div className="flex items-stretch">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="flex min-h-[56px] flex-1 items-center gap-3 px-4 text-left"
        >
          <span className="ml-num text-[13px] text-rule-bright" aria-hidden="true">
            {String(index + 1).padStart(2, '0')}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-semibold text-bone">
              {exp.firm || `Experience ${index + 1}`}
            </span>
            {exp.firm && (
              <span className="ml-label mt-0.5 block">
                {EXP_TYPES.find((t) => t.value === exp.type)?.label} · {exp.year}
              </span>
            )}
          </span>
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5 shrink-0 text-graphite" aria-hidden="true">
            <path
              d={open ? 'M3 10l5-5 5 5' : 'M3 6l5 5 5-5'}
              stroke="currentColor"
              strokeWidth="1.6"
              fill="none"
            />
          </svg>
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="flex w-12 shrink-0 items-center justify-center border-l border-rule text-graphite transition-colors hover:text-red"
        >
          <span className="sr-only">Remove {exp.firm || `experience ${index + 1}`}</span>
          <svg viewBox="0 0 16 16" className="h-4 w-4" aria-hidden="true">
            <path d="M3 4h10M6.5 4V2.5h3V4M5 4l.6 9h4.8L11 4" stroke="currentColor" strokeWidth="1.3" fill="none" />
          </svg>
        </button>
      </div>

      {open && (
        <div className="border-t border-rule px-4 pb-5">
          <div className="grid grid-cols-2 gap-x-4 gap-y-4 pt-4">
            {/* Type */}
            <div className="col-span-2">
              <label className="ml-label mb-1.5 block">Type</label>
              <select
                value={exp.type}
                onChange={(e) => onUpdate({ ...exp, type: e.target.value as ExpType, converted_to_ft: ['full_time', 'grad_program'].includes(e.target.value) ? 'NA' : exp.converted_to_ft })}
                className="ml-field"
              >
                {EXP_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            {/* Firm */}
            <div className="col-span-2">
              <label className="ml-label mb-1.5 block">Firm name</label>
              <input
                value={exp.firm}
                onChange={(e) => onUpdate({ ...exp, firm: e.target.value })}
                placeholder="e.g. J.P. Morgan"
                className="ml-field"
              />
            </div>

            {/* Firm tier */}
            <div>
              <label className="ml-label mb-1.5 block">Firm level</label>
              <select
                value={exp.firm_tier}
                onChange={(e) => onUpdate({ ...exp, firm_tier: e.target.value as FirmTier })}
                className="ml-field"
              >
                {FIRM_TIERS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>

            {/* Industry */}
            <div>
              <label className="ml-label mb-1.5 block">Area</label>
              <select
                value={exp.industry}
                onChange={(e) => onUpdate({ ...exp, industry: e.target.value as Industry })}
                className="ml-field"
              >
                {INDUSTRIES.map((i) => <option key={i.value} value={i.value}>{i.label}</option>)}
              </select>
            </div>

            {/* Year */}
            <div>
              <label className="ml-label mb-1.5 block">Year</label>
              <select
                value={exp.year}
                onChange={(e) => onUpdate({ ...exp, year: parseInt(e.target.value) })}
                className="ml-field"
              >
                {Array.from({ length: 10 }, (_, i) => currentYear - i).map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>

            {/* Duration */}
            <div>
              <label className="ml-label mb-1.5 block">Duration</label>
              <div className="flex gap-1.5 flex-wrap">
                {DURATIONS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => onUpdate({ ...exp, duration_months: d })}
                    aria-pressed={exp.duration_months === d}
                    className={`ml-num min-h-[44px] min-w-[44px] border px-2 text-[13px] transition-colors ${
                      exp.duration_months === d
                        ? 'border-red bg-raised text-bone'
                        : 'border-rule text-graphite hover:border-rule-bright hover:text-bone'
                    }`}
                  >
                    {d}m
                  </button>
                ))}
              </div>
            </div>

            {/* How obtained */}
            <div className="col-span-2">
              <label className="ml-label mb-1.5 block">How did you get it?</label>
              <select
                value={exp.how_obtained}
                onChange={(e) => onUpdate({ ...exp, how_obtained: e.target.value as HowObtained })}
                className="ml-field"
              >
                {HOW_OBTAINED.map((h) => <option key={h.value} value={h.value}>{h.label}</option>)}
              </select>
            </div>

            {/* Convert to FT — only for internships */}
            {isInternship && (
              <div className="col-span-2">
                <label className="ml-label mb-1.5 block">
                  Did it lead to a return offer?
                </label>
                <div className="flex gap-2">
                  {[{ v: true, l: 'Yes' }, { v: false, l: 'No' }, { v: 'NA' as const, l: 'N/A' }].map(({ v, l }) => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => onUpdate({ ...exp, converted_to_ft: v })}
                      aria-pressed={exp.converted_to_ft === v}
                      className={`min-h-[44px] flex-1 border text-[13px] font-medium transition-colors ${
                        exp.converted_to_ft === v
                          ? 'border-red bg-raised text-bone'
                          : 'border-rule text-graphite hover:border-rule-bright hover:text-bone'
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ExperiencePage() {
  const { data, update } = useOnboard();
  const router = useRouter();

  const addExp = () => {
    if (data.experiences.length < 5) {
      update({ experiences: [...data.experiences, { ...BLANK_EXP }] });
    }
  };

  const updateExp = (i: number, e: ExperienceEntry) => {
    const exps = [...data.experiences];
    exps[i] = e;
    update({ experiences: exps });
  };

  const deleteExp = (i: number) => {
    update({ experiences: data.experiences.filter((_, idx) => idx !== i) });
  };

  return (
    <StepShell
      step={4}
      title="Work experience"
      subtitle="Add finance-relevant roles. Up to 5 experiences."
      backHref="/onboard/grades"
    >
      <div className="space-y-3">
        {data.experiences.map((exp, i) => (
          <ExperienceCard
            key={i}
            exp={exp}
            index={i}
            onUpdate={(e) => updateExp(i, e)}
            onDelete={() => deleteExp(i)}
          />
        ))}

        {data.experiences.length < 5 && (
          <button
            type="button"
            onClick={addExp}
            className="ml-btn ml-btn-secondary min-h-[52px] w-full border-dashed text-[13px]"
          >
            <span aria-hidden="true">+</span>
            {data.experiences.length === 0 ? 'Add your first experience' : 'Add another experience'}
          </button>
        )}

        {/* Lateral flag */}
        {data.experiences.some((e) => e.type === 'full_time') && (
          <div className="flex items-center gap-3 border-t border-rule pt-4">
            <input
              id="lateral"
              type="checkbox"
              checked={data.is_lateral_candidate}
              onChange={() => update({ is_lateral_candidate: !data.is_lateral_candidate })}
              className="ml-check"
            />
            <label
              htmlFor="lateral"
              className="flex min-h-[44px] cursor-pointer select-none items-center text-[15px] leading-snug text-bone"
            >
              I&apos;m a lateral candidate (moving from another industry into IB)
            </label>
          </div>
        )}

        {data.is_lateral_candidate && (
          <div>
            <label htmlFor="ext-role" className="block text-[13px] font-semibold text-bone">
              Current role
            </label>
            <input
              id="ext-role"
              value={data.current_external_role}
              onChange={(e) => update({ current_external_role: e.target.value })}
              placeholder="e.g. Big 4 audit senior"
              className="ml-field mt-2"
            />
          </div>
        )}

        <StepActions
          onContinue={() => router.push('/onboard/signals')}
          note={
            data.experiences.length === 0
              ? 'No finance experience yet is a valid answer — continue and the scoring accounts for it.'
              : undefined
          }
        />
      </div>
    </StepShell>
  );
}
