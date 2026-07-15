import { NextResponse } from 'next/server';
import { z } from 'zod';
import { FollowUpUpdateSchema } from '@trajectoryos/core/networking/types';
import {
  getNetworkingApiContext,
  recordNetworkingEvent,
} from '@/lib/networking/server';

const IdSchema = z.uuid();

/**
 * Updates a follow-up's kind, due date, reason, or status.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await getNetworkingApiContext();
  if (result.response) return result.response;
  const { context } = result;
  const { id } = await params;
  if (!IdSchema.safeParse(id).success) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const parsed = FollowUpUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid update' }, { status: 400 });
  }
  const input = parsed.data;

  const { data: followUp } = await context.service
    .from('networking_followups')
    .select('id, status, kind')
    .eq('id', id)
    .eq('user_id', context.user.id)
    .maybeSingle();
  if (!followUp) return NextResponse.json({ error: 'Follow-up not found' }, { status: 404 });

  const update: Record<string, unknown> = {};
  if (input.kind !== undefined) update.kind = input.kind;
  if (input.due_at !== undefined) update.due_at = input.due_at;
  if (input.reason !== undefined) update.reason = input.reason;
  if (input.status !== undefined) {
    update.status = input.status;
    update.completed_at = input.status === 'completed' ? new Date().toISOString() : null;
  }
  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  const { error } = await context.service
    .from('networking_followups')
    .update(update)
    .eq('id', id)
    .eq('user_id', context.user.id);
  if (error) return NextResponse.json({ error: 'Could not update the follow-up' }, { status: 500 });

  if (input.status === 'completed') {
    await recordNetworkingEvent(context, 'networking_followup_completed', { kind: followUp.kind });
  }
  return NextResponse.json({ ok: true });
}
