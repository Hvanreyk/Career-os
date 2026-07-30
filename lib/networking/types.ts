import { z } from 'zod';

// ============================================================
// Networking Strategy — shared contracts
//
// Single source of truth for the networking workspace:
//   * migration 0010 CHECK constraints mirror these enums
//   * web route handlers validate request bodies against these
//   * the pure engine modules (coverage, plan, import, alumni)
//     consume the row shapes defined here
//
// Pure module — no I/O (see CLAUDE.md conventions).
// ============================================================

export const CONTACT_NAME_MAX = 120;
export const CONTACT_FIELD_MAX = 120;
export const CONTACT_NOTES_MAX = 4000;
export const CONTACT_TAG_MAX = 40;
export const CONTACT_TAGS_MAX_COUNT = 10;
export const INTERACTION_SUMMARY_MAX = 2000;
export const FOLLOWUP_REASON_MAX = 300;
export const MESSAGE_SUBJECT_MAX = 200;
export const MESSAGE_BODY_MAX = 4000;
export const MESSAGE_FACT_MAX = 300;
export const MESSAGE_FACTS_MAX_COUNT = 8;
export const CHAT_NOTES_MAX = 4000;
export const IMPORT_MAX_ROWS = 500;

// ─── Enums ───────────────────────────────────────────────────

/** Explicit relationship stage. `do_not_contact` is a separate flag. */
export const RelationshipStageSchema = z.enum([
  'prospect',
  'ready_to_contact',
  'contacted',
  'replied',
  'conversation_booked',
  'connected',
  'dormant',
]);
export type RelationshipStage = z.infer<typeof RelationshipStageSchema>;

export const ContactSenioritySchema = z.enum([
  'student',
  'analyst',
  'associate',
  'vp',
  'director',
  'md',
  'recruiter',
  'other',
]);
export type ContactSeniority = z.infer<typeof ContactSenioritySchema>;

export const ContactSourceSchema = z.enum([
  'alumni',
  'cold',
  'event',
  'introduction',
  'existing',
  'imported',
  'other',
]);
export type ContactSource = z.infer<typeof ContactSourceSchema>;

export const InteractionTypeSchema = z.enum([
  'email_sent',
  'email_reply',
  'linkedin_sent',
  'linkedin_reply',
  'call',
  'coffee_chat',
  'event',
  'introduction',
  'note',
]);
export type InteractionType = z.infer<typeof InteractionTypeSchema>;

export const InteractionDirectionSchema = z.enum(['outbound', 'inbound', 'none']);
export type InteractionDirection = z.infer<typeof InteractionDirectionSchema>;

export const FollowUpKindSchema = z.enum([
  'send_outreach',
  'follow_up_no_reply',
  'thank_you',
  'schedule_chat',
  'prep_chat',
  'debrief',
  'maintain',
  'custom',
]);
export type FollowUpKind = z.infer<typeof FollowUpKindSchema>;

export const FollowUpStatusSchema = z.enum(['open', 'snoozed', 'completed', 'cancelled']);
export type FollowUpStatus = z.infer<typeof FollowUpStatusSchema>;

export const MessageChannelSchema = z.enum(['email', 'linkedin']);
export type MessageChannel = z.infer<typeof MessageChannelSchema>;

export const MessagePurposeSchema = z.enum([
  'cold_intro',
  'linkedin_connection',
  'event_followup',
  'thank_you',
  'conversation_followup',
  'referral_request',
  'intro_request',
  'reply_response',
  'reengagement',
  'custom',
]);
export type MessagePurpose = z.infer<typeof MessagePurposeSchema>;

/**
 * Message lifecycle. Manual logging moves reviewed/draft → sent with
 * send_channel 'manual'. Provider states (sending/failed/unknown) are
 * reserved for the flag-gated direct-send path.
 */
export const MessageStateSchema = z.enum([
  'draft',
  'reviewed',
  'sending',
  'sent',
  'failed',
  'unknown',
]);
export type MessageState = z.infer<typeof MessageStateSchema>;

export const SendChannelSchema = z.enum(['manual', 'provider']);
export type SendChannel = z.infer<typeof SendChannelSchema>;

export const CoffeeChatStatusSchema = z.enum(['scheduled', 'completed', 'cancelled']);
export type CoffeeChatStatus = z.infer<typeof CoffeeChatStatusSchema>;

export const IntroductionStatusSchema = z.enum(['planned', 'requested', 'made', 'declined']);
export type IntroductionStatus = z.infer<typeof IntroductionStatusSchema>;

export const NetworkingEventStatusSchema = z.enum(['upcoming', 'attended', 'skipped']);
export type NetworkingEventStatus = z.infer<typeof NetworkingEventStatusSchema>;

export const ProviderSchema = z.enum(['google', 'microsoft']);
export type NetworkingProvider = z.infer<typeof ProviderSchema>;

