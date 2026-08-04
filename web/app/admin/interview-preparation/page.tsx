import type { Metadata } from 'next';
import Link from 'next/link';
import { AdminTechnicalCoreImport } from '@/components/admin/AdminTechnicalCoreImport';
import { requireAdmin } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase/server';
import { PageHeader, PageShell } from '@/components/ui/PageHeader';
import { Panel, PanelHeader, Stat } from '@/components/ui/Panel';

export const metadata: Metadata = { title: 'Technical Core Admin' };
export const dynamic = 'force-dynamic';

export default async function TechnicalCoreAdminPage() {
  await requireAdmin('/admin/interview-preparation');
  const service = createServiceClient();
  const billingEnabled = process.env.INTERVIEW_BILLING_ENABLED === 'true';
  const [concepts, families, attempts, disputes, reviews, paying] = await Promise.all([
    service.from('technical_concepts').select('id, topic, status', { count: 'exact' }),
    service.from('technical_item_families').select('id, topic, difficulty, status, variant_coverage, next_review_at'),
    service.from('technical_attempts').select('id', { count: 'exact', head: true }),
    service.from('technical_disputes').select('id, status, reason_code', { count: 'exact' }),
    service.from('technical_content_reviews').select('id, review_type, decision, resolved_at'),
    service.from('billing_subscriptions').select('user_id', { count: 'exact', head: true }).eq('status', 'active'),
  ]);
  const familyRows = families.data ?? [];
  const published = familyRows.filter((family) => family.status === 'published');
  const fullVariants = published.filter((family) => (family.variant_coverage as string[]).length === 7).length;
  const openDisputes = (disputes.data ?? []).filter((dispute) => ['open', 'reviewing'].includes(dispute.status)).length;
  const unresolvedReviews = (reviews.data ?? []).filter((review) => review.decision === 'changes_requested' && !review.resolved_at).length;
  return (
    <div className="min-h-screen bg-ink pt-16">
      <PageShell width="wide">
        <Link href="/admin/resources" className="ml-label inline-flex min-h-[44px] items-center hover:text-bone"><span aria-hidden="true" className="mr-2">◂</span> Resource Admin</Link>
        <PageHeader className="mt-1" label="Admin · Technical Core" title="Content quality operations" lede="The release count is evidence, not a target somebody can click past. Only independently reviewed, sourced, property-tested families can reach Published." />
        <div className="mt-7 grid gap-px bg-rule sm:grid-cols-3 xl:grid-cols-6">
          <div className="bg-ink p-5"><Stat label="Concepts" value={concepts.count ?? 0} sub="Target 60" /></div>
          <div className="bg-ink p-5"><Stat label="Published families" value={published.length} sub="Target 120" accent /></div>
          <div className="bg-ink p-5"><Stat label="7-variant families" value={fullVariants} sub={`of ${published.length}`} /></div>
          <div className="bg-ink p-5"><Stat label="Attempts" value={attempts.count ?? 0} sub="Pilot gate 2,000" /></div>
          <div className="bg-ink p-5"><Stat label={billingEnabled ? 'Paying users' : 'Billing'} value={billingEnabled ? (paying.count ?? 0) : 'Off'} sub={billingEnabled ? 'Future commercial gate 25' : 'Open testing access'} /></div>
          <div className="bg-ink p-5"><Stat label="Open disputes" value={openDisputes} sub={`${unresolvedReviews} review blockers`} /></div>
        </div>

        <div className="mt-7 grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(22rem,0.85fr)]">
          <Panel>
            <PanelHeader title="Reviewed-family import" label="Immutable bundle" />
            <AdminTechnicalCoreImport />
          </Panel>
          <Panel>
            <PanelHeader title="Release gates" label="Technical Core 120" />
            <ul>
              {[
                [`60 concepts seeded`, (concepts.count ?? 0) === 60],
                [`120 families published`, published.length === 120],
                [`All published families cover seven variants`, published.length === 120 && fullVariants === 120],
                [`2,000 pilot attempts`, (attempts.count ?? 0) >= 2000],
                [billingEnabled ? `25 active paying users` : `Billing deferred during testing`, billingEnabled ? (paying.count ?? 0) >= 25 : true],
                [`No unresolved blocking reviews`, unresolvedReviews === 0],
                [`No open disputes`, openDisputes === 0],
              ].map(([label, passed]) => (
                <li key={String(label)} className="ml-row flex items-center gap-3 p-4 text-[14px] text-bone">
                  <span className={`ml-num ${passed ? 'text-ok' : 'text-warn'}`}>{passed ? '✓' : '△'}</span>{label}
                </li>
              ))}
            </ul>
            <p className="p-4 text-[12px] leading-snug text-graphite">Agreement, AI-versus-human, completion, repeat-practice, and upheld-error rates populate after pilot-statistics jobs run. Until then the release remains evidence-incomplete.</p>
          </Panel>
        </div>

        <Panel className="mt-7">
          <PanelHeader title="Family register" label={`${familyRows.length} total`} />
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead><tr className="border-b border-rule"><th className="ml-label px-4 py-3">Status</th><th className="ml-label px-4 py-3">Topic</th><th className="ml-label px-4 py-3">Difficulty</th><th className="ml-label px-4 py-3">Variants</th><th className="ml-label px-4 py-3">Next review</th></tr></thead>
              <tbody>{familyRows.map((family) => <tr key={family.id} className="ml-row"><td className="px-4 py-3 font-semibold uppercase text-bone">{family.status.replaceAll('_', ' ')}</td><td className="px-4 py-3 text-graphite">{family.topic.replaceAll('_', ' ')}</td><td className="px-4 py-3 text-graphite">{family.difficulty.replaceAll('_', ' ')}</td><td className="ml-num px-4 py-3 text-bone">{(family.variant_coverage as string[]).length}/7</td><td className="ml-num px-4 py-3 text-graphite">{family.next_review_at ? new Date(family.next_review_at).toLocaleDateString('en-AU') : '—'}</td></tr>)}</tbody>
            </table>
          </div>
        </Panel>
      </PageShell>
    </div>
  );
}
