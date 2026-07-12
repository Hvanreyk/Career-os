import { NextResponse } from 'next/server';
import { generateRoadmap, type RoadmapInput } from '@trajectoryos/core/llm/roadmap';
import { createClient as createServerClient, createServiceClient } from '@/lib/supabase/server';

// Phase 2 of roadmap generation: atomically claim the stored job, run the
// LLM, then flip processing → completed/error. The database claim uses a
// short lease so concurrent requests do not duplicate model spend and an
// interrupted invocation can be resumed safely.

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

  const { data: roadmap, error: claimError } = await serviceClient
    .rpc('claim_course_roadmap', {
      p_roadmap_id: id,
      p_user_id: user.id,
    })
    .maybeSingle();

  if (claimError) {
    console.error('process-roadmap claim failed:', claimError);
    return NextResponse.json({ error: 'Failed to claim roadmap job' }, { status: 500 });
  }

  if (!roadmap) {
    const { data: current } = await serviceClient
      .from('course_roadmaps')
      .select('status')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle();
    if (!current) {
      return NextResponse.json({ error: 'Roadmap not found' }, { status: 404 });
    }
    if (current.status === 'completed') {
      return NextResponse.json({ status: 'completed' });
    }
    return NextResponse.json({ status: current.status }, { status: 202 });
  }

  try {
    const result = await generateRoadmap(
      (roadmap as { input: RoadmapInput }).input,
    );

    const { error: updateError } = await serviceClient
      .from('course_roadmaps')
      .update({ roadmap: result, status: 'completed', error_message: null })
      .eq('id', id)
      .eq('user_id', user.id)
      .eq('status', 'processing');
    if (updateError) {
      console.error('Failed to save completed roadmap:', updateError);
      return NextResponse.json({ error: 'Failed to save roadmap' }, { status: 500 });
    }

    const { data: completedRoadmap } = await serviceClient
      .from('course_roadmaps')
      .select('course_id')
      .eq('id', id)
      .maybeSingle();
    if (completedRoadmap) {
      const { data: course } = await serviceClient
        .from('courses')
        .select('slug')
        .eq('id', completedRoadmap.course_id)
        .maybeSingle();
      await serviceClient.from('product_events').insert({
        user_id: user.id,
        event_name: 'roadmap_completed',
        resource_slug: course?.slug ?? null,
        properties: { roadmap_id: id },
      });
    }

    return NextResponse.json({ status: 'completed' });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Roadmap generation failed';
    console.error('process-roadmap error:', message);

    await serviceClient
      .from('course_roadmaps')
      .update({ status: 'error', error_message: message })
      .eq('id', id)
      .eq('user_id', user.id)
      .eq('status', 'processing');

    return NextResponse.json(
      { error: 'Roadmap generation failed', status: 'error' },
      { status: 502 },
    );
  }
}