export const ConnectionHealthSchema = z.enum([
  'connected',
  'reauthorisation_required',
  'error',
]);
export type ConnectionHealth = z.infer<typeof ConnectionHealthSchema>;

// ─── Input schemas (trust boundary for route handlers) ──────

const Tag = z.string().min(1).max(CONTACT_TAG_MAX);

export const ContactInputSchema = z.object({
  full_name: z.string().trim().min(1).max(CONTACT_NAME_MAX),
  firm: z.string().trim().max(CONTACT_FIELD_MAX).default(''),
  role_title: z.string().trim().max(CONTACT_FIELD_MAX).default(''),
  seniority: ContactSenioritySchema.default('other'),
  city: z.string().trim().max(CONTACT_FIELD_MAX).default(''),
  email: z.string().trim().max(CONTACT_FIELD_MAX).default(''),
  linkedin_url: z.string().trim().max(300).default(''),
  source: ContactSourceSchema.default('cold'),
  stage: RelationshipStageSchema.default('prospect'),
  priority: z.number().int().min(1).max(3).default(2),
  tags: z.array(Tag).max(CONTACT_TAGS_MAX_COUNT).default([]),
  notes: z.string().max(CONTACT_NOTES_MAX).default(''),
  do_not_contact: z.boolean().default(false),
  is_alum: z.boolean().default(false),
  event_id: z.string().uuid().nullable().default(null),
  bank_target_ids: z.array(z.string().uuid()).max(10).default([]),
});
export type ContactInput = z.infer<typeof ContactInputSchema>;

export const ContactUpdateSchema = ContactInputSchema.partial();
export type ContactUpdate = z.infer<typeof ContactUpdateSchema>;

export const InteractionInputSchema = z.object({
  contact_id: z.string().uuid(),
  type: InteractionTypeSchema,
  direction: InteractionDirectionSchema.default('none'),
  occurred_at: z.string().datetime({ offset: true }),
  summary: z.string().max(INTERACTION_SUMMARY_MAX).default(''),
  outcome: z.string().max(INTERACTION_SUMMARY_MAX).default(''),
});
export type InteractionInput = z.infer<typeof InteractionInputSchema>;

export const FollowUpInputSchema = z.object({
  contact_id: z.string().uuid(),
  kind: FollowUpKindSchema,
  due_at: z.string().datetime({ offset: true }),
  reason: z.string().max(FOLLOWUP_REASON_MAX).default(''),
});
export type FollowUpInput = z.infer<typeof FollowUpInputSchema>;

export const FollowUpUpdateSchema = z.object({
  status: FollowUpStatusSchema.optional(),
  due_at: z.string().datetime({ offset: true }).optional(),
  reason: z.string().max(FOLLOWUP_REASON_MAX).optional(),
  kind: FollowUpKindSchema.optional(),
});
export type FollowUpUpdate = z.infer<typeof FollowUpUpdateSchema>;

/** Structured, truthful context the student supplies to the AI. */
export const MessageContextSchema = z.object({
  personal_facts: z.array(z.string().min(1).max(MESSAGE_FACT_MAX)).max(MESSAGE_FACTS_MAX_COUNT).default([]),
  ask: z.string().max(MESSAGE_FACT_MAX).default(''),
  prior_interaction: z.string().max(MESSAGE_FACT_MAX).default(''),
});
export type MessageContext = z.infer<typeof MessageContextSchema>;

export const MessageInputSchema = z.object({
  contact_id: z.string().uuid(),
  channel: MessageChannelSchema,
  purpose: MessagePurposeSchema,
  subject: z.string().max(MESSAGE_SUBJECT_MAX).default(''),
  body: z.string().max(MESSAGE_BODY_MAX).default(''),
  context: MessageContextSchema.default({ personal_facts: [], ask: '', prior_interaction: '' }),
});
export type MessageInput = z.infer<typeof MessageInputSchema>;

export const CoffeeChatInputSchema = z.object({
  contact_id: z.string().uuid(),
  scheduled_at: z.string().datetime({ offset: true }),
  timezone: z.string().min(1).max(60),
  duration_minutes: z.number().int().min(10).max(120).default(30),
  location: z.string().max(CONTACT_FIELD_MAX).default(''),
  notes: z.string().max(CHAT_NOTES_MAX).default(''),
});
export type CoffeeChatInput = z.infer<typeof CoffeeChatInputSchema>;

export const ChatDebriefSchema = z.object({
  learned: z.string().max(CHAT_NOTES_MAX).default(''),
  referral_offered: z.boolean().default(false),
  names_dropped: z.array(z.string().min(1).max(CONTACT_NAME_MAX)).max(10).default([]),
  promises_made: z.string().max(CHAT_NOTES_MAX).default(''),
  outcome: z.string().max(CHAT_NOTES_MAX).default(''),
});
export type ChatDebrief = z.infer<typeof ChatDebriefSchema>;

