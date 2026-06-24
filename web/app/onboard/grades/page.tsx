'use client';

import { useRouter } from 'next/navigation';
import { StepShell } from '@/components/onboard/StepShell';
import { ChoiceButton } from '@/components/onboard/ChoiceButton';
import { useOnboard } from '@/lib/onboard/context';
import type { WamBand, HighSchoolType, AtarBand } from '@/lib/onboard/types';

const WAMS: { value: WamBand; label: string; description: string }[] = [
  { value: 'hd', label: 'High Distinction', description: '75 and above' },
  { value: 'd', label: 'Distinction', description: '65 – 74' },
  { value: 'c', label: 'Credit', description: '55 – 64' },
  { value: 'p', label: 'Pass', description: '50 – 54' },
  { value: 'unknown', label: 'Prefer not to say', description: '' },
];

const HIGH_SCHOOLS: { value: HighSchoolType; label: string }[] = [
  { value: 'gps', label: 'GPS (Greater Public Schools)' },
  { value: 'cas', label: 'CAS (Combined Associated Schools)' },
  { value: 'aps', label: 'APS (Associated Public Schools)' },
  { value: 'selective', label: 'Selective Government School' },
  { value: 'public_comprehensive', label: 'Public Comprehensive' },
  { value: 'catholic', label: 'Catholic School' },
  { value: 'independent_other', label: 'Other Independent' },
  { value: 'unknown', label: 'Prefer not to say / Skip' },
];

const ATARS: { value: AtarBand; label: string }[] = [
  { value: '99_plus', label: '99+' },
  { value: '98_99', label: '98 – 99' },
  { value: '95_98', label: '95 – 98' },
  { value: '90_95', label: '90 – 95' },
  { value: '85_90', label: '85 – 90' },
  { value: 'below_85', label: 'Below 85' },
  { value: 'unknown', label: 'Skip / Not applicable' },
];

export default function GradesPage() {
  const { data, update } = useOnboard();
  const router = useRouter();

  const canContinue = !!data.wam_band;

  return (
    <StepShell
      step={3}
      title="Academic performance"
      subtitle="Used for matching only — never shown to anyone else."
      backHref="/onboard/university"
    >
      <div className="space-y-6">
        {/* WAM */}
        <div>
          <div className="text-xs text-slate-500 uppercase tracking-widest mb-3">
            WAM (Weighted Average Mark)
          </div>
          <div className="space-y-2">
            {WAMS.map((w) => (
              <ChoiceButton
                key={w.value}
                selected={data.wam_band === w.value}
                onClick={() => update({ wam_band: w.value })}
                description={w.description}
                gold={w.value === 'hd'}
              >
                {w.label}
              </ChoiceButton>
            ))}
          </div>
        </div>

        {/* High school */}
        <div>
          <div className="text-xs text-slate-500 uppercase tracking-widest mb-1">
            High school type
          </div>
          <div className="text-xs text-slate-600 mb-3">
            Used internally for distance matching — not shown in your report.
          </div>
          <select
            value={data.high_school_type}
            onChange={(e) => update({ high_school_type: e.target.value as HighSchoolType })}
            className="w-full bg-navy-800/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-gold-400/40 transition-colors"
          >
            {HIGH_SCHOOLS.map((h) => (
              <option key={h.value} value={h.value} className="bg-navy-900">
                {h.label}
              </option>
            ))}
          </select>
        </div>

        {/* ATAR */}
        <div>
          <div className="text-xs text-slate-500 uppercase tracking-widest mb-3">
            ATAR band <span className="text-slate-600 normal-case">(optional)</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {ATARS.map((a) => (
              <button
                key={a.value}
                type="button"
                onClick={() => update({ atar_band: a.value })}
                className={`py-2.5 px-3 rounded-xl text-xs font-medium border transition-all text-left ${
                  data.atar_band === a.value
                    ? 'border-gold-400/60 bg-gold-400/10 text-gold-300'
                    : 'border-white/10 text-slate-400 hover:border-white/25 hover:text-white'
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>

        <button
          disabled={!canContinue}
          onClick={() => router.push('/onboard/experience')}
          className="w-full py-4 bg-gold-400 text-navy-950 font-semibold rounded-xl hover:bg-gold-300 transition-all shadow-[0_0_24px_rgba(212,175,55,0.3)] disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
        >
          Continue →
        </button>
      </div>
    </StepShell>
  );
}
