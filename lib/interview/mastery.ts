import type { MasteryAttemptEvidence } from './types';

export type MasteryLabel = 'not_assessed' | 'emerging' | 'developing' | 'interview_ready' | 'durable';
export type EvidenceConfidence = 'low' | 'moderate' | 'high';

export interface ConceptMasteryResult {
  label: MasteryLabel;
  confidence: EvidenceConfidence;
  usefulAttempts: number;
  correctAttempts: number;
  variantCount: number;
  unresolvedFatalMisconceptions: string[];
  reasons: string[];
}

function daysBetween(left: string, right: string): number {
  return Math.abs(new Date(left).getTime() - new Date(right).getTime()) / 86_400_000;
}

export function calculateConceptMastery(attempts: MasteryAttemptEvidence[], now = new Date()): ConceptMasteryResult {
  const useful = attempts.filter((attempt) => attempt.useful).sort((a, b) => a.attemptedAt.localeCompare(b.attemptedAt));
  const correct = useful.filter((attempt) => attempt.correct);
  const variants = new Set(correct.map((attempt) => attempt.variant));
  const difficulties = new Set(correct.map((attempt) => attempt.difficulty));
  const sessions = new Set(correct.map((attempt) => attempt.sessionId));
  const recentCutoff = new Date(now.getTime() - 30 * 86_400_000);
  const unresolvedFatal = [...new Set(useful
    .filter((attempt) => new Date(attempt.attemptedAt) >= recentCutoff)
    .flatMap((attempt) => attempt.fatalMisconceptionCodes))];
  const hasNumericalOrReversed = correct.some((attempt) => ['numerical', 'reversed'].includes(attempt.variant));
  const spaced = correct.some((left, index) => correct.slice(index + 1).some((right) =>
    left.sessionId !== right.sessionId && daysBetween(left.attemptedAt, right.attemptedAt) >= 14));

  let label: MasteryLabel = 'not_assessed';
  const reasons: string[] = [];
  if (useful.length < 2) reasons.push('Complete at least two useful attempts.');
  else if (correct.length < 2 || unresolvedFatal.length) {
    label = 'emerging';
    if (unresolvedFatal.length) reasons.push('A fatal misconception must be cleared before Interview-ready.');
  } else if (correct.length >= 6 && variants.size >= 5 && sessions.size >= 2 && spaced && unresolvedFatal.length === 0) {
    label = 'durable';
  } else if (correct.length >= 4 && variants.size >= 3 && hasNumericalOrReversed && unresolvedFatal.length === 0) {
    label = 'interview_ready';
  } else {
    label = 'developing';
    reasons.push('Practise more independent reversed, numerical, or applied variants.');
  }

  let confidence: EvidenceConfidence = 'low';
  if (useful.length >= 8 && variants.size >= 5 && difficulties.size >= 2 && sessions.size >= 2) confidence = 'high';
  else if (useful.length >= 4 && variants.size >= 3) confidence = 'moderate';

  return {
    label,
    confidence,
    usefulAttempts: useful.length,
    correctAttempts: correct.length,
    variantCount: variants.size,
    unresolvedFatalMisconceptions: unresolvedFatal,
    reasons,
  };
}
