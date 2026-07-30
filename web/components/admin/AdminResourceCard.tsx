'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Loader2, Plus } from 'lucide-react';
import { CourseIcon } from '@/components/courses/icons';
import type { ResourceDefinition } from '@/lib/resources/catalog';
import { submitAdminContent } from '@/lib/admin/client';

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
    <div className="glass rounded-2xl border border-white/8 p-6 flex flex-col">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="w-11 h-11 rounded-xl bg-gold-400/10 flex items-center justify-center">
          <CourseIcon name={resource.icon} className="w-5 h-5 text-gold-400" />
        </div>
        <span
          className={`text-xs px-2.5 py-1 rounded-full border ${
            course?.status === 'published'
              ? 'border-emerald-400/25 bg-emerald-400/10 text-emerald-300'
              : course
                ? 'border-amber-400/25 bg-amber-400/10 text-amber-300'
                : 'border-white/10 text-slate-500'
          }`}
        >
          {course?.status ?? 'not initialised'}
        </span>
      </div>
      <h2 className="text-white font-semibold text-lg mb-2">{resource.title}</h2>
      <p className="text-slate-400 text-sm leading-relaxed flex-1">{resource.description}</p>
      {course && (
        <p className="text-xs text-slate-600 mt-4">
          {course.editorial_source} source · revision {course.editorial_revision}
        </p>
      )}
      <div className="mt-5 pt-4 border-t border-white/8">
        {course ? (
          <button
            type="button"
            onClick={() => router.push(`/admin/resources/${resource.slug}`)}
            className="text-sm text-gold-400 hover:text-gold-300 flex items-center gap-2"
          >
            Manage content <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void initialize()}
            disabled={busy}
            className="text-sm text-gold-400 hover:text-gold-300 flex items-center gap-2 disabled:opacity-50"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Create draft course
          </button>
        )}
        {error && <p className="text-red-400 text-xs mt-3">{error}</p>}
      </div>
    </div>
  );
}
