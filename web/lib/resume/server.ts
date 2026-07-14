import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { getRequestUser } from '@/lib/auth';
import { resourceHasCapability } from '@/lib/resources/catalog';
import { createServiceClient } from '@/lib/supabase/server';

export const RESUME_RESOURCE_SLUG = 'resume-cover-letter';

type ServiceClient = ReturnType<typeof createServiceClient>;

export interface ResumeApiContext {
  user: User;
  service: ServiceClient;
  course: { id: string; slug: string };
}

export type ResumeContextResult =
  | { context: ResumeApiContext; response?: never }
  | { context?: never; response: NextResponse };

export async function getResumeApiContext(): Promise<ResumeContextResult> {
  const user = await getRequestUser();
  if (!user) {
    return { response: NextResponse.json({ error: 'Unauthorised' }, { status: 401 }) };
  }
  if (!resourceHasCapability(RESUME_RESOURCE_SLUG, 'resume-workshop')) {
    return { response: NextResponse.json({ error: 'Workshop not available' }, { status: 404 }) };
  }
  const service = createServiceClient();
  const { data: course } = await service
    .from('courses')
    .select('id, slug, status')
    .eq('slug', RESUME_RESOURCE_SLUG)
    .maybeSingle();
  if (!course || course.status !== 'published') {
    return { response: NextResponse.json({ error: 'Workshop not available' }, { status: 404 }) };
  }
  return { context: { user, service, course: { id: course.id, slug: course.slug } } };
}

export function hashResumeBullet(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

export async function recordResumeEvent(
  context: ResumeApiContext,
  eventName: string,
  properties: Record<string, string | number | boolean | null> = {},
): Promise<void> {
  const { error } = await context.service.from('product_events').insert({
    user_id: context.user.id,
    event_name: eventName,
    resource_slug: RESUME_RESOURCE_SLUG,
    properties,
  });
  if (error) console.error(`resume event insert failed (${eventName}):`, error.message);
}

export function getResumeCritiqueDailyLimit(): number {
  const value = Number(process.env.RESUME_CRITIQUE_DAILY_LIMIT ?? '25');
  return Number.isInteger(value) && value >= 1 && value <= 1000 ? value : 25;
}
