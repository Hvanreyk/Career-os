'use client';

import { useRouter } from 'next/navigation';
import { StepShell } from '@/components/onboard/StepShell';
import { StepActions } from '@/components/onboard/StepParts';
import { useOnboard } from '@/lib/onboard/context';
import Link from 'next/link';

const TIER_LABELS: Record<string, string> = {
  bb: 'Bulge Bracket',
  elite_boutique_and_mm: 'Elite Boutique / MM',
  boutique: 'Boutique',
  any: 'Any Level',
};

const WAM_LABELS: Record<string, string> = {
  hd: 'High Distinction (75+)',
  d: 'Distinction (65–74)',
  c: 'Credit (55–64)',
  p: 'Pass (50–54)',
  unknown: 'Not specified',
};

export default function ReviewPage() {
  const { data } = useOnboard();
  const router = useRouter();

  const sections = [
    {
      title: 'Goal',
      href: '/onboard/goal',
      rows: [
        ['Target tier', TIER_LABELS[data.target_firm_tier] ?? data.target_firm_tier],
        ['Target city', data.target_geography === 'sydney' ? 'Sydney' : 'Melbourne'],
      ],
    },
    {
      title: 'University',
      href: '/onboard/university',
      rows: [
        ['University', data.university || '—'],
        ['Degree', data.degree || '—'],
        ['Type', data.degree_type],
        ['Majors', data.majors.join(', ') || '—'],
        ['Year', `Year ${data.current_year}`],
        ['Co-op', data.is_co_op ? 'Yes' : 'No'],
      ],
    },
    {
      title: 'Grades',
      href: '/onboard/grades',
      rows: [
        ['WAM', WAM_LABELS[data.wam_band] ?? data.wam_band],
        ['ATAR band', data.atar_band === 'unknown' ? 'Not specified' : data.atar_band],
      ],
    },
    {
      title: 'Experience',
      href: '/onboard/experience',
      rows:
        data.experiences.length > 0
          ? data.experiences.map((e) => [`${e.firm} (${e.year})`, e.type.replace(/_/g, ' ')])
          : [['No experience added', '']],
    },
    {
      title: 'Achievements',
      href: '/onboard/signals',
      rows: [['Signals', data.signals.length > 0 ? `${data.signals.length} selected` : 'None selected']],
    },
  ];

  return (
    <StepShell
      step={6}
      title="Review your profile"
      subtitle="Make sure everything looks right before we generate your report."
      backHref="/onboard/signals"
    >
      {/* A register of what was captured, not five cards. */}
      <div className="border-t border-rule">
        {sections.map((s) => (
          <section key={s.title} className="border-b border-rule py-5">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="ml-label">{s.title}</h2>
              <Link
                href={s.href}
                className="ml-btn ml-btn-text -mr-2 min-h-[44px] min-w-[44px] px-2 text-[14px]"
              >
                Edit<span className="sr-only"> {s.title}</span>
              </Link>
            </div>
            <dl className="mt-3">
              {s.rows.map(([label, value]) => (
                <div
                  key={label}
                  className="flex justify-between gap-6 border-b border-rule/60 py-2 last:border-0"
                >
                  <dt className="text-[14px] text-graphite">{label}</dt>
                  <dd className="max-w-[62%] text-right text-[14px] font-medium text-bone">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>

      <StepActions
        onContinue={() => router.push('/onboard/signup')}
        label="Create account & generate"
        note="You'll create an account, then we'll match your profile and generate your Career Compass report."
      />
    </StepShell>
  );
}
