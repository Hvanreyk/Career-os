import { NextResponse } from 'next/server';
import { normalizeEmail, normalizeLinkedinUrl } from '@trajectoryos/core/networking';
import { ContactInputSchema } from '@trajectoryos/core/networking/types';
import {
  getNetworkingApiContext,
  recordNetworkingEvent,
} from '@/lib/networking/server';

/**
 * Creates a networking contact, optionally linked to bank targets.
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

  const { data: contact, error } = await context.service
    .from('networking_contacts')
    .insert({
      user_id: context.user.id,
      full_name: input.full_name,
      firm: input.firm,
      role_title: input.role_title,
      seniority: input.seniority,
      city: input.city,
      email: emailNormalized ? input.email.trim() : '',
      email_normalized: emailNormalized,
      linkedin_url: linkedinNormalized ?? '',
      linkedin_normalized: linkedinNormalized,
      source: input.source,
      stage: input.stage,
      priority: input.priority,
      tags: input.tags,
      notes: input.notes,
      do_not_contact: input.do_not_contact,
      is_alum: input.is_alum,
      event_id: input.event_id,
    })
    .select('id')
    .single();
  if (error || !contact) {
    if (error?.code === '23505') {
      return NextResponse.json({ error: 'You already have a contact with this email or LinkedIn profile' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Could not create the contact' }, { status: 500 });
  }

  if (input.bank_target_ids.length > 0) {
    const { data: targets } = await context.service
      .from('bank_targets')
      .select('id')
      .eq('user_id', context.user.id)
      .in('id', input.bank_target_ids);
    const validIds = (targets ?? []).map((t) => t.id);
    if (validIds.length > 0) {
      await context.service.from('networking_contact_targets').insert(
        validIds.map((bankTargetId) => ({
          user_id: context.user.id,
          contact_id: contact.id,
          bank_target_id: bankTargetId,
        })),
      );
    }
  }

  await recordNetworkingEvent(context, 'networking_contact_created', {
    source: input.source,
    stage: input.stage,
    has_email: Boolean(emailNormalized),
    has_linkedin: Boolean(linkedinNormalized),
  });
  return NextResponse.json({ id: contact.id }, { status: 201 });
}
