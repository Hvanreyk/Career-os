import type { Metadata } from 'next';
import { AnimatedSection } from '@/components/ui/AnimatedSection';

export const metadata: Metadata = { title: 'Terms of Use' };

const sections = [
  {
    title: 'Acceptance of Terms',
    body: 'By accessing or using TrajectoryOS, you agree to be bound by these Terms of Use. If you do not agree to these terms, please do not use the platform. We reserve the right to update these terms at any time, and continued use of the platform constitutes acceptance of any changes.',
  },
  {
    title: 'Use of the Website',
    body: 'You may use TrajectoryOS for personal, non-commercial purposes related to your career development. You agree not to misuse the platform, attempt to gain unauthorised access, or use the service in any way that could damage or impair its operation. Accounts are for individual use only and must not be shared.',
  },
  {
    title: 'Educational Information Only',
    body: 'The content provided by TrajectoryOS — including career stage assessments, profile matches, action plans, and coaching reports — is intended for educational and informational purposes only. It does not constitute professional career advice, financial advice, or a guarantee of any employment outcome. Results will vary based on individual circumstances.',
  },
  {
    title: 'User Responsibilities',
    body: 'You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. You agree to provide accurate information when using the platform. Misrepresenting your profile data will affect the quality of your results and may violate these terms.',
  },
  {
    title: 'Limitation of Liability',
    body: 'To the maximum extent permitted by law, TrajectoryOS and its founders shall not be liable for any indirect, incidental, or consequential damages arising from your use of the platform, including but not limited to employment outcomes, decisions made based on platform output, or loss of data.',
  },
  {
    title: 'Changes to Terms',
    body: 'We may update these Terms of Use from time to time. We will notify registered users of material changes via email. Your continued use of the platform following notification of changes constitutes your acceptance of the revised terms.',
  },
  {
    title: 'Contact',
    body: 'If you have questions about these Terms of Use, please contact us at hello@trajectoryos.com.',
  },
];

export default function TermsPage() {
  return (
    <div className="relative max-w-3xl mx-auto px-6 pt-36 pb-32">
      <AnimatedSection>
        <div className="mb-12">
          <div className="text-xs font-semibold uppercase tracking-widest text-gold-400 mb-4">
            Legal
          </div>
          <h1 className="font-serif text-4xl sm:text-5xl font-bold text-white mb-4">
            Terms of Use
          </h1>
          <p className="text-slate-500 text-sm">
            Last updated: {new Date().toLocaleDateString('en-AU', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
          <div className="mt-4 p-4 glass rounded-xl border border-gold-400/15 text-sm text-gold-300">
            ⚠️ This is placeholder legal content for development purposes only. These terms should be reviewed and replaced by a qualified legal professional before public launch.
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
