'use client';

import { useRouter } from 'next/navigation';
import { StepShell } from '@/components/onboard/StepShell';
import { ChoiceButton } from '@/components/onboard/ChoiceButton';
import { useOnboard } from '@/lib/onboard/context';
import {
  TARGET_GEOGRAPHY_OPTIONS as GEOS,
  TARGET_TIER_OPTIONS as TIERS,
} from '@trajectoryos/core/career-compass/taxonomy';

export default function GoalPage() {
  const { data, update } = useOnboard();
  const router = useRouter();

  const canContinue = !!data.target_firm_tier && !!data.target_geography;

  return (
    <StepShell
      step={1}
      title="Where are you aiming?"
      subtitle="This shapes which professionals we match you against."
    >
      <div className="space-y-6">
        <div>
          <div className="text-xs text-slate-500 uppercase tracking-widest mb-3">Target bank tier</div>
          <div className="space-y-2">
            {TIERS.map((t) => (
              <ChoiceButton
                key={t.value}
                selected={data.target_firm_tier === t.value}
                onClick={() => update({ target_firm_tier: t.value })}
                description={t.description}
                gold={t.value === 'bb'}
              >
                {t.label}
              </ChoiceButton>
            ))}
          </div>
        </div>

        <div>
          <div className="text-xs text-slate-500 uppercase tracking-widest mb-3">Target city</div>
          <div className="grid grid-cols-2 gap-2">
            {GEOS.map((g) => (
              <ChoiceButton
                key={g.value}
                selected={data.target_geography === g.value}
                onClick={() => update({ target_geography: g.value })}
              >
                {g.label}
              </ChoiceButton>
            ))}
          </div>
        </div>

        <button
          disabled={!canContinue}
          onClick={() => router.push('/onboard/university')}
          className="w-full py-4 bg-gold-400 text-navy-950 font-semibold rounded-xl hover:bg-gold-300 transition-all shadow-[0_0_24px_rgba(212,175,55,0.3)] disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
        >
          Continue →
        </button>
      </div>
    </StepShell>
  );
}
