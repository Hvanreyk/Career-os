import type { Metadata } from 'next';
import { LegalPage } from '@/components/ui/LegalPage';

export const metadata: Metadata = { title: 'Terms of Use' };

const sections = [
  {
    title: 'Acceptance of Terms',
    body: 'By accessing or using MappedLabs, you agree to be bound by these Terms of Use. If you do not agree to these terms, please do not use the platform. We reserve the right to update these terms at any time, and continued use of the platform constitutes acceptance of any changes.',
  },
  {
    title: 'Use of the Website',
    body: 'You may use MappedLabs for personal, non-commercial purposes related to your career development. You agree not to misuse the platform, attempt to gain unauthorised access, or use the service in any way that could damage or impair its operation. Accounts are for individual use only and must not be shared.',
  },
  {
    title: 'Educational Information Only',
    body: 'The content provided by MappedLabs — including career stage assessments, profile matches, action plans, and coaching reports — is intended for educational and informational purposes only. It does not constitute professional career advice, financial advice, or a guarantee of any employment outcome. Results will vary based on individual circumstances.',
  },
  {
    title: 'User Responsibilities',
    body: 'You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. You agree to provide accurate information when using the platform. Misrepresenting your profile data will affect the quality of your results and may violate these terms.',
  },
  {
    title: 'Limitation of Liability',
    body: 'To the maximum extent permitted by law, MappedLabs and its founders shall not be liable for any indirect, incidental, or consequential damages arising from your use of the platform, including but not limited to employment outcomes, decisions made based on platform output, or loss of data.',
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

// Bump this when the text below actually changes.
const LAST_UPDATED = '2026-07-30';

const NOTICE =
  'This is placeholder legal content for development purposes only. These terms should be reviewed and replaced by a qualified legal professional before public launch.';

export default function TermsPage() {
  return <LegalPage title="Terms of Use" notice={NOTICE} sections={sections} updated={LAST_UPDATED} />;
}
