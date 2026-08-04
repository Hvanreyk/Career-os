import { describe, expect, it } from 'vitest';
import { generateQuestionInstance, validateGeneratedFamily } from '../../lib/interview/generator';
import { calculateConceptMastery } from '../../lib/interview/mastery';
import { TECHNICAL_CONCEPTS, TECHNICAL_CORE_120_ALLOCATION, validateConceptTaxonomy } from '../../lib/interview/taxonomy';
import { TechnicalItemFamilySchema } from '../../lib/interview/types';
import { numericEvFamily } from './fixtures';

describe('Technical Core taxonomy', () => {
  it('contains the 60 acyclic concepts and the exact Core 120 allocation', () => {
    expect(TECHNICAL_CONCEPTS).toHaveLength(60);
    expect(validateConceptTaxonomy()).toEqual([]);
    expect(TECHNICAL_CORE_120_ALLOCATION.reduce((sum, row) => sum + row.foundation + row.interviewReady + row.advanced, 0)).toBe(120);
  });
});

describe('Technical family validation and generation', () => {
  it('accepts the full schema and rejects author self-approval', () => {
    expect(TechnicalItemFamilySchema.safeParse(numericEvFamily).success).toBe(true);
    expect(TechnicalItemFamilySchema.safeParse({
      ...numericEvFamily,
      review: { ...numericEvFamily.review, approverId: numericEvFamily.review.authorId },
    }).success).toBe(false);
  });

  it('creates reproducible, hashed instances across variants', () => {
    const first = generateQuestionInstance(numericEvFamily, 'student-1', 'numerical');
    const second = generateQuestionInstance(numericEvFamily, 'student-1', 'numerical');
    const different = generateQuestionInstance(numericEvFamily, 'student-2', 'numerical');
    expect(second).toEqual(first);
    expect(first.questionHash).toHaveLength(64);
    expect(different.questionHash).not.toBe(first.questionHash);
    expect(first.prompt).not.toContain('{{');
  });

  it('passes repeated deterministic property generation', () => {
    expect(validateGeneratedFamily(numericEvFamily, 100)).toEqual([]);
  });
});

describe('concept mastery', () => {
  it('requires variants, spacing and cleared fatal misconceptions', () => {
    const attempt = (day: number, variant: 'standard' | 'reversed' | 'numerical' | 'applied_company' | 'explain_simply', sessionId: string) => ({
      attemptedAt: `2026-07-${String(day).padStart(2, '0')}T00:00:00.000Z`,
      correct: true,
      useful: true,
      variant,
      difficulty: 'interview_ready' as const,
      sessionId,
      fatalMisconceptionCodes: [],
    });
    const result = calculateConceptMastery([
      attempt(1, 'standard', 's1'), attempt(1, 'reversed', 's1'), attempt(1, 'numerical', 's1'),
      attempt(18, 'applied_company', 's2'), attempt(18, 'explain_simply', 's2'), attempt(19, 'standard', 's2'),
    ], new Date('2026-08-02T00:00:00.000Z'));
    expect(result.label).toBe('durable');
    expect(result.confidence).toBe('moderate');
  });
});
