import { NextResponse } from 'next/server';
import { computeFinalReadiness, type QuizScores, type Readiness } from '@trajectoryos/core/courses/readiness';
import {
  AU_RECRUITING_CYCLES,
  AU_TIMELINE_LAST_REVIEWED,
} from '@trajectoryos/core/courses/timeline';
import {
  ROADMAP_GENERATION_VERSION,
  type RoadmapInput,
} from '@trajectoryos/core/llm/roadmap';
import type { StudentProfile } from '@trajectoryos/core/scoring/types';
import { createClient as createServerClient, createServiceClient } from '@/lib/supabase/server';
import { hashInput } from '@/lib/courses/hash';
import { resourceHasCapability } from '@/lib/resources/catalog';

// Phase 1 of roadmap generation (mirrors /api/generate-report →
// /api/reports/[id]/process). Assembles the deterministic input
// snapshot, and either returns an existing completed roadmap with the
// same versioned input hash (cost bound: one LLM generation per distinct
// input) or inserts a 'pending' row for the process route to atomically claim.

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ courseSlug: string }> },
) {
  const { courseSlug } = await params;
  if (!resourceHasCapability(courseSlug, 'roadmap')) {
    return NextResponse.json({ error: 'Roadmap not available' }, { status: 404 });
  }

  const supabase = await createServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const serviceClient = createServiceClient();

  const { data: course } = await serviceClient
    .from('courses')
    .select('id, status')
    .eq('slug', courseSlug)
    .maybeSingle();
  if (!course || course.status !== 'published') {
    return NextResponse.json({ error: 'Course not found' }, { status: 404 });
  }

  // The roadmap is personalised from the diagnostic — require it first.
  const { data: enrollment } = await serviceClient
    .from('course_enrollments')
    .select('id, readiness')
    .eq('user_id', user.id)
    .eq('course_id', course.id)
    .maybeSingle();
  if (!enrollment?.readiness) {
    return NextResponse.json(
      { error: 'Take the diagnostic first — the roadmap is built from it.' },
      { status: 400 },
    );
  }
  const readiness = enrollment.readiness as Readiness;

  // ── Assemble the input snapshot ────────────────────────────
  const [{ data: modules }, { data: attempts }, { data: progressRows }, { data: targets }, { data: profileRow }] =
    await Promise.all([
      serviceClient
        .from('course_modules')
        .select('id, slug')
        .eq('course_id', course.id)
        .eq('status', 'published'),
      serviceClient
        .from('quiz_attempts')
        .select('module_id, score, total')
        .eq('user_id', user.id)
        .eq('course_id', course.id),
      serviceClient
        .from('lesson_progress')
        .select('lesson_id')
        .eq('user_id', user.id)
        .eq('course_id', course.id),
      serviceClient
        .from('bank_targets')
        .select('bank_name, priority, status')
        .eq('user_id', user.id)
        .order('priority'),
      serviceClient
        .from('student_profiles')
        .select('profile')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  // Best quiz attempt per module slug.
  const slugOfModule = new Map((modules ?? []).map((m) => [m.id as string, m.slug as string]));
  const quizScores: QuizScores = {};
  for (const a of attempts ?? []) {
    const slug = slugOfModule.get(a.module_id as string);
    if (!slug) continue;
    const existing = quizScores[slug];
    if (!existing || a.score > existing.score) {
      quizScores[slug] = { score: a.score as number, total: a.total as number };
    }
  }

  // Completed-lesson ratio over published lessons.
  const moduleIds = (modules ?? []).map((m) => m.id as string);
  let totalLessons = 0;
  if (moduleIds.length > 0) {
    const { count } = await serviceClient
      .from('lessons')
      .select('id', { count: 'exact', head: true })
      .in('module_id', moduleIds)
      .eq('status', 'published');
    totalLessons = count ?? 0;
  }
  const completedLessonRatio = totalLessons > 0 ? (progressRows?.length ?? 0) / totalLessons : 0;

  const finalReadiness = computeFinalReadiness(readiness, quizScores, completedLessonRatio);

  // Persist the updated readiness for the before/after comparison.
  await serviceClient
    .from('course_enrollments')
    .update({ final_readiness: finalReadiness })
    .eq('id', enrollment.id);

  const profile = (profileRow?.profile ?? null) as StudentProfile | null;

  const input: RoadmapInput = {
    generation_version: ROADMAP_GENERATION_VERSION,
    today: new Date().toISOString().slice(0, 10),
    readiness,
    final_readiness: finalReadiness,
    quiz_scores: quizScores,
    completed_lesson_ratio: Math.round(completedLessonRatio * 100) / 100,
    target_firm_tier: profile?.target_firm_tier ?? null,
    target_geography: profile?.target_geography ?? null,
    current_year: profile?.current_year ?? null,
    expected_graduation_year: profile?.expected_graduation_year ?? null,
    bank_targets: (targets ?? []).map((t) => ({
      name: t.bank_name as string,
      priority: t.priority as number,
      status: t.status as string,
    })),
    timeline: AU_RECRUITING_CYCLES,
    timeline_last_reviewed: AU_TIMELINE_LAST_REVIEWED,
  };
  const inputHash = hashInput(input);

  // Reuse an identical roadmap instead of paying for regeneration.
  const { data: existing } = await serviceClient
    .from('course_roadmaps')
    .select('id, status')
    .eq('user_id', user.id)
    .eq('course_id', course.id)
    .eq('input_hash', inputHash)
    .in('status', ['completed', 'processing', 'pending'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ roadmapId: existing.id, status: existing.status, existing: true });
  }

  const { data: inserted, error: insertError } = await serviceClient
    .from('course_roadmaps')
    .insert({
      user_id: user.id,
      course_id: course.id,
      input,
      input_hash: inputHash,
      status: 'pending',
      generation_version: ROADMAP_GENERATION_VERSION,
    })
    .select('id')
    .single();
  if (insertError?.code === '23505') {
    const { data: raced } = await serviceClient
      .from('course_roadmaps')
      .select('id, status')
      .eq('user_id', user.id)
      .eq('course_id', course.id)
      .eq('input_hash', inputHash)
      .in('status', ['completed', 'processing', 'pending'])
      .maybeSingle();
    if (raced) {
      return NextResponse.json({
        roadmapId: raced.id,
        status: raced.status,
        existing: true,
      });
    }
  }
  if (insertError || !inserted) {
    console.error('roadmap: insert failed:', insertError);
    return NextResponse.json({ error: 'Failed to start roadmap generation' }, { status: 500 });
  }

  await serviceClient.from('product_events').insert({
    user_id: user.id,
    event_name: 'roadmap_requested',
    resource_slug: courseSlug,
    properties: { roadmap_id: inserted.id },
  });

  return NextResponse.json({ roadmapId: inserted.id, status: 'pending' });
}
