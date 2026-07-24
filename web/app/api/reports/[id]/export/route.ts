import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient as createServerClient, createServiceClient } from '@/lib/supabase/server';
import type { DeepDiveReport } from '@trajectoryos/core/llm/types';
import type { ScoringOutput } from '@trajectoryos/core/scoring/types';
import { contentDispositionFilename } from '@/lib/report/export/template';

// Streams the cached Career Compass deep-dive as a PDF. The deep-dive must
// already be generated (POST …/deep-dive) — this route only renders. Mirrors
// the resume export route: dynamic-import the renderer, stream the buffer as an
// attachment. `format` is an enum kept extensible even though only pdf ships.
const QuerySchema = z.object({ format: z.enum(['pdf']) });

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const url = new URL(request.url);
  const parsed = QuerySchema.safeParse({ format: url.searchParams.get('format') ?? 'pdf' });
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid export request' }, { status: 400 });
  }

  const serviceClient = createServiceClient();
  const { data: report, error: fetchError } = await serviceClient
    .from('reports')
    .select('id, has_access, deep_dive, deep_dive_status, scoring_output, created_at')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (fetchError || !report) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 });
  }
  if (!report.has_access) {
    return NextResponse.json({ error: 'No access to this report' }, { status: 403 });
  }
  if (report.deep_dive_status !== 'completed' || !report.deep_dive) {
    return NextResponse.json({ error: 'Deep-dive not ready', status: 'not_ready' }, { status: 409 });
  }

  let body: Buffer;
  try {
    const { renderDeepDivePdf } = await import('@/lib/report/export/pdf');
    body = await renderDeepDivePdf(
      report.deep_dive as DeepDiveReport,
      report.scoring_output as ScoringOutput,
      new Date(report.created_at as string),
    );
  } catch (error) {
    console.error('deep-dive export failed:', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }

  const { ascii, encoded } = contentDispositionFilename('Career-Compass-Report.pdf');
  return new NextResponse(new Uint8Array(body), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${ascii}"; filename*=UTF-8''${encoded}`,
      'Cache-Control': 'no-store',
    },
  });
}
