import { z } from 'zod';

import {
  ProfessionalAcquisitionMethodSchema,
  ProfessionalCompatibilitySignalTagSchema,
  ProfessionalFirmTierSchema,
  ProfessionalIndustrySchema,
  RoleFunctionSchema,
  SelectableExperienceTypeSchema,
  TransitionTypeSchema,
} from '../career-compass/taxonomy';
import {
  AtarBand,
  CurrentFirmTier,
  CurrentRole,
  DataConfidence,
  DataSource,
  DegreeType,
  Geography,
  HighSchoolType,
  UniversityTier,
  WamBand,
} from '../scoring/types';

export const PROFESSIONAL_WORKBOOK_SHEETS = [
  'professionals',
  'education',
  'experiences',
  'achievements',
] as const;

export type ProfessionalWorkbookSheet = (typeof PROFESSIONAL_WORKBOOK_SHEETS)[number];

export const ImportLifecycleStatusSchema = z.enum(['draft', 'ready', 'excluded']);
export type ImportLifecycleStatus = z.infer<typeof ImportLifecycleStatusSchema>;

export const DatePrecisionSchema = z.enum(['unknown', 'year', 'month', 'day']);
export type DatePrecision = z.infer<typeof DatePrecisionSchema>;

export const ProfessionalImportProfileSchema = z.object({
  professional_key: z.string().regex(/^P\d{3,}$/, 'must be P followed by at least three digits'),
  full_name_internal: z.string().trim().min(1).max(300),
  linkedin_url_internal: z.string().url().nullable(),
  current_role: CurrentRole,
  current_firm: z.string().trim().min(1).max(300),
  current_firm_tier: CurrentFirmTier,
  current_geography: Geography,
  current_role_start_year: z.number().int().min(1990).max(2100),
  years_to_current_role: z.number().int().nonnegative(),
  path_summary: z.string().trim().max(5_000).nullable(),
  data_source: DataSource,
  data_confidence: DataConfidence,
  requested_lifecycle_status: ImportLifecycleStatusSchema,
  exclusion_reason: z.string().trim().min(1).max(1_000).nullable(),
}).superRefine((profile, ctx) => {
  if (profile.requested_lifecycle_status === 'excluded' && !profile.exclusion_reason) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['exclusion_reason'],
      message: 'is required when lifecycle_status is excluded',
    });
  }
});
export type ProfessionalImportProfile = z.infer<typeof ProfessionalImportProfileSchema>;

export const ProfessionalImportEducationSchema = z.object({
  professional_key: z.string().regex(/^P\d{3,}$/),
  sequence: z.number().int().positive(),
  is_primary: z.boolean(),
  education_level: z.enum(['higher_education', 'high_school']),
  institution: z.string().trim().min(1).max(300).nullable(),
  institution_tier: UniversityTier.nullable(),
  degree_type: DegreeType.nullable(),
  degree_name: z.string().trim().min(1).max(300).nullable(),
  majors: z.string().trim().max(500).nullable(),
  graduation_year: z.number().int().min(1990).max(2100).nullable(),
  started_on: z.string().date().nullable(),
  completed_on: z.string().date().nullable(),
  date_precision: DatePrecisionSchema,
  wam_band: WamBand.nullable(),
  has_honours: z.boolean().nullable(),
  has_masters_or_second_degree: z.boolean().nullable(),
  high_school_type: HighSchoolType.nullable(),
  atar_band: AtarBand.nullable(),
}).superRefine((education, ctx) => {
  if (education.education_level === 'higher_education') {
    const required: (keyof typeof education)[] = [
      'institution',
      'institution_tier',
      'degree_type',
      'degree_name',
      'wam_band',
      'has_honours',
      'has_masters_or_second_degree',
    ];
    for (const field of required) {
      if (education[field] === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [field],
          message: 'is required for higher education',
        });
      }
    }
  }

  if (education.education_level === 'high_school') {
    if (education.high_school_type === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['high_school_type'],
        message: 'is required for high school',
      });
    }
    if (education.atar_band === null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['atar_band'],
        message: 'is required for high school',
      });
    }
  }

  // Validate date precision matches the provided dates
  const inferredPrecision = (dateStr: string | null): DatePrecision | null => {
    if (dateStr === null) return null;
    const parts = dateStr.split('-');
    if (parts.length === 3) return 'day';
    if (parts.length === 2) return 'month';
    if (parts.length === 1) return 'year';
    return null;
  };

  if (education.started_on !== null) {
    const startedPrecision = inferredPrecision(education.started_on);
    if (startedPrecision !== null && startedPrecision !== education.date_precision) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['date_precision'],
        message: `must be '${startedPrecision}' to match started_on date format`,
      });
    }
  }

  if (education.completed_on !== null) {
    const completedPrecision = inferredPrecision(education.completed_on);
    if (completedPrecision !== null && completedPrecision !== education.date_precision) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['date_precision'],
        message: `must be '${completedPrecision}' to match completed_on date format`,
      });
    }
  }
});
export type ProfessionalImportEducation = z.infer<typeof ProfessionalImportEducationSchema>;

