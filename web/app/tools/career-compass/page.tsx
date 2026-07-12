import type { Metadata } from 'next';
import { FloatingOrbs } from '@/components/background/FloatingOrbs';
import { AnimatedSection } from '@/components/ui/AnimatedSection';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import {
  Target,
  BookOpen,
  Users,
  Briefcase,
  Calendar,
  ArrowRight,
  BarChart2,
} from 'lucide-react';

export const metadata: Metadata = { title: 'Career Compass' };

const features = [
  {
    icon: Target,
    title: 'Profile Strength Score',
    description:
      'Get a data-backed assessment of how your profile compares to professionals who successfully broke into IB from a similar starting point.',
  },
  {
    icon: BookOpen,
    title: 'Technical Interview Readiness',
    description:
      'Understand how technically prepared you are for IB interviews, from accounting concepts to LBO mechanics.',
  },
  {
    icon: Users,
    title: 'Networking Progress',
    description:
      'Track your outreach, identify coverage group targets, and know which firms your matched professionals came through.',
  },
  {
    icon: Briefcase,
    title: 'Application Pipeline',
    description:
      'Stay organised across penultimate and graduate programs. Never miss a deadline with structured timeline tracking.',
  },
  {
    icon: BarChart2,
    title: 'Deal Knowledge Tracker',
    description:
      'Build commercial awareness with structured deal tracking, so you always have something intelligent to say in interviews.',
  },
  {
    icon: Calendar,
    title: 'Weekly Action Plan',
    description:
      'Receive a personalised list of high-priority actions, ranked by recruiting impact and deadlines — not generic advice.',
  },
];

const steps = [
  'Tell us about your university, degree, WAM, and experiences',
  'Career Compass matches your profile against real IB professionals',
  'Receive a personalised stage classification and fit assessment',
  'Get ranked gaps and a prioritised action plan',
];

export default function CareerCompassPage() {
  return (
    <div className="relative">
      {/* Hero */}
      <section className="relative pt-36 pb-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-navy-900 to-navy-950" />
        <FloatingOrbs />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 60% 40% at 50% 40%, rgba(212,175,55,0.06) 0%, transparent 70%)',
          }}
        />
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <AnimatedSection>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass border border-gold-400/20 text-gold-400 text-xs font-semibold uppercase tracking-widest mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-gold-400" />
              Flagship Tool
            </div>
            <h1 className="font-serif text-5xl sm:text-6xl font-bold text-white mb-6 leading-tight">
              Your Investment Banking{' '}
              <span className="text-gold-gradient">Career Map.</span>
            </h1>
            <p className="text-slate-400 text-xl leading-relaxed max-w-2xl mx-auto mb-10">
              Career Compass helps you understand your current position, identify gaps, and create
              a structured plan to improve your chances of breaking into investment banking.
            </p>
            <Button href="/onboard/goal" size="lg">
              Launch Career Compass <ArrowRight className="w-4 h-4" />
            </Button>
          </AnimatedSection>
        </div>
      </section>

      {/* Mock dashboard */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-6">
          <AnimatedSection>
            <div className="glass-card rounded-2xl border border-gold-400/15 overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.5)]">
              {/* Window chrome */}
              <div className="px-5 py-4 border-b border-white/6 flex items-center justify-between bg-navy-900/50">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
                </div>
                <div className="text-xs text-slate-500 font-medium">Career Compass — Live Dashboard</div>
                <div className="px-2.5 py-1 rounded-full bg-gold-400/12 text-gold-400 text-xs font-semibold">
                  Preview
                </div>
              </div>

              <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Stage card */}
                <div className="glass rounded-xl p-5 border border-gold-400/15 md:col-span-1">
                  <div className="text-xs text-slate-500 uppercase tracking-widest mb-1">Stage</div>
                  <div className="text-2xl font-serif font-bold text-white mb-1">S1</div>
                  <div className="text-xs text-slate-400">Building — position for penultimate</div>
                  <div className="mt-4 pt-4 border-t border-white/6">
                    <div className="text-xs text-slate-500 mb-1">Fit Band</div>
                    <div className="text-gold-400 font-semibold text-sm">Strong Fit</div>
                  </div>
                </div>

                {/* Progress */}
                <div className="glass rounded-xl p-5 border border-white/6 md:col-span-2 space-y-4">
                  {[
                    { label: 'Profile Strength', pct: 82, color: 'from-gold-500 to-gold-300' },
                    { label: 'Interview Readiness', pct: 55, color: 'from-blue-600 to-blue-400' },
                    { label: 'Network Coverage', pct: 40, color: 'from-purple-600 to-purple-400' },
                    { label: 'Application Pipeline', pct: 20, color: 'from-emerald-600 to-emerald-400' },
                  ].map(({ label, pct, color }) => (
                    <div key={label}>
                      <div className="flex justify-between text-xs mb-1.5">
                        <span className="text-slate-400">{label}</span>
                        <span className="text-slate-300 font-medium">{pct}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-navy-800">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${color}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="md:col-span-3 glass rounded-xl p-5 border border-white/6">
                  <div className="text-xs text-gold-400 uppercase tracking-widest mb-3 font-semibold">
                    Priority Actions
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      { n: '1', title: 'Secure penultimate at BB', deadline: 'Aug 2027', effort: 'High' },
                      { n: '2', title: 'Network into coverage groups', deadline: 'Aug 2027', effort: 'Medium' },
                      { n: '3', title: 'Complete a modelling course', deadline: 'Dec 2026', effort: 'Medium' },
                    ].map(({ n, title, deadline, effort }) => (
                      <div key={n} className="glass rounded-lg p-3 border border-white/5">
                        <div className="flex items-center gap-2 mb-1.5">
                          <div className="w-5 h-5 rounded-full bg-gold-400/15 text-gold-400 text-[10px] font-bold flex items-center justify-center">
                            {n}
                          </div>
                          <span className="text-xs text-white font-medium">{title}</span>
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {deadline} · {effort} effort
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* Feature cards */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <AnimatedSection className="text-center mb-14">
            <h2 className="font-serif text-4xl font-bold text-white mb-4">
              Everything you need to <span className="text-gold-gradient">compete and win</span>
            </h2>
          </AnimatedSection>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <AnimatedSection key={f.title} delay={i * 0.07}>
                  <GlassCard className="h-full">
                    <div className="w-10 h-10 rounded-xl bg-gold-400/10 flex items-center justify-center mb-4">
                      <Icon className="w-5 h-5 text-gold-400" />
                    </div>
                    <h3 className="text-white font-semibold mb-2">{f.title}</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">{f.description}</p>
                  </GlassCard>
                </AnimatedSection>
              );
            })}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 pb-32">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <AnimatedSection>
            <h2 className="font-serif text-4xl font-bold text-white mb-12">How it works</h2>
            <div className="space-y-5">
              {steps.map((step, i) => (
                <div key={step} className="flex items-start gap-4 text-left glass rounded-xl p-5 border border-white/6">
                  <div className="w-7 h-7 rounded-full bg-gold-400/15 text-gold-400 font-bold text-sm flex items-center justify-center shrink-0">
                    {i + 1}
                  </div>
                  <p className="text-slate-300 text-sm pt-0.5">{step}</p>
                </div>
              ))}
            </div>
            <div className="mt-12">
              <Button href="/onboard/goal" size="lg">
                Launch Career Compass <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </AnimatedSection>
        </div>
      </section>
    </div>
  );
}
