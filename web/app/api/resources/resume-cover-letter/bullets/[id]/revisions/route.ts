import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ReceiptError, verifyCritiqueReceipt } from '@/lib/resume/receipt';
import { getResumeApiContext, recordResumeEvent } from '@/lib/resume/server';

const BodySchema = z.object({
  revisedText: z.string().trim().min(1).max(1000),
  receipt: z.string().min(1).max(100000),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await getResumeApiContext();
  if (result.response) return result.response;
  const [{ id }, parsed] = await Promise.all([
    params,
    request.json().catch(() => null).then((body) => BodySchema.safeParse(body)),
  ]);
  if (!z.uuid().safeParse(id).success || !parsed.success) {
    return NextResponse.json({ error: 'Invalid revision' }, { status: 400 });
  }
  const { context } = result;
  let receipt;
  try {
    receipt = verifyCritiqueReceipt(parsed.data.receipt);
  } catch (error) {
    const expired = error instanceof ReceiptError && error.code === 'EXPIRED';
    return NextResponse.json(
      { error: expired ? 'Critique expired; request fresh feedback' : 'Invalid critique receipt' },
      { status: expired ? 410 : 400 },
    );
  }
  if (receipt.userId !== context.user.id || receipt.bulletId !== id) {
    return NextResponse.json({ error: 'Invalid critique receipt' }, { status: 403 });
  }

  const { data: currentBullet } = await context.service.from('resume_bullets')
    .select('text').eq('id', id).eq('user_id', context.user.id).maybeSingle();
  if (!currentBullet) return NextResponse.json({ error: 'Bullet not found' }, { status: 404 });
  if (currentBullet.text.trim() === parsed.data.revisedText) {
    return NextResponse.json({ error: 'Revise the bullet before saving' }, { status: 400 });
  }

  const { data: revisions, error } = await context.service.rpc('save_resume_bullet_revision', {
    p_user_id: context.user.id,
    p_bullet_id: id,
    p_input_hash: receipt.inputHash,
    p_revised_text: parsed.data.revisedText,
    p_critique: receipt.critique,
    p_model: receipt.model,
    p_prompt_version: receipt.promptVersion,
    p_input_tokens: receipt.usage.input_tokens,
    p_output_tokens: receipt.usage.output_tokens,
  });
  if (error?.message.includes('STALE_CRITIQUE')) {
    return NextResponse.json({ error: 'The bullet changed; request fresh feedback' }, { status: 409 });
  }
  if (error?.message.includes('BULLET_NOT_FOUND')) {
    return NextResponse.json({ error: 'Bullet not found' }, { status: 404 });
  }
  const revision = Array.isArray(revisions) ? revisions[0] : null;
  if (error || !revision) return NextResponse.json({ error: 'Could not save revision' }, { status: 500 });
  await recordResumeEvent(context, 'bullet_revised', {
    model: receipt.model,
    prompt_version: receipt.promptVersion,
  });
  return NextResponse.json({ revision, bulletText: parsed.data.revisedText }, { status: 201 });
}
