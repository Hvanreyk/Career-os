import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  CRITIQUE_GENERATION_VERSION,
  generateResumeCritique,
} from '@trajectoryos/core/llm/critique';
import { createCritiqueReceipt } from '@/lib/resume/receipt';
import {
  getResumeApiContext,
  hashResumeBullet,
  recordResumeEvent,
} from '@/lib/resume/server';

const BodySchema = z.object({ bulletId: z.uuid() });

/**
 * Generates a signed AI critique for an authenticated user's resume bullet.
 *
 * @param request - The request containing a UUID `bulletId` in its JSON body.
 * @returns A response containing the critique, signed receipt, and expiration time.
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
    });
  } catch (error) {
    console.error('resume critique failed:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ error: 'AI critique is temporarily unavailable' }, { status: 502 });
  }
}
