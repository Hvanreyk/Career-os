import { z } from 'zod';
import {
  AtarBandSchema,
  CareerCompassSignalTagSchema,
  DegreeTypeSchema,
  ProfessionalAcquisitionMethodSchema,
  ProfessionalCompatibilitySignalTagSchema,
  ProfessionalExperienceTypeSchema,
  ProfessionalFirmTierSchema,
  ProfessionalHighSchoolTypeSchema,
  ProfessionalIndustrySchema,
  RoleFunctionSchema,
  TargetFirmTierSchema,
  TargetGeographySchema,
  WamBandSchema,
} from '../career-compass/taxonomy';

// ============================================================
// Scoring compatibility enums. Overlapping Career Compass identifiers come
// from the shared onboarding taxonomy; database-only values remain explicit
// compatibility inputs until their versioned semantic migration is approved.
// ============================================================

export const CurrentRole = z.enum(['ib_analyst', 'ib_associate', 'ib_vp']);
export type CurrentRole = z.infer<typeof CurrentRole>;

// 'elite_boutique_and_mm' is retained for backward compatibility with
// existing professional records that predate the EB/MM split. New data
// should use 'elite_boutique' or 'mid_market'.
export const CurrentFirmTier = z.enum([
  'bb', 'elite_boutique', 'mid_market', 'elite_boutique_and_mm', 'boutique',
]);
export type CurrentFirmTier = z.infer<typeof CurrentFirmTier>;

export const Geography = z.enum([
  'sydney', 'melbourne', 'perth', 'adelaide', 'brisbane',
  'hk', 'london', 'ny', 'singapore', 'other',
]);
export type Geography = z.infer<typeof Geography>;

export const UniversityTier = z.enum([
  'go8_top', 'go8_other', 'atn', 'other_au',
  'top_global', 'international_top', 'other_global',
]);
export type UniversityTier = z.infer<typeof UniversityTier>;

export const DegreeType = DegreeTypeSchema;
export type DegreeType = z.infer<typeof DegreeType>;

export const WamBand = WamBandSchema;
export type WamBand = z.infer<typeof WamBand>;

export const HighSchoolType = ProfessionalHighSchoolTypeSchema;
export type HighSchoolType = z.infer<typeof HighSchoolType>;

export const AtarBand = AtarBandSchema;
export type AtarBand = z.infer<typeof AtarBand>;

export const ExpType = ProfessionalExperienceTypeSchema;
export type ExpType = z.infer<typeof ExpType>;

// 'elite_boutique_and_mm' is retained for backward compatibility with
// existing records that predate the EB/MM split — see CurrentFirmTier.
// 'government', 'non_profit' are retained for backward compatibility with
// records predating the local/state/federal government split and the
// removal of non-profit as a selectable onboarding area.
// 'top_tier_law' displays as "Big 6" in onboarding — Australia's Big 6 law
// firms ARE the top-tier firms, so the existing value covers that tier.
// 'mid_tier_law'/'boutique_law' are distinct from the generic 'mid_tier'/
// 'boutique' values (used by accounting/consulting/IB) since law-firm tier
// rankings don't share the same scale.
// 'asx50'..'small_private' are the firm-level options for the Operations
// and Corporate Development onboarding areas.
export const ExpFirmTier = ProfessionalFirmTierSchema;
export type ExpFirmTier = z.infer<typeof ExpFirmTier>;

// 'capital_markets' is retained for backward compatibility with existing
// records that predate the 'global_markets' rename/split.
// 'corporate' (labelled "Corporate Finance") is retained for backward
// compatibility but no longer offered in onboarding — students with a
// corporate finance internship now select 'ib' instead.
// 'operations' is retained for backward compatibility but no longer offered
// in onboarding (removed as a selectable Area — students with an operations
// background now select 'corporate_development' or 'other').
// 'big4_advisory' now represents the M&A/transaction-services split of Big 4
// advisory work; 'big4_business_advisory' is the newer, non-deal-facing
// split. Both feed the same 'has_big4_advisory_experience' signal.
export const ExpIndustry = ProfessionalIndustrySchema;
export type ExpIndustry = z.infer<typeof ExpIndustry>;

export const ExpRoleFunction = RoleFunctionSchema;
export type ExpRoleFunction = z.infer<typeof ExpRoleFunction>;

export const ExpHowObtained = ProfessionalAcquisitionMethodSchema;
export type ExpHowObtained = z.infer<typeof ExpHowObtained>;

