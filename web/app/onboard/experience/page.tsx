'use client';

import { useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { StepShell } from '@/components/onboard/StepShell';
import { StepActions } from '@/components/onboard/StepParts';
import { Button } from '@/components/ui/Button';
import { useOnboard } from '@/lib/onboard/context';
import type { ExperienceEntry, ExpType, FirmTier, Industry, HowObtained } from '@/lib/onboard/types';
import {
  ACQUISITION_METHOD_OPTIONS as HOW_OBTAINED,
  AREA_FIRM_TIERS,
  EXPERIENCE_TYPE_OPTIONS as EXP_TYPES,
  FIRM_TIER_LABELS,
  INDUSTRY_OPTIONS as AREAS,
} from '@trajectoryos/core/career-compass/taxonomy';

function firmTiersForArea(area: Industry): { value: FirmTier; label: string }[] {
  return AREA_FIRM_TIERS[area].map((value) => ({ value, label: FIRM_TIER_LABELS[value] }));
}

const DURATIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 24, 36];

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

/** Small square toggle used for durations and yes/no answers. */
function Chip({
  selected,
  onClick,
  children,
  className = '',
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`ml-num min-h-[44px] border px-3 text-[13px] transition-colors ${
        selected
          ? 'border-red bg-raised text-bone'
          : 'border-rule text-graphite hover:border-rule-bright hover:text-bone'
      } ${className}`}
    >
      {children}
    </button>
  );
}

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
  const isInternship = ['summer_internship', 'winter_internship', 'penultimate_internship', 'vacationer'].includes(exp.type);
  const currentYear = new Date().getFullYear();
  const uid = useId();
  const bodyId = `${uid}-body`;
  const f = (name: string) => `${uid}-${name}`;

  return (
    <div className="ml-panel">
      {/* Header: two sibling controls, never a button inside a button. */}
      <div className="flex items-stretch border-b border-rule">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls={bodyId}
          className="flex min-h-[56px] flex-1 items-center gap-3 px-4 py-3 text-left"
        >
          <span className="ml-label shrink-0" aria-hidden="true">
            {String(index + 1).padStart(2, '0')}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[15px] font-semibold text-bone">
              {exp.firm || `Experience ${index + 1}`}
            </span>
            {exp.firm && (
              <span className="mt-0.5 block truncate text-[13px] text-graphite">
                {EXP_TYPES.find((t) => t.value === exp.type)?.label} ·{' '}
                <span className="ml-num">{exp.year}</span>
              </span>
            )}
          </span>
          <span className="ml-num shrink-0 text-[13px] text-graphite" aria-hidden="true">
            {open ? '▴' : '▾'}
          </span>
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="flex w-12 shrink-0 items-center justify-center border-l border-rule text-graphite transition-colors hover:text-red"
        >
          <span aria-hidden="true">✕</span>
          <span className="sr-only">Remove experience {index + 1}</span>
        </button>
      </div>

      <div id={bodyId} hidden={!open} className="p-4 sm:p-5">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {/* Type */}
          <div className="sm:col-span-2">
            <label htmlFor={f('type')} className="ml-label">
              Type
            </label>
            <select
              id={f('type')}
              value={exp.type}
              onChange={(e) => {
                const type = e.target.value as ExpType;
                const internship = ['summer_internship', 'winter_internship', 'penultimate_internship', 'vacationer'].includes(type);
                onUpdate({ ...exp, type, converted_to_ft: internship ? exp.converted_to_ft : 'NA' });
              }}
              className="ml-field mt-2"
            >
              {EXP_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          {/* Firm */}
          <div className="sm:col-span-2">
            <label htmlFor={f('firm')} className="ml-label">
              Firm name
            </label>
            <input
              id={f('firm')}
              value={exp.firm}
              onChange={(e) => onUpdate({ ...exp, firm: e.target.value })}
              placeholder="e.g. J.P. Morgan"
              className="ml-field mt-2"
            />
          </div>

          {/* Area (industry) — picked first, drives the Firm level options below */}
          <div>
            <label htmlFor={f('area')} className="ml-label">
              Area
            </label>
            <select
              id={f('area')}
              value={exp.industry}
              onChange={(e) => {
                const industry = e.target.value as Industry;
                const validTiers = AREA_FIRM_TIERS[industry];
                const firm_tier = validTiers.includes(exp.firm_tier) ? exp.firm_tier : validTiers[0];
                onUpdate({ ...exp, industry, firm_tier });
              }}
              className="ml-field mt-2"
            >
              {AREAS.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
            </select>
          </div>

          {/* Firm tier — options depend on the selected Area */}
          <div>
            <label htmlFor={f('tier')} className="ml-label">
              Firm level
            </label>
            <select
              id={f('tier')}
              value={exp.firm_tier}
              onChange={(e) => onUpdate({ ...exp, firm_tier: e.target.value as FirmTier })}
              className="ml-field mt-2"
            >
              {firmTiersForArea(exp.industry).map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          {/* Year */}
          <div>
            <label htmlFor={f('year')} className="ml-label">
              Year
            </label>
            <select
              id={f('year')}
              value={exp.year}
              onChange={(e) => onUpdate({ ...exp, year: parseInt(e.target.value) })}
              className="ml-field ml-num mt-2"
            >
              {Array.from({ length: 10 }, (_, i) => currentYear - i).map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* How obtained */}
          <div>
            <label htmlFor={f('how')} className="ml-label">
              How did you get it?
            </label>
            <select
              id={f('how')}
              value={exp.how_obtained}
              onChange={(e) => onUpdate({ ...exp, how_obtained: e.target.value as HowObtained })}
              className="ml-field mt-2"
            >
              {HOW_OBTAINED.map((h) => <option key={h.value} value={h.value}>{h.label}</option>)}
            </select>
          </div>

          {/* Duration */}
          <fieldset className="sm:col-span-2">
            <legend className="ml-label">Duration (months)</legend>
            <div className="mt-2 grid grid-cols-5 gap-2 sm:grid-cols-7">
              {DURATIONS.map((d) => (
                <Chip
                  key={d}
                  selected={exp.duration_months === d}
                  onClick={() => onUpdate({ ...exp, duration_months: d })}
                >
                  {d}
                </Chip>
              ))}
            </div>
          </fieldset>

          {/* Convert to FT — only for internships */}
          {isInternship && (
            <fieldset className="sm:col-span-2">
              <legend className="ml-label">Did it lead to a return offer?</legend>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {[{ v: true, l: 'Yes' }, { v: false, l: 'No' }, { v: 'NA' as const, l: 'N/A' }].map(({ v, l }) => (
                  <Chip
                    key={l}
                    selected={exp.converted_to_ft === v}
                    onClick={() => onUpdate({ ...exp, converted_to_ft: v })}
                  >
                    {l}
                  </Chip>
                ))}
              </div>
            </fieldset>
          )}
        </div>
      </div>
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

  /* The lateral flag used to be reachable only while a full-time experience
     existed, so deleting that experience stripped the checkbox off the page
     while leaving the flag (and its "current role" field) set, with no way
     back. Keeping the control on screen while the flag is on lets the student
     untick it themselves — clearing it for them would silently throw away the
     role they typed. */
  const hasFullTime = data.experiences.some((e) => e.type === 'full_time');
  const showLateral = hasFullTime || data.is_lateral_candidate;

  return (
    <StepShell
      step={4}
      title="Work experience"
      subtitle="Add finance-relevant roles. Up to 5 experiences."
      backHref="/onboard/grades"
    >
      <div className="space-y-4">
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
          <Button variant="secondary" onClick={addExp} className="w-full">
            <span aria-hidden="true">+</span>{' '}
            {data.experiences.length === 0 ? 'Add your first experience' : 'Add another experience'}
          </Button>
        )}

        {/* Lateral flag */}
        {showLateral && (
          <div className="border-t border-rule pt-1">
            <div className="ml-row flex items-center gap-3 py-1">
              <input
                id="lateral"
                type="checkbox"
                checked={data.is_lateral_candidate}
                onChange={() => update({ is_lateral_candidate: !data.is_lateral_candidate })}
                className="ml-check"
              />
              <label
                htmlFor="lateral"
                className={`flex min-h-[44px] flex-1 cursor-pointer select-none items-center text-[15px] leading-snug ${
                  data.is_lateral_candidate ? 'text-bone' : 'text-graphite'
                }`}
              >
                I&apos;m a lateral candidate (moving from another industry into IB)
              </label>
            </div>
          </div>
        )}

        {data.is_lateral_candidate && (
          <div>
            <label htmlFor="external-role" className="ml-label">
              Current role
            </label>
            <input
              id="external-role"
              value={data.current_external_role}
              onChange={(e) => update({ current_external_role: e.target.value })}
              placeholder="e.g. Big 4 audit senior"
              className="ml-field mt-2"
            />
          </div>
        )}

        <StepActions onContinue={() => router.push('/onboard/signals')} />

        {data.experiences.length === 0 && (
          <Button variant="ghost" onClick={() => router.push('/onboard/signals')}>
            Skip — I don&apos;t have finance experience yet
          </Button>
        )}
      </div>
    </StepShell>
  );
}
