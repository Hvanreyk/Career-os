import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  CRITIQUE_GENERATION_VERSION,
  generateResumeCritique,
} from '@trajectoryos/core/llm/critique';
import { createCritiqueReceipt } from '@/lib/resume/receipt';
import {
  getResumeApiContext,
  getResumeCritiqueDailyLimit,
  hashResumeBullet,
  recordResumeEvent,
} from '@/lib/resume/server';

const BodySchema = z.object({ bulletId: z.uuid() });

/**
 * Gets the current date in the Australia/Sydney time zone.
 *
 * @returns The current date formatted as `YYYY-MM-DD`
 */
function sydneyDate(): string {
  const parts = new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Sydney',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

/**
 * Retrieves the authenticated user's daily resume critique quota and remaining count.
 *
 * @returns The daily critique limit and the number of critiques remaining for the current Sydney date.
 */
export async function GET() {
  const result = await getResumeApiContext();
  if (result.response) return result.response;
  const { context } = result;
  const limit = getResumeCritiqueDailyLimit();
  const { data } = await context.service.from('resume_critique_daily_usage')
    .select('count').eq('user_id', context.user.id).eq('usage_date', sydneyDate()).maybeSingle();
  return NextResponse.json({ limit, remaining: Math.max(limit - (data?.count ?? 0), 0) });
}

/**
 * Generates a signed AI critique for an authenticated user's resume bullet.
 *
 * @param request - The request containing a UUID `bulletId` in its JSON body.
 * @returns A response containing the critique, signed receipt, expiration time, and remaining daily quota.
 */
export async function POST(request: Request) {
  const result = await getResumeApiContext();
  if (result.response) return result.response;
  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid critique request' }, { status: 400 });
  const { context } = result;
  const { data: bullet } = await context.service.from('resume_bullets')
    .select('id, text, section_id').eq('id', parsed.data.bulletId).eq('user_id', context.user.id).maybeSingle();
  if (!bullet) return NextResponse.json({ error: 'Bullet not found' }, { status: 404 });
  const { data: section } = await context.service.from('resume_sections')
    .select('kind, heading').eq('id', bullet.section_id).eq('user_id', context.user.id).maybeSingle();
  if (!section) return NextResponse.json({ error: 'Section not found' }, { status: 404 });

  const limit = getResumeCritiqueDailyLimit();
  const { data: quotaRows, error: quotaError } = await context.service.rpc(
    'claim_resume_critique_quota',
    { p_user_id: context.user.id, p_limit: limit },
  );
  const quota = Array.isArray(quotaRows) ? quotaRows[0] : null;
  if (quotaError || !quota) return NextResponse.json({ error: 'Could not check critique quota' }, { status: 500 });
  if (!quota.allowed) {
    return NextResponse.json({
      error: 'Daily critique limit reached',
      remaining: 0,
      resetsAt: quota.resets_at,
    }, { status: 429 });
  }

  await recordResumeEvent(context, 'critique_requested');
  try {
    const generated = await generateResumeCritique({
      bullet: bullet.text,
      sectionKind: section.kind,
      sectionHeading: section.heading,
    });
    const inputHash = hashResumeBullet(bullet.text);
    const signed = createCritiqueReceipt({
      userId: context.user.id,
      bulletId: bullet.id,
      inputHash,
      critique: generated.critique,
      model: generated.model,
      promptVersion: CRITIQUE_GENERATION_VERSION,
      usage: generated.usage,
    });
    await recordResumeEvent(context, 'critique_completed', {
      model: generated.model,
      prompt_version: CRITIQUE_GENERATION_VERSION,
    });
    return NextResponse.json({
      critique: generated.critique,
      receipt: signed.receipt,
      receiptExpiresAt: signed.expiresAt,
      remaining: quota.remaining,
      resetsAt: quota.resets_at,
    });
  } catch (error) {
    await context.service.rpc('release_resume_critique_quota', { p_user_id: context.user.id });
    console.error('resume critique failed:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: 'AI critique is temporarily unavailable' }, { status: 502 });
  }
}
