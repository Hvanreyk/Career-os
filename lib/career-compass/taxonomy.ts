import { z } from 'zod';

export const CAREER_COMPASS_TAXONOMY_VERSION = '2026-07-15.1';
export const CAREER_COMPASS_DERIVATION_VERSION = '2026-07-15.1';
export const PROFESSIONAL_FEATURE_VERSION = 'professional-v1';

export type IdentifierStatus = 'selectable' | 'auto_derived' | 'accepted_legacy';

export const TARGET_FIRM_TIER_VALUES = [
  'bb', 'elite_boutique', 'mid_market', 'boutique', 'any',
] as const;
export const TargetFirmTierSchema = z.enum(TARGET_FIRM_TIER_VALUES);
export type TargetFirmTier = z.infer<typeof TargetFirmTierSchema>;

export const TARGET_GEOGRAPHY_VALUES = [
  'sydney', 'melbourne', 'perth', 'adelaide', 'brisbane',
] as const;
export const TargetGeographySchema = z.enum(TARGET_GEOGRAPHY_VALUES);
export type TargetGeography = z.infer<typeof TargetGeographySchema>;

export const SELECTABLE_DEGREE_TYPE_VALUES = [
  'bachelor', 'double_degree', 'combined_degree', 'masters', 'mba',
] as const;
export const SelectableDegreeTypeSchema = z.enum(SELECTABLE_DEGREE_TYPE_VALUES);
export type SelectableDegreeType = z.infer<typeof SelectableDegreeTypeSchema>;

export const DEGREE_TYPE_VALUES = [...SELECTABLE_DEGREE_TYPE_VALUES, 'honours', 'phd'] as const;
export const DegreeTypeSchema = z.enum(DEGREE_TYPE_VALUES);
export type DegreeType = z.infer<typeof DegreeTypeSchema>;

export const WAM_BAND_VALUES = ['hd', 'd', 'c', 'p', 'unknown'] as const;
export const WamBandSchema = z.enum(WAM_BAND_VALUES);
export type WamBand = z.infer<typeof WamBandSchema>;

export const SELECTABLE_HIGH_SCHOOL_TYPE_VALUES = [
  'gps', 'cas', 'aps', 'selective', 'public_comprehensive',
  'catholic', 'independent_other', 'unknown',
] as const;
export const SelectableHighSchoolTypeSchema = z.enum(SELECTABLE_HIGH_SCHOOL_TYPE_VALUES);
export type SelectableHighSchoolType = z.infer<typeof SelectableHighSchoolTypeSchema>;

export const PROFESSIONAL_HIGH_SCHOOL_TYPE_VALUES = [
  'gps', 'cas', 'aps', 'selective', 'public_comprehensive',
  'catholic', 'independent_other', 'international', 'unknown',
] as const;
export const ProfessionalHighSchoolTypeSchema = z.enum(PROFESSIONAL_HIGH_SCHOOL_TYPE_VALUES);
export type ProfessionalHighSchoolType = z.infer<typeof ProfessionalHighSchoolTypeSchema>;

export const ATAR_BAND_VALUES = [
  '99_plus', '98_99', '95_98', '90_95', '85_90', 'below_85', 'unknown',
] as const;
export const AtarBandSchema = z.enum(ATAR_BAND_VALUES);
export type AtarBand = z.infer<typeof AtarBandSchema>;

export const SELECTABLE_EXPERIENCE_TYPE_VALUES = [
  'summer_internship', 'winter_internship', 'penultimate_internship',
  'vacationer', 'cadetship', 'part_time', 'full_time', 'grad_program',
] as const;
export const SelectableExperienceTypeSchema = z.enum(SELECTABLE_EXPERIENCE_TYPE_VALUES);
export type SelectableExperienceType = z.infer<typeof SelectableExperienceTypeSchema>;