// Tristate boolean — internships convert/not, FT roles are 'NA'
export const ConvertedToFt = z.union([z.boolean(), z.literal('NA')]);
export type ConvertedToFt = z.infer<typeof ConvertedToFt>;

export const DataSource = z.enum([
  'linkedin', 'interview', 'survey', 'public_bio', 'third_party',
]);
export type DataSource = z.infer<typeof DataSource>;

export const DataConfidence = z.enum(['high', 'medium', 'low']);
export type DataConfidence = z.infer<typeof DataConfidence>;

export const SignalTag = ProfessionalCompatibilitySignalTagSchema;
export type SignalTag = z.infer<typeof SignalTag>;

export const ProfessionalAchievementDatePrecision = z.enum([
  'unknown',
  'year',
  'month',
  'day',
]);
export type ProfessionalAchievementDatePrecision = z.infer<
  typeof ProfessionalAchievementDatePrecision
>;

export const ProfessionalAchievementSchema = z.object({
  tag: SignalTag,
  effective_year: z.number().int().min(1900).max(2100).nullable(),
  date_precision: ProfessionalAchievementDatePrecision,
}).superRefine((achievement, ctx) => {
  if (achievement.effective_year === null && achievement.date_precision !== 'unknown') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['effective_year'],
      message: 'must be non-null when date_precision is not unknown',
    });
  }
  if (achievement.effective_year !== null && achievement.date_precision === 'unknown') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['date_precision'],
      message: 'must not be unknown when effective_year is non-null',
    });
  }
});
export type ProfessionalAchievement = z.infer<typeof ProfessionalAchievementSchema>;

// ============================================================
// Per-experience slot
// ============================================================
//
// In the flat 80-col schema, exp1..exp5 are inlined. Rather than
// repeat 10 fields x 5 experiences in the row schema, we build a
// reusable ExpSlotSchema and compose it. A row may have any number
// of slots filled (1-5); unfilled slots are entirely null.

export const ExperienceSchema = z.object({
  type: ExpType,
  firm: z.string().min(1),
  firm_tier: ExpFirmTier,
  industry: ExpIndustry,
  role_function: ExpRoleFunction,
  role_relevance: z.number().int().min(1).max(5),
  year: z.number().int().min(1990).max(2100),
  duration_months: z.number().int().nonnegative().nullable(),
  how_obtained: ExpHowObtained,
  converted_to_ft: ConvertedToFt,
});
export type ExpSlot = z.infer<typeof ExperienceSchema>;

// All-null slot — for unused exp4/exp5. Either every field is null or none.
const ExpSlotEmpty = z.object({
  type: z.null(),
  firm: z.null(),
  firm_tier: z.null(),
  industry: z.null(),
  role_function: z.null(),
  role_relevance: z.null(),
  year: z.null(),
  duration_months: z.null(),
  how_obtained: z.null(),
  converted_to_ft: z.null(),
});

// Dispatch on `type`: null → empty, string → filled. This produces
// field-level error paths instead of "Invalid input" from z.union.
export const ExpSlotOrEmpty = z.unknown().transform((value, ctx) => {
  const v = value as { type?: unknown } | null | undefined;
  if (!v || typeof v !== 'object') {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'expected object' });
    return z.NEVER;
  }
  const target = v.type === null ? ExpSlotEmpty : ExperienceSchema;
  const result = target.safeParse(v);
  if (!result.success) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const issue of result.error.issues) ctx.addIssue(issue as any);
    return z.NEVER;
  }
  return result.data;
});

// ============================================================
// Professional row — full 80-column flat schema
// ============================================================

export const ProfessionalRowSchema = z.object({
  // Identity (3)
  id: z.string().regex(/^P\d{3,}$/, 'id must be P followed by digits'),
  full_name_internal: z.string().min(1),
  linkedin_url_internal: z.string().url().nullable(),

  // Current state (6)
  current_role: CurrentRole,
  current_firm: z.string().min(1),
  current_firm_tier: CurrentFirmTier,
  current_geography: Geography,
  current_role_start_year: z.number().int().min(1990).max(2100),
  years_to_current_role: z.number().int().nonnegative(),

  // Education (14)
  university: z.string().min(1),
  university_tier: UniversityTier,
  degree: z.string().min(1),
  degree_type: DegreeType,
  majors: z.string().nullable(),
  wam_band: WamBand,
  graduation_year: z.number().int().min(1990).max(2100).nullable(),
  has_honours: z.boolean(),
  has_masters_or_second_degree: z.boolean(),
  secondary_education_notes: z.string().nullable(),
  education_achievements: z.string().nullable(),
  high_school: z.string().nullable(),
  high_school_type: HighSchoolType,
  atar_band: AtarBand,

  // Experiences (5 slots x 10 fields = 50 cols)
  exp1: ExpSlotOrEmpty,
  exp2: ExpSlotOrEmpty,
  exp3: ExpSlotOrEmpty,
  exp4: ExpSlotOrEmpty,
  exp5: ExpSlotOrEmpty,

  // Signals + meta (7)
  signals: z.array(SignalTag),
  extra_experiences_notes: z.string().nullable(),
  path_summary: z.string().nullable(),
  data_source: DataSource,
  data_confidence: DataConfidence,
  notes: z.string().nullable(),
  date_added: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date_added must be YYYY-MM-DD'),
});
export type ProfessionalRow = z.infer<typeof ProfessionalRowSchema>;

