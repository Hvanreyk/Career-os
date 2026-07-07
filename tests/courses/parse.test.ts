import { describe, it, expect } from 'vitest';
import {
  parseLessonBody,
  splitFrontmatter,
  CourseParseError,
} from '../../scripts/lib/parse-course.js';
import { LessonContent } from '../../lib/courses/content.js';

const FILE = 'test.md';

describe('splitFrontmatter', () => {
  it('splits valid frontmatter from the body', () => {
    const { fm, body } = splitFrontmatter('---\ntitle: Hi\n---\nBody text\n', FILE);
    expect(fm).toEqual({ title: 'Hi' });
    expect(body.trim()).toBe('Body text');
  });

  it('rejects a file without leading ---', () => {
    expect(() => splitFrontmatter('title: Hi\n---\nBody\n', FILE)).toThrow(CourseParseError);
  });

  it('rejects unterminated frontmatter', () => {
    expect(() => splitFrontmatter('---\ntitle: Hi\nBody\n', FILE)).toThrow(/unterminated/);
  });
});

describe('parseLessonBody', () => {
  it('turns headings and prose into blocks', () => {
    const blocks = parseLessonBody(
      'Intro paragraph.\n\n## Section one\n\nFirst line\ncontinues here.\n\nSecond paragraph.\n',
      FILE,
    );
    expect(blocks).toEqual([
      { type: 'paragraph', md: 'Intro paragraph.' },
      { type: 'heading', text: 'Section one' },
      { type: 'paragraph', md: 'First line\ncontinues here.' },
      { type: 'paragraph', md: 'Second paragraph.' },
    ]);
  });

  it('parses YAML directives into typed blocks', () => {
    const body = [
      '```callout',
      'variant: tip',
      'title: Note this',
      'md: Some advice.',
      '```',
    ].join('\n');
    const blocks = parseLessonBody(body, FILE);
    expect(blocks).toEqual([
      { type: 'callout', variant: 'tip', title: 'Note this', md: 'Some advice.' },
    ]);
  });

  it('parses a knowledge_check that validates against LessonContent', () => {
    const body = [
      'Lead-in text.',
      '',
      '```knowledge_check',
      'question: What is 2 + 2?',
      'options:',
      '  - id: a',
      '    text: "3"',
      '  - id: b',
      '    text: "4"',
      'correctId: b',
      'explanation: Basic arithmetic.',
      '```',
    ].join('\n');
    const blocks = parseLessonBody(body, FILE);
    const parsed = LessonContent.parse(blocks);
    expect(parsed).toHaveLength(2);
    expect(parsed[1]).toMatchObject({ type: 'knowledge_check', correctId: 'b' });
  });

  it('rejects unknown directives', () => {
    expect(() => parseLessonBody('```mystery\nfoo: 1\n```', FILE)).toThrow(/unknown directive/);
  });

  it('rejects unclosed directives', () => {
    expect(() => parseLessonBody('```callout\nvariant: tip\nmd: hi', FILE)).toThrow(/unclosed/);
  });

  it('rejects a directive whose YAML is not a mapping', () => {
    expect(() => parseLessonBody('```callout\n- just\n- a list\n```', FILE)).toThrow(/mapping/);
  });
});

describe('LessonContent cross-field rules', () => {
  it('rejects a knowledge_check whose correctId matches no option', () => {
    const result = LessonContent.safeParse([
      {
        type: 'knowledge_check',
        question: 'Q?',
        options: [
          { id: 'a', text: 'A' },
          { id: 'b', text: 'B' },
        ],
        correctId: 'z',
        explanation: 'E',
      },
    ]);
    expect(result.success).toBe(false);
  });

  it('rejects a table whose rows do not match the header count', () => {
    const result = LessonContent.safeParse([
      {
        type: 'table',
        headers: ['One', 'Two'],
        rows: [['only-one-cell']],
      },
    ]);
    expect(result.success).toBe(false);
  });
});
