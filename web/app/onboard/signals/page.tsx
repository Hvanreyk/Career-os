'use client';

import { useRouter } from 'next/navigation';
import { StepShell } from '@/components/onboard/StepShell';
import { StepActions, StepGroup } from '@/components/onboard/StepParts';
import { useOnboard } from '@/lib/onboard/context';
import { SIGNAL_GROUPS } from '@trajectoryos/core/career-compass/taxonomy';
import type { SignalTag } from '@/lib/onboard/types';

export default function SignalsPage() {
  const { data, update } = useOnboard();
  const router = useRouter();

  const toggle = (value: SignalTag) => {
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