// ============================================================
// Flat shape for the DB row — exp slots inlined as expN_*
// ============================================================
//
// Used by the import script when writing into Postgres, which has
// the spreadsheet's flat 80-col layout (one column per inlined field).

export type FlatProfessionalRow = Omit<
  ProfessionalRow,
  'exp1' | 'exp2' | 'exp3' | 'exp4' | 'exp5'
> & {
  [K in `exp${1 | 2 | 3 | 4 | 5}_${
    | 'type' | 'firm' | 'firm_tier' | 'industry' | 'role_function'
    | 'role_relevance' | 'year' | 'duration_months'
    | 'how_obtained' | 'converted_to_ft'
  }`]: unknown;
};

export function flattenForDb(row: ProfessionalRow): FlatProfessionalRow {
  const out: Record<string, unknown> = { ...row };
  for (const i of [1, 2, 3, 4, 5] as const) {
    const slot = row[`exp${i}` as const] as ExpSlot | { type: null };
    for (const key of [
      'type', 'firm', 'firm_tier', 'industry', 'role_function',
      'role_relevance', 'year', 'duration_months',
      'how_obtained', 'converted_to_ft',
    ] as const) {
      const v = (slot as Record<string, unknown>)[key];
      // Convert TS booleans + literal 'NA' back to the canonical
      // text the DB stores for converted_to_ft.
      if (key === 'converted_to_ft') {
        if (v === true) out[`exp${i}_${key}`] = 'TRUE';
        else if (v === false) out[`exp${i}_${key}`] = 'FALSE';
        else out[`exp${i}_${key}`] = v; // null or 'NA'
      } else {
        out[`exp${i}_${key}`] = v;
      }
    }
    delete out[`exp${i}`];
  }
  // signals stays as text[] (Postgres array)
  return out as FlatProfessionalRow;
}

// ============================================================
// Phase 2 — Scoring engine types
// ============================================================

// ----- Experience (single slot, canonical engine shape) -----
// Same shape as a filled ExpSlot; aliased for clarity in engine code.
export type Experience = ExpSlot;

// ----- Stage -----
export const Stage = z.enum(['S0', 'S1', 'S2', 'S3', 'S4', 'S5']);
export type Stage = z.infer<typeof Stage>;

// ----- Tier rankings -----
// Ordinal levels for cross-tier comparisons. Keep this aligned with
// `TIER_LEVEL` in the spec — used for distance computation, gap
// analysis, and "highest_firm_tier_reached" calculation.
export const TIER_LEVEL = {
  bb: 7,
  mbb: 6,
  elite_boutique: 6,
  mega_fund: 6,
  // Legacy combined value — ranked conservatively at the Mid-Market level
  // until existing professional records are relabeled into the split tiers.
  elite_boutique_and_mm: 5,
  mid_market: 5,
  large_cap: 5,
  global_manager: 5,
  hedge_fund: 5,
  tier2_consulting: 5,
  boutique: 4,
  private_equity: 4,
  aus_big4_bank: 4,
  asx50: 4,
  top_tier_law: 3,
  big4: 3,
  asx100: 3,
  mid_tier_law: 2,
  mid_tier: 2,
  corporate: 2,
  government: 2,
  state_government: 2,
  federal_government: 3,
  asx200: 2,
  large_private: 2,
  boutique_law: 1,
  medium_private: 1,
  local_government: 1,
  startup: 1,
  non_profit: 1,
  small_private: 1,
  other: 1,
  unknown: 0,
  none: 0,
} as const;
export type TierLevel = (typeof TIER_LEVEL)[keyof typeof TIER_LEVEL];

