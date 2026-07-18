import { describe, expect, it } from 'vitest';
import { renderResumeDocx } from '../../web/lib/resume/export/docx.js';
import { renderResumePdf } from '../../web/lib/resume/export/pdf.js';
import { buildExportFilename, buildExportModel } from '../../web/lib/resume/export/template.js';
import { sampleDocument } from './fixtures.js';

describe('resume export', () => {
  it('builds a display model that drops empty sections and uppercases headings', () => {
    const model = buildExportModel({
      ...sampleDocument,
      sections: [...sampleDocument.sections, { kind: 'other', heading: 'Empty', entries: [], loose_bullets: [] }],
    });
    expect(model.sections.map((section) => section.heading)).toEqual([
      'EDUCATION', 'PROFESSIONAL EXPERIENCE', 'SKILLS & INTERESTS',
    ]);
    expect(model.name).toBe('Alex Nguyen');
    expect(model.contactLine).toContain('alex@uni.edu.au');
  });

  it('builds a safe download filename', () => {
    expect(buildExportFilename(sampleDocument)).toBe('Alex Nguyen Resume');
    expect(buildExportFilename({
      ...sampleDocument,
      contact: { ...sampleDocument.contact, full_name: '<///>' },
    })).toBe('Resume');
    expect(buildExportFilename({
      ...sampleDocument,
      contact: { ...sampleDocument.contact, full_name: null },
    })).toBe('Resume');
  });

  it('renders a real PDF', async () => {
    const buffer = await renderResumePdf(sampleDocument);
    expect(buffer.subarray(0, 5).toString('latin1')).toBe('%PDF-');
    expect(buffer.length).toBeGreaterThan(1000);
  });

  it('renders a real DOCX (zip container)', async () => {
    const buffer = await renderResumeDocx(sampleDocument);
    expect(buffer[0]).toBe(0x50); // P
    expect(buffer[1]).toBe(0x4b); // K
    expect(buffer.length).toBeGreaterThan(1000);
  });
});
