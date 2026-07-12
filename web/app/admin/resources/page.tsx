import Link from 'next/link';
import type { Metadata } from 'next';
import { Activity, ArrowLeft, ShieldCheck } from 'lucide-react';
import { AdminResourceCard } from '@/components/admin/AdminResourceCard';
import { requireAdmin } from '@/lib/auth';
import { RESOURCE_CATALOG } from '@/lib/resources/catalog';
import { createServiceClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Resource Admin' };
export const dynamic = 'force-dynamic';

interface CourseSummary {
  id: string;
  slug: string;
  status: 'draft' | 'published';
  editorial_source: 'file' | 'admin';
  editorial_revision: number;
  updated_at: string;
}

export default async function AdminResourcesPage() {
  await requireAdmin('/admin/resources');
  const service = createServiceClient();
  const [{ data: courseRows, error: courseError }, { count: eventCount }] = await Promise.all([
    service
      .from('courses')
      .select('id, slug, status, editorial_source, editorial_revision, updated_at'),
    service
      .from('product_events')
      .select('id', { count: 'exact', head: true }),
  ]);
  if (courseError) throw new Error(`Could not load admin courses: ${courseError.message}`);
  const courses = new Map(
    ((courseRows ?? []) as CourseSummary[]).map((course) => [course.slug, course]),
  );

  return (
    <div className="min-h-screen bg-navy-950 px-6 pt-28 pb-24">
      <div className="max-w-7xl mx-auto">
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-300 text-sm mb-6">
          <ArrowLeft className="w-4 h-4" /> Dashboard
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-6 mb-10">
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest text-gold-400 mb-3 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" /> Admin only
            </div>
            <h1 className="font-serif text-4xl font-bold text-white">Resource content</h1>
            <p className="text-slate-400 mt-3 max-w-2xl">
              Create draft learning content, edit lessons and quizzes, review changes, and publish each resource deliberately.
            </p>
          </div>
          <div className="glass rounded-xl border border-white/8 px-5 py-3 flex items-center gap-3">
            <Activity className="w-5 h-5 text-gold-400" />
            <div><div className="text-white font-semibold">{eventCount ?? 0}</div><div className="text-xs text-slate-500">product events</div></div>
          </div>
        </div>
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
          {RESOURCE_CATALOG.map((resource) => (
            <AdminResourceCard key={resource.slug} resource={resource} course={courses.get(resource.slug) ?? null} />
          ))}
        </div>
      </div>
    </div>
  );
}
