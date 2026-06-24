import type { Metadata } from 'next';
import { FloatingOrbs } from '@/components/background/FloatingOrbs';
import { AnimatedSection } from '@/components/ui/AnimatedSection';
import { ContactForm } from '@/components/ui/ContactForm';
import { Mail, MapPin } from 'lucide-react';

export const metadata: Metadata = { title: 'Contact' };

const details = [
  { icon: Mail, label: 'Email', value: 'hello@trajectoryos.com' },
  { icon: MapPin, label: 'Location', value: 'Sydney, Australia' },
];

export default function ContactPage() {
  return (
    <div className="relative">
      <section className="relative pt-36 pb-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-navy-900 to-navy-950" />
        <FloatingOrbs />
        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
          <AnimatedSection>
            <div className="text-xs font-semibold uppercase tracking-widest text-gold-400 mb-4">
              Get in touch
            </div>
            <h1 className="font-serif text-5xl sm:text-6xl font-bold text-white mb-6">
              Let&apos;s <span className="text-gold-gradient">Talk</span>
            </h1>
            <p className="text-slate-400 text-xl max-w-xl mx-auto">
              Have a question, partnership idea, or want to learn more about TrajectoryOS? Get in
              touch with our team.
            </p>
          </AnimatedSection>
        </div>
      </section>

      <section className="py-20 pb-32">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
            {/* Info */}
            <AnimatedSection direction="right" className="lg:col-span-2">
              <div className="space-y-5">
                {details.map(({ icon: Icon, label, value }) => (
                  <div
                    key={label}
                    className="glass rounded-xl p-5 border border-white/8 flex items-center gap-4"
                  >
                    <div className="w-10 h-10 rounded-xl bg-gold-400/10 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-gold-400" />
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">
                        {label}
                      </div>
                      <div className="text-white text-sm font-medium">{value}</div>
                    </div>
                  </div>
                ))}

                <div className="glass rounded-xl p-5 border border-gold-400/15">
                  <div className="text-gold-400 font-semibold text-sm mb-1">Response time</div>
                  <div className="text-slate-400 text-sm">
                    We typically respond within 1–2 business days.
                  </div>
                </div>
              </div>
            </AnimatedSection>

            {/* Form */}
            <AnimatedSection direction="left" delay={0.1} className="lg:col-span-3">
              <ContactForm />
            </AnimatedSection>
          </div>
        </div>
      </section>
    </div>
  );
}
