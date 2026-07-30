import Link from 'next/link';
import { notFound } from 'next/navigation';
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
    <div className="mx-auto w-full max-w-[90rem] px-5 py-10 sm:px-8 sm:py-12">
      <Link
        href={`/resources/${courseSlug}`}
        className="ml-btn ml-btn-text -ml-0.5 mb-4 inline-flex min-h-[44px] text-[14px]"
      >
        <span aria-hidden="true">\u25c2</span> {course.title}
      </Link>

      <header className="border-b border-rule pb-6">
        <span className="ml-label">Private workspace</span>
        <h1 className="ml-title mt-2.5 text-bone">Networking workspace</h1>
        <p className="mt-4 max-w-[68ch] text-[16px] leading-[1.65] text-graphite">
          Build real relationships at your target firms: a contact pipeline, a weekly plan driven by
          the AU recruiting calendar, and truthful outreach reviewed before it is sent.
        </p>
      </header>

      <div className="mt-6">
        <NetworkNav base={base} />
      </div>
      {children}
    </div>
  );
}
