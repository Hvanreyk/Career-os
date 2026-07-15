import { NextResponse } from 'next/server';
import {
  getNetworkingApiContext,
  recordNetworkingEvent,
} from '@/lib/networking/server';

/**
 * Deletes the requester's stored networking data and records the deletion event.
 *
 * @returns A JSON response with `{ ok: true }` after successful deletion, or an error response when the request context or deletion cannot be completed.
 */
export async function DELETE() {
  const result = await getNetworkingApiContext();
  if (result.response) return result.response;
  const { context } = result;
  const userId = context.user.id;
  const service = context.service;

  // Order matters only for clarity; contacts cascade to most children,
  // connections cascade to sync jobs.
  const tables = [
    'networking_introductions',
    'networking_contacts',
    'networking_events',
    'networking_connections',
  ] as const;
  for (const table of tables) {
    const { error } = await service.from(table).delete().eq('user_id', userId);
    if (error) {
      return NextResponse.json({ error: 'Deletion did not complete; try again' }, { status: 500 });
    }
  }

  await recordNetworkingEvent(context, 'networking_data_deleted');
  return NextResponse.json({ ok: true });
}
