import Link from 'next/link';
import type { Metadata } from 'next';
import { AdminResourceCard } from '@/components/admin/AdminResourceCard';
import { PageHeader, PageShell } from '@/components/ui/PageHeader';
import { Panel, PanelHeader, Stat } from '@/components/ui/Panel';
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

interface EventRow {
  event_name: string;
  resource_slug: string | null;
  user_id: string | null;
  anonymous_id: string | null;
  occurred_at: string;
}

const FUNNEL_STAGES = [
  { label: 'Resource viewed', events: ['resource_viewed'] },
  { label: 'Lesson engaged', events: ['lesson_viewed', 'lesson_completed'] },
  { label: 'Workshop opened', events: ['resume_workshop_opened'] },
  { label: 'Critique completed', events: ['critique_completed'] },
  { label: 'Bullet revised', events: ['bullet_revised'] },
] as const;

/**
 * Selects a date string when it uses the `YYYY-MM-DD` format.
 *
 * @param value - The date string to validate.
 * @param fallback - The date string to use when `value` is missing or invalid.
 * @returns `value` when it matches the `YYYY-MM-DD` format, otherwise `fallback`.
 */
function safeDate(value: string | undefined, fallback: string): string {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : fallback;
}

/**
 * Displays the admin resource management page and resume activation funnel.
 *
 * @param searchParams - Optional date range used to filter funnel events.
 * @returns The rendered admin resources page.
 */
export default async function AdminResourcesPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  await requireAdmin('/admin/resources');
  const query = await searchParams;
  const today = new Date();
  const defaultTo = today.toISOString().slice(0, 10);
  const monthAgo = new Date(today);
  monthAgo.setUTCDate(monthAgo.getUTCDate() - 29);
  const from = safeDate(query.from, monthAgo.toISOString().slice(0, 10));
  const to = safeDate(query.to, defaultTo);
  const service = createServiceClient();
  const [{ data: courseRows, error: courseError }, { count: eventCount }, { data: funnelRows }] = await Promise.all([
    service
      .from('courses')
      .select('id, slug, status, editorial_source, editorial_revision, updated_at'),
    service
      .from('product_events')
      .select('id', { count: 'exact', head: true }),
    service
      .from('product_events')
      .select('event_name, resource_slug, user_id, anonymous_id, occurred_at')
      .eq('resource_slug', 'resume-cover-letter')
      .gte('occurred_at', `${from}T00:00:00.000Z`)
      .lt('occurred_at', `${to}T23:59:59.999Z`)
      .order('occurred_at', { ascending: false })
      .limit(50000),
  ]);
  if (courseError) throw new Error(`Could not load admin courses: ${courseError.message}`);
  const courses = new Map(
    ((courseRows ?? []) as CourseSummary[]).map((course) => [course.slug, course]),
  );
  const events = (funnelRows ?? []) as EventRow[];
  const funnel = FUNNEL_STAGES.map((stage) => {
    const matching = events.filter((event) => (stage.events as readonly string[]).includes(event.event_name));
    const identities = new Set(
      matching.flatMap((event) => event.user_id ? [`u:${event.user_id}`] : event.anonymous_id ? [`a:${event.anonymous_id}`] : []),
    );
    return { ...stage, total: matching.length, unique: identities.size };
  });

  return (
    <div className="min-h-screen bg-ink pt-16">
      <PageShell width="wide">
        <Link
          href="/dashboard"
          className="ml-label inline-flex min-h-[44px] items-center gap-2 hover:text-bone"
        >
          <span aria-hidden="true">◂</span> Dashboard
        </Link>
        <PageHeader
          label="Admin only"
          title="Resource content"
          lede="Create draft learning content, edit lessons and quizzes, review changes, and publish each resource deliberately."
          actions={<Stat label="Product events" value={eventCount ?? 0} />}
          className="mt-2"
        />

        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {RESOURCE_CATALOG.map((resource) => (
            <AdminResourceCard key={resource.slug} resource={resource} course={courses.get(resource.slug) ?? null} />
          ))}
        </div>

        <Panel className="mt-8">
          <PanelHeader title="Resume activation funnel" label="Operational counts" />
          <div className="flex flex-wrap items-end justify-between gap-4 border-b border-rule p-4 sm:p-5">
            <p className="max-w-[52ch] text-[15px] leading-snug text-graphite">
              Operational counts only; these figures do not imply causal conversion.
            </p>
            <form className="flex flex-wrap items-end gap-3" method="get">
              <div>
                <label htmlFor="funnel-from" className="block text-[13px] font-semibold text-bone">
                  From
                </label>
                <input
                  id="funnel-from"
                  type="date"
                  name="from"
                  defaultValue={from}
                  className="ml-field ml-num mt-2 w-auto [color-scheme:dark]"
                />
              </div>
              <div>
                <label htmlFor="funnel-to" className="block text-[13px] font-semibold text-bone">
                  To
                </label>
                <input
                  id="funnel-to"
                  type="date"
                  name="to"
                  defaultValue={to}
                  className="ml-field ml-num mt-2 w-auto [color-scheme:dark]"
                />
              </div>
              <button type="submit" className="ml-btn ml-btn-secondary min-h-[44px] px-5 text-[13px]">
                Apply
              </button>
            </form>
          </div>
          {events.length === 50000 && (
            <p role="alert" className="border-b border-rule px-4 py-3 text-[14px] text-warn sm:px-5">
              <span aria-hidden="true">▲ </span>
              Limit reached: the 50,000-event safety limit was hit; narrow the date range for
              complete counts.
            </p>
          )}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-rule text-left">
                  <th scope="col" className="ml-label px-4 py-3 font-normal sm:px-5">Stage</th>
                  <th scope="col" className="ml-label px-4 py-3 font-normal">Events</th>
                  <th scope="col" className="ml-label px-4 py-3 font-normal sm:px-5">Unique users / visitors</th>
                </tr>
              </thead>
              <tbody>
                {funnel.map((stage) => (
                  <tr key={stage.label} className="ml-row">
                    <td className="px-4 py-3 text-[15px] text-bone sm:px-5">{stage.label}</td>
                    <td className="ml-num px-4 py-3 text-[15px] font-bold text-bone">{stage.total}</td>
                    <td className="ml-num px-4 py-3 text-[15px] font-bold text-bone sm:px-5">{stage.unique}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </PageShell>
    </div>
  );
}
