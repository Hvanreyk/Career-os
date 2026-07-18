import { z } from 'zod';
import { RESUME_BULLET_MAX_LENGTH, ResumeSectionKindSchema } from './types';

// The structured-document "lingua franca" for Resume Builder v2. These
// schemas validate LLM structured output (import/compose proposals), the
// replace_resume_document RPC payload, and export input. Keep every object
// .strict() and use .nullable() (not .optional()) so they stay compatible
// with OpenAI structured outputs via zodTextFormat.

export const RESUME_MAX_SECTIONS = 12;
export const RESUME_MAX_ENTRIES_PER_SECTION = 10;
export const RESUME_MAX_BULLETS_PER_ENTRY = 12;

export const ResumeContactSchema = z.object({
  full_name: z.string().min(1).max(120).nullable(),
  email: z.string().min(3).max(254).nullable(),
  phone: z.string().min(1).max(40).nullable(),
  linkedin_url: z.string().min(1).max(200).nullable(),
  location: z.string().min(1).max(120).nullable(),
}).strict();
export type ResumeContact = z.infer<typeof ResumeContactSchema>;

export const ResumeEntryDraftSchema = z.object({
  org: z.string().min(1).max(120),
  role_title: z.string().min(1).max(120).nullable(),
  location: z.string().min(1).max(80).nullable(),
  date_range: z.string().min(1).max(60).nullable(),
  bullets: z.array(z.string().min(1).max(RESUME_BULLET_MAX_LENGTH))
    .max(RESUME_MAX_BULLETS_PER_ENTRY),
}).strict();
export type ResumeEntryDraft = z.infer<typeof ResumeEntryDraftSchema>;

export const ResumeSectionDraftSchema = z.object({
  kind: ResumeSectionKindSchema,
  heading: z.string().min(1).max(80),
  entries: z.array(ResumeEntryDraftSchema).max(RESUME_MAX_ENTRIES_PER_SECTION),
  // Section-level bullets with no entry (skills lines, interests, awards).
  loose_bullets: z.array(z.string().min(1).max(RESUME_BULLET_MAX_LENGTH))
    .max(RESUME_MAX_BULLETS_PER_ENTRY),
}).strict();
export type ResumeSectionDraft = z.infer<typeof ResumeSectionDraftSchema>;

export const ResumeDocumentSchema = z.object({
  contact: ResumeContactSchema,
  sections: z.array(ResumeSectionDraftSchema).max(RESUME_MAX_SECTIONS),
}).strict();
export type ResumeDocument = z.infer<typeof ResumeDocumentSchema>;

/**
 * Whether a document has any substantive content — at least one entry or
 * section-level bullet. An empty-but-titled section (heading with no
 * entries/bullets yet) does not count, so export/improve/tailor routes don't
 * operate on a resume that has nothing to work with.
 */
export function hasResumeContent(document: ResumeDocument): boolean {
  return document.sections.some(
    (section) => section.entries.length > 0 || section.loose_bullets.length > 0,
  );
}

// ─── Index-addressed changes (improve / tailor proposals) ───
//
// Targets address the serialized snapshot the LLM saw (see serialize.ts):
// entry bullets are (section_index, entry_index, bullet_index); loose
// bullets are (section_index, null, bullet_index); entry/section fields
// leave bullet_index null.

export const ResumeChangeTargetSchema = z.object({
  section_index: z.number().int().min(0).max(RESUME_MAX_SECTIONS - 1),
  entry_index: z.number().int().min(0).max(RESUME_MAX_ENTRIES_PER_SECTION - 1).nullable(),
  bullet_index: z.number().int().min(0).max(RESUME_MAX_BULLETS_PER_ENTRY - 1).nullable(),
  field: z.enum(['heading', 'org', 'role_title', 'location', 'date_range', 'bullet']),
}).strict();
export type ResumeChangeTarget = z.infer<typeof ResumeChangeTargetSchema>;

export const ResumeChangeSchema = z.object({
  target: ResumeChangeTargetSchema,
  original: z.string().max(RESUME_BULLET_MAX_LENGTH),
  proposed: z.string().min(1).max(RESUME_BULLET_MAX_LENGTH),
  rationale: z.string().min(1).max(500),
}).strict();
export type ResumeChange = z.infer<typeof ResumeChangeSchema>;

// Exported for zod-v4 consumers (web) that cannot wrap v3 schemas.
export const ResumeChangeListSchema = z.array(ResumeChangeSchema).max(40);

