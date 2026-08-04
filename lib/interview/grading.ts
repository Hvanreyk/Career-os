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

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractObservedValues(answer: string, checkCodes: string[]): Map<string, string> {
  const normalized = answer.replaceAll(',', '');
  if (checkCodes.length === 1) {
    const observed = extractNumbers(normalized).at(-1);
    return observed ? new Map([[checkCodes[0]!, observed]]) : new Map();
  }
  const values = new Map<string, string>();
  for (const code of checkCodes) {
    const label = escapeRegExp(code);
    const match = normalized.match(new RegExp(`(?:^|[\\s,;])${label}\\s*(?:=|:|is)\\s*(-?\\d+(?:\\.\\d+)?)`, 'i'));
    if (match?.[1]) values.set(code, match[1]);
  }
  return values;
}

export function gradeDeterministicAnswer(
  answer: string,
  variables: Record<string, string>,
  checks: TechnicalItemFamily['rubricVersion']['deterministicChecks'],
  fatalErrors: TechnicalItemFamily['rubricVersion']['fatalErrors'],
): DeterministicGradeResult {
  if (!checks.length) return { classification: 'not_deterministic', checks: [], misconceptionCodes: [] };
  const observedValues = extractObservedValues(answer, checks.map((check) => check.code));
  const matchedFatalDetectors = new Set<string>();
  const results = checks.map((check) => {
    const expectedFixed = evaluateFixed(check.expression, variables);
    const expected = formatFixed(expectedFixed, Math.max(0, ...check.acceptedRounding));
    const observedText = observedValues.get(check.code) ?? null;
    if (!observedText) return { code: check.code, status: 'not_observed' as const, expected, observed: null, expectedUnit: check.expectedUnit };
    let observed: bigint;
    try {
      observed = parseFixed(observedText);
    } catch {
      return { code: check.code, status: 'fail' as const, expected, observed: observedText, expectedUnit: check.expectedUnit };
    }
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
    if (difference > tolerance) matchedFatalDetectors.add(`numeric:${check.code}`);
    if (!signPass) matchedFatalDetectors.add(`sign:${check.code}`);
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
  const misconceptionCodes = fatalErrors.filter((error) => error.blocksMastery && error.triggerRules.some((rule) => (
    !rule.negated
    && matchedFatalDetectors.has(`${rule.kind}:${rule.value}`)
  ))).map((error) => error.misconceptionCode);
  return { classification, checks: results, misconceptionCodes };
}
