import { AnimatedSection } from '@/components/ui/AnimatedSection';
import { Button } from '@/components/ui/Button';
import { ArrowRight, CheckCircle2 } from 'lucide-react';

const capabilities = [
  'Understand where you sit in the IB recruiting pipeline',
  'Receive a personalised match against real career paths',
  'Identify profile gaps with ranked, actionable fixes',
  'Get a structured plan prioritised by recruiting deadlines',
  'Track your readiness as you build experience',
];

export function FeaturedTool() {
  return (
    <section className="py-28 relative overflow-hidden">
      {/* Background accent */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 60% 40% at 50% 50%, rgba(212,175,55,0.04) 0%, transparent 70%)',
        }}
      />

      <div className="max-w-7xl mx-auto px-6">
        <div className="section-divider mb-28" />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left — copy */}
          <AnimatedSection direction="right">
            <div className="text-xs font-semibold uppercase tracking-widest text-gold-400 mb-4">
              Featured Tool
            </div>
            <h2 className="font-serif text-4xl sm:text-5xl font-bold text-white mb-6 leading-tight">
              Career Compass
            </h2>
            <p className="text-slate-400 text-lg leading-relaxed mb-8">
              Career Compass gives students a structured view of where they are, where they need
              to go, and what steps matter most for breaking into investment banking.
            </p>
            <ul className="space-y-3 mb-10">
              {capabilities.map((cap) => (
                <li key={cap} className="flex items-start gap-3 text-slate-300 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-gold-400 mt-0.5 shrink-0" />
                  {cap}
                </li>
              ))}
            </ul>
            <Button href="/tools/career-compass" size="lg">
              Open Career Compass <ArrowRight className="w-4 h-4" />
            </Button>
          </AnimatedSection>

          {/* Right — mock UI */}
          <AnimatedSection direction="left" delay={0.15}>
            <div className="glass-card rounded-2xl border border-gold-400/15 overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.5)]">
              {/* Header bar */}
              <div className="px-5 py-4 border-b border-white/6 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/60" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/60" />
                </div>
                <div className="text-xs text-slate-500 font-medium">Career Compass — Dashboard</div>
                <div className="w-16" />
              </div>

              <div className="p-6 space-y-4">
                {/* Stage badge */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-slate-500 mb-0.5">Current Stage</div>
                    <div className="text-white font-semibold">S1 — Building</div>
                  </div>
                  <div className="px-3 py-1.5 rounded-full glass border border-gold-400/20 text-gold-400 text-xs font-semibold">
                    Strong Fit
                  </div>
                </div>

                {/* Progress bars */}
                {[
                  { label: 'Profile Strength', pct: 82, color: 'from-gold-500 to-gold-300' },
                  { label: 'Interview Readiness', pct: 55, color: 'from-blue-600 to-blue-400' },
                  { label: 'Network Coverage', pct: 40, color: 'from-purple-600 to-purple-400' },
                ].map(({ label, pct, color }) => (
                  <div key={label}>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-slate-400">{label}</span>
                      <span className="text-slate-300">{pct}%</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-navy-800">
                      <div
                        className={`h-full rounded-full bg-gradient-to-r ${color}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                ))}

                {/* Action card */}
                <div className="glass rounded-xl p-4 border border-white/6 mt-2">
                  <div className="text-[10px] text-gold-400 uppercase tracking-widest mb-1.5 font-semibold">
                    Priority Action
                  </div>
                  <div className="text-sm text-white font-medium">
                    Secure penultimate summer at a BB
                  </div>
                  <div className="text-xs text-slate-400 mt-1">Deadline: Aug 2027 · High effort</div>
                </div>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </div>
    </section>
  );
}
