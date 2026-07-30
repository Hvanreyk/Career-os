/**
 * Course content parser.
 *
 * Reads an authored course directory (content/courses/<slug>/) and
 * returns a fully validated ParsedCourse. All validation is strict:
 * any malformed file aborts with the offending path in the message.
 *
 * Layout:
 *   course.yaml                  — CourseMetaSchema (+ ordered module dirs)
 *   modules/NN-slug/module.yaml  — ModuleMetaSchema
 *   modules/NN-slug/quiz.yaml    — QuizFileSchema (optional)
 *   modules/NN-slug/NN-slug.md   — lesson: YAML frontmatter + markdown body
 *
 * Lesson bodies are markdown where:
 *   * `## Heading`            → heading block
 *   * prose/lists             → paragraph blocks (split on blank lines)
 *   * fenced YAML directives  → special blocks, e.g.
 *       ```knowledge_check
 *       question: ...
 *       options: [{id: a, text: ...}, ...]
 *       correctId: a
 *       explanation: ...
 *       ```
 *     (also: callout, table, profile_example)
 *
 * File I/O lives here (scripts/), NOT in lib/ — the engine stays pure.
 */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { ZodError, type ZodTypeAny, type z } from 'zod';

import {
  CourseMetaSchema,
  ModuleMetaSchema,
  LessonFrontmatterSchema,
  QuizFileSchema,
  LessonContent,
  type ParsedCourse,
  type ParsedModule,
  type ParsedLesson,
} from '../../lib/courses/content.js';

export class CourseParseError extends Error {
  constructor(
    public readonly file: string,
    message: string,
  ) {
    super(`${file}: ${message}`);
    this.name = 'CourseParseError';
  }
}

function formatZodError(err: ZodError): string {
  return err.issues
    .map((i) => `  - ${i.path.length ? i.path.join('.') : '(root)'}: ${i.message}`)
    .join('\n');
}

function validate<S extends ZodTypeAny>(schema: S, data: unknown, file: string): z.infer<S> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new CourseParseError(file, `validation failed\n${formatZodError(result.error)}`);
  }
  return result.data;
}

function readYamlFile<S extends ZodTypeAny>(schema: S, file: string): z.infer<S> {
  let data: unknown;
  try {
    data = parseYaml(readFileSync(file, 'utf8'));
  } catch (err) {
    throw new CourseParseError(file, `invalid YAML: ${(err as Error).message}`);
  }
  return validate(schema, data, file);
}

// ─── Lesson markdown ─────────────────────────────────────────

/** Split `---` frontmatter from the markdown body. */
export function splitFrontmatter(raw: string, file: string): { fm: unknown; body: string } {
  const lines = raw.split('\n');
  if (lines[0]?.trim() !== '---') {
    throw new CourseParseError(file, 'lesson must start with `---` YAML frontmatter');
  }
  const end = lines.findIndex((l, i) => i > 0 && l.trim() === '---');
  if (end === -1) {
    throw new CourseParseError(file, 'unterminated frontmatter (missing closing `---`)');
  }
  let fm: unknown;
  try {
    fm = parseYaml(lines.slice(1, end).join('\n'));
  } catch (err) {
    throw new CourseParseError(file, `invalid frontmatter YAML: ${(err as Error).message}`);
  }
  return { fm, body: lines.slice(end + 1).join('\n') };
}

const DIRECTIVE_TYPES = new Set(['knowledge_check', 'callout', 'table', 'profile_example']);