export const IntroductionInputSchema = z.object({
  via_contact_id: z.string().uuid(),
  to_contact_id: z.string().uuid().nullable().default(null),
  to_name: z.string().trim().max(CONTACT_NAME_MAX).default(''),
  status: IntroductionStatusSchema.default('planned'),
  notes: z.string().max(CONTACT_NOTES_MAX).default(''),
});
export type IntroductionInput = z.infer<typeof IntroductionInputSchema>;

export const NetworkingEventInputSchema = z.object({
  name: z.string().trim().min(1).max(CONTACT_FIELD_MAX),
  event_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'must be YYYY-MM-DD'),
  related_firm: z.string().trim().max(CONTACT_FIELD_MAX).default(''),
  status: NetworkingEventStatusSchema.default('upcoming'),
  notes: z.string().max(CONTACT_NOTES_MAX).default(''),
});
export type NetworkingEventInput = z.infer<typeof NetworkingEventInputSchema>;

// ─── AI review / draft contracts ─────────────────────────────

export const ReviewIssueAreaSchema = z.enum([
  'relevance',
  'specificity',
  'tone',
  'brevity',
  'credibility',
  'ask',
  'timing',
  'pressure',
]);
export type ReviewIssueArea = z.infer<typeof ReviewIssueAreaSchema>;

export const ReviewIssueSchema = z.object({
  area: ReviewIssueAreaSchema,
  observation: z.string().min(1).max(500),
  why_it_matters: z.string().min(1).max(500),
  revision_question: z.string().min(1).max(500),
}).strict();

export const ReviewRewriteSchema = z.object({
  subject: z.string().max(MESSAGE_SUBJECT_MAX),
  body: z.string().min(1).max(MESSAGE_BODY_MAX),
  change_summary: z.string().min(1).max(500),
}).strict();

export const NetworkingReviewSchema = z.object({
  summary: z.string().min(1).max(800),
  strengths: z.array(z.string().min(1).max(500)).min(1).max(3),
  issues: z.array(ReviewIssueSchema).max(5),
  rewrite_options: z.array(ReviewRewriteSchema).min(1).max(3),
}).strict();
export type NetworkingReview = z.infer<typeof NetworkingReviewSchema>;

export const NetworkingDraftSchema = z.object({
  subject: z.string().max(MESSAGE_SUBJECT_MAX),
  body: z.string().min(1).max(MESSAGE_BODY_MAX),
  notes_for_student: z.string().min(1).max(800),
}).strict();
export type NetworkingDraft = z.infer<typeof NetworkingDraftSchema>;

// ─── Row shapes (as returned to the web app) ─────────────────

export interface NetworkingContactRow {
  id: string;
  full_name: string;
  firm: string;
  role_title: string;
  seniority: ContactSeniority;
  city: string;
  email: string;
  email_normalized: string | null;
  linkedin_url: string;
  linkedin_normalized: string | null;
  source: ContactSource;
  stage: RelationshipStage;
  priority: number;
  tags: string[];
  notes: string;
  do_not_contact: boolean;
  is_alum: boolean;
  event_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface NetworkingInteractionRow {
  id: string;
  contact_id: string;
  type: InteractionType;
  direction: InteractionDirection;
  occurred_at: string;
  summary: string;
  outcome: string;
  source: 'manual' | 'synced';
  created_at: string;
}

export interface NetworkingFollowUpRow {
  id: string;
  contact_id: string;
  kind: FollowUpKind;
  status: FollowUpStatus;
  due_at: string;
  reason: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface NetworkingMessageRow {
  id: string;
  contact_id: string;
  channel: MessageChannel;
  purpose: MessagePurpose;
  subject: string;
  body: string;
  context: MessageContext;
  state: MessageState;
  reviewed_hash: string | null;
  send_channel: SendChannel | null;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface NetworkingMessageReviewRow {
  id: string;
  message_id: string;
  input_hash: string;
  review: NetworkingReview;
  model: string;
  prompt_version: string;
  created_at: string;
}

export interface NetworkingCoffeeChatRow {
  id: string;
  contact_id: string;
  status: CoffeeChatStatus;
  scheduled_at: string;
  timezone: string;
  duration_minutes: number;
  location: string;
  notes: string;
  prep: Record<string, unknown> | null;
  debrief: ChatDebrief | null;
  created_at: string;
  updated_at: string;
}

export interface NetworkingIntroductionRow {
  id: string;
  via_contact_id: string;
  to_contact_id: string | null;
  to_name: string;
  status: IntroductionStatus;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface NetworkingEventRow {
  id: string;
  name: string;
  event_date: string;
  related_firm: string;
  status: NetworkingEventStatus;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface NetworkingConnectionRow {
  id: string;
  provider: NetworkingProvider;
  account_email: string;
  scopes: string[];
  health: ConnectionHealth;
  last_synced_at: string | null;
  created_at: string;
}
