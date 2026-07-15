import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type {
  NetworkingCoffeeChatRow,
  NetworkingContactRow,
  NetworkingFollowUpRow,
  NetworkingIntroductionRow,
  NetworkingMessageRow,
} from '@trajectoryos/core/networking/types';
import { ContactDetail } from '@/components/networking/ContactDetail';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Networking — Contact' };
export const dynamic = 'force-dynamic';

interface InteractionRow {
  id: string;
  type: string;
  direction: string;
  occurred_at: string;
  summary: string;
  outcome: string;
  source: string;
}

/**
 * Displays a networking contact's details and related activity.
 *
 * @param params - Route parameters containing the course slug and contact ID.
 * @returns The contact detail page.
 */
export default async function NetworkContactDetailPage({
  params,
}: {
  params: Promise<{ courseSlug: string; id: string }>;
}) {
  const { courseSlug, id } = await params;
  const supabase = await createClient();
  const { data: contact } = await supabase
    .from('networking_contacts')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (!contact) notFound();

  const [interactions, followUps, messages, chats, intros, targets, links, allContacts] = await Promise.all([
    supabase.from('networking_interactions').select('id, type, direction, occurred_at, summary, outcome, source').eq('contact_id', id).order('occurred_at', { ascending: false }).limit(200),
    supabase.from('networking_followups').select('*').eq('contact_id', id).order('created_at', { ascending: false }).limit(50),
    supabase.from('networking_messages').select('*').eq('contact_id', id).order('updated_at', { ascending: false }).limit(50),
    supabase.from('networking_coffee_chats').select('*').eq('contact_id', id).order('scheduled_at', { ascending: false }).limit(50),
    supabase.from('networking_introductions').select('*').eq('via_contact_id', id).order('created_at', { ascending: false }).limit(50),
    supabase.from('bank_targets').select('id, bank_name').order('sort_order'),
    supabase.from('networking_contact_targets').select('bank_target_id').eq('contact_id', id),
    supabase.from('networking_contacts').select('id, full_name').neq('id', id).order('full_name').limit(500),
  ]);

  return (
    <ContactDetail
      base={`/resources/${courseSlug}/network`}
      contact={contact as NetworkingContactRow}
      interactions={(interactions.data ?? []) as InteractionRow[]}
      followUps={(followUps.data ?? []) as NetworkingFollowUpRow[]}
      messages={(messages.data ?? []) as NetworkingMessageRow[]}
      chats={(chats.data ?? []) as NetworkingCoffeeChatRow[]}
      introductions={(intros.data ?? []) as NetworkingIntroductionRow[]}
      targets={(targets.data ?? []) as Array<{ id: string; bank_name: string }>}
      linkedTargetIds={((links.data ?? []) as Array<{ bank_target_id: string }>).map((l) => l.bank_target_id)}
      otherContacts={(allContacts.data ?? []) as Array<{ id: string; full_name: string }>}
    />
  );
}
