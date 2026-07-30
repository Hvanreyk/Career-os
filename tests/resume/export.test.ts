import { describe, expect, it } from 'vitest';
import { renderResumeDocx } from '../../web/lib/resume/export/docx.js';
import { renderResumePdf } from '../../web/lib/resume/export/pdf.js';
import {
  buildContentDispositionFilename,
  buildExportFilename,
  buildExportModel,
} from '../../web/lib/resume/export/template.js';
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

  it('builds an ASCII-safe Content-Disposition filename with an RFC 5987 fallback', () => {
    const plain = buildContentDispositionFilename('Alex Nguyen Resume', 'pdf');
    expect(plain.ascii).toBe('Alex Nguyen Resume.pdf');
    expect(plain.encoded).toBe(encodeURIComponent('Alex Nguyen Resume.pdf'));

    const accented = buildContentDispositionFilename('José Núñez Resume', 'docx');
    expect(accented.ascii).toBe('Jose Nunez Resume.docx');
    expect(/^[\x20-\x7E]*$/.test(accented.ascii)).toBe(true);
    expect(accented.encoded).toBe(encodeURIComponent('José Núñez Resume.docx'));

    const nonLatin = buildContentDispositionFilename('田中 Resume', 'pdf');
    expect(/^[\x20-\x7E]*$/.test(nonLatin.ascii)).toBe(true);
    expect(nonLatin.ascii.length).toBeGreaterThan(0);
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
