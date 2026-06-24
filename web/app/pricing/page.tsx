import type { Metadata } from 'next';
import { FloatingOrbs } from '@/components/background/FloatingOrbs';
import { AnimatedSection } from '@/components/ui/AnimatedSection';
import { GlassCard } from '@/components/ui/GlassCard';
import { CheckCircle2 } from 'lucide-react';

export const metadata: Metadata = { title: 'Pricing' };

const plans = [
  {
    name: 'Starter',
    badge: null,
    description: 'For students exploring their options and getting oriented.',
    features: [
      'Career stage assessment',
      'Basic profile scoring',
      'Recruiting timeline overview',
      'Access to resource library',
    ],
    cta: 'Join Waitlist',
    gold: false,
  },
  {
    name: 'Pro',
    badge: 'Most Popular',
    description: 'For serious candidates actively preparing for IB recruiting.',
    features: [
      'Full Career Compass access',
      'Professional path matching (K-NN)',
      'Personalised gap analysis',
      'Prioritised action plan',
      'AI-generated coaching report',
      'Recruiting deadline tracker',
    ],
    cta: 'Join Waitlist',
    gold: true,
  },
  {
    name: 'Elite',
    badge: null,
    description: 'For candidates who want every possible edge.',
    features: [
      'Everything in Pro',
      'Weekly updated action plans',
      'Deal knowledge tracker',
      'Application pipeline management',
      'Priority support',
      'Early access to new tools',
    ],
    cta: 'Join Waitlist',
    gold: false,
  },
];

export default function PricingPage() {
  return (
    <div className="relative">
      <section className="relative pt-36 pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-navy-900 to-navy-950" />
        <FloatingOrbs />
        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
          <AnimatedSection>
            <div className="text-xs font-semibold uppercase tracking-widest text-gold-400 mb-4">
              Pricing
            </div>
            <h1 className="font-serif text-5xl sm:text-6xl font-bold text-white mb-6">
              Simple, <span className="text-gold-gradient">Transparent Plans</span>
            </h1>
            <p className="text-slate-400 text-xl">
              TrajectoryOS is launching soon. Join the waitlist to get early access and founding
              member pricing.
            </p>
          </AnimatedSection>
        </div>
      </section>

      <section className="py-20 pb-32">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            {plans.map((plan, i) => (
              <AnimatedSection key={plan.name} delay={i * 0.1}>
                <div
                  className={`relative rounded-2xl p-7 flex flex-col h-full transition-all ${
                    plan.gold
                      ? 'glass border border-gold-400/30 shadow-[0_0_60px_rgba(212,175,55,0.1)] scale-105'
                      : 'glass border border-white/8'
                  }`}
                >
                  {plan.badge && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 bg-gold-400 text-navy-950 text-xs font-bold rounded-full uppercase tracking-widest">
                      {plan.badge}
                    </div>
                  )}

                  <div className="mb-6">
                    <div className="font-serif text-2xl font-bold text-white mb-1">{plan.name}</div>
                    <div className="text-slate-400 text-sm">{plan.description}</div>
                  </div>

                  <div className="mb-6">
                    <div className="text-3xl font-serif font-bold text-white">Coming Soon</div>
                    <div className="text-slate-500 text-sm mt-1">Pricing announced at launch</div>
                  </div>

                  <ul className="space-y-3 mb-8 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-sm">
                        <CheckCircle2
                          className={`w-4 h-4 shrink-0 mt-0.5 ${
                            plan.gold ? 'text-gold-400' : 'text-slate-400'
                          }`}
                        />
                        <span className="text-slate-300">{f}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    className={`w-full py-3 rounded-xl text-sm font-semibold transition-all ${
                      plan.gold
                        ? 'bg-gold-400 text-navy-950 hover:bg-gold-300 shadow-[0_0_24px_rgba(212,175,55,0.3)]'
                        : 'border border-white/15 text-white hover:border-white/30'
                    }`}
                  >
                    {plan.cta}
                  </button>
                </div>
              </AnimatedSection>
            ))}
          </div>

          <AnimatedSection className="text-center mt-14" delay={0.3}>
            <p className="text-slate-500 text-sm">
              All plans include a free trial period. No credit card required to join the waitlist.
            </p>
          </AnimatedSection>
        </div>
      </section>
    </div>
  );
}
