// Zod schema for the onboarding form payload. This is the trust boundary:
// the body of POST /api/generate-report is fully client-controlled, so it is
// validated here before anything derives a StudentProfile from it.
//
// Keep this in sync with ./types.ts (OnboardData). The schema is the runtime
// source of truth; the TS types are inferred-compatible by construction.

import { z } from 'zod';

const TargetTier = z.enum(['bb', 'elite_boutique', 'mid_market', 'boutique', 'any']);
const TargetGeo = z.enum(['sydney', 'melbourne', 'perth', 'adelaide', 'brisbane']);
const DegreeType = z.enum(['bachelor', 'double_degree', 'combined_degree', 'honours', 'masters', 'mba', 'phd']);
const WamBand = z.enum(['hd', 'd', 'c', 'p', 'unknown']);
const HighSchoolType = z.enum([
  'gps', 'cas', 'aps', 'selective',
  'public_comprehensive', 'catholic', 'independent_other', 'unknown',
]);
const AtarBand = z.enum(['99_plus', '98_99', '95_98', '90_95', '85_90', 'below_85', 'unknown']);
const ExpType = z.enum([
  'summer_internship', 'winter_internship', 'penultimate_internship',
  'internship', 'part_time', 'full_time', 'casual', 'grad_program',
]);
const FirmTier = z.enum([
  'bb', 'elite_boutique', 'mid_market', 'boutique',
  'aus_big4_bank',
  'mega_fund', 'large_cap',
  'global_manager', 'hedge_fund',
  'mbb', 'tier2_consulting',
  'big4', 'mid_tier',
  'private_equity', 'top_tier_law',
  'corporate', 'startup',
  'local_government', 'state_government', 'federal_government',
  'government', 'non_profit', 'other',
]);
const Industry = z.enum([
  'ib', 'global_markets', 'capital_markets',
  'private_equity',
  'investment_management_equities', 'investment_management_credit',
  'investment_management_real_estate',
  'consulting', 'big4_advisory', 'big4_audit', 'corporate',
  'law', 'government', 'non_profit', 'other',
]);
const HowObtained = z.enum([
  'online_application', 'cold_email', 'society_referral',
  'ocr', 'internal_referral', 'networking_event', 'alumni_network',
  'co_op_program', 'scholarship', 'conversion', 'unknown',
]);

const ExperienceEntrySchema = z.object({
  type: ExpType,
  firm: z.string().min(1).max(200),
  firm_tier: FirmTier,
  industry: Industry,
  year: z.number().int().min(1990).max(2100),
  duration_months: z.number().int().min(0).max(600),
  how_obtained: HowObtained,
  converted_to_ft: z.union([z.boolean(), z.literal('NA')]),
});

export const OnboardDataSchema = z.object({
  target_firm_tier: TargetTier,
  target_geography: TargetGeo,
  university: z.string().min(1).max(200),
  degree: z.string().max(200),
  degree_type: DegreeType,
  majors: z.array(z.string().max(100)).max(10),
  current_year: z.number().int().min(1).max(10),
  is_co_op: z.boolean(),
  wam_band: WamBand,
  high_school_type: HighSchoolType,
  atar_band: AtarBand,
  experiences: z.array(ExperienceEntrySchema).max(20),
  is_lateral_candidate: z.boolean(),
  current_external_role: z.string().max(200),
  signals: z.array(z.string().max(100)).max(100),
});

export type OnboardDataParsed = z.infer<typeof OnboardDataSchema>;
