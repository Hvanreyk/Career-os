import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { advanceStage } from '@trajectoryos/core/networking';
import type {
  InteractionDirection,
  InteractionType,
  RelationshipStage,
} from '@trajectoryos/core/networking/types';
import { getRequestUser } from '@/lib/auth';
import { resourceHasCapability, type ResourceCapability } from '@/lib/resources/catalog';
import { createServiceClient } from '@/lib/supabase/server';

export const NETWORKING_RESOURCE_SLUG = 'networking-strategy';

type ServiceClient = ReturnType<typeof createServiceClient>;

export interface NetworkingOwnerContext {
  user: User;
  service: ServiceClient;
}

export interface NetworkingApiContext extends NetworkingOwnerContext {
  course: { id: string; slug: string };
}

export type NetworkingContextResult =
  | { context: NetworkingApiContext; response?: never }
  | { context?: never; response: NextResponse };

export type NetworkingOwnerContextResult =
  | { context: NetworkingOwnerContext; response?: never }
  | { context?: never; response: NextResponse };

/**
 * Authenticates the requester and verifies access to the published
 * Networking Strategy workspace.
 *
 * @param capability - The catalog capability the handler exercises
 * @returns An authenticated context, or an HTTP error response
 */
export async function getNetworkingApiContext(
  capability: ResourceCapability = 'contacts',
): Promise<NetworkingContextResult> {
  const user = await getRequestUser();
  if (!user) {
    return { response: NextResponse.json({ error: 'Unauthorised' }, { status: 401 }) };
  }
  if (!resourceHasCapability(NETWORKING_RESOURCE_SLUG, capability)) {
    return { response: NextResponse.json({ error: 'Not available' }, { status: 404 }) };
  }
  const service = createServiceClient();
  const { data: course } = await service
    .from('courses')
    .select('id, slug, status')
    .eq('slug', NETWORKING_RESOURCE_SLUG)
    .maybeSingle();
  if (!course || course.status !== 'published') {
    return { response: NextResponse.json({ error: 'Not available' }, { status: 404 }) };
  }
  return { context: { user, service, course: { id: course.id, slug: course.slug } } };
}

/**
 * Authenticates the requester only — no capability or publish-state
 * check. Destructive privacy controls (delete all data, disconnect a
 * provider) must stay reachable even if the resource is later
 * unpublished or withdrawn, so a user can still remove retained data
 * and credentials.
 */
export async function getNetworkingOwnerContext(): Promise<NetworkingOwnerContextResult> {
  const user = await getRequestUser();
  if (!user) {
    return { response: NextResponse.json({ error: 'Unauthorised' }, { status: 401 }) };
  }
  return { context: { user, service: createServiceClient() } };
}

/**
 * Records a text-free networking product event. Properties may include
 * enum-like values (provider, channel, purpose, stage, counts) but must
 * never contain names, firms, addresses, message content, notes, tokens,
 * or provider-issued identifiers (account IDs, connection IDs, message IDs).
 */
export async function recordNetworkingEvent(
  context: NetworkingOwnerContext,
  eventName: string,
  properties: Record<string, string | number | boolean | null> = {},
): Promise<void> {
  const { error } = await context.service.from('product_events').insert({
    user_id: context.user.id,
    event_name: eventName,
    resource_slug: NETWORKING_RESOURCE_SLUG,
    properties,
  });
  if (error) console.error(`networking event insert failed (${eventName}):`, error.message);
}

/** Daily limit shared by AI drafting and review (1–1000, default 25). */
export function getNetworkingAiDailyLimit(): number {
  const value = Number(process.env.NETWORKING_AI_DAILY_LIMIT ?? '25');
  return Number.isInteger(value) && value >= 1 && value <= 1000 ? value : 25;
}

/**
 * Content hash binding reviews/sends to the exact message text. Must
 * match save_networking_message_review in migration 0010:
 * sha256(coalesce(subject,'') || '\n' || body).
 */
export function hashMessageContent(subject: string, body: string): string {
  return createHash('sha256').update(`${subject}\n${body}`).digest('hex');
}

/** Loads a contact and asserts ownership; null when absent. */
export async function loadOwnedContact(
  context: NetworkingApiContext,
  contactId: string,
): Promise<{ id: string; stage: RelationshipStage; seniority: string; full_name: string; email: string; email_normalized: string | null; do_not_contact: boolean } | null> {
  const { data } = await context.service
    .from('networking_contacts')
    .select('id, stage, seniority, full_name, email, email_normalized, do_not_contact')
    .eq('id', contactId)
    .eq('user_id', context.user.id)
    .maybeSingle();
  return data ?? null;
}

/**
 * Advances a contact's stage in response to a logged interaction,
 * using the engine's never-regress rules. Compare-and-swap: the
 * update is scoped to the stage this call actually read, so a
 * concurrent transition can never be silently overwritten. If the
 * stage changed underneath this call, the row's current stage is
 * returned as-is rather than blindly applying a now-stale `next`.
 */
export async function advanceContactStage(
  context: NetworkingApiContext,
  contact: { id: string; stage: RelationshipStage },
  type: InteractionType,
  direction: InteractionDirection,
): Promise<RelationshipStage> {
  const next = advanceStage(contact.stage, type, direction);
  if (next === contact.stage) return next;

  const { data: updated, error } = await context.service
    .from('networking_contacts')
    .update({ stage: next })
    .eq('id', contact.id)
    .eq('user_id', context.user.id)
    .eq('stage', contact.stage)
    .select('stage')
    .maybeSingle();
  if (error) throw error;
  if (updated) return updated.stage as RelationshipStage;

  const { data: current, error: refetchError } = await context.service
    .from('networking_contacts')
    .select('stage')
    .eq('id', contact.id)
    .eq('user_id', context.user.id)
    .maybeSingle();
  if (refetchError) throw refetchError;
  return (current?.stage as RelationshipStage | undefined) ?? contact.stage;
}

/**
 * Fires networking_activation_completed once the compound activation
 * (contact + logged outreach + scheduled follow-up) first holds.
 * Cheap existence checks; the event row itself is deduplicated by
 * checking for a prior activation event.
 */
export async function maybeRecordActivation(context: NetworkingApiContext): Promise<void> {
  const service = context.service;
  const userId = context.user.id;
  const [{ count: contacts }, { count: outreach }, { count: followups }, { count: prior }] = await Promise.all([
    service.from('networking_contacts').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    service.from('networking_interactions').select('id', { count: 'exact', head: true })
      .eq('user_id', userId).eq('direction', 'outbound'),
    service.from('networking_followups').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    service.from('product_events').select('id', { count: 'exact', head: true })
      .eq('user_id', userId).eq('event_name', 'networking_activation_completed'),
  ]);
  if ((prior ?? 0) > 0) return;
  if ((contacts ?? 0) > 0 && (outreach ?? 0) > 0 && (followups ?? 0) > 0) {
    await recordNetworkingEvent(context, 'networking_activation_completed');
  }
}
