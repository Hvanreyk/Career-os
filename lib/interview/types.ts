import { z } from 'zod';

export const TECHNICAL_TOPICS = [
  'accounting',
  'enterprise_value',
  'valuation',
  'dcf',
  'ma',
  'lbo',
  'debt_credit',
  'capital_markets',
  'applied_judgement',
] as const;

export const VARIANT_TYPES = [
  'standard',
  'reversed',
  'numerical',
  'assumption_changed',
  'applied_company',
  'explain_simply',
  'followup_chain',
] as const;

export type TechnicalTopic = (typeof TECHNICAL_TOPICS)[number];
export type VariantType = (typeof VARIANT_TYPES)[number];
export type Difficulty = 'foundation' | 'interview_ready' | 'advanced';

export interface TechnicalConcept {
  id: string;
  slug: string;
  topic: TechnicalTopic;
  name: string;
  prerequisiteIds: string[];
  primaryMisconceptionCode: string;
  sortOrder: number;
}

const EvidenceRuleSchema = z.object({
  kind: z.enum(['phrase', 'semantic', 'numeric', 'sign', 'unit', 'assumption']),
  value: z.string().min(1).max(500),
  negated: z.boolean().default(false),
});

const ParameterSchema = z.object({
  code: z.string().regex(/^[A-Z][A-Z0-9_]*$/),
  type: z.enum(['integer', 'decimal', 'percent', 'currency', 'enum']),
  minimum: z.string().optional(),
  maximum: z.string().optional(),
  step: z.string().optional(),
  values: z.array(z.string()).min(1).optional(),
  unit: z.string().max(40).optional(),
}).superRefine((value, context) => {
  if (value.type === 'enum' && !value.values?.length) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'Enum parameters require values' });
  }
  if (value.type !== 'enum' && (value.minimum === undefined || value.maximum === undefined)) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'Numeric parameters require minimum and maximum' });
  }
});

