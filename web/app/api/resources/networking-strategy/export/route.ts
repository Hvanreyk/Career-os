import { NextResponse } from 'next/server';
import { getNetworkingApiContext } from '@/lib/networking/server';

/**
 * Private data export: every networking record the student owns, as
 * JSON. Connection token material is never included.
 */
export async function GET() {
  const result = await getNetworkingApiContext();
  if (result.response) return result.response;
  const { context } = result;
  const userId = context.user.id;
  const service = context.service;

  const [contacts, targets, interactions, followups, chats, intros, events, messages, reviews] = await Promise.all([
    service.from('networking_contacts').select('*').eq('user_id', userId).order('created_at'),
    service.from('networking_contact_targets').select('contact_id, bank_target_id, created_at').eq('user_id', userId),
    service.from('networking_interactions').select('*').eq('user_id', userId).order('occurred_at'),
    service.from('networking_followups').select('*').eq('user_id', userId).order('due_at'),
    service.from('networking_coffee_chats').select('*').eq('user_id', userId).order('scheduled_at'),
    service.from('networking_introductions').select('*').eq('user_id', userId).order('created_at'),
    service.from('networking_events').select('*').eq('user_id', userId).order('event_date'),
    service.from('networking_messages').select('*').eq('user_id', userId).order('created_at'),
    service.from('networking_message_reviews').select('id, message_id, input_hash, review, model, prompt_version, created_at').eq('user_id', userId).order('created_at'),
  ]);

  const body = JSON.stringify({
    exported_at: new Date().toISOString(),
    contacts: contacts.data ?? [],
    contact_bank_target_links: targets.data ?? [],
    interactions: interactions.data ?? [],
    followups: followups.data ?? [],
    coffee_chats: chats.data ?? [],
    introductions: intros.data ?? [],
    events: events.data ?? [],
    messages: messages.data ?? [],
    message_reviews: reviews.data ?? [],
  }, null, 2);

  return new NextResponse(body, {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': 'attachment; filename="trajectoryos-networking-export.json"',
      'Cache-Control': 'no-store',
    },
  });
}
