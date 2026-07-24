import { NextResponse } from 'next/server';
import { createClient as createServerClient, createServiceClient } from '@/lib/supabase/server';
import { generateDeepDive } from '@trajectoryos/core/llm/deep-dive';
import type { LLMReport } from '@trajectoryos/core/llm/types';
import type { ScoringOutput } from '@trajectoryos/core/scoring/types';
import { resolveRecommendations } from '@/lib/report/recommend';

// Generates (and caches) the downloadable Career Compass deep-dive for a
// completed report. One LLM call, isolated in its own request like the report's
// own /process route. Idempotent: a report whose deep-dive is already
// 'completed' returns immediately; an 'error' can be retried by calling again.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const serviceClient = createServiceClient();
  const { data: report, error: fetchError } = await serviceClient
    .from('reports')
    .select('id, user_id, has_access, status, scoring_output, llm_report, deep_dive_status')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (fetchError || !report) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 });
  }
  if (!report.has_access) {
    return NextResponse.json({ error: 'No access to this report' }, { status: 403 });
  }
  if (report.deep_dive_status === 'completed') {
    return NextResponse.json({ status: 'completed' });
  }
  // The deep-dive expands the on-screen report, so that must exist first.
  if (report.status !== 'completed' || !report.llm_report) {
    return NextResponse.json({ error: 'Report is not ready yet', status: 'not_ready' }, { status: 409 });
  }

  const scoringOutput = report.scoring_output as ScoringOutput;
  const llmReport = report.llm_report as LLMReport;

  const { error: markError } = await serviceClient
    .from('reports')
    .update({ deep_dive_status: 'processing', deep_dive_error: null })
    .eq('id', id)
    .eq('user_id', user.id);
  // Non-fatal: the marker is best-effort (generation proceeds either way), but
  // a failure here is worth surfacing in logs rather than silently discarding.
  if (markError) console.error('Failed to mark deep-dive processing:', markError);

  try {
    const recommendedResources = await resolveRecommendations(scoringOutput);
    const deepDive = await generateDeepDive(scoringOutput, {
      existingSections: llmReport.sections,
      recommendedResources,
    });

    const { error: updateError } = await serviceClient
      .from('reports')
      .update({ deep_dive: deepDive, deep_dive_status: 'completed', deep_dive_error: null })
      .eq('id', id)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Failed to save deep-dive:', updateError);
      return NextResponse.json({ error: 'Failed to save deep-dive' }, { status: 500 });
    }

    return NextResponse.json({ status: 'completed' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Deep-dive generation failed';
    console.error('deep-dive error:', message);

    const { error: errorWriteError } = await serviceClient
      .from('reports')
      .update({ deep_dive_status: 'error', deep_dive_error: message })
      .eq('id', id)
      .eq('user_id', user.id);
    if (errorWriteError) console.error('Failed to record deep-dive error state:', errorWriteError);

    return NextResponse.json({ error: 'Deep-dive generation failed', status: 'error' }, { status: 502 });
  }
}
