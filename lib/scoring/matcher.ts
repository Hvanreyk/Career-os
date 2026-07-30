/**
 * Layer 5 (continued) — Top-K nearest-neighbour matcher.
 *
 * Pipeline:
 *   filtered pool → reconstructAtStage(prof, stage) → distance → sort → top K
 *
 * If the pool size after filtering is < K, return all available and
 * the caller flags `low_data_warning = true`. The v7 dataset has 12
 * entry-level pros so early users will frequently hit this.
 */

import type {
  ComputedFields,
  MatchResult,
  Professional,
  Stage,
  StudentProfile,
} from './types';
import { reconstructAtStage } from './snapshot';
import { computeDistance, studentForDistance } from './distance';

export const DEFAULT_K = 20;

export function findKNearest(
  student: StudentProfile,
  studentComputed: ComputedFields,
  pool: Professional[],
  stage: Stage,
  K: number = DEFAULT_K,
): MatchResult[] {
  const sd = studentForDistance(student, studentComputed);

  const scored: MatchResult[] = pool.map(prof => {
    const snapshot = reconstructAtStage(prof, stage);
    const distance = computeDistance(sd, snapshot);
    return { professional: prof, snapshot, distance };
  });

  scored.sort((a, b) => a.distance - b.distance);

  // Expand K to include everyone tied with the K-th match. Early-stage
  // students (S0/S1) match many pros whose snapshots look identical
  // (distance 0); cutting ties at an arbitrary 20 would make downstream
  // stats (reached_target ratio) sampling noise rather than the true
  // cohort rate.
  if (scored.length > K) {
    const kth = scored[K - 1]!.distance;
    let end = K;
    while (end < scored.length && scored[end]!.distance - kth < 1e-9) end++;
    return scored.slice(0, end);
  }
  return scored;
}
