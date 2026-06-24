/**
 * Shared test fixtures: load the 17 professionals once, build a few
 * synthetic students that the brief and spec reference by name.
 */

import { loadProfessionalsFromXlsx } from '../../lib/db/xlsx.js';
import type { StudentProfile, Professional } from '../../lib/scoring/types.js';

let _pros: Professional[] | null = null;

export function loadPros(): Professional[] {
  if (!_pros) _pros = loadProfessionalsFromXlsx();
  return _pros;
}

/**
 * The synthetic Y2 UNSW BCom Co-op Finance student with HD WAM and
 * a JPM IB internship — the brief's Phase 2 acceptance test student.
 *
 * Setting expected_graduation_year = 2028 (4-yr Co-op, started 2025).
 */
export const Y2_UNSW_COOP_HD_JPM: StudentProfile = {
  id: 'student-test-y2-unsw-coop',
  email: 'test@example.com',

  university: 'UNSW',
  university_tier: 'go8_top',
  degree: 'Bachelor of Commerce (Co-op)',
  degree_type: 'bachelor',
  majors: ['Finance'],
  current_year: 2,
  expected_graduation_year: 2028,
  wam_band: 'hd',
  has_honours: false,
  has_masters_or_second_degree: false,

  high_school: null,
  high_school_type: 'unknown',
  atar_band: 'unknown',

  experiences: [
    {
      type: 'summer_internship',
      firm: 'J.P. Morgan',
      firm_tier: 'bb',
      industry: 'ib',
      role_function: 'ib_coverage',
      role_relevance: 5,
      year: 2025,
      duration_months: 3,
      how_obtained: 'online_application',
      converted_to_ft: 'NA',
    },
  ],
  signals: ['co_op_program', 'wam_hd'],

  target_role: 'ib_analyst',
  target_firm_tier: 'bb',
  target_geography: 'sydney',

  is_lateral_candidate: false,
};

/** Y3 student in May 2026 with no IB experience — expected stage = S2. */
export const Y3_NO_IB_PRE_RECRUITING: StudentProfile = {
  ...Y2_UNSW_COOP_HD_JPM,
  id: 'student-test-y3-no-ib',
  current_year: 3,
  expected_graduation_year: 2027,
  experiences: [],
  signals: ['wam_distinction'],
  wam_band: 'd',
};

/** Y2 student with no relevant experience — expected stage = S0. */
export const Y2_FOUNDATION: StudentProfile = {
  ...Y2_UNSW_COOP_HD_JPM,
  id: 'student-test-y2-foundation',
  experiences: [],
  signals: [],
  wam_band: 'unknown',
};

/** Lateral candidate from Big 4 audit — expected stage = S5. */
export const LATERAL_BIG4_AUDIT: StudentProfile = {
  ...Y2_UNSW_COOP_HD_JPM,
  id: 'student-test-lateral',
  current_year: 5,
  is_lateral_candidate: true,
  current_external_role: 'Big 4 audit senior',
  experiences: [
    {
      type: 'full_time',
      firm: 'KPMG',
      firm_tier: 'big4',
      industry: 'big4_audit',
      role_function: 'audit',
      role_relevance: 2,
      year: 2023,
      duration_months: 24,
      how_obtained: 'graduate_program',
      converted_to_ft: 'NA',
    },
  ],
};

/** Fixed test date so time-sensitive computations are deterministic. */
export const TEST_NOW = new Date('2026-05-08T00:00:00Z');
