'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { StepShell } from '@/components/onboard/StepShell';
import { StepActions, StepGroup } from '@/components/onboard/StepParts';
import { useOnboard } from '@/lib/onboard/context';
import { searchUniversities } from '@/lib/onboard/universities';
import type { DegreeType } from '@/lib/onboard/types';

const YEARS = [1, 2, 3, 4, 5];
const DEGREE_TYPES: { value: DegreeType; label: string }[] = [
  { value: 'bachelor', label: 'Bachelor' },
  { value: 'double_degree', label: 'Double Degree' },
  { value: 'honours', label: 'Honours' },
  { value: 'masters', label: 'Masters' },
  { value: 'mba', label: 'MBA' },
];

export default function UniversityPage() {
  const { data, update } = useOnboard();
  const router = useRouter();
  const [uniQuery, setUniQuery] = useState(data.university);
  const [showDropdown, setShowDropdown] = useState(false);
  const [majorInput, setMajorInput] = useState('');

  const results = searchUniversities(uniQuery).slice(0, 6);

  const canContinue =
    data.university && data.degree && data.degree_type && data.current_year && data.majors.length > 0;

  const addMajor = () => {
    const trimmed = majorInput.trim();
    if (trimmed && !data.majors.includes(trimmed) && data.majors.length < 3) {
      update({ majors: [...data.majors, trimmed] });
      setMajorInput('');
    }
  };

  return (
    <StepShell
      step={2}
      title="Tell us about your degree"
      subtitle="Your university and academic background shapes your match pool."
      backHref="/onboard/goal"
    >
      <div className="space-y-7">
        {/* University — combobox over the tracked list */}
        <div>
          <label htmlFor="uni" className="block text-[13px] font-semibold text-bone">
            University
          </label>
          <div className="relative mt-2">
            <input
              id="uni"
              role="combobox"
              aria-expanded={showDropdown && results.length > 0}
              aria-controls="uni-results"
              aria-autocomplete="list"
              autoComplete="off"
              value={uniQuery}
              onChange={(e) => { setUniQuery(e.target.value); setShowDropdown(true); }}
              onFocus={() => setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
              placeholder="Search your university…"
              className="ml-field"
            />
            {showDropdown && results.length > 0 && (
              <ul
                id="uni-results"
                role="listbox"
                className="absolute inset-x-0 top-full z-20 mt-1 border border-rule-bright bg-surface"
              >
                {results.map((u) => (
                  <li key={u.name} className="ml-row">
                    <button
                      type="button"
                      role="option"
                      aria-selected={data.university === u.name}
                      onMouseDown={() => {
                        update({ university: u.name });
                        setUniQuery(u.name);
                        setShowDropdown(false);
                      }}
                      className="flex min-h-[44px] w-full items-center justify-between gap-3 px-3.5 text-left text-[14px] text-bone transition-colors hover:bg-raised"
                    >
                      <span>{u.name}</span>
                      <span className="ml-label shrink-0">{u.tier}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="degree" className="block text-[13px] font-semibold text-bone">
            Degree name
          </label>
          <input
            id="degree"
            value={data.degree}
            onChange={(e) => update({ degree: e.target.value })}
            placeholder="e.g. Bachelor of Commerce"
            className="ml-field mt-2"
          />
        </div>

        <StepGroup label="Degree type">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {DEGREE_TYPES.map((d) => {
              const selected = data.degree_type === d.value;
              return (
                <button
                  key={d.value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => update({ degree_type: d.value })}
                  className={`min-h-[44px] border px-3 text-[13px] font-medium transition-colors ${
                    selected
                      ? 'border-red bg-raised text-bone'
                      : 'border-rule text-graphite hover:border-rule-bright hover:text-bone'
                  }`}
                >
                  {d.label}
                </button>
              );
            })}
          </div>
        </StepGroup>

        {/* Majors */}
        <div>
          <label htmlFor="major" className="block text-[13px] font-semibold text-bone">
            Major(s)
          </label>
          <p id="major-hint" className="mt-1 text-[13px] text-graphite">
            Up to 3. {data.majors.length}/3 added.
          </p>
          <div className="mt-2 flex gap-2">
            <input
              id="major"
              aria-describedby="major-hint"
              value={majorInput}
              onChange={(e) => setMajorInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addMajor())}
              placeholder="e.g. Finance"
              className="ml-field flex-1"
            />
            <button
              type="button"
              onClick={addMajor}
              disabled={!majorInput.trim() || data.majors.length >= 3}
              className="ml-btn ml-btn-secondary min-h-[44px] px-4 text-[13px]"
            >
              Add
            </button>
          </div>
          {data.majors.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-2">
              {data.majors.map((m) => (
                <li
                  key={m}
                  className="inline-flex items-center gap-2 border border-rule-bright bg-raised py-1 pl-3 pr-1 text-[13px] text-bone"
                >
                  {m}
                  <button
                    type="button"
                    onClick={() => update({ majors: data.majors.filter((x) => x !== m) })}
                    className="flex h-7 w-7 items-center justify-center text-graphite transition-colors hover:text-red"
                  >
                    <span className="sr-only">Remove {m}</span>
                    <svg viewBox="0 0 14 14" className="h-3 w-3" aria-hidden="true">
                      <path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.6" fill="none" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <StepGroup label="Current year of study">
          <div className="flex gap-2">
            {YEARS.map((y) => {
              const selected = data.current_year === y;
              return (
                <button
                  key={y}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => update({ current_year: y })}
                  className={`ml-num min-h-[44px] flex-1 border text-[14px] transition-colors ${
                    selected
                      ? 'border-red bg-raised text-bone'
                      : 'border-rule text-graphite hover:border-rule-bright hover:text-bone'
                  }`}
                >
                  <span className="sr-only">Year </span>Y{y}
                </button>
              );
            })}
          </div>
        </StepGroup>

        <div className="flex items-center gap-3 border-t border-rule pt-5">
          <input
            id="coop"
            type="checkbox"
            checked={data.is_co_op}
            onChange={() => update({ is_co_op: !data.is_co_op })}
            className="ml-check"
          />
          <label htmlFor="coop" className="flex min-h-[44px] cursor-pointer select-none items-center text-[15px] text-bone">
            This is a Co-op program
          </label>
        </div>

        <StepActions disabled={!canContinue} onContinue={() => router.push('/onboard/grades')} />
      </div>
    </StepShell>
  );
}
