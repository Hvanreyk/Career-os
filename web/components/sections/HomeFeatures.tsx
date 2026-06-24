import { AnimatedSection } from '@/components/ui/AnimatedSection';
import { GlassCard } from '@/components/ui/GlassCard';
import { Route, BookOpen, Users, Mic, Briefcase } from 'lucide-react';

const features = [
  {
    icon: Route,
    title: 'Clarify your career path',
    description:
      'Understand exactly where you stand in the recruiting timeline and what moves matter most at your stage.',
  },
  {
    icon: BookOpen,
    title: 'Prepare for technical interviews',
    description:
      'Build deep technical fluency in valuation, LBO modelling, and deal mechanics — the skills that separate candidates.',
  },
  {
    icon: Users,
    title: 'Improve your networking strategy',
    description:
      'Learn how to approach bankers, build genuine relationships, and convert conversations into opportunities.',
  },
  {
    icon: Briefcase,
    title: 'Build a stronger finance profile',
    description:
      'Identify the gaps in your experience and signal strength, then close them with targeted, high-impact actions.',
  },
  {
    icon: Mic,
    title: 'Track applications',
    description:
      'Stay organised across firms and rounds so nothing slips through when recruiting moves fast.',
  },
];

export function HomeFeatures() {
  return (
    <section className="py-28 relative">
      <div className="max-w-7xl mx-auto px-6">
        <AnimatedSection className="text-center mb-16">
          <div className="text-xs font-semibold uppercase tracking-widest text-gold-400 mb-4">
            What we help you do
          </div>
          <h2 className="font-serif text-4xl sm:text-5xl font-bold text-white mb-5">
            Built for Students Targeting{' '}
            <span className="text-gold-gradient">Investment Banking</span>
          </h2>
          <p className="text-slate-400 max-w-xl mx-auto text-lg">
            Everything in TrajectoryOS is designed around one goal: helping you land a role in
            high finance.
          </p>
        </AnimatedSection>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <AnimatedSection key={f.title} delay={i * 0.08}>
                <GlassCard className="h-full">
                  <div className="w-10 h-10 rounded-xl bg-gold-400/10 flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5 text-gold-400" />
                  </div>
                  <h3 className="text-white font-semibold text-base mb-2">{f.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{f.description}</p>
                </GlassCard>
              </AnimatedSection>
            );
          })}
        </div>
      </div>
    </section>
  );
}
