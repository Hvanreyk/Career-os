import type { Metadata } from 'next';
import { AnimatedSection } from '@/components/ui/AnimatedSection';

export const metadata: Metadata = { title: 'Privacy Policy' };

const sections = [
  {
    title: 'Information We Collect',
    body: 'We collect information you provide directly when you create an account, complete your student profile, or contact us. This includes your name, email address, university, degree details, and career history as entered into the platform. We also collect usage data such as pages visited, features used, and session duration to improve our product.',
  },
  {
    title: 'How We Use Information',
    body: 'We use your information to provide, personalise, and improve the TrajectoryOS platform — including generating your career stage classification, profile match, and action plan. We do not sell your personal information to third parties. We may use anonymised, aggregated data to improve our matching algorithms and product features.',
  },
  {
    title: 'Cookies and Analytics',
    body: 'TrajectoryOS uses cookies to maintain your session and remember your preferences. We use analytics tools to understand how users interact with our platform. You can control cookie preferences through your browser settings, though disabling certain cookies may affect platform functionality.',
  },
  {
    title: 'Data Security',
    body: 'We take the security of your personal data seriously. All data is transmitted over HTTPS and stored with industry-standard encryption. Access to personal data is restricted to authorised team members who require it to operate and improve the platform.',
  },
  {
    title: 'Third-Party Services',
    body: 'TrajectoryOS integrates with third-party services including Supabase (database and authentication) and payment processors. These services have their own privacy policies and data practices. We only share the data necessary for these services to function.',
  },
  {
    title: 'Contact Us',
    body: 'If you have questions about this Privacy Policy or how we handle your data, please contact us at hello@trajectoryos.com. You have the right to access, correct, or request deletion of your personal information at any time.',
  },
];

export default function PrivacyPage() {
  return (
    <div className="relative max-w-3xl mx-auto px-6 pt-36 pb-32">
      <AnimatedSection>
        <div className="mb-12">
          <div className="text-xs font-semibold uppercase tracking-widest text-gold-400 mb-4">
            Legal
          </div>
          <h1 className="font-serif text-4xl sm:text-5xl font-bold text-white mb-4">
            Privacy Policy
          </h1>
          <p className="text-slate-500 text-sm">
            Last updated: {new Date().toLocaleDateString('en-AU', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
          <div className="mt-4 p-4 glass rounded-xl border border-gold-400/15 text-sm text-gold-300">
            ⚠️ This is placeholder legal content for development purposes only. This policy should be reviewed and replaced by a qualified legal professional before public launch.
          </div>
        </div>

        <div className="space-y-10">
          {sections.map((s, i) => (
            <div key={s.title}>
              <h2 className="font-serif text-xl font-bold text-white mb-3">
                {i + 1}. {s.title}
              </h2>
              <p className="text-slate-400 leading-relaxed">{s.body}</p>
              <div className="section-divider mt-10" />
            </div>
          ))}
        </div>
      </AnimatedSection>
    </div>
  );
}
