/**
 * Layer 5 — Similarity scoring. Weighted Gower-like distance with
 * unknown-skipping: when either side has `unknown` for a feature,
 * exclude that feature from the calculation rather than imputing.
 *
 * Lower distance = closer match. 0 = identical (on compared features).
 */

import type {
  AtarBand,
  ComputedFields,
  HighSchoolType,
  ProfileSnapshot,
  StudentProfile,
  UniversityTier,
  WamBand,
} from './types';
import {
  ATAR_RANKS,
  TIER_LEVEL,
  UNI_TIER_RANKS,
  WAM_RANKS,
} from './types';

// ----- Primitive distance functions -----

export function categoricalDistance(a: string, b: string): number {
  return a === b ? 0 : 1;
}

export function binaryDistance(a: boolean, b: boolean): number {
  return a === b ? 0 : 1;
}

export function bucketedDistance(a: number, b: number, max_diff: number): number {
  if (max_diff <= 0) return 0;
  return Math.min(Math.abs(a - b), max_diff) / max_diff;
}

export function ordinalDistance(
  a: string,
  b: string,
  ranks: Record<string, number>,
): number {
  const ra = ranks[a];
  const rb = ranks[b];
  if (ra === undefined || rb === undefined) return 1; // unknown rank → treat as max distance
  const values = Object.values(ranks);
  const max_diff = Math.max(...values) - Math.min(...values);
  if (max_diff === 0) return 0;
  return Math.abs(ra - rb) / max_diff;
}

// ----- Composite distance -----

interface StudentForDistance {
  university_tier: UniversityTier;
  wam_band: WamBand;
  atar_band: AtarBand;
  high_school_type: HighSchoolType;
  has_honours: boolean;
  computed: ComputedFields;
}

export interface DistanceComponent {
  feat: string;
  weight: number;
  dist: number;
  skipped: boolean;
}

export interface DistanceBreakdown {
  total: number;
  weight_total: number;
  components: DistanceComponent[];
}

export function computeDistance(
  student: StudentForDistance,
  snap: ProfileSnapshot,
): number {
  return computeDistanceWithBreakdown(student, snap).total;
}

export function computeDistanceWithBreakdown(
  student: StudentForDistance,
  snap: ProfileSnapshot,
): DistanceBreakdown {
  const sc = student.computed;
  const pc = snap.computed;

  // Skip-rules per feature: skip when either side has 'unknown' for
  // that ordinal feature (or where missingness is meaningful).
  const components: DistanceComponent[] = [
    {
      feat: 'university_tier',
      weight: 1.0,
      dist: ordinalDistance(student.university_tier, snap.university_tier, UNI_TIER_RANKS),
      skipped: false,
    },
    {
      feat: 'wam_band',
      weight: 1.5,
      dist:
        student.wam_band === 'unknown' || snap.wam_band === 'unknown'
          ? 0
          : ordinalDistance(student.wam_band, snap.wam_band, WAM_RANKS),
      skipped: student.wam_band === 'unknown' || snap.wam_band === 'unknown',
    },
    {
      feat: 'atar_band',
      weight: 0.5,
      dist:
        student.atar_band === 'unknown' || snap.atar_band === 'unknown'
          ? 0
          : ordinalDistance(student.atar_band, snap.atar_band, ATAR_RANKS),
      skipped: student.atar_band === 'unknown' || snap.atar_band === 'unknown',
    },
    {
      feat: 'high_school_type',
      weight: 0.3,
      dist: categoricalDistance(student.high_school_type, snap.high_school_type),
      skipped:
        student.high_school_type === 'unknown' || snap.high_school_type === 'unknown',
    },
    {
      feat: 'has_honours',
      weight: 0.5,
      dist: binaryDistance(student.has_honours, snap.has_honours),
      skipped: false,
    },
    {
      feat: 'experience_count_relevant',
      weight: 1.0,
      dist: bucketedDistance(sc.experience_count_relevant, pc.experience_count_relevant, 4),
      skipped: false,
    },
    {
      feat: 'highest_firm_tier_reached',
      weight: 2.0,
      dist: bucketedDistance(
        sc.highest_firm_tier_reached,
        pc.highest_firm_tier_reached,
        TIER_LEVEL.bb, // 6 — span from 'unknown' (0) to 'bb' (6)
      ),
      skipped: false,
    },
    {
      feat: 'has_ib_experience',
      weight: 2.0,
      dist: binaryDistance(sc.has_ib_experience, pc.has_ib_experience),
      skipped: false,
    },
    {
      feat: 'has_big4_advisory_experience',
      weight: 1.0,
      dist: binaryDistance(sc.has_big4_advisory_experience, pc.has_big4_advisory_experience),
      skipped: false,
    },
    {
      feat: 'has_pe_experience',
      weight: 0.8,
      dist: binaryDistance(sc.has_pe_experience, pc.has_pe_experience),
      skipped: false,
    },
    {
      feat: 'total_experience_months',
      weight: 0.8,
      dist: bucketedDistance(sc.total_experience_months, pc.total_experience_months, 12),
      skipped: false,
    },
    {
      feat: 'has_smif',
      weight: 1.0,
      dist: binaryDistance(sc.has_smif, pc.has_smif),
      skipped: false,
    },
    {
      feat: 'has_society_committee',
      weight: 0.8,
      dist: binaryDistance(sc.has_society_committee, pc.has_society_committee),
      skipped: false,
    },
    {
      feat: 'has_modelling_course',
      weight: 0.5,
      dist: binaryDistance(sc.has_modelling_course, pc.has_modelling_course),
      skipped: false,
    },
    {
      feat: 'has_dean_list',
      weight: 0.7,
      dist: binaryDistance(sc.has_dean_list, pc.has_dean_list),
      skipped: false,
    },
    {
      feat: 'cfa_level',
      weight: 0.4,
      dist: bucketedDistance(sc.cfa_level, pc.cfa_level, 3),
      skipped: false,
    },
    {
      feat: 'is_co_op_program',
      weight: 0.6,
      dist: binaryDistance(sc.is_co_op_program, pc.is_co_op_program),
      skipped: false,
    },
  ];

  let weighted_sum = 0;
  let weight_total = 0;
  for (const c of components) {
    if (c.skipped) continue;
    weighted_sum += c.weight * c.dist;
    weight_total += c.weight;
  }

  // Safety: if every feature was skipped, treat as max distance.
  const total = weight_total === 0 ? 1.0 : weighted_sum / weight_total;
  return { total, weight_total, components };
}

/** Build the slim StudentForDistance shape from a full StudentProfile + computed. */
export function studentForDistance(
  s: StudentProfile,
  c: ComputedFields,
): StudentForDistance {
  return {
    university_tier: s.university_tier,
    wam_band: s.wam_band,
    atar_band: s.atar_band,
    high_school_type: s.high_school_type,
    has_honours: s.has_honours,
    computed: c,
  };
}
