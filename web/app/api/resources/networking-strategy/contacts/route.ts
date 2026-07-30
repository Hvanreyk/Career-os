import { NextResponse } from 'next/server';
import { normalizeEmail, normalizeLinkedinUrl } from '@trajectoryos/core/networking';
import { ContactInputSchema } from '@trajectoryos/core/networking/types';
import {
  getNetworkingApiContext,
  recordNetworkingEvent,
} from '@/lib/networking/server';

/**
 * Creates a networking contact, optionally linked to bank targets.
 * Contact creation and target linking commit atomically (see
 * create_networking_contact_with_targets in migration 0010) so a
 * target-link failure can never silently drop requested associations.
 */
export async function POST(request: Request) {
  const result = await getNetworkingApiContext();
  if (result.response) return result.response;
  const { context } = result;

  const parsed = ContactInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid contact' }, { status: 400 });
  }
  const input = parsed.data;
  const emailNormalized = input.email ? normalizeEmail(input.email) : null;
  const linkedinNormalized = input.linkedin_url ? normalizeLinkedinUrl(input.linkedin_url) : null;
  if (input.email && !emailNormalized) {
    return NextResponse.json({ error: 'That email address does not look valid' }, { status: 400 });
  }
  if (input.linkedin_url && !linkedinNormalized) {
    return NextResponse.json({ error: 'That LinkedIn URL does not look like a profile link (linkedin.com/in/...)' }, { status: 400 });
  }

  if (input.event_id) {
    const { data: event } = await context.service
      .from('networking_events')
      .select('id')
      .eq('id', input.event_id)
      .eq('user_id', context.user.id)
      .maybeSingle();
    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }

  const { data: contactId, error } = await context.service.rpc('create_networking_contact_with_targets', {
    p_user_id: context.user.id,
    p_full_name: input.full_name,
    p_firm: input.firm,
    p_role_title: input.role_title,
    p_seniority: input.seniority,
    p_city: input.city,
    p_email: emailNormalized ? input.email.trim() : '',
    p_email_normalized: emailNormalized,
    p_linkedin_url: linkedinNormalized ?? '',
    p_linkedin_normalized: linkedinNormalized,
    p_source: input.source,
    p_stage: input.stage,
    p_priority: input.priority,
    p_tags: input.tags,
    p_notes: input.notes,
    p_do_not_contact: input.do_not_contact,
    p_is_alum: input.is_alum,
    p_event_id: input.event_id,
    p_bank_target_ids: input.bank_target_ids,
  });
  if (error || !contactId) {
    if (error?.code === '23505') {
      return NextResponse.json({ error: 'You already have a contact with this email or LinkedIn profile' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Could not create the contact' }, { status: 500 });
  }

  await recordNetworkingEvent(context, 'networking_contact_created', {
    source: input.source,
    stage: input.stage,
    has_email: Boolean(emailNormalized),
    has_linkedin: Boolean(linkedinNormalized),
  });
  return NextResponse.json({ id: contactId }, { status: 201 });
}