export const ProfessionalImportExperienceSchema = z.object({
  professional_key: z.string().regex(/^P\d{3,}$/),
  sequence: z.number().int().positive(),
  experience_type: SelectableExperienceTypeSchema,
  organization: z.string().trim().min(1).max(300),
  firm_tier: ProfessionalFirmTierSchema,
  industry: ProfessionalIndustrySchema,
  role_function: RoleFunctionSchema,
  role_relevance: z.number().int().min(1).max(5),
  year: z.number().int().min(1990).max(2100),
  started_on: z.string().date().nullable(),
  ended_on: z.string().date().nullable(),
  date_precision: DatePrecisionSchema,
  duration_months: z.number().int().nonnegative().nullable(),
  acquisition_method: ProfessionalAcquisitionMethodSchema,
  transition_type: TransitionTypeSchema.nullable(),
  converted_to_full_time: z.boolean().nullable(),
}).superRefine((experience, ctx) => {
  // Validate date precision matches the provided dates
  const inferredPrecision = (dateStr: string | null): DatePrecision | null => {
    if (dateStr === null) return null;
    const parts = dateStr.split('-');
    if (parts.length === 3) return 'day';
    if (parts.length === 2) return 'month';
    if (parts.length === 1) return 'year';
    return null;
  };

  if (experience.started_on !== null) {
    const startedPrecision = inferredPrecision(experience.started_on);
    if (startedPrecision !== null && startedPrecision !== experience.date_precision) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['date_precision'],
        message: `must be '${startedPrecision}' to match started_on date format`,
      });
    }
  }

  if (experience.ended_on !== null) {
    const endedPrecision = inferredPrecision(experience.ended_on);
    if (endedPrecision !== null && endedPrecision !== experience.date_precision) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['date_precision'],
        message: `must be '${endedPrecision}' to match ended_on date format`,
      });
    }
  }
});
export type ProfessionalImportExperience = z.infer<typeof ProfessionalImportExperienceSchema>;

export const ProfessionalImportAchievementSchema = z.object({
  professional_key: z.string().regex(/^P\d{3,}$/),
  sequence: z.number().int().positive(),
  tag: ProfessionalCompatibilitySignalTagSchema,
  effective_year: z.number().int().min(1900).max(2100).nullable(),
  date_precision: DatePrecisionSchema,
  source: z.enum(['manual', 'derived']),
}).superRefine((achievement, ctx) => {
  if (achievement.effective_year === null && achievement.date_precision !== 'unknown') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['date_precision'],
      message: 'must be unknown when effective_year is blank',
    });
  }
  if (achievement.effective_year !== null && achievement.date_precision === 'unknown') {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['date_precision'],
      message: 'must describe the precision of a known effective_year',
    });
  }
});
export type ProfessionalImportAchievement = z.infer<typeof ProfessionalImportAchievementSchema>;

export interface ProfessionalImportRecord {
  profile: ProfessionalImportProfile;
  education: ProfessionalImportEducation[];
  experiences: ProfessionalImportExperience[];
  achievements: ProfessionalImportAchievement[];
  lifecycle_status: ImportLifecycleStatus;
  readiness_blockers: string[];
}

export interface ProfessionalImportIssue {
  severity: 'error' | 'warning';
  code:
    | 'missing_sheet'
    | 'missing_column'
    | 'invalid_cell'
    | 'duplicate_professional'
    | 'duplicate_linkedin'
    | 'duplicate_sequence'
    | 'duplicate_achievement'
    | 'orphan_child'
    | 'rejected_professional'
    | 'empty_batch';
  sheet: ProfessionalWorkbookSheet;
  row: number | null;
  column: string | null;
  professional_key: string | null;
  message: string;
}

export interface ProfessionalSheetSummary {
  received: number;
  accepted: number;
  rejected: number;
}

export interface ProfessionalImportSummary {
  comparison_basis: 'assume_new' | 'existing_records';
  professionals: {
    received: number;
    accepted: number;
    rejected: number;
    inserted: number;
    updated: number;
    unchanged: number;
    ready: number;
    draft: number;
    excluded: number;
  };
  sheets: Record<ProfessionalWorkbookSheet, ProfessionalSheetSummary>;
  errors: number;
  warnings: number;
}

export interface ProfessionalImportStagingRow {
  sheet_name: ProfessionalWorkbookSheet;
  source_row: number;
  professional_key: string;
  payload: Record<string, unknown>;
}

export interface ProfessionalImportBatch {
  records: ProfessionalImportRecord[];
  staging_rows: ProfessionalImportStagingRow[];
  issues: ProfessionalImportIssue[];
  summary: ProfessionalImportSummary;
  can_apply: boolean;
}

export type RawWorkbookRow = Record<string, unknown>;

export interface CanonicalWorkbookRows {
  professionals: RawWorkbookRow[];
  education: RawWorkbookRow[];
  experiences: RawWorkbookRow[];
  achievements: RawWorkbookRow[];
}

export interface ProfessionalImportParseOptions {
  /**
   * Optional current canonical records used only to classify accepted records
   * as inserted, updated, or unchanged in a dry-run summary.
   */
  existing_records?: readonly ProfessionalImportRecord[];
}
