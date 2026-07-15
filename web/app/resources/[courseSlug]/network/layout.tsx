import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { NetworkNav } from '@/components/networking/NetworkNav';
import { requireUser } from '@/lib/auth';
import { resourceHasCapability } from '@/lib/resources/catalog';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * Shared shell for the networking workspace: capability + login gate,
 * course header and tab navigation. The user-scoped courses read only
 * returns published courses, so a draft course 404s here just as it
 * does at the API layer.
 */
export default async function NetworkLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ courseSlug: string }>;
}) {
  const { courseSlug } = await params;
  if (!resourceHasCapability(courseSlug, 'contacts')) notFound();
  await requireUser(`/resources/${courseSlug}/network`);
  const supabase = await createClient();
  const { data: course } = await supabase
    .from('courses')
    .select('id, title')
    .eq('slug', courseSlug)
    .maybeSingle();
  if (!course) notFound();

  const base = `/resources/${courseSlug}/network`;
  return (
    <div className="min-h-screen bg-navy-950 px-6 pt-28 pb-24">
      <div className="max-w-7xl mx-auto">
        <Link
          href={`/resources/${courseSlug}`}
          className="inline-flex items-center gap-1.5 text-slate-500 hover:text-slate-300 text-sm mb-6"
        >
          <ChevronLeft className="w-4 h-4" /> {course.title}
        </Link>
        <div className="mb-6">
          <p className="text-xs font-semibold text-gold-400 uppercase tracking-widest mb-2">Private workspace</p>
          <h1 className="font-serif text-3xl md:text-4xl font-bold text-white mb-2">Networking workspace</h1>
          <p className="text-slate-400 text-sm leading-relaxed max-w-3xl">
            Build real relationships at your target firms: a contact pipeline, a weekly plan driven by the
            AU recruiting calendar, and truthful outreach reviewed before it is sent.
          </p>
        </div>
        <NetworkNav base={base} />
        {children}
      </div>
    </div>
  );
}
