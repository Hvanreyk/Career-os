import type { Metadata } from 'next';
import { FloatingOrbs } from '@/components/background/FloatingOrbs';
import { AnimatedSection } from '@/components/ui/AnimatedSection';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/Button';
import { ArrowRight, Target, Lightbulb, Users, Eye } from 'lucide-react';

export const metadata: Metadata = { title: 'About Us' };

const pillars = [
  {
    icon: Target,
    title: 'Our Mission',
    body: 'To give every ambitious finance student access to the same quality of guidance that was previously only available through elite networks, expensive coaching, or sheer luck of connection.',
  },
  {
    icon: Lightbulb,
    title: 'Why We Built TrajectoryOS',
    body: 'We watched talented students miss out on investment banking roles — not because they lacked ability, but because they lacked structure. They applied too late, prepared for the wrong things, or had no way to benchmark themselves against people who made it. We built the tool we wish we had.',
  },
  {
    icon: Users,
    title: 'Built by Students, For Students',
    body: 'TrajectoryOS was built by two young entrepreneurs who navigated the same recruiting gauntlet. We understand the anxiety of unsure timelines, the frustration of vague advice, and the pressure of competing against candidates who seem to know things you don\'t. That lived experience shapes everything we build.',
  },
  {
    icon: Eye,
    title: 'Our Vision',
    body: 'A world where where you go to school or who you know no longer determines whether you get a shot at high finance. Where every student with the drive to compete has the tools to do it intelligently.',
  },
];

export default function AboutPage() {
  return (
    <div className="relative">
      {/* Hero */}
      <section className="relative pt-36 pb-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-navy-900 to-navy-950" />
        <FloatingOrbs />
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <AnimatedSection>
            <div className="text-xs font-semibold uppercase tracking-widest text-gold-400 mb-4">
              Our story
            </div>
            <h1 className="font-serif text-5xl sm:text-6xl font-bold text-white mb-6 leading-tight">
              Built With Purpose,{' '}
              <span className="text-gold-gradient">Designed for Edge.</span>
            </h1>
            <p className="text-slate-400 text-xl leading-relaxed max-w-2xl mx-auto">
              TrajectoryOS was founded by two young entrepreneurs who saw how difficult it can be
              for students to break into investment banking without the right guidance, structure,
              or network. We built TrajectoryOS to give ambitious students a clearer system for
              preparing, improving, and positioning themselves for high-finance careers.
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* Pillars */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {pillars.map((p, i) => {
              const Icon = p.icon;
              return (
                <AnimatedSection key={p.title} delay={i * 0.1}>
                  <GlassCard className="h-full">
                    <div className="w-11 h-11 rounded-xl bg-gold-400/10 flex items-center justify-center mb-5">
                      <Icon className="w-5 h-5 text-gold-400" />
                    </div>
                    <h2 className="font-serif text-2xl font-bold text-white mb-3">{p.title}</h2>
                    <p className="text-slate-400 leading-relaxed">{p.body}</p>
                  </GlassCard>
                </AnimatedSection>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 text-center">
        <AnimatedSection>
          <div className="max-w-2xl mx-auto px-6">
            <h2 className="font-serif text-3xl sm:text-4xl font-bold text-white mb-4">
              Ready to build your trajectory?
            </h2>
            <p className="text-slate-400 mb-8">
              Use Career Compass to understand exactly where you stand and what to do next.
            </p>
            <Button href="/tools/career-compass" size="lg">
              Get Started <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </AnimatedSection>
      </section>
    </div>
  );
}
