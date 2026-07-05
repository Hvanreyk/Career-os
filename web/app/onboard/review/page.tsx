'use client';

import { useRouter } from 'next/navigation';
import { StepShell } from '@/components/onboard/StepShell';
import { useOnboard } from '@/lib/onboard/context';
import { ArrowRight, Edit2 } from 'lucide-react';
import Link from 'next/link';

const TIER_LABELS: Record<string, string> = {
  bb: 'Bulge Bracket',
  elite_boutique: 'Elite Boutique',
  mid_market: 'Mid-Market',
  boutique: 'Boutique',
  any: 'Any Level',
};

const GEO_LABELS: Record<string, string> = {
  sydney: 'Sydney',
  melbourne: 'Melbourne',
  perth: 'Perth',
  adelaide: 'Adelaide',
  brisbane: 'Brisbane',
};

const WAM_LABELS: Record<string, string> = {
  hd: 'High Distinction (85+)',
  d: 'Distinction (75–84)',
  c: 'Credit (65–74)',
  p: 'Pass (50–64)',
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
        ['Target city', GEO_LABELS[data.target_geography] ?? data.target_geography],
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
      <div className="space-y-4">
        {sections.map((s) => (
          <div key={s.title} className="glass border border-white/8 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/6">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
                {s.title}
              </span>
              <Link
                href={s.href}
                className="text-slate-600 hover:text-gold-400 transition-colors flex items-center gap-1 text-xs"
              >
                <Edit2 className="w-3 h-3" /> Edit
              </Link>
            </div>
            <div className="px-5 py-3 divide-y divide-white/5">
              {s.rows.map(([label, value]) => (
                <div key={label} className="flex justify-between py-2 text-sm">
                  <span className="text-slate-500">{label}</span>
                  <span className="text-white font-medium text-right max-w-[60%]">{value}</span>
                </div>
              ))}
            </div>
          </div>
        ))}

        <div className="glass border border-gold-400/20 rounded-2xl p-5 text-center">
          <div className="text-gold-400 font-semibold text-sm mb-1">Ready to generate your report?</div>
          <p className="text-slate-400 text-xs mb-4">
            You&apos;ll create an account, then we&apos;ll match your profile and generate your personalised Career Compass report.
          </p>
          <button
            onClick={() => router.push('/onboard/signup')}
            className="w-full py-4 bg-gold-400 text-navy-950 font-bold rounded-xl hover:bg-gold-300 transition-all shadow-[0_0_28px_rgba(212,175,55,0.35)] flex items-center justify-center gap-2"
          >
            Create Account & Generate Report <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </StepShell>
  );
}
