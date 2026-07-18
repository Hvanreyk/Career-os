import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { getRequestUser } from '@/lib/auth';
import { resourceHasCapability } from '@/lib/resources/catalog';
import { createServiceClient } from '@/lib/supabase/server';

export const RESUME_RESOURCE_SLUG = 'resume-cover-letter';

export const RESUME_COLUMNS =
  'id, title, status, full_name, email, phone, linkedin_url, location, created_at, updated_at';
export const RESUME_ENTRY_COLUMNS =
  'id, section_id, org, role_title, location, date_range, sort_order, created_at, updated_at';
export const RESUME_BULLET_COLUMNS =
  'id, section_id, entry_id, text, status, sort_order, created_at, updated_at';

type ServiceClient = ReturnType<typeof createServiceClient>;

export interface ResumeApiContext {
  user: User;
  service: ServiceClient;
  course: { id: string; slug: string };
}

export type ResumeContextResult =
  | { context: ResumeApiContext; response?: never }
  | { context?: never; response: NextResponse };

/**
 * Authenticates the requester and verifies access to the published resume workshop.
 *
 * @returns An authenticated resume API context on success, or an HTTP error response when access is unavailable.
 */
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

/**
 * Creates a SHA-256 hash for a resume bullet.
 *
 * @param text - The resume bullet text to hash
 * @returns The SHA-256 digest as a hexadecimal string
 */
export function hashResumeBullet(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

/**
 * Records a resume-related product event for the authenticated user.
 *
 * @param context - The authenticated resume API context.
 * @param eventName - The name of the event to record.
 * @param properties - Additional event properties.
 */
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

/**
 * Determines the daily limit for resume critiques from environment configuration.
 *
 * @returns The configured integer limit from 1 through 1000, or `25` when the configuration is invalid or absent.
 */
export function getResumeCritiqueDailyLimit(): number {
  const value = Number(process.env.RESUME_CRITIQUE_DAILY_LIMIT ?? '25');
  return Number.isInteger(value) && value >= 1 && value <= 1000 ? value : 25;
}

/**
 * Determines the daily per-kind limit for the heavy resume AI generators
 * (import / compose / improve / tailor) from environment configuration.
 *
 * @returns The configured integer limit from 1 through 1000, or `10` when the configuration is invalid or absent.
 */
export function getResumeAiDailyLimit(): number {
  const value = Number(process.env.RESUME_AI_DAILY_LIMIT ?? '10');
  return Number.isInteger(value) && value >= 1 && value <= 1000 ? value : 10;
}

/**
 * Creates a SHA-256 hash of an AI job's canonical input string, used for
 * idempotent job reuse via the resume_ai_jobs unique index.
 */
export function hashResumeAiInput(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}
