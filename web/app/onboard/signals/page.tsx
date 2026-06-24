'use client';

import { useRouter } from 'next/navigation';
import { StepShell } from '@/components/onboard/StepShell';
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
      <div className="space-y-6">
        {SIGNAL_GROUPS.map((group) => (
          <div key={group.label}>
            <div className="text-xs text-slate-500 uppercase tracking-widest mb-2.5">
              {group.label}
            </div>
            <div className="space-y-1.5">
              {group.options.map((opt) => {
                const selected = data.signals.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggle(opt.value)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
                      selected
                        ? 'border-gold-400/40 bg-gold-400/8 text-white'
                        : 'border-white/8 text-slate-400 hover:border-white/20 hover:text-white'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                      selected ? 'border-gold-400 bg-gold-400' : 'border-slate-600'
                    }`}>
                      {selected && <span className="text-navy-950 text-[9px] font-bold">✓</span>}
                    </div>
                    <span className="text-sm">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        <button
          onClick={() => router.push('/onboard/review')}
          className="w-full py-4 bg-gold-400 text-navy-950 font-semibold rounded-xl hover:bg-gold-300 transition-all shadow-[0_0_24px_rgba(212,175,55,0.3)]"
        >
          Review my profile →
        </button>
      </div>
    </StepShell>
  );
}
