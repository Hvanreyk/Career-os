import type { ResumeDocument } from '@trajectoryos/core/resume/document';
import { buildExportModel, type ExportEntry } from './template';

// PDF export via @react-pdf/renderer (dynamic-imported to keep it out of
// bundles that never export). Uses the built-in Helvetica family so no font
// files ship with the function. Single-page AU IB layout: name header,
// contact line, ruled section headings, org/date rows, tight bullets.

/**
 * Renders a resume document to a PDF buffer.
 */
export async function renderResumePdf(document: ResumeDocument): Promise<Buffer> {
  const [{ Document, Page, StyleSheet, Text, View, renderToBuffer }, React] = await Promise.all([
    import('@react-pdf/renderer'),
    import('react'),
  ]);
  const h = React.createElement;
  const model = buildExportModel(document);

  const styles = StyleSheet.create({
    page: { fontFamily: 'Helvetica', fontSize: 9.5, paddingTop: 36, paddingBottom: 36, paddingHorizontal: 44, color: '#111827', lineHeight: 1.35 },
    name: { fontSize: 17, fontFamily: 'Helvetica-Bold', textAlign: 'center', letterSpacing: 0.5 },
    contact: { fontSize: 8.5, textAlign: 'center', marginTop: 3, color: '#374151' },
    section: { marginTop: 10 },
    heading: { fontSize: 10, fontFamily: 'Helvetica-Bold', letterSpacing: 0.8, borderBottomWidth: 1, borderBottomColor: '#111827', paddingBottom: 2, marginBottom: 4 },
    entry: { marginBottom: 5 },
    entryRow: { flexDirection: 'row', justifyContent: 'space-between' },
    org: { fontFamily: 'Helvetica-Bold' },
    roleRow: { flexDirection: 'row', justifyContent: 'space-between' },
    role: { fontFamily: 'Helvetica-Oblique' },
    meta: { color: '#374151' },
    bulletRow: { flexDirection: 'row', marginTop: 1.5 },
    bulletMark: { width: 10 },
    bulletText: { flex: 1 },
  });

  const bulletRows = (bullets: string[]) => bullets.map((bullet, index) =>
    h(View, { key: index, style: styles.bulletRow },
      h(Text, { style: styles.bulletMark }, '•'),
      h(Text, { style: styles.bulletText }, bullet),
    ),
  );

  const entryView = (entry: ExportEntry, index: number) =>
    h(View, { key: index, style: styles.entry },
      h(View, { style: styles.entryRow },
        h(Text, { style: styles.org }, entry.org),
        entry.dateRange ? h(Text, { style: styles.meta }, entry.dateRange) : null,
      ),
      entry.roleTitle || entry.location
        ? h(View, { style: styles.roleRow },
            h(Text, { style: styles.role }, entry.roleTitle ?? ''),
            entry.location ? h(Text, { style: styles.meta }, entry.location) : null,
          )
        : null,
      ...bulletRows(entry.bullets),
    );

  const pdfDocument = h(Document, { title: `${model.name} — Resume` },
    h(Page, { size: 'A4', style: styles.page },
      h(Text, { style: styles.name }, model.name),
      model.contactLine ? h(Text, { style: styles.contact }, model.contactLine) : null,
      ...model.sections.map((section, index) =>
        h(View, { key: index, style: styles.section },
          h(Text, { style: styles.heading }, section.heading),
          ...section.entries.map(entryView),
          ...bulletRows(section.looseBullets),
        ),
      ),
    ),
  );

  // renderToBuffer types expect a DocumentProps element; createElement above
  // produces the right runtime shape.
  return renderToBuffer(pdfDocument as Parameters<typeof renderToBuffer>[0]);
}
