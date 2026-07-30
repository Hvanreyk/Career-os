import type {
  AtarBand,
  SelectableAcquisitionMethod,
  SelectableDegreeType,
  SelectableExperienceType,
  SelectableFirmTier,
  SelectableHighSchoolType,
  SelectableIndustry,
  SelectableSignalTag,
  TargetFirmTier,
  TargetGeography,
  WamBand as CareerCompassWamBand,
} from '@trajectoryos/core/career-compass/taxonomy';

// Form-layer aliases. The Career Compass taxonomy module is the only source of
// identifier truth; this file contains only the shape of the persisted form.
export type TargetTier = TargetFirmTier;
export type TargetGeo = TargetGeography;
export type DegreeType = SelectableDegreeType;
export type WamBand = CareerCompassWamBand;
export type HighSchoolType = SelectableHighSchoolType;
export type ExpType = SelectableExperienceType;
export type FirmTier = SelectableFirmTier;
export type Industry = SelectableIndustry;
export type HowObtained = SelectableAcquisitionMethod;
export type SignalTag = SelectableSignalTag;
export type { AtarBand };

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
  expected_graduation_year: number;
  is_co_op: boolean;

  // Step 3 — Grades
  wam_band: WamBand;
  high_school_type: HighSchoolType;
  atar_band: AtarBand;

  // Step 4 — Experience
  experiences: ExperienceEntry[];
  is_lateral_candidate: boolean;
  current_external_role: string;

  // Step 5 — only user-selectable tags; server-derived tags are added later.
  signals: SignalTag[];
}

export const EMPTY_ONBOARD: OnboardData = {
  target_firm_tier: 'bb',
  target_geography: 'sydney',
  university: '',
  degree: '',
  degree_type: 'bachelor',
  majors: [],
  current_year: 2,
  expected_graduation_year: new Date().getFullYear() + 2,
  is_co_op: false,
  wam_band: 'unknown',
  high_school_type: 'unknown',
  atar_band: 'unknown',
  experiences: [],
  is_lateral_candidate: false,
  current_external_role: '',
  signals: [],
};
