import { NextResponse } from 'next/server';
import {
  RESUME_COMPOSE_GENERATION_VERSION,
  toComposeProfileInput,
} from '@trajectoryos/core/llm/resume-compose';
import { AdditionalDetailsSchema } from '@trajectoryos/core/resume/document';
import { StudentProfileSchema, type StudentProfile } from '@trajectoryos/core/scoring/types';
import { getResumeApiContext, recordResumeEvent, type ResumeApiContext } from '@/lib/resume/server';
import { createResumeAiJob } from '@/lib/resume/jobs';

interface ProfileLookup {
  profile: StudentProfile | null;
  // True only for a query/infrastructure failure — distinct from "the user
  // simply hasn't completed onboarding yet", which must not surface as a 500.
  failed: boolean;
}

async function loadStudentProfile(context: ResumeApiContext): Promise<ProfileLookup> {
  const { data, error } = await context.service
    .from('student_profiles')
    .select('profile')
    .eq('user_id', context.user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error('resume compose: student_profiles lookup failed:', error.message);
    return { profile: null, failed: true };
  }
  if (!data?.profile) return { profile: null, failed: false };
  const parsed = StudentProfileSchema.safeParse(data.profile);
  if (!parsed.success) {
    console.error('resume compose: stored student profile failed schema validation:', parsed.error.message);
    return { profile: null, failed: false };
  }
  return { profile: parsed.data, failed: false };
}

/**
 * Returns the prefill data for the auto-create "additional details" screen:
 * the display-safe projection of the student's onboarding profile (the same
 * subset the model will see — never high-school/ATAR data) plus their login
 * email as a contact starting point.
 */
export async function GET() {
  const result = await getResumeApiContext();
  if (result.response) return result.response;
  const { context } = result;
  const { profile, failed } = await loadStudentProfile(context);
  if (failed) return NextResponse.json({ error: 'Could not load your profile' }, { status: 500 });
  if (!profile) {
    return NextResponse.json({
      available: false,
      error: 'Complete onboarding first — auto-create builds from your Career Compass profile',
    }, { status: 422 });
  }
  return NextResponse.json({
    available: true,
    profile: toComposeProfileInput(profile),
    contact_email: context.user.email ?? null,
  });
}

/**
 * Starts an auto-create job: composes a first-draft structured resume from
 * the stored onboarding profile plus the additional details collected on the
 * pre-generation screen.
 */
export async function POST(request: Request) {
  const result = await getResumeApiContext();
  if (result.response) return result.response;
  const { context } = result;
  const body = await request.json().catch(() => null) as { details?: unknown } | null;
  const details = AdditionalDetailsSchema.safeParse(body?.details);
  if (!details.success) {
    return NextResponse.json({ error: 'Invalid additional details' }, { status: 400 });
  }

  const { profile, failed } = await loadStudentProfile(context);
  if (failed) return NextResponse.json({ error: 'Could not load your profile' }, { status: 500 });
  if (!profile) {
    return NextResponse.json({
      error: 'Complete onboarding first — auto-create builds from your Career Compass profile',
    }, { status: 422 });
  }

  const { data: resume } = await context.service.from('resumes')
    .select('id').eq('user_id', context.user.id).maybeSingle();

  const created = await createResumeAiJob(context, {
    kind: 'compose',
    input: { profile: toComposeProfileInput(profile), details: details.data },
    generationVersion: RESUME_COMPOSE_GENERATION_VERSION,
    resumeId: resume?.id ?? null,
  });
  if (created.response) return created.response;

  await recordResumeEvent(context, 'resume_compose_started', { reused: created.reused });
  return NextResponse.json({ jobId: created.jobId, reused: created.reused }, { status: created.reused ? 200 : 201 });
}
