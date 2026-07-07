import { z } from 'zod';

// ============================================================
// Course content schemas
//
// Single source of truth for the shape of authored course content:
//   * scripts/lib/parse-course.ts validates parsed files against these
//   * tests/courses/ lint every file under content/courses/**
//   * web renders lessons.content (jsonb) typed as LessonBlock[]
//
// Pure module — no I/O. File parsing lives in scripts/ so the engine
// stays unit-testable (see CLAUDE.md conventions).
// ============================================================

export const ContentStatus = z.enum(['draft', 'published']);
export type ContentStatus = z.infer<typeof ContentStatus>;

export const ContentRegion = z.enum(['au', 'uk', 'us', 'global']);
export type ContentRegion = z.infer<typeof ContentRegion>;

// slugs are URL segments: lowercase kebab-case
const Slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'must be kebab-case');

// ─── Lesson content blocks ───────────────────────────────────

/** Prose paragraph. `md` supports inline markdown (bold/italic/links/lists). */
export const ParagraphBlock = z.object({
  type: z.literal('paragraph'),
  md: z.string().min(1),
});

export const HeadingBlock = z.object({
  type: z.literal('heading'),
  text: z.string().min(1),
});

export const CalloutBlock = z.object({
  type: z.literal('callout'),
  variant: z.enum(['tip', 'warning', 'note']),
  title: z.string().optional(),
  md: z.string().min(1),
});

/** Comparison / reference table (e.g. group comparisons in Module 2). */
export const TableBlock = z.object({
  type: z.literal('table'),
  caption: z.string().optional(),
  headers: z.array(z.string()).min(2),
  rows: z.array(z.array(z.string()).min(1)).min(1),
});

/** Strong/weak candidate profile examples (Module 7). Always fictional. */
export const ProfileExampleBlock = z.object({
  type: z.literal('profile_example'),
  strength: z.enum(['strong', 'weak']),
  title: z.string().min(1),
  bullets: z.array(z.string().min(1)).min(1),
  verdict: z.string().min(1),
});

/**
 * Inline formative knowledge check. Ungraded — answers ship to the
 * client inside published lesson JSON, which is an accepted trade-off
 * (scored module quizzes live in quiz_questions, server-side only).
 */
export const KnowledgeCheckBlock = z.object({
  type: z.literal('knowledge_check'),
  question: z.string().min(1),
  options: z
    .array(z.object({ id: z.string().min(1), text: z.string().min(1) }))
    .min(2),
  correctId: z.string().min(1),
  explanation: z.string().min(1),
});

// Cross-field rules live in superRefine on the array (zod v3's
// discriminatedUnion cannot contain refined members).
export const LessonBlock = z.discriminatedUnion('type', [
  ParagraphBlock,
  HeadingBlock,
  CalloutBlock,
  TableBlock,
  ProfileExampleBlock,
  KnowledgeCheckBlock,
]);
export type LessonBlock = z.infer<typeof LessonBlock>;

export const LessonContent = z
  .array(LessonBlock)
  .min(1)
  .superRefine((blocks, ctx) => {
    blocks.forEach((block, i) => {
      if (block.type === 'table') {
        if (!block.rows.every((r) => r.length === block.headers.length)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [i],
            message: 'table: every row must have exactly one cell per header',
          });
        }
      }
      if (block.type === 'knowledge_check') {
        if (!block.options.some((o) => o.id === block.correctId)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [i],
            message: 'knowledge_check: correctId must match one of the option ids',
          });
        }
        if (new Set(block.options.map((o) => o.id)).size !== block.options.length) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [i],
            message: 'knowledge_check: option ids must be unique',
          });
        }
      }
    });
  });
export type LessonContent = z.infer<typeof LessonContent>;

// ─── Authoring file schemas ──────────────────────────────────
// These mirror the on-disk layout under content/courses/<course>/:
//   course.yaml, modules/NN-slug/module.yaml, quiz.yaml, NN-slug.md

export const SourceRef = z.object({
  label: z.string().min(1),
  url: z.string().url().optional(),
});
export type SourceRef = z.infer<typeof SourceRef>;

/** ISO date the founder last reviewed this content (surfaced in the UI). */
const ReviewDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'must be YYYY-MM-DD');

export const CourseMetaSchema = z.object({
  slug: Slug,
  title: z.string().min(1),
  description: z.string().min(1),
  /** lucide-react icon name in kebab-case, e.g. 'trending-up'. */
  icon: z.string().min(1),
  tag: z.string().default(''),
  region: ContentRegion.default('au'),
  status: ContentStatus.default('draft'),
  sort_order: z.number().int().default(0),
  last_reviewed: ReviewDate.optional(),
  /** Module directory names in display order, e.g. '01-what-is-ib'. */
  modules: z.array(z.string().min(1)).min(1),
});
export type CourseMeta = z.infer<typeof CourseMetaSchema>;

export const ModuleMetaSchema = z.object({
  slug: Slug,
  title: z.string().min(1),
  summary: z.string().default(''),
  status: ContentStatus.default('draft'),
  last_reviewed: ReviewDate.optional(),
});
export type ModuleMeta = z.infer<typeof ModuleMetaSchema>;

/** Frontmatter of a lesson .md file. */
export const LessonFrontmatterSchema = z.object({
  slug: Slug,
  title: z.string().min(1),
  est_minutes: z.number().int().positive().default(7),
  region: ContentRegion.default('au'),
  status: ContentStatus.default('draft'),
  last_reviewed: ReviewDate.optional(),
  sources: z.array(SourceRef).default([]),
});
export type LessonFrontmatter = z.infer<typeof LessonFrontmatterSchema>;

export const QuizQuestionSchema = z
  .object({
    slug: Slug, // stable upsert key, e.g. 'q1'
    prompt: z.string().min(1),
    options: z
      .array(z.object({ id: z.string().min(1), text: z.string().min(1) }))
      .min(2),
    correct: z.string().min(1),
    explanation: z.string().default(''),
  })
  .refine(
    (q) => q.options.some((o) => o.id === q.correct),
    'correct must match one of the option ids',
  )
  .refine(
    (q) => new Set(q.options.map((o) => o.id)).size === q.options.length,
    'option ids must be unique',
  );
export type QuizQuestion = z.infer<typeof QuizQuestionSchema>;

export const QuizFileSchema = z.object({
  status: ContentStatus.default('draft'),
  questions: z.array(QuizQuestionSchema).min(3).max(10),
});
export type QuizFile = z.infer<typeof QuizFileSchema>;

// ─── Fully parsed course (output of scripts/lib/parse-course.ts) ─

export interface ParsedLesson {
  meta: LessonFrontmatter;
  content: LessonContent;
  /** Source file path, for error reporting only. */
  file: string;
}

export interface ParsedModule {
  meta: ModuleMeta;
  /** Directory name, e.g. '01-what-is-ib' (ordering prefix). */
  dir: string;
  lessons: ParsedLesson[];
  quiz: QuizFile | null;
}

export interface ParsedCourse {
  meta: CourseMeta;
  modules: ParsedModule[];
}
