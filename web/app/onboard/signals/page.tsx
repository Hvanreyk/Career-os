'use client';

import { useRouter } from 'next/navigation';
import { StepShell } from '@/components/onboard/StepShell';
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
