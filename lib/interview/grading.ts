import { evaluateFixed, formatFixed, parseFixed } from './decimal';
import type { TechnicalItemFamily } from './types';

export interface DeterministicGradeResult {
  classification: 'correct' | 'partial' | 'incorrect' | 'not_deterministic';
  checks: Array<{
    code: string;
    status: 'pass' | 'fail' | 'not_observed';
    expected: string;
    observed: string | null;
    expectedUnit: string | null;
  }>;
  misconceptionCodes: string[];
}

function extractNumbers(answer: string): string[] {
  return [...answer.replaceAll(',', '').matchAll(/-?\d+(?:\.\d+)?/g)].map((match) => match[0]);
}

export function gradeDeterministicAnswer(
  answer: string,
  variables: Record<string, string>,
  checks: TechnicalItemFamily['rubricVersion']['deterministicChecks'],
  fatalErrors: TechnicalItemFamily['rubricVersion']['fatalErrors'],
): DeterministicGradeResult {
  if (!checks.length) return { classification: 'not_deterministic', checks: [], misconceptionCodes: [] };
  const numbers = extractNumbers(answer);
  const observedText = numbers.at(-1) ?? null;
  const results = checks.map((check) => {
    const expectedFixed = evaluateFixed(check.expression, variables);
    const expected = formatFixed(expectedFixed, Math.max(0, ...check.acceptedRounding));
    if (!observedText) return { code: check.code, status: 'not_observed' as const, expected, observed: null, expectedUnit: check.expectedUnit };
    const observed = parseFixed(observedText);
    const absoluteTolerance = parseFixed(check.absoluteTolerance ?? '0');
    const relativeTolerance = check.relativeTolerance
      ? (expectedFixed < 0n ? -expectedFixed : expectedFixed) * parseFixed(check.relativeTolerance) / 1_000_000n
      : 0n;
    const tolerance = absoluteTolerance > relativeTolerance ? absoluteTolerance : relativeTolerance;
    const difference = observed > expectedFixed ? observed - expectedFixed : expectedFixed - observed;
    const signPass = check.requiredSign === 'any'
      || (check.requiredSign === 'positive' && observed > 0n)
      || (check.requiredSign === 'negative' && observed < 0n)
      || (check.requiredSign === 'zero' && observed === 0n);
    return {
      code: check.code,
      status: difference <= tolerance && signPass ? 'pass' as const : 'fail' as const,
      expected,
      observed: observedText,
      expectedUnit: check.expectedUnit,
    };
  });
  const passes = results.filter((result) => result.status === 'pass').length;
  const classification = passes === results.length ? 'correct' : passes > 0 ? 'partial' : 'incorrect';
  const misconceptionCodes = classification === 'incorrect' && observedText
    ? fatalErrors.filter((error) => error.blocksMastery).map((error) => error.misconceptionCode)
    : [];
  return { classification, checks: results, misconceptionCodes };
}
