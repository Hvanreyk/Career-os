import type { Metadata } from 'next';
import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { TechnicalPracticeWorkspace } from '@/components/interview/TechnicalPracticeWorkspace';
import { PageHeader, PageShell } from '@/components/ui/PageHeader';
import { createServiceClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Technical Core Practice' };
export const dynamic = 'force-dynamic';

export default async function TechnicalPracticePage() {
  const user = await requireUser('/resources/interview-preparation/practice');
  const service = createServiceClient();
  const now = new Date().toISOString();
  const [{ data: entitlements }, { data: mastery }, { count: attemptCount }] = await Promise.all([
    service.from('resource_entitlements').select('status, ends_at')
      .eq('user_id', user.id).eq('resource_slug', 'interview-preparation')
      .eq('capability', 'question-bank').in('status', ['active', 'grace']),
    service.from('technical_concept_mastery')
      .select('concept_id, mastery_label, evidence_confidence, useful_attempts, variant_count, unresolved_fatal_misconceptions')
      .eq('user_id', user.id).order('concept_id'),
    service.from('technical_attempts').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
  ]);
  const billingEnabled = process.env.INTERVIEW_BILLING_ENABLED === 'true';
  const entitled = (entitlements ?? []).some((entitlement) => !entitlement.ends_at || entitlement.ends_at > now);
  const fullAccess = !billingEnabled || entitled;
  return (
    <PageShell width="wide">
      <Link href="/resources/interview-preparation" className="ml-label inline-flex min-h-[44px] items-center hover:text-bone">
        <span aria-hidden="true" className="mr-2">◂</span> Interview Preparation
      </Link>
      <PageHeader
        className="mt-1"
        label="Technical Core"
        title="Practise concepts, not wording"
        lede="Every question is generated from a reviewed family and tied to an exact rubric version. Mastery only moves when your evidence survives multiple variants."
      />
      <TechnicalPracticeWorkspace
        initialFullAccess={fullAccess}
        billingEnabled={billingEnabled}
        initialMastery={mastery ?? []}
        initialAttemptCount={attemptCount ?? 0}
      />
    </PageShell>
  );
}
