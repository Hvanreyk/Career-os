/**
 * Funnel model — the population-level denominators the competitiveness model
 * anchors on. Sourced from researched AU IB market figures
 * (australia_ib_researched_numbers.csv). Pure data + functions; no I/O.
 *
 * WHY THIS EXISTS
 * ---------------
 * The professional database is survivors-only: everyone in it already made it
 * into IB. So similarity-to-survivors can tell us *relative* competitiveness,
 * but not an absolute "chance of getting in". These funnel figures supply the
 * missing denominator — how many seats exist vs. how many serious candidates
 * chase them — so a competitiveness score can be expressed as a defensible
 * probability estimate (base rate x competitiveness multiplier).
 *
 * IMPORTANT HONESTY NOTES
 * - Every number here is an ESTIMATE with a low/base/high range.
 * - Base rates are the odds for an *average serious candidate*. A strong
 *   candidate sits well above them (that is what the multiplier captures); a
 *   weak one below. Never present a bare base rate as an individual's chance.
 * - The CSV does not separate elite-boutique seats from mid-market/independent
 *   seats — they share one "mid-market and independent platforms" pool. So EB
 *   and MM map to the SAME seat bucket here; the scorecard still differentiates
 *   them via cohort tier-attainment, but their funnel base rate is shared.
 */

import type { TargetFirmTier, TargetGeography } from './types';

// A researched estimate as a range. `base` is the working figure; `low`/`high`
// bound the uncertainty and let callers surface a range rather than false
// precision.
export interface Range {
  low: number;
  base: number;
  high: number;
}

const r = (low: number, base: number, high: number): Range => ({ low, base, high });

// ── Candidate pools (per recruiting cohort, Australia) ─────────────────────
export const SERIOUS_CANDIDATES: Range = r(2200, 2900, 3600);
export const COMPETITIVE_CANDIDATES: Range = r(800, 1100, 1400);
export const BROADLY_INTERESTED: Range = r(12000, 15000, 20000);

// Serious IB candidates per year by university (base estimates from the CSV
// "University Breakdown"). Keyed by canonical university names + common aliases.
export const UNI_SERIOUS_CANDIDATES: Record<string, number> = {
  'UNSW Sydney': 485, 'UNSW': 485, 'University of New South Wales': 485,
  'University of Sydney': 385, 'USYD': 385,
  'University of Melbourne': 335, 'UMelb': 335,
  'Monash University': 365, 'Monash': 365,
  'University of Queensland': 205, 'UQ': 205,
  'University of Technology Sydney': 215, 'UTS': 215,
  'Macquarie University': 180, 'Macquarie': 180,
  'Australian National University': 115, 'ANU': 115,
  'University of Western Australia': 90, 'UWA': 90,
  'University of Adelaide': 45,
  'Other Australian University': 480,
};

// Rough serious-candidate pool by recruiting city, for geography-aware framing.
// ANU is Canberra but recruits predominantly into the Sydney market.
export const GEOGRAPHY_SERIOUS_CANDIDATES: Record<TargetGeography, number> = {
  sydney: 485 + 385 + 215 + 180 + 115, // UNSW, USYD, UTS, Macquarie, ANU = 1380
  melbourne: 335 + 365,                 // UMelb, Monash = 700
  brisbane: 205,                        // UQ
  perth: 90,                            // UWA
  adelaide: 45,                         // Adelaide
};

// ── Seats (summer front-office internship seats per year, Australia) ────────
// Buckets mirror the CSV exactly. `elite_boutique` and `mid_market` share the
// "mid-market and independent platforms" bucket — the source does not split them.
export const SUMMER_SEATS = {
  bb: r(45, 58, 70),
  mm_and_independent: r(40, 55, 70), // covers elite_boutique AND mid_market
  boutique: r(20, 35, 50),
  any_core: r(105, 145, 190),
} as const;

// Total placements including winter/off-cycle (a wider on-ramp than summer alone).
export const TOTAL_PLACEMENTS = {
  bb: r(55, 70, 85),
  mm_and_independent: r(60, 80, 100),
  boutique: r(35, 55, 75),
  any_core: r(150, 205, 260),
} as const;

// ── Conversion (penultimate internship -> full-time) ────────────────────────
export const RETURN_OFFER_RATE: Range = r(0.65, 0.72, 0.80);
/** Net penultimate-intern -> starts-full-time-at-same-firm rate. */
export const PENULTIMATE_TO_FT_RATE: Range = r(0.55, 0.63, 0.70);

// ── Derived base rates ──────────────────────────────────────────────────────

/** Map a scoring target tier to its funnel seat bucket. */
function seatBucket(tier: TargetFirmTier): keyof typeof SUMMER_SEATS {
  switch (tier) {
    case 'bb': return 'bb';
    case 'elite_boutique':
    case 'mid_market': return 'mm_and_independent';
    case 'boutique': return 'boutique';
    case 'any': return 'any_core';
  }
}

/**
 * Population base rate: the share of *serious candidates* who land a summer
 * seat at the given tier. This is the average-candidate anchor — combine with a
 * competitiveness multiplier for an individual estimate. Low/high compose the
 * pessimistic (few seats / many candidates) and optimistic ends.
 */
export function baseSeatRate(tier: TargetFirmTier): Range {
  const seats = SUMMER_SEATS[seatBucket(tier)];
  return {
    low: seats.low / SERIOUS_CANDIDATES.high,
    base: seats.base / SERIOUS_CANDIDATES.base,
    high: seats.high / SERIOUS_CANDIDATES.low,
  };
}

/**
 * Wider base rate counting winter/off-cycle placements too — the realistic
 * "break in somewhere front-office at this tier over the cycle" denominator.
 */
export function basePlacementRate(tier: TargetFirmTier): Range {
  const seats = TOTAL_PLACEMENTS[seatBucket(tier)];
  return {
    low: seats.low / SERIOUS_CANDIDATES.high,
    base: seats.base / SERIOUS_CANDIDATES.base,
    high: seats.high / SERIOUS_CANDIDATES.low,
  };
}

/** Serious candidates competing per summer seat at the given tier. */
export function candidatesPerSeat(tier: TargetFirmTier): Range {
  const seats = SUMMER_SEATS[seatBucket(tier)];
  return {
    low: SERIOUS_CANDIDATES.low / seats.high,
    base: SERIOUS_CANDIDATES.base / seats.base,
    high: SERIOUS_CANDIDATES.high / seats.low,
  };
}

/**
 * Ceiling on any individual probability estimate, per tier. Even the strongest
 * profile cannot exceed a sane multiple of the base rate — total probability
 * mass is bounded by the number of seats. This keeps the "likely to achieve X"
 * headline honest and stops it drifting back toward fantasy figures.
 */
export function probabilityCeiling(tier: TargetFirmTier): number {
  // ~the odds if seats went preferentially to the competitive pool (~1,100),
  // i.e. seats(high) / competitive(low), lightly capped.
  const seats = SUMMER_SEATS[seatBucket(tier)];
  const ceiling = seats.high / COMPETITIVE_CANDIDATES.low;
  return Math.min(ceiling, 0.6);
}

/** Serious-candidate pool for a target geography (falls back to national). */
export function seriousCandidatesFor(geo: TargetGeography): number {
  return GEOGRAPHY_SERIOUS_CANDIDATES[geo] ?? SERIOUS_CANDIDATES.base;
}