// WAM_RANKS, ATAR_RANKS, UNI_TIER_RANKS: ordinal ranks used by the
// distance function. `unknown` deliberately excluded — the engine
// skips the feature when either side is unknown.
export const WAM_RANKS: Record<Exclude<WamBand, 'unknown'>, number> = {
  hd: 4, d: 3, c: 2, p: 1,
};

export const ATAR_RANKS: Record<Exclude<AtarBand, 'unknown'>, number> = {
  '99_plus': 6, '98_99': 5, '95_98': 4, '90_95': 3, '85_90': 2, 'below_85': 1,
};

export const UNI_TIER_RANKS: Record<UniversityTier, number> = {
  go8_top: 5,
  international_top: 5,
  top_global: 5,
  go8_other: 4,
  atn: 3,
  other_global: 3,
  other_au: 2,
};

// ----- Student profile (intake schema) -----
export const TargetFirmTier = TargetFirmTierSchema;
export type TargetFirmTier = z.infer<typeof TargetFirmTier>;

export const TargetGeography = TargetGeographySchema;
export type TargetGeography = z.infer<typeof TargetGeography>;

// Geographies with real professional data. Perth/Adelaide/Brisbane targets
// fall back to matching against this whole set (see pool.ts) since there's
// no dedicated professional data for them yet.
export const AU_BROAD_MATCH_TARGETS: readonly TargetGeography[] = [
  'perth', 'adelaide', 'brisbane',
];
export const AU_CONFIRMED_GEOGRAPHIES: readonly Geography[] = [
  'sydney', 'melbourne', 'perth', 'adelaide', 'brisbane',
];

export const StudentProfileSchema = z.object({
  id: z.string(),
  email: z.string().email(),

  // Education
  university: z.string(),
  university_tier: UniversityTier,
  degree: z.string(),
  degree_type: DegreeType,
  majors: z.array(z.string()),
  current_year: z.number().int().min(1).max(6),
  expected_graduation_year: z.number().int().min(2020).max(2100),
  wam_band: WamBand,
  has_honours: z.boolean(),
  has_masters_or_second_degree: z.boolean(),

  // High school (internal scoring only — never displayed)
  high_school: z.string().nullable(),
  high_school_type: HighSchoolType,
  atar_band: AtarBand,

  // Experiences + signals
  experiences: z.array(ExperienceSchema),
  signals: z.array(CareerCompassSignalTagSchema),

  // Targeting
  target_role: z.literal('ib_analyst'),
  target_firm_tier: TargetFirmTier,
  target_geography: TargetGeography,

  // Lateral mover (S5 only)
  is_lateral_candidate: z.boolean(),
  current_external_role: z.string().optional(),
});
export type StudentProfile = z.infer<typeof StudentProfileSchema>;

// ----- Professional (canonical engine shape — experiences as array) -----
//
// The DB stores experiences in 5 inlined slots; the engine wants them
// as a single array. `toCanonicalProfessional` collapses the slots. Private
// identity is deliberately excluded because scoring never consumes it.

export const ProfessionalSchema = z.object({
  id: z.string().regex(/^P\d{3,}$/, 'id must be P followed by digits'),
  current_role: CurrentRole,
  current_firm: z.string().min(1),
  current_firm_tier: CurrentFirmTier,
  current_geography: Geography,
  current_role_start_year: z.number().int().min(1990).max(2100),
  years_to_current_role: z.number().int().nonnegative(),
  university: z.string().min(1),
  university_tier: UniversityTier,
  degree: z.string().min(1),
  degree_type: DegreeType,
  majors: z.string().nullable(),
  wam_band: WamBand,
  graduation_year: z.number().int().min(1990).max(2100).nullable(),
  has_honours: z.boolean(),
  has_masters_or_second_degree: z.boolean(),
  high_school: z.string().nullable(),
  high_school_type: HighSchoolType,
  atar_band: AtarBand,
  experiences: z.array(ExperienceSchema),
  signals: z.array(SignalTag),
  // Optional while older fixtures/imports are migrated. When present, these
  // records provide the timing metadata used to stage-gate signal tags.
  achievements: z.array(ProfessionalAchievementSchema).optional(),
  path_summary: z.string().nullable(),
  data_source: DataSource,
  data_confidence: DataConfidence,
});
export type Professional = z.infer<typeof ProfessionalSchema>;

