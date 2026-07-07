import { NextResponse } from 'next/server';
import { z } from 'zod';
import { DiagnosticAnswersSchema } from '@trajectoryos/core/courses/diagnostic';
import { computeReadiness } from '@trajectoryos/core/courses/readiness';
import { createClient as createServerClient, createServiceClient } from '@/lib/supabase/server';

// Scores the course diagnostic (deterministic, no LLM) and stores the
// answers + readiness on the user's enrollment.
//
// The request body shape is checked with the web-side zod (v4); the
// answer semantics (every question answered, valid option ids) are
// validated by the engine's own schema.

const BodySchema = z.object({
  answers: z.record(z.string(), z.string()),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ courseSlug: string }> },
) {
  const { courseSlug } = await params;

  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = DiagnosticAnswersSchema.safeParse(body.answers);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Please answer every question' }, { status: 400 });
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

  const readiness = computeReadiness(parsed.data);

  const { error: upsertError } = await serviceClient.from('course_enrollments').upsert(
    {
      user_id: user.id,
      course_id: course.id,
      diagnostic_answers: parsed.data,
      readiness,
    },
    { onConflict: 'user_id,course_id' },
  );
  if (upsertError) {
    console.error('diagnostic: enrollment upsert failed:', upsertError);
    return NextResponse.json({ error: 'Failed to save your diagnostic' }, { status: 500 });
  }

  return NextResponse.json({ readiness });
}
