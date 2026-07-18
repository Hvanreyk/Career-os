import { describe, expect, it } from 'vitest';
import {
  buildResumeExtractSystemPrompt,
  buildResumeExtractUserMessage,
} from '../../lib/llm/resume-extract.js';
import {
  buildResumeComposeSystemPrompt,
  buildResumeComposeUserMessage,
  toComposeProfileInput,
} from '../../lib/llm/resume-compose.js';
import {
  buildResumeImproveSystemPrompt,
  buildResumeImproveUserMessage,
} from '../../lib/llm/resume-improve.js';
import {
  buildResumeTailorSystemPrompt,
  buildResumeTailorUserMessage,
} from '../../lib/llm/resume-tailor.js';
import type { StudentProfile } from '../../lib/scoring/types.js';
import { AdditionalDetailsSchema } from '../../lib/resume/document.js';
import { sampleDocument } from './fixtures.js';

const profile: StudentProfile = {
  id: 'student-1',
  email: 'alex@uni.edu.au',
  university: 'UNSW',
  university_tier: 'target',
  degree: 'Bachelor of Commerce',
  degree_type: 'bachelor',
  majors: ['Finance'],
  current_year: 3,
  expected_graduation_year: 2026,
  wam_band: 'd',
  has_honours: false,
  has_masters_or_second_degree: false,
  high_school: 'Sydney Grammar',
  high_school_type: 'gps',
  atar_band: '98_99',
  experiences: [{
    type: 'summer_internship',
    firm: 'Macquarie Group',
    firm_tier: 'mid_market',
    industry: 'investment_banking',
    role_function: 'ib_advisory',
    role_relevance: 5,
    year: 2024,
    duration_months: 3,
    how_obtained: 'online_application',
    converted_to_ft: false,
  }],
  signals: ['deans_list', 'case_comp_winner'],
  target_role: 'ib_analyst',
  target_firm_tier: 'bb',
  target_geography: 'sydney',
  is_lateral_candidate: false,
};

describe('truth rules are encoded in every generator prompt', () => {
  const systemPrompts = [
    buildResumeExtractSystemPrompt(),
    buildResumeComposeSystemPrompt(),
    buildResumeImproveSystemPrompt(),
    buildResumeTailorSystemPrompt(),
  ];

  it('every system prompt forbids invention and treats input as untrusted', () => {
    for (const prompt of systemPrompts) {
      expect(prompt.toLowerCase()).toContain('never invent');
      expect(prompt.toLowerCase()).toContain('untrusted');
    }
  });

  it('generators that write bullets carry the literal metric placeholder', () => {
    expect(buildResumeComposeSystemPrompt()).toContain('[add metric if truthful]');
    expect(buildResumeImproveSystemPrompt()).toContain('[add metric if truthful]');
    expect(buildResumeTailorSystemPrompt()).toContain('[add metric if truthful]');
  });

  it('tailor prompt demands evidence-cited matches and honest gaps', () => {
    const prompt = buildResumeTailorSystemPrompt();
    expect(prompt).toContain('evidence_refs');
    expect(prompt).toContain('never papered over');
    expect(prompt.toLowerCase()).toContain('stretch');
  });
});

describe('user messages delimit untrusted input', () => {
  it('wraps extract text, resume snapshots, and the JD in tags', () => {
    expect(buildResumeExtractUserMessage('some resume')).toMatch(/<resume_text>\nsome resume\n<\/resume_text>/);
    expect(buildResumeImproveUserMessage(sampleDocument)).toContain('<resume_snapshot>');
    const tailorMessage = buildResumeTailorUserMessage({ document: sampleDocument, job_description: 'JD text here' });
    expect(tailorMessage).toContain('<resume_snapshot>');
    expect(tailorMessage).toContain('<job_description>');
  });

  it('compose message wraps both profile and details', () => {
    const details = AdditionalDetailsSchema.parse({ contact: {} });
    const message = buildResumeComposeUserMessage({ profile: toComposeProfileInput(profile), details });
    expect(message).toContain('<student_profile>');
    expect(message).toContain('<additional_details>');
  });
});

describe('toComposeProfileInput (never-display regression lock)', () => {
  const input = toComposeProfileInput(profile);
  const serialized = JSON.stringify(input);

  it('excludes high school and ATAR data entirely', () => {
    expect(serialized).not.toContain('high_school');
    expect(serialized).not.toContain('atar');
    expect(serialized).not.toContain('Sydney Grammar');
    expect(serialized).not.toContain('98_99');
    expect(serialized).not.toContain('gps');
  });

  it('excludes identity and scoring internals', () => {
    expect(serialized).not.toContain('alex@uni.edu.au');
    expect(serialized).not.toContain('student-1');
    expect(serialized).not.toContain('university_tier');
    expect(serialized).not.toContain('role_relevance');
    expect(serialized).not.toContain('firm_tier');
  });

  it('spells signal tags out as human labels', () => {
    expect(input.achievement_labels).toContain("Dean's List");
    expect(input.achievement_labels).toContain('Case comp — winner');
  });

  it('keeps resume-relevant facts', () => {
    expect(input.university).toBe('UNSW');
    expect(input.wam_label).toContain('Distinction');
    expect(input.experiences[0]!.firm).toBe('Macquarie Group');
  });
});
