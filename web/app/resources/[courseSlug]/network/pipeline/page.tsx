import type { Metadata } from 'next';
import { PipelineView } from '@/components/networking/PipelineView';
import { buildPlanInputs, loadWorkspaceData } from '@/lib/networking/queries';

export const metadata: Metadata = { title: 'Networking — Pipeline' };
export const dynamic = 'force-dynamic';

/**
 * Renders the networking pipeline page for a course.
 *
 * @param params - Route parameters containing the course slug
 * @returns The networking pipeline view populated with workspace contacts and follow-ups
 */
export default async function NetworkPipelinePage({ params }: { params: Promise<{ courseSlug: string }> }) {
  const { courseSlug } = await params;
  const data = await loadWorkspaceData();
  const inputs = buildPlanInputs(data, new Date().toISOString());
  return (
    <PipelineView
      base={`/resources/${courseSlug}/network`}
      contacts={data.contacts}
      planContacts={inputs.contacts}
      followUps={data.followUps}
    />
  );
}
