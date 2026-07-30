'use client';

import { useId, useState } from 'react';
import { useRouter } from 'next/navigation';
import { StepShell } from '@/components/onboard/StepShell';
import { ChoiceButton } from '@/components/onboard/ChoiceButton';
import { ChoiceList, StepActions, StepGroup } from '@/components/onboard/StepParts';
import { useOnboard } from '@/lib/onboard/context';
import { searchUniversities, normalizeUniversityName } from '@/lib/onboard/universities';
import { DEGREE_TYPE_OPTIONS as DEGREE_TYPES } from '@trajectoryos/core/career-compass/taxonomy';

const YEARS = [1, 2, 3, 4, 5, 6];
const CURRENT_CALENDAR_YEAR = new Date().getFullYear();
const GRAD_YEARS = Array.from({ length: 8 }, (_, i) => CURRENT_CALENDAR_YEAR + i);

export default function UniversityPage() {
  const { data, update } = useOnboard();
  const router = useRouter();
  const [uniQuery, setUniQuery] = useState(data.university);
  const [showDropdown, setShowDropdown] = useState(false);
  // -1 = nothing highlighted; the field's own text is what would be committed.
  const [activeIndex, setActiveIndex] = useState(-1);
  const [majorInput, setMajorInput] = useState('');
  const uniId = useId();
  const listboxId = `${uniId}-listbox`;
  const optionId = (i: number) => `${uniId}-opt-${i}`;

  const results = searchUniversities(uniQuery).slice(0, 6);

  const commitUniversity = () => {
    const trimmed = uniQuery.trim();
    if (!trimmed) return;
    const normalized = normalizeUniversityName(trimmed);
    update({ university: normalized });
    setUniQuery(normalized);
  };

  /* The saved value and the visible text are kept in step on every keystroke.
     Previously the value was only written on select/blur, so typing after
     picking an option left the *old* university saved behind a field that
     showed something else. Normalisation still happens on commit. */
  const changeQuery = (value: string) => {
    setUniQuery(value);
    setActiveIndex(-1);
    setShowDropdown(true);
    update({ university: value.trim() });
  };

  const selectUniversity = (name: string) => {
    setUniQuery(name);
    update({ university: name });
    setShowDropdown(false);
    setActiveIndex(-1);
  };

  /* Keyboard parity with the pointer: the list was previously only reachable
     via onMouseDown, so keyboard users could not select an option at all. */
  const onUniKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (results.length === 0) return;
      if (!showDropdown) {
        setShowDropdown(true);
        setActiveIndex(0);
        return;
      }
      setActiveIndex((i) => (i + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (results.length === 0) return;
      if (!showDropdown) {
        setShowDropdown(true);
        setActiveIndex(results.length - 1);
        return;
      }
      setActiveIndex((i) => (i <= 0 ? results.length - 1 : i - 1));
    } else if (e.key === 'Enter') {
      if (showDropdown && activeIndex >= 0 && results[activeIndex]) {
        e.preventDefault();
        selectUniversity(results[activeIndex].name);
      }
    } else if (e.key === 'Escape') {
      if (showDropdown) {
        e.preventDefault();
        setShowDropdown(false);
        setActiveIndex(-1);
      }
    }
  };

  const canContinue =
    data.university && data.degree && data.degree_type && data.current_year &&
    data.expected_graduation_year && data.majors.length > 0;

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
      <div className="space-y-8">
        {/* University — a combobox: type to filter, arrows + Enter to pick. */}
        <div>
          <label htmlFor={uniId} className="ml-label">
            University
          </label>
          <div className="relative mt-3">
            <input
              id={uniId}
              role="combobox"
              aria-expanded={showDropdown && results.length > 0}
              aria-controls={listboxId}
              aria-autocomplete="list"
              aria-activedescendant={
                showDropdown && activeIndex >= 0 ? optionId(activeIndex) : undefined
              }
              autoComplete="off"
              value={uniQuery}
              onChange={(e) => changeQuery(e.target.value)}
              onFocus={() => setShowDropdown(true)}
              onBlur={() => {
                setShowDropdown(false);
                setActiveIndex(-1);
                commitUniversity();
              }}
              onKeyDown={onUniKeyDown}
              placeholder="Search your university…"
              className="ml-field"
            />
            {showDropdown && results.length > 0 && (
              <ul
                id={listboxId}
                role="listbox"
                aria-label="University suggestions"
                className="absolute left-0 right-0 top-full z-20 -mt-px max-h-[17rem] overflow-y-auto border border-rule-bright bg-raised"
              >
                {results.map((u, i) => {
                  const active = i === activeIndex;
                  return (
                    <li
                      key={u.name}
                      id={optionId(i)}
                      role="option"
                      aria-selected={active}
                      /* mousedown, not click: it fires before blur would tear
                         the list down. preventDefault keeps focus in the field. */
                      onMouseDown={(e) => {
                        e.preventDefault();
                        selectUniversity(u.name);
                      }}
                      onMouseEnter={() => setActiveIndex(i)}
                      className={`ml-row flex min-h-[44px] cursor-pointer items-center justify-between gap-3 border-l-2 px-4 py-2.5 text-[15px] ${
                        active
                          ? 'border-l-red bg-surface text-bone'
                          : 'border-l-transparent text-graphite'
                      }`}
                    >
                      <span>{u.name}</span>
                      <span className="ml-label shrink-0">{u.tier}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* Degree name */}
        <div>
          <label htmlFor="degree-name" className="ml-label">
            Degree name
          </label>
          <input
            id="degree-name"
            value={data.degree}
            onChange={(e) => update({ degree: e.target.value })}
            placeholder="e.g. Bachelor of Commerce"
            className="ml-field mt-3"
          />
        </div>

        {/* Degree type — the example sits in the row, not in a hover tooltip */}
        <StepGroup label="Degree type">
          <ChoiceList>
            {DEGREE_TYPES.map((d) => (
              <ChoiceButton
                key={d.value}
                selected={data.degree_type === d.value}
                onClick={() => update({ degree_type: d.value })}
                description={d.example}
              >
                {d.label}
              </ChoiceButton>
            ))}
          </ChoiceList>
        </StepGroup>

        {/* Majors */}
        <div>
          <label htmlFor="major-input" className="ml-label">
            Major(s)
          </label>
          <p id="major-hint" className="mt-1.5 text-[13px] leading-snug text-graphite">
            Up to 3. {data.majors.length}/3 added.
          </p>
          <div className="mt-3 flex gap-2">
            <input
              id="major-input"
              aria-describedby="major-hint"
              value={majorInput}
              onChange={(e) => setMajorInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addMajor())}
              placeholder="e.g. Finance"
              className="ml-field"
            />
            <button
              type="button"
              onClick={addMajor}
              className="ml-btn ml-btn-secondary min-h-[44px] shrink-0 px-5 text-[13px]"
            >
              Add
            </button>
          </div>
          {data.majors.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-2">
              {data.majors.map((m) => (
                <li
                  key={m}
                  className="flex min-h-[44px] items-center gap-1 border border-rule-bright pl-3 text-[14px] text-bone"
                >
                  {m}
                  <button
                    type="button"
                    onClick={() => update({ majors: data.majors.filter((x) => x !== m) })}
                    className="flex h-11 w-11 items-center justify-center text-graphite transition-colors hover:text-red"
                  >
                    <span aria-hidden="true">✕</span>
                    <span className="sr-only">Remove {m}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Year */}
        <StepGroup label="Current year of study">
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {YEARS.map((y) => {
              const selected = data.current_year === y;
              return (
                <button
                  key={y}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => update({ current_year: y })}
                  className={`ml-num min-h-[44px] border px-3 text-[13px] transition-colors ${
                    selected
                      ? 'border-red bg-raised text-bone'
                      : 'border-rule text-graphite hover:border-rule-bright hover:text-bone'
                  }`}
                >
                  Y{y}
                </button>
              );
            })}
          </div>
        </StepGroup>

        {/* Expected graduation year */}
        <StepGroup
          label="Expected graduation year"
          hint="If you're extending your degree (e.g. underloading), pick the year you actually expect to finish — not the standard length for your degree type."
        >
          <div className="grid grid-cols-4 gap-2">
            {GRAD_YEARS.map((y) => {
              const selected = data.expected_graduation_year === y;
              return (
                <button
                  key={y}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => update({ expected_graduation_year: y })}
                  className={`ml-num min-h-[44px] border px-2 text-[13px] transition-colors ${
                    selected
                      ? 'border-red bg-raised text-bone'
                      : 'border-rule text-graphite hover:border-rule-bright hover:text-bone'
                  }`}
                >
                  {y}
                </button>
              );
            })}
          </div>
        </StepGroup>

        {/* Co-op */}
        <div className="ml-row flex items-center gap-3 border-t border-rule py-1">
          <input
            id="co-op"
            type="checkbox"
            checked={data.is_co_op}
            onChange={() => update({ is_co_op: !data.is_co_op })}
            className="ml-check"
          />
          <label
            htmlFor="co-op"
            className={`flex min-h-[44px] flex-1 cursor-pointer select-none items-center text-[15px] leading-snug ${
              data.is_co_op ? 'text-bone' : 'text-graphite'
            }`}
          >
            This is a Co-op program
          </label>
        </div>

        <StepActions
          disabled={!canContinue}
          onContinue={() => router.push('/onboard/grades')}
        />
      </div>
    </StepShell>
  );
}
