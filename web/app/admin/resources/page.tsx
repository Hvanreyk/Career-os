import Link from 'next/link';
import type { Metadata } from 'next';
import { Activity, ArrowLeft, BarChart3, ShieldCheck } from 'lucide-react';
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
        <div className="glass rounded-2xl border border-white/8 p-6 mt-8">
          <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
            <div>
              <div className="flex items-center gap-2 text-gold-400 text-xs uppercase tracking-widest font-semibold mb-2"><BarChart3 className="w-4 h-4" />Resume activation funnel</div>
              <p className="text-slate-500 text-sm">Operational counts only; these figures do not imply causal conversion.</p>
            </div>
            <form className="flex flex-wrap gap-3 items-end" method="get">
              <label className="text-xs text-slate-500">From<input type="date" name="from" defaultValue={from} className="block mt-1 px-3 py-2 rounded-lg bg-navy-950 border border-white/10 text-white [color-scheme:dark]" /></label>
              <label className="text-xs text-slate-500">To<input type="date" name="to" defaultValue={to} className="block mt-1 px-3 py-2 rounded-lg bg-navy-950 border border-white/10 text-white [color-scheme:dark]" /></label>
              <button type="submit" className="px-4 py-2 rounded-lg bg-white/10 text-white text-sm">Apply</button>
            </form>
          </div>
          {events.length === 50000 && <p className="text-amber-300 text-xs mb-4">The 50,000-event safety limit was reached; narrow the date range for complete counts.</p>}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-slate-500 border-b border-white/8"><th className="py-2 pr-4">Stage</th><th className="py-2 px-4">Events</th><th className="py-2 pl-4">Unique users / visitors</th></tr></thead>
              <tbody>{funnel.map((stage) => <tr key={stage.label} className="border-b border-white/5 last:border-0"><td className="py-3 pr-4 text-slate-300">{stage.label}</td><td className="py-3 px-4 text-white font-semibold">{stage.total}</td><td className="py-3 pl-4 text-white font-semibold">{stage.unique}</td></tr>)}</tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
