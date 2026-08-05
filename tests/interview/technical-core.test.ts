import { describe, expect, it } from 'vitest';
import { parseFixed } from '../../lib/interview/decimal.js';
import { generateQuestionInstance, validateGeneratedFamily } from '../../lib/interview/generator.js';
import { gradeDeterministicAnswer } from '../../lib/interview/grading.js';
import { calculateConceptMastery } from '../../lib/interview/mastery.js';
import { TECHNICAL_CONCEPTS, TECHNICAL_CORE_120_ALLOCATION, validateConceptTaxonomy } from '../../lib/interview/taxonomy.js';
import {
  TECHNICAL_CORE_120_DRAFTS,
  TECHNICAL_CORE_RESEARCH_SOURCES,
  validateTechnicalCore120Drafts,
} from '../../lib/interview/technical-core-120.js';
import { TechnicalItemFamilySchema } from '../../lib/interview/types.js';
import { numericEvFamily } from './fixtures';

describe('Technical Core taxonomy', () => {
  it('contains the 60 acyclic concepts and the exact Core 120 allocation', () => {
    expect(TECHNICAL_CONCEPTS).toHaveLength(60);
    expect(validateConceptTaxonomy()).toEqual([]);
    expect(TECHNICAL_CORE_120_ALLOCATION.reduce((sum, row) => sum + row.foundation + row.interviewReady + row.advanced, 0)).toBe(120);
  });

  it('contains 120 independently authored draft families with answers and complete variant coverage', () => {
    expect(validateTechnicalCore120Drafts()).toEqual([]);
    expect(TECHNICAL_CORE_120_DRAFTS).toHaveLength(120);
    expect(new Set(TECHNICAL_CORE_120_DRAFTS.map((family) => family.slug)).size).toBe(120);
    expect(new Set(TECHNICAL_CORE_120_DRAFTS.map((family) => family.primaryConceptId)).size).toBe(60);
    expect(TECHNICAL_CORE_120_DRAFTS.every((family) =>
      family.rubricVersion.answerOutline.length === 3
      && family.parameterSpec.transformationRules.length === 7
      && family.variantCoverage.length === 7
      && family.questionVersion.promptTemplate.length > 20
    )).toBe(true);
  });

  it('records the supplied guides as non-publishable coverage research only', () => {
    expect(TECHNICAL_CORE_RESEARCH_SOURCES).toHaveLength(2);
    expect(TECHNICAL_CORE_RESEARCH_SOURCES.every((source) =>
      source.sourceType === 'competitor_concept_research'
      && source.rightsBasis === 'fact_reference_only'
      && source.notes.toLowerCase().includes('only')
    )).toBe(true);
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

describe('deterministic grading', () => {
  it('rejects decimal inputs beyond the supported fixed precision', () => {
    expect(parseFixed('1.123456')).toBe(1_123_456n);
    expect(() => parseFixed('1.1234567')).toThrow('Invalid decimal: 1.1234567');
  });

  it('maps labelled observations to separate checks instead of reusing the last number', () => {
    const checks = [
      { code: 'EQUITY', expression: 'EQUITY', expectedUnit: 'A$m', absoluteTolerance: '0', relativeTolerance: null, requiredSign: 'positive' as const, acceptedRounding: [0] },
      { code: 'EV', expression: 'EV', expectedUnit: 'A$m', absoluteTolerance: '0', relativeTolerance: null, requiredSign: 'positive' as const, acceptedRounding: [0] },
    ];
    const labelled = gradeDeterministicAnswer('EQUITY: 100; EV is 140', { EQUITY: '100', EV: '140' }, checks, []);
    const unlabelled = gradeDeterministicAnswer('The values are 100 and 140', { EQUITY: '100', EV: '140' }, checks, []);
    expect(labelled.classification).toBe('correct');
    expect(labelled.checks.map((check) => check.observed)).toEqual(['100', '140']);
    expect(unlabelled.classification).toBe('unparsed');
    expect(unlabelled.checks.every((check) => check.status === 'not_observed')).toBe(true);
  });

  it('treats unsupported answer precision as unparsed without inferring a fatal misconception', () => {
    const checks = [{
      code: 'EV', expression: 'EV', expectedUnit: 'A$m', absoluteTolerance: '0', relativeTolerance: null,
      requiredSign: 'positive' as const, acceptedRounding: [6],
    }];
    const fatalErrors = [{
      misconceptionCode: 'E02.BRIDGE_SIGN_ERROR', description: 'Detected EV error',
      triggerRules: [{ kind: 'numeric' as const, value: 'EV', negated: false }], blocksMastery: true,
    }];
    const grade = gradeDeterministicAnswer('1.1234567', { EV: '1.123456' }, checks, fatalErrors);
    expect(grade.classification).toBe('unparsed');
    expect(grade.checks[0]?.status).toBe('unparsed');
    expect(grade.misconceptionCodes).toEqual([]);
  });

  it('only emits a fatal misconception when its deterministic detector matches', () => {
    const checks = [{
      code: 'EV', expression: 'EV', expectedUnit: 'A$m', absoluteTolerance: '0', relativeTolerance: null,
      requiredSign: 'positive' as const, acceptedRounding: [0],
    }];
    const fatalErrors = [
      { misconceptionCode: 'E02.MATCHED', description: 'Detected EV error', triggerRules: [{ kind: 'numeric' as const, value: 'EV', negated: false }], blocksMastery: true },
      { misconceptionCode: 'E02.UNRELATED', description: 'Unrelated sign error', triggerRules: [{ kind: 'sign' as const, value: 'DEBT_OR_CASH', negated: false }], blocksMastery: true },
    ];
    const grade = gradeDeterministicAnswer('150', { EV: '140' }, checks, fatalErrors);
    expect(grade.misconceptionCodes).toEqual(['E02.MATCHED']);
  });

  it('accepts answers rounded to any explicitly permitted precision', () => {
    const checks = [{
      code: 'VALUE', expression: 'VALUE', expectedUnit: 'A$m', absoluteTolerance: '0', relativeTolerance: null,
      requiredSign: 'positive' as const, acceptedRounding: [0, 1],
    }];
    expect(gradeDeterministicAnswer('VALUE: 11', { VALUE: '10.56' }, checks, []).classification).toBe('correct');
    expect(gradeDeterministicAnswer('VALUE: 10.6', { VALUE: '10.56' }, checks, []).classification).toBe('correct');
    expect(gradeDeterministicAnswer('VALUE: 10.56', { VALUE: '10.56' }, checks, []).classification).toBe('correct');
    expect(gradeDeterministicAnswer('VALUE: 10.5', { VALUE: '10.56' }, checks, []).classification).toBe('incorrect');
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
