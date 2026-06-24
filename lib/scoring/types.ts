import { z } from 'zod';

// ============================================================
// Enums (locked — match Database_v7_clean.xlsx reference sheet)
// ============================================================

export const CurrentRole = z.enum(['ib_analyst', 'ib_associate', 'ib_vp']);
export type CurrentRole = z.infer<typeof CurrentRole>;

export const CurrentFirmTier = z.enum(['bb', 'elite_boutique_and_mm', 'boutique']);
export type CurrentFirmTier = z.infer<typeof CurrentFirmTier>;

export const Geography = z.enum([
  'sydney', 'melbourne', 'hk', 'london', 'ny', 'singapore', 'other',
]);
export type Geography = z.infer<typeof Geography>;

export const UniversityTier = z.enum([
  'go8_top', 'go8_other', 'atn', 'other_au',
  'top_global', 'international_top', 'other_global',
]);
export type UniversityTier = z.infer<typeof UniversityTier>;

export const DegreeType = z.enum([
  'bachelor', 'honours', 'masters', 'mba', 'double_degree', 'phd',
]);
export type DegreeType = z.infer<typeof DegreeType>;

export const WamBand = z.enum(['hd', 'd', 'c', 'p', 'unknown']);
export type WamBand = z.infer<typeof WamBand>;

export const HighSchoolType = z.enum([
  'gps', 'cas', 'aps', 'selective', 'public_comprehensive',
  'catholic', 'independent_other', 'international', 'unknown',
]);
export type HighSchoolType = z.infer<typeof HighSchoolType>;

export const AtarBand = z.enum([
  '99_plus', '98_99', '95_98', '90_95', '85_90', 'below_85', 'unknown',
]);
export type AtarBand = z.infer<typeof AtarBand>;

export const ExpType = z.enum([
  'summer_internship', 'winter_internship', 'penultimate_internship',
  'internship', 'part_time', 'full_time', 'casual', 'grad_program',
]);
export type ExpType = z.infer<typeof ExpType>;

export const ExpFirmTier = z.enum([
  'bb', 'elite_boutique_and_mm', 'boutique',
  'big4', 'private_equity', 'top_tier_law',
  'corporate', 'startup', 'government', 'non_profit',
  'other', 'unknown',
]);
export type ExpFirmTier = z.infer<typeof ExpFirmTier>;

export const ExpIndustry = z.enum([
  'ib', 'big4_advisory', 'big4_audit', 'corporate', 'law',
  'private_equity', 'capital_markets', 'consulting',
  'government', 'non_profit', 'other',
]);
export type ExpIndustry = z.infer<typeof ExpIndustry>;

export const ExpRoleFunction = z.enum([
  'ib_coverage', 'ib_product', 'transaction_services', 'advisory',
  'audit', 'corp_finance', 'sales_trading', 'pe_investment',
  'law', 'consulting', 'other',
]);
export type ExpRoleFunction = z.infer<typeof ExpRoleFunction>;

export const ExpHowObtained = z.enum([
  'cold_email', 'society_referral', 'ocr', 'online_application',
  'internal_referral', 'networking_event', 'alumni_network',
  'family_connection', 'recruiter', 'co_op_program', 'scholarship',
  'graduate_program', 'conversion', 'return_offer', 'lateral',
  'promotion', 'unknown', 'NA',
]);
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

export const SignalTag = z.enum([
  // Academic
  'wam_hd', 'wam_distinction', 'wam_top_10',
  'subject_top_10_finance', 'subject_top_10_law',
  'first_in_class', 'deans_list', 'university_medal', 'faculty_prize',
  'honours_first_class',
  // ATAR / school
  'atar_99_plus', 'school_dux', 'hsc_distinguished_achiever', 'selective_school',
  // Society / leadership
  'fin_society_committee',
  'investment_society_member', 'investment_society_committee', 'investment_society_president',
  'consulting_society_committee', 'consulting_society_member',
  'society_committee', 'school_leadership',
  // Competitions
  'case_comp_winner', 'case_comp_finalist', 'stock_pitch_winner', 'hackathon_winner',
  // Certifications
  'cfa_l1', 'cfa_l2', 'cfa_l3', 'chartered_accountant', 'modelling_course', 'virtual_experience',
  // Programs
  'co_op_program', 'scholarship', 'women_in_banking_scholarship', 'exchange_program',
  // Awards
  'industry_award',
  // Experience flags
  'has_pe_internship', 'has_law_clerkship',
  'has_big4_audit', 'has_big4_advisory', 'has_consulting_experience',
  // Sport
  'sports_rep', 'sports_volunteer',
]);
export type SignalTag = z.infer<typeof SignalTag>;

// ============================================================
// Per-experience slot
// ============================================================
//
// In the flat 80-col schema, exp1..exp5 are inlined. Rather than
// repeat 10 fields x 5 experiences in the row schema, we build a
// reusable ExpSlotSchema and compose it. A row may have any number
// of slots filled (1-5); unfilled slots are entirely null.

const ExpSlotSchema = z.object({
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
export type ExpSlot = z.infer<typeof ExpSlotSchema>;

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
  const target = v.type === null ? ExpSlotEmpty : ExpSlotSchema;
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
  bb: 6,
  elite_boutique_and_mm: 5,
  boutique: 4,
  private_equity: 4,
  top_tier_law: 3,
  big4: 3,
  corporate: 2,
  government: 2,
  startup: 1,
  non_profit: 1,
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
export const TargetFirmTier = z.enum(['bb', 'elite_boutique_and_mm', 'boutique', 'any']);
export type TargetFirmTier = z.infer<typeof TargetFirmTier>;

export const TargetGeography = z.enum(['sydney', 'melbourne']);
export type TargetGeography = z.infer<typeof TargetGeography>;

export const StudentProfileSchema = z.object({
  id: z.string(),
  email: z.string().email(),

  // Education
  university: z.string(),
  university_tier: UniversityTier,
  degree: z.string(),
  degree_type: DegreeType,
  majors: z.array(z.string()),
  current_year: z.number().int().min(1).max(5),
  expected_graduation_year: z.number().int().min(2020).max(2100),
  wam_band: WamBand,
  has_honours: z.boolean(),
  has_masters_or_second_degree: z.boolean(),

  // High school (internal scoring only — never displayed)
  high_school: z.string().nullable(),
  high_school_type: HighSchoolType,
  atar_band: AtarBand,

  // Experiences + signals
  experiences: z.array(ExpSlotSchema),
  signals: z.array(SignalTag),

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
// as a single array. `toCanonicalProfessional` collapses the slots.

export interface Professional {
  id: string;
  full_name_internal: string;
  current_role: CurrentRole;
  current_firm: string;
  current_firm_tier: CurrentFirmTier;
  current_geography: Geography;
  current_role_start_year: number;
  years_to_current_role: number;
  university: string;
  university_tier: UniversityTier;
  degree: string;
  degree_type: DegreeType;
  majors: string | null;
  wam_band: WamBand;
  graduation_year: number | null;
  has_honours: boolean;
  has_masters_or_second_degree: boolean;
  high_school: string | null;
  high_school_type: HighSchoolType;
  atar_band: AtarBand;
  experiences: Experience[];
  signals: SignalTag[];
  path_summary: string | null;
  data_source: DataSource;
  data_confidence: DataConfidence;
}

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
    full_name_internal: row.full_name_internal,
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
  has_eb_mm_experience: boolean;
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
    pool_size: number;
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
