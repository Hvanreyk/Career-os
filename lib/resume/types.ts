import { z } from 'zod';

export const RESUME_TITLE_MAX_LENGTH = 120;
export const RESUME_HEADING_MAX_LENGTH = 80;
export const RESUME_BULLET_MAX_LENGTH = 1000;

export const ResumeStatusSchema = z.enum(['draft', 'current']);
export type ResumeStatus = z.infer<typeof ResumeStatusSchema>;

export const ResumeSectionKindSchema = z.enum([
  'education',
  'experience',
  'leadership',
  'extracurricular',
  'skills',
  'other',
]);
export type ResumeSectionKind = z.infer<typeof ResumeSectionKindSchema>;

export const ResumeBulletStatusSchema = z.enum(['draft', 'final']);
export type ResumeBulletStatus = z.infer<typeof ResumeBulletStatusSchema>;

export const CritiqueAreaSchema = z.enum([
  'impact',
  'specificity',
  'action',
  'evidence',
  'concision',
  'clarity',
]);
export type CritiqueArea = z.infer<typeof CritiqueAreaSchema>;

export const CritiqueImprovementSchema = z.object({
  area: CritiqueAreaSchema,
  observation: z.string().min(1).max(500),
  why_it_matters: z.string().min(1).max(500),
  revision_question: z.string().min(1).max(500),
}).strict();

export const CritiqueRewriteSchema = z.object({
  text: z.string().min(1).max(RESUME_BULLET_MAX_LENGTH),
  change_summary: z.string().min(1).max(500),
}).strict();

export const ResumeCritiqueSchema = z.object({
  summary: z.string().min(1).max(800),
  strengths: z.array(z.string().min(1).max(500)).min(1).max(3),
  improvements: z.array(CritiqueImprovementSchema).max(5),
  rewrite_options: z.array(CritiqueRewriteSchema).min(1).max(3),
}).strict();
export type ResumeCritique = z.infer<typeof ResumeCritiqueSchema>;

export interface ResumeRow {
  id: string;
  title: string;
  status: ResumeStatus;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  linkedin_url: string | null;
  location: string | null;
  created_at: string;
  updated_at: string;
}

export interface ResumeEntryRow {
  id: string;
  section_id: string;
  org: string;
  role_title: string | null;
  location: string | null;
  date_range: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ResumeSectionRow {
  id: string;
  resume_id: string;
  kind: ResumeSectionKind;
  heading: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ResumeBulletRow {
  id: string;
  section_id: string;
  entry_id: string | null;
  text: string;
  status: ResumeBulletStatus;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ResumeBulletRevisionRow {
  id: string;
  bullet_id: string;
  original_text: string;
  revised_text: string;
  critique: ResumeCritique;
  input_hash: string;
  model: string;
  prompt_version: string;
  input_tokens: number;
  output_tokens: number;
  created_at: string;
}

export interface ResumeWorkspaceData {
  resume: ResumeRow | null;
  sections: ResumeSectionRow[];
  entries: ResumeEntryRow[];
  bullets: ResumeBulletRow[];
  revisions: ResumeBulletRevisionRow[];
}