/** Parse a lesson markdown body into raw (unvalidated) content blocks. */
export function parseLessonBody(body: string, file: string): unknown[] {
  const blocks: unknown[] = [];
  const lines = body.split('\n');
  let para: string[] = [];

  const flushParagraph = () => {
    const md = para.join('\n').trim();
    if (md) blocks.push({ type: 'paragraph', md });
    para = [];
  };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i] ?? '';

    const fence = line.match(/^```([a-z_]+)\s*$/);
    if (fence) {
      const name = fence[1] ?? '';
      if (!DIRECTIVE_TYPES.has(name)) {
        throw new CourseParseError(
          file,
          `unknown directive \`\`\`${name} (expected one of: ${[...DIRECTIVE_TYPES].join(', ')})`,
        );
      }
      flushParagraph();
      const yamlLines: string[] = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i] ?? '')) {
        yamlLines.push(lines[i] ?? '');
        i++;
      }
      if (i >= lines.length) {
        throw new CourseParseError(file, `unclosed \`\`\`${name} directive`);
      }
      i++; // skip closing fence
      let data: unknown;
      try {
        data = parseYaml(yamlLines.join('\n'));
      } catch (err) {
        throw new CourseParseError(
          file,
          `invalid YAML in \`\`\`${name} directive: ${(err as Error).message}`,
        );
      }
      if (data === null || typeof data !== 'object' || Array.isArray(data)) {
        throw new CourseParseError(file, `\`\`\`${name} directive must contain a YAML mapping`);
      }
      blocks.push({ type: name, ...(data as Record<string, unknown>) });
      continue;
    }

    if (/^##\s+/.test(line)) {
      flushParagraph();
      blocks.push({ type: 'heading', text: line.replace(/^##\s+/, '').trim() });
      i++;
      continue;
    }

    if (line.trim() === '') {
      flushParagraph();
      i++;
      continue;
    }

    para.push(line);
    i++;
  }
  flushParagraph();
  return blocks;
}

export function parseLessonFile(file: string): ParsedLesson {
  const raw = readFileSync(file, 'utf8');
  const { fm, body } = splitFrontmatter(raw, file);
  const meta = validate(LessonFrontmatterSchema, fm, file);
  const content = validate(LessonContent, parseLessonBody(body, file), file);
  return { meta, content, file };
}

// ─── Course directory ────────────────────────────────────────

function uniqueSlugs(items: { slug: string }[], what: string, file: string): void {
  const seen = new Set<string>();
  for (const { slug } of items) {
    if (seen.has(slug)) {
      throw new CourseParseError(file, `duplicate ${what} slug '${slug}'`);
    }
    seen.add(slug);
  }
}

function parseModuleDir(moduleDir: string, dirName: string): ParsedModule {
  const metaFile = join(moduleDir, 'module.yaml');
  if (!existsSync(metaFile)) {
    throw new CourseParseError(metaFile, 'missing module.yaml');
  }
  const meta = readYamlFile(ModuleMetaSchema, metaFile);

  const lessonFiles = readdirSync(moduleDir)
    .filter((f) => f.endsWith('.md'))
    .sort();
  if (lessonFiles.length === 0) {
    throw new CourseParseError(moduleDir, 'module has no lesson .md files');
  }
  const lessons = lessonFiles.map((f) => parseLessonFile(join(moduleDir, f)));
  uniqueSlugs(
    lessons.map((l) => l.meta),
    'lesson',
    moduleDir,
  );

  const quizFile = join(moduleDir, 'quiz.yaml');
  const quiz = existsSync(quizFile) ? readYamlFile(QuizFileSchema, quizFile) : null;
  if (quiz) {
    uniqueSlugs(quiz.questions, 'quiz question', quizFile);
  }

  return { meta, dir: dirName, lessons, quiz };
}

/** Parse one course directory (containing course.yaml). */
export function parseCourseDir(courseDir: string): ParsedCourse {
  const metaFile = join(courseDir, 'course.yaml');
  if (!existsSync(metaFile)) {
    throw new CourseParseError(metaFile, 'missing course.yaml');
  }
  const meta = readYamlFile(CourseMetaSchema, metaFile);

  const modules = meta.modules.map((dirName) => {
    const moduleDir = join(courseDir, 'modules', dirName);
    if (!existsSync(moduleDir)) {
      throw new CourseParseError(moduleDir, `module directory listed in course.yaml not found`);
    }
    return parseModuleDir(moduleDir, dirName);
  });
  uniqueSlugs(
    modules.map((m) => m.meta),
    'module',
    metaFile,
  );

  return { meta, modules };
}

/** Parse every course under a content root (content/courses). */
export function parseAllCourses(contentRoot: string): ParsedCourse[] {
  if (!existsSync(contentRoot)) {
    throw new CourseParseError(contentRoot, 'content root not found');
  }
  const dirs = readdirSync(contentRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
  const courses = dirs.map((d) => parseCourseDir(join(contentRoot, d)));
  uniqueSlugs(
    courses.map((c) => c.meta),
    'course',
    contentRoot,
  );
  return courses;
}
