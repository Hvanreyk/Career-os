import { NextResponse } from 'next/server';
import { FollowUpInputSchema } from '@trajectoryos/core/networking/types';
import {
  getNetworkingApiContext,
  maybeRecordActivation,
  recordNetworkingEvent,
} from '@/lib/networking/server';

/**
 * Schedules the contact's next action. Each contact has at most one
 * active follow-up: scheduling while one exists reschedules it.
 * Uses an atomic upsert (schedule_networking_followup) through the
 * one-active partial unique index, so two concurrent requests can
 * never both observe no active follow-up and both insert one.
 */
export async function POST(request: Request) {
  const result = await getNetworkingApiContext();
  if (result.response) return result.response;
  const { context } = result;

  const parsed = FollowUpInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid follow-up' }, { status: 400 });
  }
  const input = parsed.data;

  const { data: rows, error } = await context.service.rpc('schedule_networking_followup', {
    p_user_id: context.user.id,
    p_contact_id: input.contact_id,
    p_kind: input.kind,
    p_due_at: input.due_at,
    p_reason: input.reason,
  });
  if (error) {
    if (error.message?.includes('CONTACT_NOT_FOUND')) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Could not schedule the follow-up' }, { status: 500 });
  }
  const outcome = Array.isArray(rows) ? rows[0] : rows;
  if (!outcome) return NextResponse.json({ error: 'Could not schedule the follow-up' }, { status: 500 });

  await recordNetworkingEvent(context, 'networking_followup_scheduled', {
    kind: input.kind,
    rescheduled: outcome.rescheduled,
  });
  await maybeRecordActivation(context);
  return NextResponse.json({ id: outcome.id }, { status: outcome.rescheduled ? 200 : 201 });
}