export const ResumeImproveOutputSchema = z.object({
  summary: z.string().min(1).max(800),
  changes: z.array(ResumeChangeSchema).max(40),
  // Reference-repo "experience discovery": questions that could surface
  // undocumented truthful material. Never answered by the model itself.
  discovery_questions: z.array(z.string().min(1).max(300)).max(5),
}).strict();
export type ResumeImproveOutput = z.infer<typeof ResumeImproveOutputSchema>;

// ─── JD tailoring ───────────────────────────────────────────

export const JdRequirementSchema = z.object({
  id: z.string().min(1).max(40),
  text: z.string().min(1).max(300),
  kind: z.enum(['must_have', 'nice_to_have']),
  keywords: z.array(z.string().min(1).max(60)).max(10),
}).strict();
export type JdRequirement = z.infer<typeof JdRequirementSchema>;

export const JdMatchSchema = z.object({
  requirement_id: z.string().min(1).max(40),
  match: z.enum(['direct', 'stretch', 'gap']),
  // Where in the existing resume the evidence lives. Empty only for gaps.
  evidence_refs: z.array(ResumeChangeTargetSchema).max(5),
  note: z.string().min(1).max(400),
}).strict().superRefine((value, ctx) => {
  if (value.match === 'gap') {
    if (value.evidence_refs.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'A gap match must not cite evidence_refs',
        path: ['evidence_refs'],
      });
    }
  } else if (value.evidence_refs.length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Direct and stretch matches require at least one evidence reference',
      path: ['evidence_refs'],
    });
  }
});
export type JdMatch = z.infer<typeof JdMatchSchema>;

export const JdGapSchema = z.object({
  requirement_id: z.string().min(1).max(40),
  honest_suggestion: z.string().min(1).max(400),
}).strict();
export type JdGap = z.infer<typeof JdGapSchema>;

export const TailorOutputSchema = z.object({
  jd_analysis: z.object({
    role_title: z.string().min(1).max(120).nullable(),
    firm: z.string().min(1).max(120).nullable(),
    requirements: z.array(JdRequirementSchema).min(1).max(25),
  }).strict(),
  matches: z.array(JdMatchSchema).max(25),
  gaps: z.array(JdGapSchema).max(25),
  changes: z.array(ResumeChangeSchema).max(40),
}).strict();
export type TailorOutput = z.infer<typeof TailorOutputSchema>;

// ─── Auto-create "additional details" form payload ──────────
// Route-boundary schema (browser form → compose job input), not LLM output.

export const AdditionalExperienceDetailSchema = z.object({
  firm: z.string().trim().min(1).max(120),
  role_title: z.string().trim().max(120).default(''),
  date_range: z.string().trim().max(60).default(''),
  responsibilities: z.array(z.string().trim().min(1).max(500)).max(5).default([]),
}).strict();
export type AdditionalExperienceDetail = z.infer<typeof AdditionalExperienceDetailSchema>;

export const AdditionalDetailsSchema = z.object({
  contact: z.object({
    full_name: z.string().trim().max(120).default(''),
    email: z.string().trim().max(254).default(''),
    phone: z.string().trim().max(40).default(''),
    linkedin_url: z.string().trim().max(200).default(''),
    location: z.string().trim().max(120).default(''),
  }).strict(),
  experience_details: z.array(AdditionalExperienceDetailSchema).max(8).default([]),
  education_extras: z.string().trim().max(1000).default(''),
  skills: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
  interests: z.array(z.string().trim().min(1).max(80)).max(10).default([]),
  anything_else: z.string().trim().max(2000).default(''),
}).strict();
export type AdditionalDetails = z.infer<typeof AdditionalDetailsSchema>;

// ─── AI job rows (resume_ai_jobs) ───────────────────────────

export const ResumeAiJobKindSchema = z.enum(['import', 'compose', 'improve', 'tailor']);
export type ResumeAiJobKind = z.infer<typeof ResumeAiJobKindSchema>;

export const ResumeAiJobStatusSchema = z.enum(['pending', 'processing', 'completed', 'error']);
export type ResumeAiJobStatus = z.infer<typeof ResumeAiJobStatusSchema>;

export interface ResumeAiJobRow {
  id: string;
  kind: ResumeAiJobKind;
  status: ResumeAiJobStatus;
  output: Record<string, unknown> | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}
