import type { ResumeDocument } from '@trajectoryos/core/resume/document';
import { buildExportModel } from './template';

// DOCX export via the `docx` package (dynamic-imported). Produces an
// ATS-friendly, recruiter-editable Word file mirroring the PDF layout.

/**
 * Renders a resume document to a DOCX buffer.
 */
export async function renderResumeDocx(document: ResumeDocument): Promise<Buffer> {
  const {
    AlignmentType, BorderStyle, Document, Packer, Paragraph, TabStopType, TextRun,
  } = await import('docx');
  const model = buildExportModel(document);
  const RIGHT_TAB = 9360; // twentieths of a point; right edge of A4 text block

  const paragraphs: InstanceType<typeof Paragraph>[] = [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: model.name, bold: true, size: 34 })],
    }),
  ];
  if (model.contactLine) {
    paragraphs.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [new TextRun({ text: model.contactLine, size: 17, color: '374151' })],
    }));
  }

  const bulletParagraphs = (bullets: string[]) => bullets.map((bullet) =>
    new Paragraph({
      bullet: { level: 0 },
      spacing: { after: 20 },
      children: [new TextRun({ text: bullet, size: 19 })],
    }),
  );

  for (const section of model.sections) {
    paragraphs.push(new Paragraph({
      spacing: { before: 160, after: 60 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: '111827' } },
      children: [new TextRun({ text: section.heading, bold: true, size: 20 })],
    }));
    for (const entry of section.entries) {
      paragraphs.push(new Paragraph({
        tabStops: [{ type: TabStopType.RIGHT, position: RIGHT_TAB }],
        spacing: { before: 60 },
        children: [
          new TextRun({ text: entry.org, bold: true, size: 19 }),
          ...(entry.dateRange ? [new TextRun({ text: `\t${entry.dateRange}`, size: 19, color: '374151' })] : []),
        ],
      }));
      if (entry.roleTitle || entry.location) {
        paragraphs.push(new Paragraph({
          tabStops: [{ type: TabStopType.RIGHT, position: RIGHT_TAB }],
          children: [
            new TextRun({ text: entry.roleTitle ?? '', italics: true, size: 19 }),
            ...(entry.location ? [new TextRun({ text: `\t${entry.location}`, size: 19, color: '374151' })] : []),
          ],
        }));
      }
      paragraphs.push(...bulletParagraphs(entry.bullets));
    }
    paragraphs.push(...bulletParagraphs(section.looseBullets));
  }

  const doc = new Document({
    styles: { default: { document: { run: { font: 'Calibri' } } } },
    sections: [{
      properties: {
        page: { margin: { top: 720, bottom: 720, left: 880, right: 880 } },
      },
      children: paragraphs,
    }],
  });

  return Packer.toBuffer(doc);
}
