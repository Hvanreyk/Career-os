import { describe, expect, it } from 'vitest';
import {
  AdditionalDetailsSchema,
  hasResumeContent,
  JdMatchSchema,
  ResumeDocumentSchema,
} from '../../lib/resume/document.js';
import { sampleDocument } from './fixtures.js';

describe('ResumeDocumentSchema', () => {
  it('accepts a well-formed document', () => {
    expect(ResumeDocumentSchema.safeParse(sampleDocument).success).toBe(true);
  });

  it('accepts fully-null contact details', () => {
    const parsed = ResumeDocumentSchema.safeParse({
      contact: { full_name: null, email: null, phone: null, linkedin_url: null, location: null },
      sections: [],
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects unknown keys (strict for structured output)', () => {
    const parsed = ResumeDocumentSchema.safeParse({ ...sampleDocument, extra: true });
    expect(parsed.success).toBe(false);
  });

  it('caps sections, entries and bullets', () => {
    const section = sampleDocument.sections[1]!;
    expect(ResumeDocumentSchema.safeParse({
      ...sampleDocument,
      sections: Array.from({ length: 13 }, () => section),
    }).success).toBe(false);
    expect(ResumeDocumentSchema.safeParse({
      ...sampleDocument,
      sections: [{ ...section, entries: Array.from({ length: 11 }, () => section.entries[0]!) }],
    }).success).toBe(false);
    expect(ResumeDocumentSchema.safeParse({
      ...sampleDocument,
      sections: [{ ...section, entries: [{ ...section.entries[0]!, bullets: Array.from({ length: 13 }, () => 'x') }] }],
    }).success).toBe(false);
  });

  it('rejects empty org and over-long bullets', () => {
    const section = sampleDocument.sections[1]!;
    expect(ResumeDocumentSchema.safeParse({
      ...sampleDocument,
      sections: [{ ...section, entries: [{ ...section.entries[0]!, org: '' }] }],
    }).success).toBe(false);
    expect(ResumeDocumentSchema.safeParse({
      ...sampleDocument,
      sections: [{ ...section, entries: [{ ...section.entries[0]!, bullets: ['y'.repeat(1001)] }] }],
    }).success).toBe(false);
  });
});

describe('hasResumeContent', () => {
  it('is true for a document with entries or loose bullets', () => {
    expect(hasResumeContent(sampleDocument)).toBe(true);
  });

  it('is false for a document with only empty, titled sections', () => {
    expect(hasResumeContent({
      contact: sampleDocument.contact,
      sections: [{ kind: 'experience', heading: 'Experience', entries: [], loose_bullets: [] }],
    })).toBe(false);
  });

  it('is false for no sections at all', () => {
    expect(hasResumeContent({ ...sampleDocument, sections: [] })).toBe(false);
  });
});

describe('JdMatchSchema', () => {
  const base = { requirement_id: 'R1', note: 'n' };

  it('requires at least one evidence ref for direct and stretch matches', () => {
    expect(JdMatchSchema.safeParse({ ...base, match: 'direct', evidence_refs: [] }).success).toBe(false);
    expect(JdMatchSchema.safeParse({ ...base, match: 'stretch', evidence_refs: [] }).success).toBe(false);
  });

  it('accepts a direct match with evidence', () => {
    const parsed = JdMatchSchema.safeParse({
      ...base,
      match: 'direct',
      evidence_refs: [{ section_index: 0, entry_index: 0, bullet_index: 0, field: 'bullet' }],
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects a gap match that cites evidence', () => {
    expect(JdMatchSchema.safeParse({
      ...base,
      match: 'gap',
      evidence_refs: [{ section_index: 0, entry_index: 0, bullet_index: 0, field: 'bullet' }],
    }).success).toBe(false);
  });

  it('accepts a gap match with no evidence', () => {
    expect(JdMatchSchema.safeParse({ ...base, match: 'gap', evidence_refs: [] }).success).toBe(true);
  });
});

describe('AdditionalDetailsSchema', () => {
  it('fills defaults for a minimal payload', () => {
    const parsed = AdditionalDetailsSchema.parse({ contact: {} });
    expect(parsed.skills).toEqual([]);
    expect(parsed.experience_details).toEqual([]);
    expect(parsed.anything_else).toBe('');
  });

  it('rejects unknown keys and over-long free text', () => {
    expect(AdditionalDetailsSchema.safeParse({ contact: {}, hacked: true }).success).toBe(false);
    expect(AdditionalDetailsSchema.safeParse({ contact: {}, anything_else: 'z'.repeat(2001) }).success).toBe(false);
  });

  it('requires a firm on each experience detail', () => {
    expect(AdditionalDetailsSchema.safeParse({
      contact: {},
      experience_details: [{ firm: '', role_title: 'Analyst' }],
    }).success).toBe(false);
  });
});
