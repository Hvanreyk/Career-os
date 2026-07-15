import { NextResponse } from 'next/server';
import { z } from 'zod';
import { normalizeEmail, normalizeLinkedinUrl } from '@trajectoryos/core/networking';
import { ContactUpdateSchema } from '@trajectoryos/core/networking/types';
import {
  getNetworkingApiContext,
  loadOwnedContact,
  recordNetworkingEvent,
} from '@/lib/networking/server';

const IdSchema = z.uuid();

/**
 * Updates a contact (identity fields, stage, tags, target links).
 * Stage changes here are explicit: they never create interactions.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await getNetworkingApiContext();
  if (result.response) return result.response;
  const { context } = result;
  const { id } = await params;
  if (!IdSchema.safeParse(id).success) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const contact = await loadOwnedContact(context, id);
  if (!contact) return NextResponse.json({ error: 'Contact not found' }, { status: 404 });

  const parsed = ContactUpdateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid update' }, { status: 400 });
  }
  const input = parsed.data;
  const update: Record<string, unknown> = {};
  for (const key of ['full_name', 'firm', 'role_title', 'seniority', 'city', 'source', 'stage', 'priority', 'tags', 'notes', 'do_not_contact', 'is_alum'] as const) {
    if (input[key] !== undefined) update[key] = input[key];
  }
  if (input.email !== undefined) {
    const emailNormalized = input.email ? normalizeEmail(input.email) : null;
    if (input.email && !emailNormalized) {
      return NextResponse.json({ error: 'That email address does not look valid' }, { status: 400 });
    }
    update.email = emailNormalized ? input.email.trim() : '';
    update.email_normalized = emailNormalized;
  }
  if (input.linkedin_url !== undefined) {
    const linkedinNormalized = input.linkedin_url ? normalizeLinkedinUrl(input.linkedin_url) : null;
    if (input.linkedin_url && !linkedinNormalized) {
      return NextResponse.json({ error: 'That LinkedIn URL does not look like a profile link' }, { status: 400 });
    }
    update.linkedin_url = linkedinNormalized ?? '';
    update.linkedin_normalized = linkedinNormalized;
  }

  if (Object.keys(update).length > 0) {
    const { error } = await context.service
      .from('networking_contacts')
      .update(update)
      .eq('id', id)
      .eq('user_id', context.user.id);
    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Another contact already uses this email or LinkedIn profile' }, { status: 409 });
      }
      return NextResponse.json({ error: 'Could not update the contact' }, { status: 500 });
    }
  }

  if (input.bank_target_ids !== undefined) {
    const { data: targets } = await context.service
      .from('bank_targets')
      .select('id')
      .eq('user_id', context.user.id)
      .in('id', input.bank_target_ids.length > 0 ? input.bank_target_ids : ['00000000-0000-0000-0000-000000000000']);
    const validIds = (targets ?? []).map((t) => t.id);
    await context.service
      .from('networking_contact_targets')
      .delete()
      .eq('user_id', context.user.id)
      .eq('contact_id', id);
    if (validIds.length > 0) {
      await context.service.from('networking_contact_targets').insert(
        validIds.map((bankTargetId) => ({
          user_id: context.user.id,
          contact_id: id,
          bank_target_id: bankTargetId,
        })),
      );
    }
  }

  return NextResponse.json({ ok: true });
}

/**
 * Deletes a contact and (via cascade) its interactions, follow-ups,
 * messages, reviews, chats and target links.
 */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const result = await getNetworkingApiContext();
  if (result.response) return result.response;
  const { context } = result;
  const { id } = await params;
  if (!IdSchema.safeParse(id).success) return NextResponse.json({ error: 'Invalid id' }, { status: 400 });

  const contact = await loadOwnedContact(context, id);
  if (!contact) return NextResponse.json({ error: 'Contact not found' }, { status: 404 });

  const { error } = await context.service
    .from('networking_contacts')
    .delete()
    .eq('id', id)
    .eq('user_id', context.user.id);
  if (error) return NextResponse.json({ error: 'Could not delete the contact' }, { status: 500 });

  await recordNetworkingEvent(context, 'networking_contact_deleted');
  return NextResponse.json({ ok: true });
}
