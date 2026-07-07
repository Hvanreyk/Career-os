import { NextResponse } from 'next/server';
import { generateRoadmap, type RoadmapInput } from '@trajectoryos/core/llm/roadmap';
import { createClient as createServerClient, createServiceClient } from '@/lib/supabase/server';

// Phase 2 of roadmap generation: run the LLM over the stored input and
// flip 'processing' → 'completed' (or 'error'). Clone of the report
// process route — isolated so neither request risks a serverless
// timeout; idempotent and retryable.

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const supabase = await createServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const serviceClient = createServiceClient();

  const { data: roadmap, error: fetchError } = await serviceClient
    .from('course_roadmaps')
    .select('id, user_id, status, input')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();
  if (fetchError || !roadmap) {
    return NextResponse.json({ error: 'Roadmap not found' }, { status: 404 });
  }

  if (roadmap.status === 'completed') {
    return NextResponse.json({ status: 'completed' });
  }

  try {
    const result = await generateRoadmap(roadmap.input as RoadmapInput);

    const { error: updateError } = await serviceClient
      .from('course_roadmaps')
      .update({ roadmap: result, status: 'completed', error_message: null })
      .eq('id', id)
      .eq('user_id', user.id);
    if (updateError) {
      console.error('Failed to save completed roadmap:', updateError);
      return NextResponse.json({ error: 'Failed to save roadmap' }, { status: 500 });
    }

    return NextResponse.json({ status: 'completed' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Roadmap generation failed';
    console.error('process-roadmap error:', message);

    await serviceClient
      .from('course_roadmaps')
      .update({ status: 'error', error_message: message })
      .eq('id', id)
      .eq('user_id', user.id);

    return NextResponse.json(
      { error: 'Roadmap generation failed', status: 'error' },
      { status: 502 },
    );
  }
}
