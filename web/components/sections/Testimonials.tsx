import { AnimatedSection } from '@/components/ui/AnimatedSection';
import { GlassCard } from '@/components/ui/GlassCard';
import { Star } from 'lucide-react';

const testimonials = [
  {
    quote:
      "Career Compass showed me exactly where I was falling short. I fixed two things in my profile, applied to penultimate programs in July, and had an offer from Citi by October.",
    name: 'James L.',
    detail: 'Y3 · UNSW BCom Finance · Citi IB Summer Analyst',
  },
  {
    quote:
      "I had no idea what stage I was at or what to prioritise. TrajectoryOS gave me a real roadmap — not generic advice. The matched professional paths were genuinely insightful.",
    name: 'Priya S.',
    detail: 'Y2 · University of Sydney · Commerce/Law',
  },
  {
    quote:
      "The gap analysis called out exactly what I was missing: I hadn't done a modelling course or joined a finance society. Fixed both. I'm now much more confident going into recruiting.",
    name: 'Tom R.',
    detail: 'Y3 · Macquarie University · BCom Accounting & Finance',
  },
];

function Stars() {
  return (
    <div className="flex gap-1 mb-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className="w-3.5 h-3.5 fill-gold-400 text-gold-400" />
      ))}
    </div>
  );
}

export function Testimonials() {
  return (
    <section className="py-28">
      <div className="max-w-7xl mx-auto px-6">
        <div className="section-divider mb-28" />

        <AnimatedSection className="text-center mb-16">
          <div className="text-xs font-semibold uppercase tracking-widest text-gold-400 mb-4">
            Student stories
          </div>
          <h2 className="font-serif text-4xl sm:text-5xl font-bold text-white">
            From students who made it
          </h2>
        </AnimatedSection>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {testimonials.map((t, i) => (
            <AnimatedSection key={t.name} delay={i * 0.1}>
              <GlassCard className="h-full flex flex-col">
                <Stars />
                <p className="text-slate-300 text-sm leading-relaxed flex-1 italic mb-6">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div>
                  <div className="text-white font-semibold text-sm">{t.name}</div>
                  <div className="text-slate-500 text-xs mt-0.5">{t.detail}</div>
                </div>
              </GlassCard>
            </AnimatedSection>
          ))}
        </div>
      </div>
    </section>
  );
}
