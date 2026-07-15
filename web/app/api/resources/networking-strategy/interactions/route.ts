import { NextResponse } from 'next/server';
import { InteractionInputSchema } from '@trajectoryos/core/networking/types';
import {
  advanceContactStage,
  getNetworkingApiContext,
  loadOwnedContact,
  maybeRecordActivation,
  recordNetworkingEvent,
} from '@/lib/networking/server';

/**
 * Logs a manual networking interaction and advances the contact's stage according to the applicable rules.
 *
 * @param request - The request containing the interaction details.
 * @returns A response containing the logged interaction ID and resulting contact stage.
 */
export async function POST(request: Request) {
  const result = await getNetworkingApiContext();
  if (result.response) return result.response;
  const { context } = result;

  const parsed = InteractionInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid interaction' }, { status: 400 });
  }
  const input = parsed.data;
  const contact = await loadOwnedContact(context, input.contact_id);
  if (!contact) return NextResponse.json({ error: 'Contact not found' }, { status: 404 });

  const { data: interaction, error } = await context.service
    .from('networking_interactions')
    .insert({
      user_id: context.user.id,
      contact_id: input.contact_id,
      type: input.type,
      direction: input.direction,
      occurred_at: input.occurred_at,
      summary: input.summary,
      outcome: input.outcome,
      source: 'manual',
    })
    .select('id')
    .single();
  if (error || !interaction) {
    return NextResponse.json({ error: 'Could not log the interaction' }, { status: 500 });
  }

  const stage = await advanceContactStage(context, contact, input.type, input.direction);
  await recordNetworkingEvent(context, 'networking_interaction_logged', {
    type: input.type,
    direction: input.direction,
    stage,
  });
  if (input.type === 'email_reply' || input.type === 'linkedin_reply') {
    await recordNetworkingEvent(context, 'networking_reply_detected', { channel: input.type === 'email_reply' ? 'email' : 'linkedin', source: 'manual' });
  }
  await maybeRecordActivation(context);
  return NextResponse.json({ id: interaction.id, stage }, { status: 201 });
}
