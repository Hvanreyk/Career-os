import type { Metadata } from 'next';
import type { NetworkingContactRow, NetworkingMessageRow } from '@trajectoryos/core/networking/types';
import { MessageLabView } from '@/components/networking/MessageLabView';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Networking — Message Lab' };
export const dynamic = 'force-dynamic';

/**
 * Message Lab: draft, AI-draft, deterministic preflight, AI review,
 * revise, and send (manual mailto/copy or log-as-sent).
 */
export default async function NetworkMessagesPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseSlug: string }>;
  searchParams: Promise<{ contact?: string; channel?: string; message?: string }>;
}) {
  await params;
  const query = await searchParams;
  const supabase = await createClient();

  const [contactsResult, messagesResult] = await Promise.all([
    supabase.from('networking_contacts')
      .select('id, full_name, firm, role_title, seniority, city, email, email_normalized, linkedin_url, linkedin_normalized, stage, is_alum, do_not_contact')
      .order('full_name')
      .limit(1000),
    supabase.from('networking_messages').select('*').order('updated_at', { ascending: false }).limit(200),
  ]);

  return (
    <MessageLabView
      contacts={(contactsResult.data ?? []) as Pick<NetworkingContactRow, 'id' | 'full_name' | 'firm' | 'role_title' | 'seniority' | 'city' | 'email' | 'email_normalized' | 'linkedin_url' | 'linkedin_normalized' | 'stage' | 'is_alum' | 'do_not_contact'>[]}
      messages={(messagesResult.data ?? []) as NetworkingMessageRow[]}
      initialContactId={query.contact ?? null}
      initialChannel={query.channel === 'linkedin' ? 'linkedin' : 'email'}
      initialMessageId={query.message ?? null}
    />
  );
}