export function toCanonicalProfessional(row: ProfessionalRow): Professional {
  const slots = [row.exp1, row.exp2, row.exp3, row.exp4, row.exp5];
  const experiences: Experience[] = [];
  for (const slot of slots) {
    // Filled slots have a non-null `type`; empty slots are entirely null.
    if (slot && (slot as { type: unknown }).type !== null) {
      experiences.push(slot as Experience);
    }
  }
  return {
    id: row.id,
    current_role: row.current_role,
    current_firm: row.current_firm,
    current_firm_tier: row.current_firm_tier,
    current_geography: row.current_geography,
    current_role_start_year: row.current_role_start_year,
    years_to_current_role: row.years_to_current_role,
    university: row.university,
    university_tier: row.university_tier,
    degree: row.degree,
    degree_type: row.degree_type,
    majors: row.majors,
    wam_band: row.wam_band,
    graduation_year: row.graduation_year,
    has_honours: row.has_honours,
    has_masters_or_second_degree: row.has_masters_or_second_degree,
    high_school: row.high_school,
    high_school_type: row.high_school_type,
    atar_band: row.atar_band,
    experiences,
    signals: row.signals,
    path_summary: row.path_summary,
    data_source: row.data_source,
    data_confidence: row.data_confidence,
  };
}

// ----- Computed fields -----
export interface ComputedFields {
  // Experience aggregates
  has_ib_experience: boolean;
  has_bb_experience: boolean;
  has_elite_boutique_experience: boolean;
  has_mid_market_experience: boolean;
  has_boutique_experience: boolean;
  has_big4_advisory_experience: boolean;
  has_pe_experience: boolean;
  has_law_experience: boolean;
  has_penultimate_internship: boolean;
  has_summer_internship: boolean;
  has_full_time_ib: boolean;
  experience_count_relevant: number;
  total_experience_months: number;
  highest_firm_tier_reached: number;

  // Transition signals
  has_conversion: boolean;
  has_lateral: boolean;

  // Time-sensitive (months from `now`)
  months_until_penultimate_recruiting: number;
  months_until_grad_recruiting: number;

  // Signal flags
  has_smif: boolean;
  has_society_committee: boolean;
  has_modelling_course: boolean;
  has_dean_list: boolean;
  cfa_level: 0 | 1 | 2 | 3;
  is_co_op_program: boolean;
}

// ----- Profile snapshot (for stage-aligned matching) -----
//
// What the professional looked like at the student's current stage.
// Used by the distance function — we compare student-now to
// professional-at-same-stage, not student-now to professional-now.

export interface ProfileSnapshot {
  university_tier: UniversityTier;
  wam_band: WamBand;
  atar_band: AtarBand;
  high_school_type: HighSchoolType;
  has_honours: boolean;
  has_masters_or_second_degree: boolean;
  experiences: Experience[];
  signals: SignalTag[];
  computed: ComputedFields;
}

// ----- Match / Gap / Action / Output -----

export interface MatchResult {
  professional: Professional;
  snapshot: ProfileSnapshot;
  distance: number;
}

export interface Gap {
  gap_key: string;
  display_name: string;
  match_pct: number;
  student_has: boolean;
  actionability: 'high' | 'medium' | 'low';
  time_to_address_months: number;
}

export interface Action {
  priority: 1 | 2 | 3;
  action_type: string;
  title: string;
  description: string;
  deadline: string | null; // ISO date or null
  estimated_effort: 'low' | 'medium' | 'high';
}

export type FitBand = 'strong_fit' | 'stretch_but_achievable' | 'reach' | 'long_shot';

export interface ScoringOutput {
  student_summary: string;
  stage: Stage;
  stage_description: string;

  target: {
    role: string;
    tier: string;
    geography: string;
  };

  match_summary: {
    /** Whole database analysed before comparability filters. Optional
     * because reports stored before this field existed lack it. */
    total_professionals?: number;
    /** Comparable peers after geography + cohort filters. */
    pool_size: number;
    /** How many of the comparable pool are at/above the target tier —
     * the base rate the fit band compares the matched cohort against.
     * Optional: absent on reports stored before this field existed. */
    pool_reached_target_count?: number;
    matched_count: number;
    reached_target_count: number;
    fit_band: FitBand;
    low_data_warning: boolean;
    boutique_data_warning: boolean;
  };

  probability_data: {
    matched_count: number;
    reached_target: number;
    reached_one_below: number;
  };

  top_paths: Array<{
    path_summary: string;
    distance: number;
    reached_tier: string;
    anonymised_profile_id: string;
  }>;

  gaps: Gap[];
  actions: Action[];

  context: {
    current_date: string;
    next_recruiting_window: string;
  };
}
