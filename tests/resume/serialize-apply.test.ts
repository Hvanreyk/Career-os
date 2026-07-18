import { describe, expect, it } from 'vitest';
import { applyChanges } from '../../lib/resume/apply.js';
import { serializeResumeForPrompt } from '../../lib/resume/serialize.js';
import type { ResumeChange } from '../../lib/resume/document.js';
import { sampleDocument } from './fixtures.js';

describe('serializeResumeForPrompt', () => {
  it('emits stable index tags matching change-target addressing', () => {
    const text = serializeResumeForPrompt(sampleDocument);
    expect(text).toContain('[S0] EDUCATION — "Education"');
    expect(text).toContain('[S1.E0] Macquarie Group — Summer Analyst · Sydney · Nov 2024 – Feb 2025');
    expect(text).toContain('[S1.E0.B1] Drafted committee papers');
    expect(text).toContain('[S2.B0] Excel, PowerPoint, Python');
    expect(text).toContain('CONTACT — name: Alex Nguyen');
  });

  it('handles an empty document without throwing', () => {
    const text = serializeResumeForPrompt({
      contact: { full_name: null, email: null, phone: null, linkedin_url: null, location: null },
      sections: [],
    });
    expect(text).toContain('(none provided)');
  });
});

describe('applyChanges', () => {
  const change = (target: ResumeChange['target'], original: string, proposed: string): ResumeChange => ({
    target, proposed, original, rationale: 'test',
  });

  it('applies entry bullets, loose bullets, headings and entry fields by index', () => {
    const result = applyChanges(sampleDocument, [
      change(
        { section_index: 1, entry_index: 0, bullet_index: 0, field: 'bullet' },
        'Built a three-statement model',
        'Built a three-statement model for an ASX-200 target [add metric if truthful]',
      ),
      change(
        { section_index: 2, entry_index: null, bullet_index: 1, field: 'bullet' },
        'AFL, chess',
        'Interests: AFL, chess',
      ),
      change(
        { section_index: 2, entry_index: null, bullet_index: null, field: 'heading' },
        'Skills & Interests',
        'Skills, Certifications & Interests',
      ),
      change(
        { section_index: 1, entry_index: 0, bullet_index: null, field: 'role_title' },
        'Summer Analyst',
        'Investment Banking Summer Analyst',
      ),
    ]);
    expect(result.skipped).toHaveLength(0);
    expect(result.document.sections[1]!.entries[0]!.bullets[0]).toContain('[add metric if truthful]');
    expect(result.document.sections[2]!.loose_bullets[1]).toBe('Interests: AFL, chess');
    expect(result.document.sections[2]!.heading).toBe('Skills, Certifications & Interests');
    expect(result.document.sections[1]!.entries[0]!.role_title).toBe('Investment Banking Summer Analyst');
  });

  it('does not mutate the input document', () => {
    const before = JSON.stringify(sampleDocument);
    applyChanges(sampleDocument, [
      change(
        { section_index: 0, entry_index: 0, bullet_index: 0, field: 'bullet' },
        'Distinction average',
        'changed',
      ),
    ]);
    expect(JSON.stringify(sampleDocument)).toBe(before);
  });

  it('skips targets that no longer resolve instead of corrupting the document', () => {
    const result = applyChanges(sampleDocument, [
      change({ section_index: 9, entry_index: 0, bullet_index: 0, field: 'bullet' }, 'x', 'nope'),
      change({ section_index: 1, entry_index: 5, bullet_index: 0, field: 'bullet' }, 'x', 'nope'),
      change({ section_index: 1, entry_index: 0, bullet_index: 9, field: 'bullet' }, 'x', 'nope'),
      change({ section_index: 1, entry_index: null, bullet_index: null, field: 'org' }, 'x', 'nope'),
      change({ section_index: 1, entry_index: 0, bullet_index: null, field: 'bullet' }, 'x', 'nope'),
    ]);
    expect(result.applied).toHaveLength(0);
    expect(result.skipped).toHaveLength(5);
    expect(JSON.stringify(result.document)).toBe(JSON.stringify(sampleDocument));
  });

  it('skips a change whose original text no longer matches the current document (stale proposal)', () => {
    const result = applyChanges(sampleDocument, [
      change(
        { section_index: 1, entry_index: 0, bullet_index: 0, field: 'bullet' },
        'This is not what the bullet currently says',
        'Overwritten text',
      ),
    ]);
    expect(result.applied).toHaveLength(0);
    expect(result.skipped).toHaveLength(1);
    expect(result.document.sections[1]!.entries[0]!.bullets[0]).toBe('Built a three-statement model');
  });
});
