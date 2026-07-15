import { NextResponse } from 'next/server';
import { IntroductionInputSchema } from '@trajectoryos/core/networking/types';
import {
  getNetworkingApiContext,
  loadOwnedContact,
  recordNetworkingEvent,
} from '@/lib/networking/server';

/**
 * Records a warm-introduction chain: who can introduce you, to whom.
 */
export async function POST(request: Request) {
  const result = await getNetworkingApiContext();
  if (result.response) return result.response;
  const { context } = result;

  const parsed = IntroductionInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid introduction' }, { status: 400 });
  }
  const input = parsed.data;
  if (!input.to_contact_id && !input.to_name.trim()) {
    return NextResponse.json({ error: 'Name the person you want to be introduced to' }, { status: 400 });
  }
  const via = await loadOwnedContact(context, input.via_contact_id);
  if (!via) return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
  if (input.to_contact_id) {
    const to = await loadOwnedContact(context, input.to_contact_id);
    if (!to) return NextResponse.json({ error: 'Target contact not found' }, { status: 404 });
  }

  const { data: intro, error } = await context.service
    .from('networking_introductions')
    .insert({
      user_id: context.user.id,
      via_contact_id: input.via_contact_id,
      to_contact_id: input.to_contact_id,
      to_name: input.to_name,
      status: input.status,
      notes: input.notes,
    })
    .select('id')
    .single();
  if (error || !intro) return NextResponse.json({ error: 'Could not record the introduction' }, { status: 500 });

  await recordNetworkingEvent(context, 'networking_introduction_recorded', { status: input.status });
  return NextResponse.json({ id: intro.id }, { status: 201 });
}
