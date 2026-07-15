import type { Metadata } from 'next';
import { ContactsView } from '@/components/networking/ContactsView';
import { loadWorkspaceData } from '@/lib/networking/queries';

export const metadata: Metadata = { title: 'Networking — Contacts' };
export const dynamic = 'force-dynamic';

/**
 * Renders the contacts directory for a course.
 *
 * @param params - Route parameters containing the course slug.
 * @returns The contacts directory populated with workspace networking data.
 */
export default async function NetworkContactsPage({ params }: { params: Promise<{ courseSlug: string }> }) {
  const { courseSlug } = await params;
  const data = await loadWorkspaceData();
  return (
    <ContactsView
      base={`/resources/${courseSlug}/network`}
      contacts={data.contacts}
      followUps={data.followUps}
      interactions={data.interactions}
      targets={data.targets}
      links={data.links}
    />
  );
}
