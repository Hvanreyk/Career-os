// Form-layer types — slightly simpler than the engine's StudentProfile.
// Derivation (university_tier, role_relevance, signals from WAM, etc.)
// happens in /api/generate-report before the profile is passed to score().

export type TargetTier = 'bb' | 'elite_boutique' | 'mid_market' | 'boutique' | 'any';
export type TargetGeo = 'sydney' | 'melbourne' | 'perth' | 'adelaide' | 'brisbane';
export type DegreeType = 'bachelor' | 'double_degree' | 'honours' | 'masters' | 'mba' | 'phd';
export type WamBand = 'hd' | 'd' | 'c' | 'p' | 'unknown';
export type HighSchoolType =
  | 'gps' | 'cas' | 'aps' | 'selective'
  | 'public_comprehensive' | 'catholic' | 'independent_other' | 'unknown';
export type AtarBand = '99_plus' | '98_99' | '95_98' | '90_95' | '85_90' | 'below_85' | 'unknown';
export type ExpType =
  | 'summer_internship' | 'winter_internship' | 'penultimate_internship'
  | 'internship' | 'part_time' | 'full_time' | 'casual' | 'grad_program';
export type FirmTier =
  | 'bb' | 'elite_boutique' | 'mid_market' | 'boutique'
  | 'big4' | 'private_equity' | 'top_tier_law'
  | 'corporate' | 'startup' | 'government' | 'non_profit' | 'other';
export type Industry =
  | 'ib' | 'big4_advisory' | 'big4_audit' | 'corporate'
  | 'law' | 'private_equity' | 'capital_markets'
  | 'consulting' | 'government' | 'non_profit' | 'other';
export type HowObtained =
  | 'online_application' | 'cold_email' | 'society_referral'
  | 'ocr' | 'internal_referral' | 'networking_event' | 'alumni_network'
  | 'co_op_program' | 'scholarship' | 'conversion' | 'unknown';

export interface ExperienceEntry {
  type: ExpType;
  firm: string;
  firm_tier: FirmTier;
  industry: Industry;
  year: number;
  duration_months: number;
  how_obtained: HowObtained;
  converted_to_ft: boolean | 'NA';
}

export interface OnboardData {
  // Step 1 — Goal
  target_firm_tier: TargetTier;
  target_geography: TargetGeo;

  // Step 2 — University
  university: string;
  degree: string;
  degree_type: DegreeType;
  majors: string[];
  current_year: number;
  is_co_op: boolean;

  // Step 3 — Grades
  wam_band: WamBand;
  high_school_type: HighSchoolType;
  atar_band: AtarBand;

  // Step 4 — Experience
  experiences: ExperienceEntry[];
  is_lateral_candidate: boolean;
  current_external_role: string;

  // Step 5 — Signals (subset — rest auto-derived)
  signals: string[];
}

export const EMPTY_ONBOARD: OnboardData = {
  target_firm_tier: 'bb',
  target_geography: 'sydney',
  university: '',
  degree: '',
  degree_type: 'bachelor',
  majors: [],
  current_year: 2,
  is_co_op: false,
  wam_band: 'unknown',
  high_school_type: 'unknown',
  atar_band: 'unknown',
  experiences: [],
  is_lateral_candidate: false,
  current_external_role: '',
  signals: [],
};
