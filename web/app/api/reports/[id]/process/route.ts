import { NextResponse } from 'next/server';
import { createClient as createServerClient, createServiceClient } from '@/lib/supabase/server';
import { generateReport } from '@trajectoryos/core/llm';
import type { ScoringOutput } from '@trajectoryos/core/scoring/types';

// Phase 2 of report generation: run the LLM over the already-computed scoring
// output and flip the report from 'processing' → 'completed' (or 'error').
//
// Isolating the LLM call in its own request keeps the create request fast and
// keeps this one comfortably under serverless time limits. It is idempotent:
// a report that is already 'completed' returns immediately, and an 'error'
// report can be retried by calling this again.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  // Auth — only the owner may trigger processing.
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const serviceClient = createServiceClient();

  const { data: report, error: fetchError } = await serviceClient
    .from('reports')
    .select('id, user_id, status, scoring_output')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (fetchError || !report) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 });
  }

  // Already done — nothing to do.
  if (report.status === 'completed') {
    return NextResponse.json({ status: 'completed' });
  }

  try {
    const llmReport = await generateReport(report.scoring_output as ScoringOutput);

    const { error: updateError } = await serviceClient
      .from('reports')
      .update({ llm_report: llmReport, status: 'completed', error_message: null })
      .eq('id', id)
      .eq('user_id', user.id);

    if (updateError) {
      console.error('Failed to save completed report:', updateError);
      return NextResponse.json({ error: 'Failed to save report' }, { status: 500 });
    }

    return NextResponse.json({ status: 'completed' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'LLM generation failed';
    console.error('process-report error:', message);

    await serviceClient
      .from('reports')
      .update({ status: 'error', error_message: message })
      .eq('id', id)
      .eq('user_id', user.id);

    return NextResponse.json({ error: 'Report generation failed', status: 'error' }, { status: 502 });
  }
}
