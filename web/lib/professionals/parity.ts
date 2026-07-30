import { createHash } from 'node:crypto';

import type { Professional } from '@trajectoryos/core/scoring/types';

export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, entry]) => entry !== undefined)
      .sort(([left], [right]) => left.localeCompare(right));
    return `{${entries.map(([key, entry]) =>
      `${JSON.stringify(key)}:${stableStringify(entry)}`).join(',')}}`;
  }
  return JSON.stringify(value) ?? 'null';
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

function sortedProfessionals(professionals: readonly Professional[]): Professional[] {
  return [...professionals].sort((left, right) => left.id.localeCompare(right.id));
}

export interface ProfessionalParitySummary {
  exact: boolean;
  legacy_professional_count: number;
  normalized_professional_count: number;
  legacy_experience_count: number;
  normalized_experience_count: number;
  mismatched_professional_count: number;
  legacy_source_hash: string;
  normalized_source_hash: string;
}

export function summarizeProfessionalParity(
  legacy: readonly Professional[],
  normalized: readonly Professional[],
): ProfessionalParitySummary {
  const legacySorted = sortedProfessionals(legacy);
  const normalizedSorted = sortedProfessionals(normalized);
  const normalizedById = new Map(normalizedSorted.map((professional) => [professional.id, professional]));
  const legacyIds = new Set(legacySorted.map((professional) => professional.id));
  let mismatchCount = 0;

  for (const professional of legacySorted) {
    const counterpart = normalizedById.get(professional.id);
    if (!counterpart || stableStringify(professional) !== stableStringify(counterpart)) {
      mismatchCount++;
    }
  }
  for (const professional of normalizedSorted) {
    if (!legacyIds.has(professional.id)) mismatchCount++;
  }

  const legacySerialized = stableStringify(legacySorted);
  const normalizedSerialized = stableStringify(normalizedSorted);
  return {
    exact: legacySerialized === normalizedSerialized,
    legacy_professional_count: legacy.length,
    normalized_professional_count: normalized.length,
    legacy_experience_count: legacy.reduce((total, row) => total + row.experiences.length, 0),
    normalized_experience_count: normalized.reduce((total, row) => total + row.experiences.length, 0),
    mismatched_professional_count: mismatchCount,
    legacy_source_hash: sha256(legacySerialized),
    normalized_source_hash: sha256(normalizedSerialized),
  };
}

interface DifferenceCounter {
  count: number;
}

function compareWithTolerance(
  left: unknown,
  right: unknown,
  tolerance: number,
  differences: DifferenceCounter,
): void {
  if (typeof left === 'number' && typeof right === 'number') {
    if (!Number.isFinite(left) || !Number.isFinite(right) || Math.abs(left - right) > tolerance) {
      differences.count++;
    }
    return;
  }
  if (Array.isArray(left) && Array.isArray(right)) {
    if (left.length !== right.length) differences.count++;
    const length = Math.min(left.length, right.length);
    for (let index = 0; index < length; index++) {
      compareWithTolerance(left[index], right[index], tolerance, differences);
    }
    return;
  }
  if (left !== null && right !== null && typeof left === 'object' && typeof right === 'object') {
    const leftRecord = left as Record<string, unknown>;
    const rightRecord = right as Record<string, unknown>;
    const keys = new Set([...Object.keys(leftRecord), ...Object.keys(rightRecord)]);
    for (const key of keys) {
      if (!(key in leftRecord) || !(key in rightRecord)) {
        differences.count++;
      } else {
        compareWithTolerance(leftRecord[key], rightRecord[key], tolerance, differences);
      }
    }
    return;
  }
  if (left !== right) differences.count++;
}

export function summarizeScoringParity(
  legacyOutput: unknown,
  normalizedOutput: unknown,
  tolerance = 1e-12,
): { exact: boolean; equivalent_within_tolerance: boolean; differing_leaf_count: number } {
  const differences: DifferenceCounter = { count: 0 };
  compareWithTolerance(legacyOutput, normalizedOutput, tolerance, differences);
  return {
    exact: stableStringify(legacyOutput) === stableStringify(normalizedOutput),
    equivalent_within_tolerance: differences.count === 0,
    differing_leaf_count: differences.count,
  };
}
