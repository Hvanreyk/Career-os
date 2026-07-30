'use client';

import { useRouter } from 'next/navigation';
import { StepShell } from '@/components/onboard/StepShell';
import { StepActions, StepGroup } from '@/components/onboard/StepParts';
import { useOnboard } from '@/lib/onboard/context';

const SIGNAL_GROUPS = [
  {
    label: 'Academic achievements',
    options: [
      { value: 'deans_list', label: "Dean's List" },
      { value: 'first_in_class', label: 'First in class / subject' },
      { value: 'subject_top_10_finance', label: 'Top 10 in Finance subject' },
      { value: 'faculty_prize', label: 'Faculty prize' },
      { value: 'university_medal', label: 'University medal' },
      { value: 'school_dux', label: 'School Dux' },
    ],
  },
  {
    label: 'Finance & investment societies',
    options: [
      { value: 'investment_society_member', label: 'Investment society — member' },
      { value: 'investment_society_committee', label: 'Investment society — committee' },
      { value: 'investment_society_president', label: 'Investment society — president' },
      { value: 'fin_society_committee', label: 'Finance society — committee' },
      { value: 'consulting_society_committee', label: 'Consulting society — committee' },
    ],
  },
  {
    label: 'Competitions',
    options: [
      { value: 'case_comp_winner', label: 'Case comp — winner' },
      { value: 'case_comp_finalist', label: 'Case comp — finalist' },
      { value: 'stock_pitch_winner', label: 'Stock pitch competition — winner' },
      { value: 'hackathon_winner', label: 'Hackathon — winner' },
    ],
  },
  {
    label: 'Certifications & courses',
    options: [
      { value: 'cfa_l1', label: 'CFA Level 1 (passed)' },
      { value: 'cfa_l2', label: 'CFA Level 2 (passed)' },
      { value: 'cfa_l3', label: 'CFA Level 3 (passed)' },
      { value: 'modelling_course', label: 'Financial modelling course (BIWS, REFM, etc.)' },
      { value: 'virtual_experience', label: 'Virtual experience program' },
    ],
  },
  {
    label: 'Programs & scholarships',
    options: [
      { value: 'scholarship', label: 'Academic scholarship' },
      { value: 'women_in_banking_scholarship', label: 'Women in Banking scholarship' },
      { value: 'exchange_program', label: 'Exchange / study abroad program' },
    ],
  },
  {
    label: 'Other',
    options: [
      { value: 'sports_rep', label: 'Sports representative (state / national)' },
      { value: 'school_leadership', label: 'School leadership (captain, prefect)' },
      { value: 'industry_award', label: 'Industry award' },
    ],
  },
];

export default function SignalsPage() {
  const { data, update } = useOnboard();
  const router = useRouter();

  const toggle = (value: string) => {
    const has = data.signals.includes(value);
    update({ signals: has ? data.signals.filter((s) => s !== value) : [...data.signals, value] });
  };

  return (
    <StepShell
      step={5}
      title="Achievements & signals"
      subtitle="Select everything that applies. These strengthen your profile match."
      backHref="/onboard/experience"
    >
      <div className="space-y-8">
        {SIGNAL_GROUPS.map((group) => (
          <StepGroup key={group.label} label={group.label}>
            <div className="grid grid-cols-1 border-t border-rule sm:grid-cols-2 sm:gap-x-6">
              {group.options.map((opt) => {
                const selected = data.signals.includes(opt.value);
                const id = `sig-${opt.value}`;
                return (
                  <div key={opt.value} className="ml-row flex items-center gap-3 py-1">
                    <input
                      id={id}
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggle(opt.value)}
                      className="ml-check"
                    />
                    <label
                      htmlFor={id}
                      className={`flex min-h-[44px] flex-1 cursor-pointer select-none items-center text-[15px] leading-snug ${
                        selected ? 'text-bone' : 'text-graphite'
                      }`}
                    >
                      {opt.label}
                    </label>
                  </div>
                );
              })}
            </div>
          </StepGroup>
        ))}

        <StepActions
          onContinue={() => router.push('/onboard/review')}
          label="Review my profile"
          note={`${data.signals.length} selected.`}
        />
      </div>
    </StepShell>
  );
}
