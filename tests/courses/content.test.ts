/**
 * Content lint gate: every authored course under content/courses/ must
 * parse and validate. Run automatically in `npm test`, so malformed
 * content fails CI/local checks before it can reach the seed script.
 */
import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { parseAllCourses } from '../../scripts/lib/parse-course.js';

const CONTENT_ROOT = resolve(import.meta.dirname, '../../content/courses');

describe('authored course content', () => {
  const courses = parseAllCourses(CONTENT_ROOT);

  it('parses at least one course', () => {
    expect(courses.length).toBeGreaterThanOrEqual(1);
  });

  it('investment-banking-guides exists with ordered modules', () => {
    const ibg = courses.find((c) => c.meta.slug === 'investment-banking-guides');
    expect(ibg).toBeDefined();
    expect(ibg!.modules.length).toBeGreaterThanOrEqual(1);
    for (const mod of ibg!.modules) {
      expect(mod.lessons.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('every lesson has at least one knowledge check or the module has a quiz', () => {
    for (const course of courses) {
      for (const mod of course.modules) {
        const hasQuiz = mod.quiz !== null && mod.quiz.questions.length >= 3;
        const checks = mod.lessons.flatMap((l) =>
          l.content.filter((b) => b.type === 'knowledge_check'),
        );
        expect(
          hasQuiz || checks.length > 0,
          `${course.meta.slug}/${mod.meta.slug} has neither quiz nor knowledge checks`,
        ).toBe(true);
      }
    }
  });

  it('every source with a url uses https', () => {
    for (const course of courses) {
      for (const mod of course.modules) {
        for (const lesson of mod.lessons) {
          for (const src of lesson.meta.sources) {
            if (src.url) {
              expect(src.url, `${lesson.file}: ${src.label}`).toMatch(/^https:\/\//);
            }
          }
        }
      }
    }
  });
});
