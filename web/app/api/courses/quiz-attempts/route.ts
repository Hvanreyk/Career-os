import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient as createServerClient, createServiceClient } from '@/lib/supabase/server';
import { resourceHasCapability } from '@/lib/resources/catalog';

// Grades a module quiz server-side and records the attempt. The correct
// answers live in quiz_questions, which has no RLS policies — only this
// route (service role) can read them, so scores can't be forged and
// answers can't be scraped.

const BodySchema = z.object({
  moduleId: z.uuid(),
  answers: z.record(z.uuid(), z.string()),
});

export async function POST(request: Request) {
  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
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

  const { data: module } = await serviceClient
    .from('course_modules')
    .select('id, status, course_id')
    .eq('id', body.moduleId)
    .maybeSingle();
  if (!module || module.status !== 'published') {
    return NextResponse.json({ error: 'Module not found' }, { status: 404 });
  }
  const { data: course } = await serviceClient
    .from('courses')
    .select('id, slug, status')
    .eq('id', module.course_id)
    .maybeSingle();
  if (!course || course.status !== 'published' || !resourceHasCapability(course.slug, 'quizzes')) {
    return NextResponse.json({ error: 'Module not found' }, { status: 404 });
  }

  const { data: questions } = await serviceClient
    .from('quiz_questions')
    .select('id, correct_option_id, explanation, options')
    .eq('module_id', module.id)
    .eq('status', 'published')
    .order('sort_order');
  if (!questions || questions.length === 0) {
    return NextResponse.json({ error: 'No quiz for this module' }, { status: 404 });
  }

  // Grade — unanswered or unknown-option answers count as wrong.
  const results = questions.map((q) => {
    const submitted = body.answers[q.id as string];
    const validOption = (q.options as { id: string }[]).some((o) => o.id === submitted);
    const correct = validOption && submitted === q.correct_option_id;
    return {
      questionId: q.id as string,
      correct,
      correctId: q.correct_option_id as string,
      explanation: (q.explanation as string) ?? '',
    };
  });
  const score = results.filter((r) => r.correct).length;

  const { error: insertError } = await serviceClient.from('quiz_attempts').insert({
    user_id: user.id,
    module_id: module.id,
    course_id: module.course_id,
    answers: body.answers,
    score,
    total: questions.length,
  });
  if (insertError) {
    console.error('quiz-attempts: insert failed:', insertError);
    return NextResponse.json({ error: 'Failed to save attempt' }, { status: 500 });
  }

  await serviceClient.from('product_events').insert({
    user_id: user.id,
    event_name: 'quiz_completed',
    resource_slug: course.slug,
    properties: { module_id: module.id, score, total: questions.length },
  });

  return NextResponse.json({ score, total: questions.length, results });
}