export const PROFESSIONAL_EXPERIENCE_TYPE_VALUES = [
  ...SELECTABLE_EXPERIENCE_TYPE_VALUES,
  'internship', 'casual',
] as const;
export const ProfessionalExperienceTypeSchema = z.enum(PROFESSIONAL_EXPERIENCE_TYPE_VALUES);
export type ProfessionalExperienceType = z.infer<typeof ProfessionalExperienceTypeSchema>;

// Product decision 2B: generic database experience types are mapped to the
// closest selectable Career Compass value. The original value remains in a
// compatibility column for scoring parity and auditability.
export const LEGACY_EXPERIENCE_TYPE_MAP = {
  internship: 'summer_internship',
  casual: 'part_time',
} as const satisfies Record<string, SelectableExperienceType>;

export function toCareerCompassExperienceType(
  value: ProfessionalExperienceType,
): SelectableExperienceType {
  if (value in LEGACY_EXPERIENCE_TYPE_MAP) {
    return LEGACY_EXPERIENCE_TYPE_MAP[value as keyof typeof LEGACY_EXPERIENCE_TYPE_MAP];
  }
  return SelectableExperienceTypeSchema.parse(value);
}

export const SELECTABLE_INDUSTRY_VALUES = [
  'ib', 'global_markets', 'equity_research', 'private_equity',
  'investment_management_equities', 'investment_management_credit',
  'investment_management_real_estate', 'consulting', 'big4_advisory',
  'big4_business_advisory', 'big4_audit', 'corporate_development',
  'law', 'government', 'other',
] as const;
export const SelectableIndustrySchema = z.enum(SELECTABLE_INDUSTRY_VALUES);
export type SelectableIndustry = z.infer<typeof SelectableIndustrySchema>;

export const PROFESSIONAL_INDUSTRY_VALUES = [
  ...SELECTABLE_INDUSTRY_VALUES,
  'capital_markets', 'operations', 'corporate', 'non_profit',
] as const;
export const ProfessionalIndustrySchema = z.enum(PROFESSIONAL_INDUSTRY_VALUES);
export type ProfessionalIndustry = z.infer<typeof ProfessionalIndustrySchema>;

export const LEGACY_INDUSTRY_MAP = {
  capital_markets: 'global_markets',
} as const satisfies Partial<Record<ProfessionalIndustry, SelectableIndustry>>;

