import type { Metadata } from 'next';
import { FloatingOrbs } from '@/components/background/FloatingOrbs';
import { AnimatedSection } from '@/components/ui/AnimatedSection';
import { Button } from '@/components/ui/Button';
import { Calculator, ArrowRight } from 'lucide-react';

export const metadata: Metadata = { title: 'Career Calculator' };

export default function CareerCalculatorPage() {
  return (
    <div className="relative">
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
        <div className="absolute inset-0 bg-gradient-to-b from-navy-900 to-navy-950" />
        <FloatingOrbs />
        <div className="relative z-10 max-w-2xl mx-auto px-6 text-center">
          <AnimatedSection>
            <div className="w-20 h-20 rounded-2xl bg-gold-400/10 border border-gold-400/20 flex items-center justify-center mx-auto mb-8">
              <Calculator className="w-9 h-9 text-gold-400" />
            </div>
            <div className="text-xs font-semibold uppercase tracking-widest text-gold-400 mb-4">
              Coming Soon
            </div>
            <h1 className="font-serif text-5xl sm:text-6xl font-bold text-white mb-6">
              Career <span className="text-gold-gradient">Calculator</span>
            </h1>
            <p className="text-slate-400 text-xl leading-relaxed mb-10">
              The Career Calculator will help you quantify your readiness for investment banking,
              assess your competitive positioning, and identify the highest-leverage moves to
              improve your chances.
            </p>
            <div className="glass rounded-2xl border border-gold-400/15 p-8 mb-10">
              <div className="text-white font-semibold mb-2">This tool is in development</div>
              <p className="text-slate-400 text-sm leading-relaxed">
                In the meantime, use Career Compass — our flagship tool — to get a complete
                analysis of your IB readiness including stage classification, professional path
                matching, and a personalised action plan.
              </p>
            </div>
            <Button href="/tools/career-compass" size="lg">
              Try Career Compass Instead <ArrowRight className="w-4 h-4" />
            </Button>
          </AnimatedSection>
        </div>
      </section>
    </div>
  );
}
