import { AnimatedSection } from '@/components/ui/AnimatedSection';
import { Button } from '@/components/ui/Button';
import { ArrowRight } from 'lucide-react';

export function HomeCTA() {
  return (
    <section className="py-28 relative overflow-hidden">
      {/* Gold glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 70% 50% at 50% 50%, rgba(212,175,55,0.06) 0%, transparent 70%)',
        }}
      />

      <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
        <div className="section-divider mb-28" />

        <AnimatedSection>
          <div className="text-xs font-semibold uppercase tracking-widest text-gold-400 mb-6">
            Start today
          </div>
          <h2 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
            Start building your{' '}
            <span className="text-gold-gradient">trajectory today.</span>
          </h2>
          <p className="text-slate-400 text-lg mb-10 max-w-xl mx-auto">
            Join ambitious finance students using TrajectoryOS to structure their IB preparation
            and move with clarity.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Button href="/tools/career-compass" size="lg">
              Explore Career Compass <ArrowRight className="w-4 h-4" />
            </Button>
            <Button href="/pricing" variant="secondary" size="lg">
              View Pricing
            </Button>
          </div>
        </AnimatedSection>
      </div>
    </section>
  );
}