export function toCareerCompassIndustry(
  value: ProfessionalIndustry,
): SelectableIndustry | null {
  if (value in LEGACY_INDUSTRY_MAP) {
    return LEGACY_INDUSTRY_MAP[value as keyof typeof LEGACY_INDUSTRY_MAP];
  }
  const parsed = SelectableIndustrySchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export const SELECTABLE_FIRM_TIER_VALUES = [
  'bb', 'elite_boutique', 'mid_market', 'boutique', 'aus_big4_bank',
  'mega_fund', 'large_cap', 'global_manager', 'hedge_fund', 'mbb',
  'tier2_consulting', 'big4', 'mid_tier', 'private_equity', 'top_tier_law',
  'mid_tier_law', 'boutique_law', 'asx50', 'asx100', 'asx200',
  'large_private', 'medium_private', 'small_private', 'corporate', 'startup',
  'local_government', 'state_government', 'federal_government',
  'government', 'non_profit', 'other',
] as const;
export const SelectableFirmTierSchema = z.enum(SELECTABLE_FIRM_TIER_VALUES);
export type SelectableFirmTier = z.infer<typeof SelectableFirmTierSchema>;

export const PROFESSIONAL_FIRM_TIER_VALUES = [
  ...SELECTABLE_FIRM_TIER_VALUES,
  'elite_boutique_and_mm', 'unknown',
] as const;
export const ProfessionalFirmTierSchema = z.enum(PROFESSIONAL_FIRM_TIER_VALUES);
export type ProfessionalFirmTier = z.infer<typeof ProfessionalFirmTierSchema>;

export const SELECTABLE_ACQUISITION_METHOD_VALUES = [
  'online_application', 'cold_email', 'ocr', 'society_referral',
  'internal_referral', 'co_op_program', 'unknown',
] as const;
export const SelectableAcquisitionMethodSchema = z.enum(SELECTABLE_ACQUISITION_METHOD_VALUES);
export type SelectableAcquisitionMethod = z.infer<typeof SelectableAcquisitionMethodSchema>;

export const PROFESSIONAL_ACQUISITION_METHOD_VALUES = [
  ...SELECTABLE_ACQUISITION_METHOD_VALUES,
  'networking_event', 'alumni_network', 'family_connection', 'recruiter',
  'scholarship', 'graduate_program', 'conversion', 'return_offer', 'lateral',
  'promotion', 'NA',
] as const;
export const ProfessionalAcquisitionMethodSchema = z.enum(PROFESSIONAL_ACQUISITION_METHOD_VALUES);
export type ProfessionalAcquisitionMethod = z.infer<typeof ProfessionalAcquisitionMethodSchema>;

export const TRANSITION_TYPE_VALUES = ['return_offer', 'lateral', 'promotion'] as const;
export const TransitionTypeSchema = z.enum(TRANSITION_TYPE_VALUES);
export type TransitionType = z.infer<typeof TransitionTypeSchema>;

export function deriveTransitionType(
  method: ProfessionalAcquisitionMethod,
): TransitionType | null {
  return TransitionTypeSchema.safeParse(method).success ? method as TransitionType : null;
}

export function toCareerCompassAcquisitionMethod(
  method: ProfessionalAcquisitionMethod,
): SelectableAcquisitionMethod | null {
  if (method === 'return_offer') return 'unknown';
  if (method === 'lateral' || method === 'promotion' || method === 'NA') return 'unknown';
  const parsed = SelectableAcquisitionMethodSchema.safeParse(method);
  return parsed.success ? parsed.data : null;
}

export const SELECTABLE_SIGNAL_VALUES = [
  'honours', 'deans_list', 'first_in_class', 'subject_top_10_finance', 'faculty_prize',
  'university_medal', 'school_dux', 'investment_society_member',
  'investment_society_committee', 'investment_society_president',
  'fin_society_committee', 'consulting_society_committee', 'case_comp_winner',
  'case_comp_finalist', 'stock_pitch_winner', 'hackathon_winner', 'cfa_l1',
  'cfa_l2', 'cfa_l3', 'modelling_course', 'virtual_experience', 'scholarship',
  'women_in_banking_scholarship', 'exchange_program', 'sports_rep',
  'school_leadership', 'industry_award',
] as const;
export const SelectableSignalTagSchema = z.enum(SELECTABLE_SIGNAL_VALUES);
export type SelectableSignalTag = z.infer<typeof SelectableSignalTagSchema>;

export const AUTO_DERIVED_SIGNAL_VALUES = [
  'wam_hd', 'wam_distinction', 'co_op_program', 'atar_99_plus',
  'has_pe_internship', 'has_big4_audit', 'has_big4_advisory',
  'has_consulting_experience', 'fin_society_committee',
] as const;
export const AutoDerivedSignalTagSchema = z.enum(AUTO_DERIVED_SIGNAL_VALUES);
export type AutoDerivedSignalTag = z.infer<typeof AutoDerivedSignalTagSchema>;

export const CAREER_COMPASS_SIGNAL_VALUES = [
  ...SELECTABLE_SIGNAL_VALUES,
  ...AUTO_DERIVED_SIGNAL_VALUES.filter(
    (value): value is Exclude<AutoDerivedSignalTag, SelectableSignalTag> =>
      !(SELECTABLE_SIGNAL_VALUES as readonly string[]).includes(value),
  ),
] as const;
export const CareerCompassSignalTagSchema = z.enum(CAREER_COMPASS_SIGNAL_VALUES);
export type CareerCompassSignalTag = z.infer<typeof CareerCompassSignalTagSchema>;

export const ACCEPTED_LEGACY_SIGNAL_VALUES = [
  'wam_top_10', 'subject_top_10_law', 'honours_first_class',
  'hsc_distinguished_achiever', 'selective_school', 'consulting_society_member',
  'society_committee', 'chartered_accountant', 'has_law_clerkship',
  'sports_volunteer',
] as const;
export const AcceptedLegacySignalTagSchema = z.enum(ACCEPTED_LEGACY_SIGNAL_VALUES);
export type AcceptedLegacySignalTag = z.infer<typeof AcceptedLegacySignalTagSchema>;

export const PROFESSIONAL_COMPATIBILITY_SIGNAL_VALUES = [
  ...CAREER_COMPASS_SIGNAL_VALUES,
  ...ACCEPTED_LEGACY_SIGNAL_VALUES,
] as const;
export const ProfessionalCompatibilitySignalTagSchema = z.enum(
  PROFESSIONAL_COMPATIBILITY_SIGNAL_VALUES,
);
export type ProfessionalCompatibilitySignalTag = z.infer<
  typeof ProfessionalCompatibilitySignalTagSchema
>;

export const SIGNAL_STATUS: Readonly<Record<ProfessionalCompatibilitySignalTag, IdentifierStatus>> =
  Object.freeze(Object.fromEntries(PROFESSIONAL_COMPATIBILITY_SIGNAL_VALUES.map((value) => [
    value,
    (SELECTABLE_SIGNAL_VALUES as readonly string[]).includes(value)
      ? 'selectable'
      : (AUTO_DERIVED_SIGNAL_VALUES as readonly string[]).includes(value)
        ? 'auto_derived'
        : 'accepted_legacy',
  ])) as Record<ProfessionalCompatibilitySignalTag, IdentifierStatus>);

export const TARGET_TIER_OPTIONS: readonly {
  value: TargetFirmTier;
  label: string;
  description: string;
}[] = [
  { value: 'bb', label: 'Bulge Bracket (BB)', description: 'Goldman, JPM, Morgan Stanley, Citi, UBS, Deutsche, Barrenjoey' },
  { value: 'elite_boutique', label: 'Elite Boutique', description: 'Lazard, Jefferies, Moelis, Jarden, Rothschild' },
  { value: 'mid_market', label: 'Mid-Market', description: 'Local and independent mid-market advisory firms' },
  { value: 'boutique', label: 'Boutique', description: 'Smaller advisory and specialist firms' },
  { value: 'any', label: 'Any Level', description: "I'm open — match me to all options" },
] as const;

export const TARGET_GEOGRAPHY_OPTIONS: readonly {
  value: TargetGeography;
  label: string;
}[] = [
  { value: 'sydney', label: 'Sydney' },
  { value: 'melbourne', label: 'Melbourne' },
  { value: 'perth', label: 'Perth' },
  { value: 'adelaide', label: 'Adelaide' },
  { value: 'brisbane', label: 'Brisbane' },
] as const;

export const DEGREE_TYPE_OPTIONS: readonly {
  value: SelectableDegreeType;
  label: string;
  example: string;
}[] = [
  {
    value: 'bachelor',
    label: 'Bachelor',
    example: 'A single undergraduate degree, e.g. a Bachelor of Commerce.',
  },
  {
    value: 'double_degree',
    label: 'Double Degree',
    example: "An undergraduate bachelor's degree followed by a Master's or a clinical Doctorate — e.g. a Bachelor of Commerce/Laws, or Medicine (MD) and Dentistry pathways.",
  },
  {
    value: 'combined_degree',
    label: 'Combined Degree',
    example: "Two bachelor's degrees studied together at the same time, e.g. a Bachelor of Commerce and Bachelor of Science, or a Bachelor of Commerce and Bachelor of Advanced Studies (very common combination).",
  },
  {
    value: 'masters',
    label: 'Masters',
    example: 'A postgraduate degree, e.g. a Master of Finance.',
  },
  {
    value: 'mba',
    label: 'MBA',
    example: 'A Master of Business Administration, typically after work experience.',
  },
] as const;

export const WAM_OPTIONS: readonly {
  value: WamBand;
  label: string;
  description: string;
}[] = [
  { value: 'hd', label: 'High Distinction', description: '85 and above' },
  { value: 'd', label: 'Distinction', description: '75 – 84' },
  { value: 'c', label: 'Credit', description: '65 – 74' },
  { value: 'p', label: 'Pass', description: '50 – 64' },
  { value: 'unknown', label: 'Prefer not to say', description: '' },
] as const;

export const HIGH_SCHOOL_TYPE_OPTIONS: readonly {
  value: SelectableHighSchoolType;
  label: string;
}[] = [
  { value: 'gps', label: 'GPS (Greater Public Schools)' },
  { value: 'cas', label: 'CAS (Combined Associated Schools)' },
  { value: 'aps', label: 'APS (Associated Public Schools)' },
  { value: 'selective', label: 'Selective Government School' },
  { value: 'public_comprehensive', label: 'Public Comprehensive' },
  { value: 'catholic', label: 'Catholic School' },
  { value: 'independent_other', label: 'Other Independent' },
  { value: 'unknown', label: 'Prefer not to say / Skip' },
] as const;

export const ATAR_OPTIONS: readonly { value: AtarBand; label: string }[] = [
  { value: '99_plus', label: '99+' },
  { value: '98_99', label: '98 – 99' },
  { value: '95_98', label: '95 – 98' },
  { value: '90_95', label: '90 – 95' },
  { value: '85_90', label: '85 – 90' },
  { value: 'below_85', label: 'Below 85' },
  { value: 'unknown', label: 'Skip / Not applicable' },
] as const;

export const EXPERIENCE_TYPE_OPTIONS: readonly {
  value: SelectableExperienceType;
  label: string;
}[] = [
  { value: 'summer_internship', label: 'Summer Internship' },
  { value: 'winter_internship', label: 'Winter Internship' },
  { value: 'penultimate_internship', label: 'Penultimate Year Internship' },
  { value: 'vacationer', label: 'Vacationer' },
  { value: 'cadetship', label: 'Cadetship' },
  { value: 'part_time', label: 'Part-time Role' },
  { value: 'full_time', label: 'Full-time Role' },
  { value: 'grad_program', label: 'Graduate Program' },
] as const;

export const INDUSTRY_OPTIONS: readonly {
  value: SelectableIndustry;
  label: string;
}[] = [
  { value: 'ib', label: 'Investment Banking' },
  { value: 'global_markets', label: 'Global Markets (Sales & Trading)' },
  { value: 'equity_research', label: 'Equity Research' },
  { value: 'private_equity', label: 'Private Equity' },
  { value: 'investment_management_equities', label: 'Investment Management — Equities' },
  { value: 'investment_management_credit', label: 'Investment Management — Credit' },
  { value: 'investment_management_real_estate', label: 'Investment Management — Real Estate' },
  { value: 'consulting', label: 'Consulting' },
  { value: 'big4_audit', label: 'Accounting — Audit' },
  { value: 'big4_advisory', label: 'Accounting — Advisory / M&A' },
  { value: 'big4_business_advisory', label: 'Accounting — Business Advisory' },
  { value: 'corporate_development', label: 'Corporate Development' },
  { value: 'law', label: 'Law' },
  { value: 'government', label: 'Government' },
  { value: 'other', label: 'Other' },
] as const;

export const FIRM_TIER_LABELS: Readonly<Record<SelectableFirmTier, string>> = {
  bb: 'Bulge Bracket (BB)',
  elite_boutique: 'Elite Boutique',
  mid_market: 'Mid-Market',
  boutique: 'Boutique',
  aus_big4_bank: 'Big 4 Australian Bank (CBA/NAB/Westpac/ANZ)',
  mega_fund: 'Mega-Fund',
  large_cap: 'Large-Cap',
  global_manager: 'Global Asset Manager',
  hedge_fund: 'Hedge Fund',
  mbb: 'MBB',
  tier2_consulting: 'Tier 2',
  big4: 'Big 4',
  mid_tier: 'Mid-Tier',
  private_equity: 'Private Equity',
  top_tier_law: 'Big 6',
  mid_tier_law: 'Mid-Tier',
  boutique_law: 'Boutique',
  asx50: 'ASX50',
  asx100: 'ASX100',
  asx200: 'ASX200',
  large_private: 'Large Private',
  medium_private: 'Medium Private',
  small_private: 'Small Private',
  corporate: 'Corporate / Other',
  startup: 'Startup',
  local_government: 'Local Government',
  state_government: 'State Government',
  federal_government: 'Federal Government',
  government: 'Government',
  non_profit: 'Non-Profit',
  other: 'Other',
};

export const AREA_FIRM_TIERS: Readonly<Record<SelectableIndustry, readonly SelectableFirmTier[]>> = {
  ib: ['bb', 'elite_boutique', 'mid_market', 'boutique'],
  global_markets: ['bb', 'elite_boutique', 'mid_market', 'boutique', 'aus_big4_bank'],
  equity_research: ['bb', 'elite_boutique', 'mid_market', 'boutique'],
  private_equity: ['mega_fund', 'large_cap', 'mid_market', 'boutique'],
  investment_management_equities: ['global_manager', 'hedge_fund', 'boutique'],
  investment_management_credit: ['global_manager', 'hedge_fund', 'boutique'],
  investment_management_real_estate: ['global_manager', 'hedge_fund', 'boutique'],
  consulting: ['mbb', 'tier2_consulting', 'big4', 'boutique'],
  big4_audit: ['big4', 'mid_tier', 'boutique'],
  big4_advisory: ['big4', 'mid_tier', 'boutique'],
  big4_business_advisory: ['big4', 'mid_tier', 'boutique'],
  corporate_development: ['asx50', 'asx100', 'asx200', 'large_private', 'medium_private', 'small_private'],
  law: ['top_tier_law', 'mid_tier_law', 'boutique_law', 'other'],
  government: ['federal_government', 'state_government', 'local_government'],
  other: ['other'],
};

export const ACQUISITION_METHOD_OPTIONS: readonly {
  value: SelectableAcquisitionMethod;
  label: string;
}[] = [
  { value: 'online_application', label: 'Online application' },
  { value: 'cold_email', label: 'Cold email / networking' },
  { value: 'ocr', label: 'Campus recruitment (OCR)' },
  { value: 'society_referral', label: 'Finance society referral' },
  { value: 'internal_referral', label: 'Internal / personal referral' },
  { value: 'co_op_program', label: 'Co-op program placement' },
  { value: 'unknown', label: 'Other / not sure' },
] as const;

export const SIGNAL_GROUPS: readonly {
  label: string;
  options: readonly { value: SelectableSignalTag; label: string }[];
}[] = [
  {
    label: 'Academic achievements',
    options: [
      { value: 'honours', label: 'Honours' },
      { value: 'deans_list', label: "Dean's List" },
      { value: 'first_in_class', label: 'First in class / subject' },
      { value: 'subject_top_10_finance', label: 'Top 10 in Finance subject' },
      { value: 'faculty_prize', label: 'Faculty prize' },
      { value: 'university_medal', label: 'University medal' },
      { value: 'school_dux', label: 'School Dux' },
    ],
  },
  {
    label: 'Finance & investment societies',
    options: [
      { value: 'investment_society_member', label: 'Investment society — member' },
      { value: 'investment_society_committee', label: 'Investment society — committee' },
      { value: 'investment_society_president', label: 'Investment society — president' },
      { value: 'fin_society_committee', label: 'Finance society — committee' },
      { value: 'consulting_society_committee', label: 'Consulting society — committee' },
    ],
  },
  {
    label: 'Competitions',
    options: [
      { value: 'case_comp_winner', label: 'Case comp — winner' },
      { value: 'case_comp_finalist', label: 'Case comp — finalist' },
      { value: 'stock_pitch_winner', label: 'Stock pitch competition — winner' },
      { value: 'hackathon_winner', label: 'Hackathon — winner' },
    ],
  },
  {
    label: 'Certifications & courses',
    options: [
      { value: 'cfa_l1', label: 'CFA Level 1 (passed)' },
      { value: 'cfa_l2', label: 'CFA Level 2 (passed)' },
      { value: 'cfa_l3', label: 'CFA Level 3 (passed)' },
      { value: 'modelling_course', label: 'Financial modelling course (BIWS, REFM, etc.)' },
      { value: 'virtual_experience', label: 'Virtual experience program' },
    ],
  },
  {
    label: 'Programs & scholarships',
    options: [
      { value: 'scholarship', label: 'Academic scholarship' },
      { value: 'women_in_banking_scholarship', label: 'Women in Banking scholarship' },
      { value: 'exchange_program', label: 'Exchange / study abroad program' },
    ],
  },
  {
    label: 'Other',
    options: [
      { value: 'sports_rep', label: 'Sports representative (state / national)' },
      { value: 'school_leadership', label: 'School leadership (captain, prefect)' },
      { value: 'industry_award', label: 'Industry award' },
    ],
  },
] as const;

export const ROLE_FUNCTION_VALUES = [
  'ib_coverage', 'ib_product', 'equity_research', 'transaction_services', 'advisory', 'audit',
  'corp_finance', 'sales_trading', 'pe_investment', 'asset_management', 'law',
  'consulting', 'other',
] as const;
export const RoleFunctionSchema = z.enum(ROLE_FUNCTION_VALUES);
export type RoleFunction = z.infer<typeof RoleFunctionSchema>;

export function deriveRoleFunction(industry: ProfessionalIndustry): RoleFunction {
  const map: Record<ProfessionalIndustry, RoleFunction> = {
    ib: 'ib_coverage',
    global_markets: 'sales_trading',
    capital_markets: 'sales_trading',
    equity_research: 'equity_research',
    big4_advisory: 'transaction_services',
    big4_business_advisory: 'advisory',
    big4_audit: 'audit',
    private_equity: 'pe_investment',
    investment_management_equities: 'asset_management',
    investment_management_credit: 'asset_management',
    investment_management_real_estate: 'asset_management',
    consulting: 'consulting',
    law: 'law',
    corporate: 'corp_finance',
    corporate_development: 'corp_finance',
    operations: 'other',
    government: 'other',
    non_profit: 'other',
    other: 'other',
  };
  return map[industry];
}

const INVESTMENT_MANAGEMENT_INDUSTRIES: readonly ProfessionalIndustry[] = [
  'investment_management_equities',
  'investment_management_credit',
  'investment_management_real_estate',
];

export function deriveRelevance(
  firmTier: ProfessionalFirmTier,
  industry: ProfessionalIndustry,
): number {
  if (firmTier === 'bb' && (industry === 'ib' || industry === 'equity_research')) return 5;
  if ((firmTier === 'elite_boutique' || firmTier === 'mid_market') && (industry === 'ib' || industry === 'equity_research')) return 5;
  if (firmTier === 'boutique' && (industry === 'ib' || industry === 'equity_research')) return 4;

  if (industry === 'global_markets' || industry === 'capital_markets') {
    if (['bb', 'elite_boutique', 'mid_market'].includes(firmTier)) return 5;
    if (firmTier === 'boutique' || firmTier === 'aus_big4_bank') return 4;
    return 3;
  }

  if (industry === 'private_equity') {
    if (firmTier === 'mega_fund' || firmTier === 'large_cap') return 5;
    return 4;
  }

  if (INVESTMENT_MANAGEMENT_INDUSTRIES.includes(industry)) {
    if (firmTier === 'global_manager' || firmTier === 'hedge_fund') return 4;
    return 3;
  }

  if (industry === 'consulting') {
    if (firmTier === 'mbb') return 5;
    if (firmTier === 'tier2_consulting') return 4;
    return 3;
  }

  if (industry === 'big4_advisory' || industry === 'big4_business_advisory' || industry === 'big4_audit') {
    if (firmTier === 'big4') return 3;
    if (firmTier === 'mid_tier') return 2;
  }

  if (industry === 'law') {
    if (firmTier === 'top_tier_law') return 3;
    if (firmTier === 'mid_tier_law' || firmTier === 'boutique_law') return 2;
  }

  if (industry === 'operations' || industry === 'corporate_development') {
    if (firmTier === 'asx50' || firmTier === 'asx100') return 3;
    if (firmTier === 'asx200' || firmTier === 'large_private') return 2;
  }

  return 2;
}

export interface AutoSignalInput {
  wamBand: WamBand;
  isCoOp: boolean;
  atarBand: AtarBand;
  experiences: readonly {
    industry: SelectableIndustry;
    howObtained: SelectableAcquisitionMethod;
  }[];
}

export function deriveAutoSignals(input: AutoSignalInput): AutoDerivedSignalTag[] {
  const signals: AutoDerivedSignalTag[] = [];
  if (input.wamBand === 'hd') signals.push('wam_hd');
  else if (input.wamBand === 'd') signals.push('wam_distinction');
  if (input.isCoOp) signals.push('co_op_program');
  if (input.atarBand === '99_plus') signals.push('atar_99_plus');

  for (const experience of input.experiences) {
    if (experience.industry === 'private_equity') signals.push('has_pe_internship');
    if (experience.industry === 'big4_audit') signals.push('has_big4_audit');
    if (experience.industry === 'big4_advisory' || experience.industry === 'big4_business_advisory') {
      signals.push('has_big4_advisory');
    }
    if (experience.industry === 'consulting') signals.push('has_consulting_experience');
    if (experience.howObtained === 'society_referral') signals.push('fin_society_committee');
  }

  return [...new Set(signals)];
}

export const CareerCompassExperienceEntrySchema = z.object({
  type: SelectableExperienceTypeSchema,
  firm: z.string().trim().min(1).max(200),
  firm_tier: SelectableFirmTierSchema,
  industry: SelectableIndustrySchema,
  year: z.number().int().min(1990).max(2100),
  duration_months: z.number().int().min(0).max(600),
  how_obtained: SelectableAcquisitionMethodSchema,
  converted_to_ft: z.union([z.boolean(), z.literal('NA')]),
}).superRefine((experience, ctx) => {
  if (!(AREA_FIRM_TIERS[experience.industry] as readonly string[]).includes(experience.firm_tier)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['firm_tier'],
      message: 'Firm level is not valid for the selected Career Compass area',
    });
  }

  const isInternship = [
    'summer_internship', 'winter_internship', 'penultimate_internship', 'vacationer',
  ].includes(experience.type);
  if (!isInternship && experience.converted_to_ft !== 'NA') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['converted_to_ft'],
      message: 'Conversion is only applicable to internships',
    });
  }
});

export const CareerCompassOnboardDataSchema = z.object({
  target_firm_tier: TargetFirmTierSchema,
  target_geography: TargetGeographySchema,
  university: z.string().trim().min(1).max(200),
  degree: z.string().max(200),
  degree_type: SelectableDegreeTypeSchema,
  majors: z.array(z.string().max(100)).max(10),
  current_year: z.number().int().min(1).max(6),
  is_co_op: z.boolean(),
  wam_band: WamBandSchema,
  high_school_type: SelectableHighSchoolTypeSchema,
  atar_band: AtarBandSchema,
  experiences: z.array(CareerCompassExperienceEntrySchema).max(5),
  is_lateral_candidate: z.boolean(),
  current_external_role: z.string().max(200),
  signals: z.array(SelectableSignalTagSchema).max(100),
});
export type CareerCompassOnboardData = z.infer<typeof CareerCompassOnboardDataSchema>;
