import { NextResponse } from 'next/server';
import {
  getNetworkingOwnerContext,
  recordNetworkingEvent,
} from '@/lib/networking/server';

/**
 * Deletes ALL of the requester's networking data: contacts (cascading
 * to interactions, follow-ups, chats, target links, messages and
 * reviews), events, introductions, send attempts, connections and
 * their sync jobs. Sent emails and external calendar events are not
 * recalled — that is disclosed in the UI before confirmation. All
 * deletions commit as one transaction (see delete_all_networking_data
 * in migration 0010), so a mid-sequence failure can never leave only
 * part of "delete everything" applied.
 */
export async function DELETE() {
  const result = await getNetworkingOwnerContext();
  if (result.response) return result.response;
  const { context } = result;

  const { error } = await context.service.rpc('delete_all_networking_data', {
    p_user_id: context.user.id,
  });
  if (error) {
    return NextResponse.json({ error: 'Deletion did not complete; try again' }, { status: 500 });
  }

  await recordNetworkingEvent(context, 'networking_data_deleted');
  return NextResponse.json({ ok: true });
}
