import type { Metadata } from 'next';
import Link from 'next/link';
import { computeAlumniIntel, type AlumniIntel } from '@trajectoryos/core/networking';
import { TargetMapView } from '@/components/networking/TargetMapView';
import { buildPlanInputs, loadWorkspaceData } from '@/lib/networking/queries';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Networking — Target map' };
export const dynamic = 'force-dynamic';

/**
 * Target map: per-firm relationship coverage against a goal of two
 * junior + one senior contact, plus aggregate alumni intelligence
 * from the professionals database (aggregates only — individual rows
 * never leave the server; see lib/networking/alumni.ts).
 */
export default async function NetworkTargetMapPage({ params }: { params: Promise<{ courseSlug: string }> }) {
  const { courseSlug } = await params;
  const data = await loadWorkspaceData();
  const inputs = buildPlanInputs(data, new Date().toISOString());

  // Student university from their latest report profile (if any).
  const supabase = await createClient();
  const { data: profileRow } = await supabase
    .from('student_profiles')
    .select('profile')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const university = typeof (profileRow?.profile as { university?: unknown } | null)?.university === 'string'
    ? (profileRow?.profile as { university: string }).university
    : '';

  let alumni: AlumniIntel | null = null;
  try {
    const service = createServiceClient();
    const { data: professionals } = await service
      .from('professionals')
      .select('current_firm, current_firm_tier, current_role, current_geography, university');
    if (professionals && professionals.length > 0) {
      alumni = computeAlumniIntel(professionals, university);
    }
  } catch {
    // Aggregate intel is additive — the coverage grid works without it.
  }

  return (
    <div className="space-y-5">
      <TargetMapView
        base={`/resources/${courseSlug}/network`}
        coverage={inputs.coverage}
        alumni={alumni}
        university={university}
      />
      {inputs.coverage.totalTargets === 0 && (
        <p className="text-sm text-slate-500">
          No bank targets yet — build your target list in the{' '}
          <Link href="/resources/investment-banking-guides/tracker" className="text-gold-400 hover:underline">
            bank target tracker
          </Link>{' '}
          and it powers this map automatically.
        </p>
      )}
    </div>
  );
}
