import { describe, expect, it } from 'vitest';

import {
  CAREER_COMPASS_SIGNAL_VALUES,
  CareerCompassOnboardDataSchema,
  PROFESSIONAL_COMPATIBILITY_SIGNAL_VALUES,
  SELECTABLE_SIGNAL_VALUES,
  deriveAutoSignals,
  toCareerCompassExperienceType,
  toCareerCompassIndustry,
} from '../../lib/career-compass/taxonomy';

const validPayload = {
  target_firm_tier: 'bb',
  target_geography: 'sydney',
  university: 'UNSW',
  degree: 'Bachelor of Commerce',
  degree_type: 'bachelor',
  majors: ['Finance'],
  current_year: 2,
  is_co_op: false,
  wam_band: 'hd',
  high_school_type: 'unknown',
  atar_band: 'unknown',
  experiences: [{
    type: 'summer_internship',
    firm: 'Example Bank',
    firm_tier: 'bb',
    industry: 'ib',
    year: 2025,
    duration_months: 3,
    how_obtained: 'online_application',
    converted_to_ft: false,
  }],
  is_lateral_candidate: false,
  current_external_role: '',
  signals: ['deans_list'],
} as const;

describe('Career Compass taxonomy', () => {
  it('keeps submitted, derived, and compatibility signal sets distinct', () => {
    expect(SELECTABLE_SIGNAL_VALUES).toHaveLength(27);
    expect(new Set(CAREER_COMPASS_SIGNAL_VALUES).size).toBe(35);
    expect(PROFESSIONAL_COMPATIBILITY_SIGNAL_VALUES).toContain('chartered_accountant');
    expect(CAREER_COMPASS_SIGNAL_VALUES).not.toContain('chartered_accountant');
  });

  it('accepts only identifiers exposed by current onboarding', () => {
    expect(CareerCompassOnboardDataSchema.safeParse(validPayload).success).toBe(true);
    expect(CareerCompassOnboardDataSchema.safeParse({
      ...validPayload,
      signals: ['chartered_accountant'],
    }).success).toBe(false);
    expect(CareerCompassOnboardDataSchema.safeParse({
      ...validPayload,
      experiences: [{ ...validPayload.experiences[0], type: 'internship' }],
    }).success).toBe(false);
    expect(CareerCompassOnboardDataSchema.safeParse({
      ...validPayload,
      experiences: [{ ...validPayload.experiences[0], industry: 'capital_markets' }],
    }).success).toBe(false);
    expect(CareerCompassOnboardDataSchema.safeParse({
      ...validPayload,
      degree_type: 'phd',
    }).success).toBe(false);
    expect(CareerCompassOnboardDataSchema.safeParse({
      ...validPayload,
      degree_type: 'honours',
    }).success).toBe(false);
    expect(CareerCompassOnboardDataSchema.safeParse({
      ...validPayload,
      signals: ['honours'],
      experiences: [{
        ...validPayload.experiences[0],
        type: 'vacationer',
        industry: 'corporate_development',
        firm_tier: 'asx50',
      }],
    }).success).toBe(true);
  });

  it('rejects firm levels that the selected onboarding area cannot emit', () => {
    const parsed = CareerCompassOnboardDataSchema.safeParse({
      ...validPayload,
      experiences: [{ ...validPayload.experiences[0], firm_tier: 'mbb' }],
    });
    expect(parsed.success).toBe(false);
  });

  it('implements approved legacy experience mappings without losing compatibility values', () => {
    expect(toCareerCompassExperienceType('internship')).toBe('summer_internship');
    expect(toCareerCompassExperienceType('casual')).toBe('part_time');
    expect(toCareerCompassIndustry('capital_markets')).toBe('global_markets');
    expect(toCareerCompassIndustry('non_profit')).toBeNull();
  });

  it('derives only registered server-side signals and de-duplicates them', () => {
    expect(deriveAutoSignals({
      wamBand: 'hd',
      isCoOp: true,
      atarBand: '99_plus',
      experiences: [
        { industry: 'private_equity', howObtained: 'society_referral' },
        { industry: 'private_equity', howObtained: 'society_referral' },
      ],
    })).toEqual([
      'wam_hd', 'co_op_program', 'atar_99_plus',
      'has_pe_internship', 'fin_society_committee',
    ]);
  });
});
