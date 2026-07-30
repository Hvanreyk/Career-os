'use client';

import { useRouter } from 'next/navigation';
import { StepShell } from '@/components/onboard/StepShell';
import { ChoiceButton } from '@/components/onboard/ChoiceButton';
import { ChoiceList, StepActions, StepGroup } from '@/components/onboard/StepParts';
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
      <div className="space-y-8">
        <StepGroup label="Target bank tier">
          <ChoiceList>
            {TIERS.map((t) => (
              <ChoiceButton
                key={t.value}
                selected={data.target_firm_tier === t.value}
                onClick={() => update({ target_firm_tier: t.value })}
                description={t.description}
              >
                {t.label}
              </ChoiceButton>
            ))}
          </ChoiceList>
        </StepGroup>

        <StepGroup label="Target city">
          <div className="grid grid-cols-1 divide-y divide-rule border border-rule sm:grid-cols-2 sm:divide-x sm:divide-y-0">
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
        </StepGroup>

        <StepActions
          disabled={!canContinue}
          onContinue={() => router.push('/onboard/university')}
        />
      </div>
    </StepShell>
  );
}