export const TechnicalItemFamilySchema = z.object({
  id: z.string().uuid(),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(120),
  primaryConceptId: z.string().regex(/^[AEVFMLCKJ][0-9]{2}$/),
  secondaryConceptIds: z.array(z.string()).default([]),
  prerequisiteConceptIds: z.array(z.string()).default([]),
  learningObjectives: z.array(z.string().min(1).max(500)).min(1),
  topic: z.enum(TECHNICAL_TOPICS),
  difficulty: z.enum(['foundation', 'interview_ready', 'advanced']),
  cognitiveOperation: z.enum([
    'recall', 'explain', 'calculate', 'reverse', 'diagnose', 'compare', 'apply', 'defend',
  ]),
  variantCoverage: z.array(z.enum(VARIANT_TYPES)).min(1),
  questionVersion: z.object({
    version: z.number().int().positive(),
    promptTemplate: z.string().min(1).max(8000),
    shortPromptTemplate: z.string().max(2000).optional(),
    followupPromptTemplates: z.array(z.string().max(4000)).default([]),
    jurisdiction: z.enum(['AU', 'GLOBAL_IFRS', 'US_GAAP']),
    currency: z.enum(['AUD', 'USD', 'GBP', 'NONE']),
    effectiveFrom: z.string().datetime(),
    effectiveTo: z.string().datetime().nullable(),
    interviewRounds: z.array(z.enum(['screen', 'first_round', 'assessment_centre', 'superday'])).min(1),
    interviewerLevels: z.array(z.enum(['analyst', 'associate', 'vp', 'director', 'md'])).min(1),
    calculatorPolicy: z.enum(['not_allowed', 'mental_math', 'allowed']),
    expectedAnswerDurationSeconds: z.object({
      minimum: z.number().int().min(5),
      target: z.number().int().min(5),
      maximum: z.number().int().min(5),
    }).refine((duration) => duration.minimum <= duration.target && duration.target <= duration.maximum, {
      message: 'Answer duration must satisfy minimum <= target <= maximum',
    }),
    assumptions: z.array(z.object({
      code: z.string().min(1).max(80),
      text: z.string().min(1).max(1000),
      requiredToState: z.boolean(),
    })),
  }),
  parameterSpec: z.object({
    seedVersion: z.number().int().positive(),
    parameters: z.array(ParameterSchema),
    derivedValues: z.array(z.object({
      code: z.string().regex(/^[A-Z][A-Z0-9_]*$/),
      expression: z.string().min(1).max(500),
      precision: z.number().int().min(0).max(6),
      rounding: z.enum(['half_up', 'floor', 'ceiling']),
    })),
    constraints: z.array(z.object({
      code: z.string().min(1).max(80),
      expression: z.string().min(1).max(500),
      errorMessage: z.string().min(1).max(500),
    })),
    transformationRules: z.array(z.object({
      variant: z.enum(VARIANT_TYPES),
      promptTemplate: z.string().min(1).max(8000),
      requiredParameterOverrides: z.record(z.unknown()).optional(),
    })),
  }),
  rubricVersion: z.object({
    version: z.number().int().positive(),
    answerOutline: z.array(z.string().min(1).max(1000)).min(1),
    mustHitPoints: z.array(z.object({
      code: z.string().min(1).max(80),
      description: z.string().min(1).max(1000),
      weight: z.number().min(0).max(1),
      evidenceRules: z.array(EvidenceRuleSchema).min(1),
    })).min(1),
    bonusPoints: z.array(z.object({
      code: z.string().min(1).max(80),
      description: z.string().min(1).max(1000),
      maximumContribution: z.number().min(0).max(0.25),
    })),
    fatalErrors: z.array(z.object({
      misconceptionCode: z.string().min(1).max(120),
      description: z.string().min(1).max(1000),
      triggerRules: z.array(EvidenceRuleSchema).min(1),
      blocksMastery: z.boolean(),
    })),
    acceptedVariants: z.array(z.object({
      condition: z.string().min(1).max(500),
      acceptedAnswer: z.string().min(1).max(2000),
      rationale: z.string().min(1).max(2000),
    })),
    commonMisconceptions: z.array(z.object({
      misconceptionCode: z.string().min(1).max(120),
      explanation: z.string().min(1).max(1000),
      remediationId: z.string().min(1).max(120),
    })),
    deterministicChecks: z.array(z.object({
      code: z.string().min(1).max(80),
      expression: z.string().min(1).max(500),
      expectedUnit: z.string().nullable(),
      absoluteTolerance: z.string().nullable(),
      relativeTolerance: z.string().nullable(),
      requiredSign: z.enum(['positive', 'negative', 'zero', 'any']),
      acceptedRounding: z.array(z.number().int().min(0).max(6)),
    })),
    followupTree: z.array(z.object({
      nodeId: z.string().min(1).max(80),
      parentNodeId: z.string().max(80).nullable(),
      trigger: z.enum(['correct', 'partial', 'fatal_error', 'misconception', 'time_exceeded']),
      triggerCode: z.string().max(120).optional(),
      questionTemplate: z.string().min(1).max(4000),
      expectedPoints: z.array(z.string().min(1).max(500)),
      maximumDepth: z.number().int().min(1).max(5),
    })),
  }).superRefine((rubric, context) => {
    const total = rubric.mustHitPoints.reduce((sum, point) => sum + point.weight, 0);
    if (Math.abs(total - 1) > 1e-9) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: 'Must-hit weights must sum to exactly 1' });
    }
  }),
  sources: z.array(z.object({
    sourceId: z.string().uuid(),
    sourceType: z.enum([
      'authoritative_standard', 'law_regulator', 'public_company', 'public_transaction',
      'licensed_text', 'candidate_report', 'independent_bank_style', 'competitor_concept_research',
    ]),
    title: z.string().min(1).max(500),
    publisher: z.string().min(1).max(300),
    url: z.string().url().nullable(),
    documentDate: z.string().date(),
    accessedAt: z.string().datetime(),
    pageOrSection: z.string().max(300).nullable(),
    jurisdiction: z.string().min(1).max(80),
    rightsBasis: z.enum(['fact_reference_only', 'licensed', 'permission', 'candidate_consent', 'public_domain']),
    verbatimTextUsed: z.literal(false),
    candidateConsentRecorded: z.boolean().default(false),
    candidateIndependenceKey: z.string().min(8).max(200).optional(),
    recruitingCycle: z.string().min(1).max(80).optional(),
    bankName: z.string().min(1).max(160).optional(),
    confidentialMaterialAttestedAbsent: z.boolean().default(false),
  }).superRefine((source, context) => {
    if (source.sourceType === 'candidate_report' && (
      source.rightsBasis !== 'candidate_consent'
      || !source.candidateConsentRecorded
      || !source.candidateIndependenceKey
      || !source.recruitingCycle
      || !source.confidentialMaterialAttestedAbsent
    )) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Candidate reports require consent, an independence key, recruiting cycle, and confidentiality attestation',
      });
    }
  })).min(1),
  bankReliability: z.object({
    classification: z.enum([
      'official_public', 'corroborated_bank_specific', 'candidate_reported', 'bank_style', 'not_applicable',
    ]),
    bankName: z.string().max(160).nullable(),
    independentReportCount: z.number().int().nonnegative(),
    recruitingCycleCount: z.number().int().nonnegative(),
    lastReportDate: z.string().date().nullable(),
  }).superRefine((reliability, context) => {
    if (reliability.classification === 'corroborated_bank_specific' &&
      (reliability.independentReportCount < 3 || reliability.recruitingCycleCount < 2 || !reliability.lastReportDate)) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: 'Corroborated bank-specific content needs 3 reports, 2 cycles, and a report date' });
    }
  }),
  review: z.object({
    authorId: z.string().uuid(),
    technicalReviewerId: z.string().uuid(),
    realismReviewerId: z.string().uuid(),
    approverId: z.string().uuid(),
    authoredAt: z.string().datetime(),
    approvedAt: z.string().datetime(),
    nextReviewAt: z.string().datetime(),
    changeReason: z.string().min(1).max(1000),
    founderOverride: z.boolean(),
    founderOverrideReason: z.string().max(1000).nullable(),
  }).superRefine((review, context) => {
    if (review.authorId === review.technicalReviewerId || review.authorId === review.realismReviewerId || review.authorId === review.approverId) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: 'Authors cannot review or approve their own version' });
    }
    if (review.founderOverride && !review.founderOverrideReason) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: 'Founder override requires a reason' });
    }
  }),
});

export type TechnicalItemFamily = z.infer<typeof TechnicalItemFamilySchema>;

export type GeneratableTechnicalFamily = Pick<
  TechnicalItemFamily,
  'id' | 'slug' | 'variantCoverage' | 'questionVersion' | 'parameterSpec' | 'rubricVersion'
>;

export interface GeneratedQuestionInstance {
  familyId: string;
  questionVersion: number;
  rubricVersion: number;
  seed: string;
  seedVersion: number;
  variant: VariantType;
  prompt: string;
  parameters: Record<string, string>;
  derivedValues: Record<string, string>;
  questionHash: string;
}

export interface MasteryAttemptEvidence {
  attemptedAt: string;
  correct: boolean;
  useful: boolean;
  variant: VariantType;
  difficulty: Difficulty;
  sessionId: string;
  fatalMisconceptionCodes: string[];
}
