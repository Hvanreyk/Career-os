'use client';

import { useRouter } from 'next/navigation';
import { StepShell } from '@/components/onboard/StepShell';
import { ChoiceButton } from '@/components/onboard/ChoiceButton';
import { ChoiceList, StepActions, StepGroup } from '@/components/onboard/StepParts';
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
      <div className="space-y-8">
        <StepGroup label="WAM (Weighted Average Mark)">
          <ChoiceList>
            {WAMS.map((w) => (
              <ChoiceButton
                key={w.value}
                selected={data.wam_band === w.value}
                onClick={() => update({ wam_band: w.value })}
                description={w.description}
              >
                {w.label}
              </ChoiceButton>
            ))}
          </ChoiceList>
        </StepGroup>

        <div>
          <label htmlFor="high-school" className="ml-label">
            High school type
          </label>
          <p id="high-school-hint" className="mt-1.5 text-[13px] leading-snug text-graphite">
            Used internally for distance matching — not shown in your report.
          </p>
          <select
            id="high-school"
            aria-describedby="high-school-hint"
            value={data.high_school_type}
            onChange={(e) => update({ high_school_type: e.target.value as HighSchoolType })}
            className="ml-field mt-3"
          >
            {HIGH_SCHOOLS.map((h) => (
              <option key={h.value} value={h.value}>
                {h.label}
              </option>
            ))}
          </select>
        </div>

        <StepGroup label="ATAR band" hint="Optional.">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {ATARS.map((a) => {
              const selected = data.atar_band === a.value;
              return (
                <button
                  key={a.value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => update({ atar_band: a.value })}
                  className={`ml-num min-h-[44px] border px-3 text-[13px] transition-colors ${
                    selected
                      ? 'border-red bg-raised text-bone'
                      : 'border-rule text-graphite hover:border-rule-bright hover:text-bone'
                  }`}
                >
                  {a.label}
                </button>
              );
            })}
          </div>
        </StepGroup>

        <StepActions
          disabled={!canContinue}
          onContinue={() => router.push('/onboard/experience')}
        />
      </div>
    </StepShell>
  );
}
