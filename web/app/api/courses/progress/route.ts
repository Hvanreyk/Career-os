import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient as createServerClient, createServiceClient } from '@/lib/supabase/server';

// Marks a lesson complete for the signed-in user. The lesson must be a
// published lesson in a published module/course; course_id is resolved
// server-side (never trusted from the client). Idempotent upsert.

const BodySchema = z.object({
  lessonId: z.uuid(),
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

  // Resolve the lesson → module → course chain, published rows only.
  const { data: lesson } = await serviceClient
    .from('lessons')
    .select('id, status, module_id')
    .eq('id', body.lessonId)
    .maybeSingle();
  if (!lesson || lesson.status !== 'published') {
    return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
  }

  const { data: module } = await serviceClient
    .from('course_modules')
    .select('id, status, course_id')
    .eq('id', lesson.module_id)
    .maybeSingle();
  if (!module || module.status !== 'published') {
    return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
  }

  // Auto-create the enrollment so students can start reading without
  // having taken the diagnostic first.
  const { error: enrolError } = await serviceClient
    .from('course_enrollments')
    .upsert(
      { user_id: user.id, course_id: module.course_id },
      { onConflict: 'user_id,course_id', ignoreDuplicates: true },
    );
  if (enrolError) {
    console.error('progress: enrollment upsert failed:', enrolError);
    return NextResponse.json({ error: 'Failed to save progress' }, { status: 500 });
  }

  const { error: progressError } = await serviceClient
    .from('lesson_progress')
    .upsert(
      { user_id: user.id, lesson_id: lesson.id, course_id: module.course_id },
      { onConflict: 'user_id,lesson_id', ignoreDuplicates: true },
    );
  if (progressError) {
    console.error('progress: upsert failed:', progressError);
    return NextResponse.json({ error: 'Failed to save progress' }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
