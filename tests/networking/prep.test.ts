import { describe, expect, it } from 'vitest';
import { buildPrepSheet, prepQuestionsFor } from '../../lib/networking/prep.js';

describe('prepQuestionsFor', () => {
  it('gives different question banks to junior vs senior contacts', () => {
    const junior = prepQuestionsFor('analyst');
    const senior = prepQuestionsFor('md');
    expect(junior).not.toEqual(senior);
    expect(junior.length).toBeGreaterThan(0);
    expect(senior.length).toBeGreaterThan(0);
  });

  it('gives recruiters process-specific questions', () => {
    const recruiter = prepQuestionsFor('recruiter');
    expect(recruiter.some((q) => /process|screening|dates/i.test(q.question))).toBe(true);
  });
});

describe('buildPrepSheet', () => {
  it('seeds up to four questions and leaves student fields empty', () => {
    const sheet = buildPrepSheet('vp');
    expect(sheet.questions.length).toBeLessThanOrEqual(4);
    expect(sheet.questions.length).toBeGreaterThan(0);
    expect(sheet.research_notes).toBe('');
    expect(sheet.my_ask).toBe('');
  });
});
