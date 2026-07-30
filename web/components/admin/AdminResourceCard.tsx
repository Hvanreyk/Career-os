'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ResourceDefinition } from '@/lib/resources/catalog';
import { submitAdminContent } from '@/lib/admin/client';
import { Panel } from '@/components/ui/Panel';
import { StatusLabel } from '@/components/ui/Status';

interface Props {
  resource: ResourceDefinition;
  course: {
    id: string;
    status: 'draft' | 'published';
    editorial_source: 'file' | 'admin';
    editorial_revision: number;
    updated_at: string;
  } | null;
}

export function AdminResourceCard({ resource, course }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function initialize() {
    setBusy(true);
    setError(null);
    try {
      await submitAdminContent({
        action: 'initialize_course',
        resourceSlug: resource.slug,
      });
      router.push(`/admin/resources/${resource.slug}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not initialise resource');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel className="flex flex-col">
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-3">
          <span className="ml-label">{resource.slug}</span>
          <StatusLabel
            tone={course?.status === 'published' ? 'ok' : course ? 'warn' : 'neutral'}
            className="shrink-0"
          >
            {course?.status ?? 'not initialised'}
          </StatusLabel>
        </div>
        <h2 className="mt-3 text-[17px] font-bold uppercase tracking-[-0.015em] text-bone">
          {resource.title}
        </h2>
        <p className="mt-2 flex-1 text-[15px] leading-[1.6] text-graphite">
          {resource.description}
        </p>
        {course && (
          <p className="ml-num mt-4 text-[12px] text-graphite">
            {course.editorial_source} source · revision {course.editorial_revision}
          </p>
        )}
      </div>
      <div className="border-t border-rule px-5 py-2">
        {course ? (
          <button
            type="button"
            onClick={() => router.push(`/admin/resources/${resource.slug}`)}
            className="ml-btn ml-btn-text min-h-[44px] text-[14px]"
          >
            Manage content <span aria-hidden="true">▸</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void initialize()}
            disabled={busy}
            className="ml-btn ml-btn-text min-h-[44px] text-[14px]"
          >
            {busy ? 'Creating…' : 'Create draft course'}
          </button>
        )}
        {error && (
          <p role="alert" className="pb-2 text-[13px] leading-snug text-red">
            <span aria-hidden="true">▲ </span>
            {error}
          </p>
        )}
      </div>
    </Panel>
  );
}
