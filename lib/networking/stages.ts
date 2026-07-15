import type {
  InteractionDirection,
  InteractionType,
  RelationshipStage,
} from './types';

// ============================================================
// Relationship-stage machine.
//
// Stages are explicit: dragging a card or picking from a menu sets
// the stage directly and never manufactures interactions. Logging an
// interaction may ADVANCE the stage (never regress it) via
// stageImpliedByInteraction — e.g. logging an email reply moves a
// 'contacted' contact to 'replied', but leaves a 'connected' one alone.
// ============================================================

export const STAGE_ORDER: readonly RelationshipStage[] = [
  'prospect',
  'ready_to_contact',
  'contacted',
  'replied',
  'conversation_booked',
  'connected',
  'dormant',
];

/** Human labels for stage chips and the pipeline board. */
export const STAGE_LABELS: Record<RelationshipStage, string> = {
  prospect: 'Prospect',
  ready_to_contact: 'Ready to contact',
  contacted: 'Contacted',
  replied: 'Replied',
  conversation_booked: 'Conversation booked',
  connected: 'Connected',
  dormant: 'Dormant',
};

/**
 * Determines the forward-progression rank of a relationship stage.
 *
 * @param stage - The relationship stage to rank
 * @returns The stage's zero-based position in the progression ladder, or `-1` for `dormant`
 */
export function stageRank(stage: RelationshipStage): number {
  if (stage === 'dormant') return -1;
  return STAGE_ORDER.indexOf(stage);
}

/**
 * Compares the progression of two relationship stages.
 *
 * @param a - The stage to evaluate
 * @param b - The reference stage
 * @returns `true` if `a` is at least as advanced as `b`, `false` otherwise.
 */
export function stageAtLeast(a: RelationshipStage, b: RelationshipStage): boolean {
  return stageRank(a) >= stageRank(b);
}

/**
 * Determines the minimum relationship stage implied by an interaction.
 *
 * @returns The implied relationship stage, or `null` when the interaction provides no stage signal.
 */
export function stageImpliedByInteraction(
  type: InteractionType,
  direction: InteractionDirection,
): RelationshipStage | null {
  switch (type) {
    case 'email_sent':
    case 'linkedin_sent':
      return 'contacted';
    case 'email_reply':
    case 'linkedin_reply':
      return 'replied';
    case 'call':
      return direction === 'inbound' ? 'replied' : 'contacted';
    case 'coffee_chat':
      return 'connected';
    default:
      return null;
  }
}

/**
 * Advances a contact's stage in response to a logged interaction.
 *
 * @returns The new stage — never a regression, and never away from a
 *   deliberate 'dormant' unless the interaction itself implies renewed
 *   contact (any implied stage revives a dormant contact).
 */
export function advanceStage(
  current: RelationshipStage,
  type: InteractionType,
  direction: InteractionDirection,
): RelationshipStage {
  const implied = stageImpliedByInteraction(type, direction);
  if (!implied) return current;
  if (current === 'dormant') return implied;
  return stageAtLeast(current, implied) ? current : implied;
}
