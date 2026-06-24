import type { Metadata } from 'next';
import { FloatingOrbs } from '@/components/background/FloatingOrbs';
import { AnimatedSection } from '@/components/ui/AnimatedSection';
import { GlassCard } from '@/components/ui/GlassCard';
import { FileText, Mail, Mic, Users, Globe, PieChart, ArrowUpRight } from 'lucide-react';

export const metadata: Metadata = { title: 'Resources' };

const categories = [
  {
    icon: FileText,
    title: 'Investment Banking Guides',
    description:
      'Comprehensive guides covering IB recruiting timelines, how deals work, coverage groups, and what banks look for at each hiring stage.',
    count: 12,
    tag: 'Guides',
  },
  {
    icon: Mail,
    title: 'Resume & Cover Letter Tips',
    description:
      'Craft a finance resume that stands out. Learn what MDs and analysts actually look at, and how to present your experience with impact.',
    count: 8,
    tag: 'Templates',
  },
  {
    icon: Mic,
    title: 'Interview Preparation',
    description:
      'Technical and behavioural interview prep tailored to IB. Accounting walk-throughs, DCF practice, LBO questions, and fit interview frameworks.',
    count: 20,
    tag: 'Practice',
  },
  {
    icon: Users,
    title: 'Networking Strategy',
    description:
      'How to cold outreach bankers effectively, what to say in coffee chats, how to follow up, and how to convert conversations into referrals.',
    count: 6,
    tag: 'Strategy',
  },
  {
    icon: Globe,
    title: 'Market Awareness',
    description:
      'Stay up to date on M&A activity, capital markets trends, and deal flow. Build the commercial awareness interviewers expect.',
    count: 10,
    tag: 'Intel',
  },
  {
    icon: PieChart,
    title: 'Deal Breakdown Templates',
    description:
      'Structured frameworks for dissecting real transactions — the deal rationale, financing structure, valuation approach, and buyer logic.',
    count: 5,
    tag: 'Templates',
  },
];

export default function ResourcesPage() {
  return (
    <div className="relative">
      <section className="relative pt-36 pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-navy-900 to-navy-950" />
        <FloatingOrbs />
        <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
          <AnimatedSection>
            <div className="text-xs font-semibold uppercase tracking-widest text-gold-400 mb-4">
              Knowledge Base
            </div>
            <h1 className="font-serif text-5xl sm:text-6xl font-bold text-white mb-6">
              Resources to <span className="text-gold-gradient">Sharpen Your Edge</span>
            </h1>
            <p className="text-slate-400 text-xl max-w-xl mx-auto">
              Practical guides, templates, and frameworks built for students serious about
              breaking into investment banking.
            </p>
          </AnimatedSection>
        </div>
      </section>

      <section className="py-20 pb-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {categories.map((cat, i) => {
              const Icon = cat.icon;
              return (
                <AnimatedSection key={cat.title} delay={i * 0.08}>
                  <GlassCard className="h-full flex flex-col group cursor-pointer">
                    <div className="flex items-start justify-between mb-5">
                      <div className="w-11 h-11 rounded-xl bg-gold-400/10 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-gold-400" />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2.5 py-1 rounded-full glass border border-white/10 text-slate-400">
                          {cat.tag}
                        </span>
                        <ArrowUpRight className="w-4 h-4 text-slate-600 group-hover:text-gold-400 transition-colors" />
                      </div>
                    </div>
                    <h3 className="text-white font-semibold text-lg mb-2">{cat.title}</h3>
                    <p className="text-slate-400 text-sm leading-relaxed flex-1">{cat.description}</p>
                    <div className="mt-5 pt-4 border-t border-white/6 text-xs text-slate-500">
                      {cat.count} resources — Coming soon
                    </div>
                  </GlassCard>
                </AnimatedSection>
              );
            })}
          </div>

          <AnimatedSection className="text-center mt-16" delay={0.2}>
            <div className="glass inline-block rounded-2xl border border-gold-400/15 px-8 py-6 max-w-lg">
              <div className="text-gold-400 font-semibold mb-2">More resources coming soon</div>
              <p className="text-slate-400 text-sm">
                We&apos;re building out the full resource library. Join the waitlist to be notified when
                new content drops.
              </p>
            </div>
          </AnimatedSection>
        </div>
      </section>
    </div>
  );
}
