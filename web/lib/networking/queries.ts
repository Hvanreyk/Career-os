import {
  computeCoverage,
  type CoverageContact,
  type CoverageSummary,
  type CoverageTarget,
  type PlanCoffeeChat,
  type PlanContact,
  type PlanFollowUp,
} from '@trajectoryos/core/networking';
import type {
  NetworkingContactRow,
  NetworkingCoffeeChatRow,
  NetworkingFollowUpRow,
} from '@trajectoryos/core/networking/types';
import { createClient } from '@/lib/supabase/server';

// ============================================================
// Server-component data loading for the networking workspace.
// Reads go through the user-scoped client (RLS) — same posture as
// the resume workshop pages.
// ============================================================

export interface InteractionSummaryRow {
  id: string;
  contact_id: string;
  type: string;
  direction: string;
  occurred_at: string;
}

export interface BankTargetRow {
  id: string;
  bank_name: string;
  tier: string | null;
  priority: number;
  status: string;
  apps_close: string | null;
}

export interface ContactTargetLink {
  contact_id: string;
  bank_target_id: string;
}

export interface NetworkingWorkspaceData {
  contacts: NetworkingContactRow[];
  followUps: NetworkingFollowUpRow[];
  interactions: InteractionSummaryRow[];
  coffeeChats: NetworkingCoffeeChatRow[];
  targets: BankTargetRow[];
  links: ContactTargetLink[];
}

/** Loads everything the Today / Pipeline / Target Map views derive from. */
export async function loadWorkspaceData(): Promise<NetworkingWorkspaceData> {
  const supabase = await createClient();
  const [contacts, followUps, interactions, coffeeChats, targets, links] = await Promise.all([
    supabase.from('networking_contacts').select('*').order('updated_at', { ascending: false }).limit(1000),
    supabase.from('networking_followups').select('*').in('status', ['open', 'snoozed']).order('due_at').limit(1000),
    supabase.from('networking_interactions')
      .select('id, contact_id, type, direction, occurred_at')
      .order('occurred_at', { ascending: false })
      .limit(2000),
    supabase.from('networking_coffee_chats').select('*').order('scheduled_at', { ascending: false }).limit(500),
    supabase.from('bank_targets').select('id, bank_name, tier, priority, status, apps_close').order('sort_order'),
    supabase.from('networking_contact_targets').select('contact_id, bank_target_id'),
  ]);
  return {
    contacts: (contacts.data ?? []) as NetworkingContactRow[],
    followUps: (followUps.data ?? []) as NetworkingFollowUpRow[],
    interactions: (interactions.data ?? []) as InteractionSummaryRow[],
    coffeeChats: (coffeeChats.data ?? []) as NetworkingCoffeeChatRow[],
    targets: (targets.data ?? []) as BankTargetRow[],
    links: (links.data ?? []) as ContactTargetLink[],
  };
}

export interface PlanInputs {
  contacts: PlanContact[];
  followUps: PlanFollowUp[];
  coffeeChats: PlanCoffeeChat[];
  coverage: CoverageSummary;
}

/** Maps raw workspace rows into the pure engine's input shapes. */
export function buildPlanInputs(data: NetworkingWorkspaceData, nowIso: string): PlanInputs {
  const contactName = new Map(data.contacts.map((c) => [c.id, c.full_name]));
  const lastOutbound = new Map<string, string>();
  const lastInbound = new Map<string, string>();
  const lastAny = new Map<string, string>();
  for (const interaction of data.interactions) {
    if (!lastAny.has(interaction.contact_id)) lastAny.set(interaction.contact_id, interaction.occurred_at);
    if (interaction.direction === 'outbound' && !lastOutbound.has(interaction.contact_id)) {
      lastOutbound.set(interaction.contact_id, interaction.occurred_at);
    }
    if (interaction.direction === 'inbound' && !lastInbound.has(interaction.contact_id)) {
      lastInbound.set(interaction.contact_id, interaction.occurred_at);
    }
  }
  const activeFollowUpContacts = new Set(data.followUps.map((f) => f.contact_id));

  const planContacts: PlanContact[] = data.contacts.map((contact) => ({
    id: contact.id,
    full_name: contact.full_name,
    stage: contact.stage,
    do_not_contact: contact.do_not_contact,
    created_at: contact.created_at,
    last_outbound_at: lastOutbound.get(contact.id) ?? null,
    last_inbound_at: lastInbound.get(contact.id) ?? null,
    has_active_followup: activeFollowUpContacts.has(contact.id),
  }));

  const planFollowUps: PlanFollowUp[] = data.followUps.map((followUp) => ({
    id: followUp.id,
    contact_id: followUp.contact_id,
    contact_name: contactName.get(followUp.contact_id) ?? 'a contact',
    kind: followUp.kind,
    status: followUp.status,
    due_at: followUp.due_at,
  }));

  const planChats: PlanCoffeeChat[] = data.coffeeChats.map((chat) => ({
    id: chat.id,
    contact_id: chat.contact_id,
    contact_name: contactName.get(chat.contact_id) ?? 'a contact',
    status: chat.status,
    scheduled_at: chat.scheduled_at,
    has_prep: Boolean(chat.prep && ((chat.prep as { research_notes?: string; my_ask?: string }).research_notes || (chat.prep as { my_ask?: string }).my_ask)),
    has_debrief: Boolean(chat.debrief),
  }));

  const linksByContact = new Map<string, string[]>();
  for (const link of data.links) {
    const list = linksByContact.get(link.contact_id) ?? [];
    list.push(link.bank_target_id);
    linksByContact.set(link.contact_id, list);
  }
  const coverageContacts: CoverageContact[] = data.contacts.map((contact) => ({
    id: contact.id,
    full_name: contact.full_name,
    stage: contact.stage,
    seniority: contact.seniority,
    do_not_contact: contact.do_not_contact,
    bank_target_ids: linksByContact.get(contact.id) ?? [],
    last_interaction_at: lastAny.get(contact.id) ?? null,
    has_active_followup: activeFollowUpContacts.has(contact.id),
  }));
  const coverageTargets: CoverageTarget[] = data.targets.map((target) => ({
    id: target.id,
    bank_name: target.bank_name,
    tier: target.tier,
    priority: target.priority,
    status: target.status,
    apps_close: target.apps_close,
  }));

  return {
    contacts: planContacts,
    followUps: planFollowUps,
    coffeeChats: planChats,
    coverage: computeCoverage(coverageTargets, coverageContacts, nowIso),
  };
}
