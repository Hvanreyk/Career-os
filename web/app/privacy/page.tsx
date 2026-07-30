import type { Metadata } from 'next';
import { LegalPage } from '@/components/ui/LegalPage';

export const metadata: Metadata = { title: 'Privacy Policy' };

const sections = [
  {
    title: 'Information We Collect',
    body: 'We collect information you provide directly when you create an account, complete your student profile, or contact us. This includes your name, email address, university, degree details, and career history as entered into the platform. We also collect usage data such as pages visited, features used, and session duration to improve our product.',
  },
  {
    title: 'How We Use Information',
    body: 'We use your information to provide, personalise, and improve the MappedLabs platform — including generating your career stage classification, profile match, and action plan. We do not sell your personal information to third parties. We may use anonymised, aggregated data to improve our matching algorithms and product features.',
  },
  {
    title: 'Cookies and Analytics',
    body: 'MappedLabs uses cookies to maintain your session and remember your preferences. We use analytics tools to understand how users interact with our platform. You can control cookie preferences through your browser settings, though disabling certain cookies may affect platform functionality.',
  },
  {
    title: 'Data Security',
    body: 'We take the security of your personal data seriously. All data is transmitted over HTTPS and stored with industry-standard encryption. Access to personal data is restricted to authorised team members who require it to operate and improve the platform.',
  },
  {
    title: 'Third-Party Services',
    body: 'MappedLabs integrates with third-party services including Supabase for database and authentication, OpenAI for features you deliberately ask to generate, and payment processors. In the AI Resume Workshop, the resume bullet you select is sent to OpenAI only when you request critique. Unsaved critique is not retained in the MappedLabs database. These services have their own privacy policies and data practices, and we share only the data needed for the requested feature to function.',
  },
  {
    title: 'Resume Workshop Data',
    body: 'Your master resume, sections, bullets and explicitly saved AI-assisted revisions remain private to your account. Product analytics record feature names and counts, not resume or critique text. You can delete all content-bearing workshop data from the workshop at any time. A text-free daily usage counter may remain briefly to enforce the daily AI critique limit.',
  },
  {
    title: 'Contact Us',
    body: 'If you have questions about this Privacy Policy or how we handle your data, please contact us at hello@trajectoryos.com. You have the right to access, correct, or request deletion of your personal information at any time.',
  },
];

// Bump this when the text below actually changes.
const LAST_UPDATED = '2026-07-30';

const NOTICE =
  'This is placeholder legal content for development purposes only. This policy should be reviewed and replaced by a qualified legal professional before public launch.';

export default function PrivacyPage() {
  return <LegalPage title="Privacy Policy" notice={NOTICE} sections={sections} updated={LAST_UPDATED} />;
}
