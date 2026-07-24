import type { DeepDiveReport } from '@trajectoryos/core/llm/types';
import type { ScoringOutput } from '@trajectoryos/core/scoring/types';
import {
  buildDeepDiveExportModel,
  type Block,
  type ExportSection,
  type InlineSpan,
} from './template';

// PDF export for the Career Compass deep-dive via @react-pdf/renderer
// (dynamic-imported to keep it out of bundles that never export). Built-in
// Helvetica family → no font files ship. A4, gold-accent ruled headings,
// clickable resource CTAs, page numbers. Elements are built with
// React.createElement (no JSX) so this stays a plain .tsx like the resume PDF.

const GOLD = '#b7892b';
const INK = '#1f2937';
const MUTED = '#6b7280';
const RULE = '#e5e7eb';
const NAVY = '#0f172a';

/**
 * Renders a stored deep-dive report + its scoring output to a PDF buffer.
 */
export async function renderDeepDivePdf(
  deepDive: DeepDiveReport,
  output: ScoringOutput,
  generatedOn: Date,
): Promise<Buffer> {
  const [{ Document, Page, StyleSheet, Text, View, Link, renderToBuffer }, React] = await Promise.all([
    import('@react-pdf/renderer'),
    import('react'),
  ]);
  const h = React.createElement;
  const model = buildDeepDiveExportModel(deepDive, output, generatedOn);

  const styles = StyleSheet.create({
    page: { fontFamily: 'Helvetica', fontSize: 10, paddingTop: 44, paddingBottom: 48, paddingHorizontal: 48, color: INK, lineHeight: 1.4 },
    // Cover header
    eyebrow: { fontSize: 8, fontFamily: 'Helvetica-Bold', letterSpacing: 2, color: GOLD, textTransform: 'uppercase' },
    title: { fontSize: 22, fontFamily: 'Helvetica-Bold', color: NAVY, marginTop: 4 },
    subtitle: { fontSize: 9.5, color: MUTED, marginTop: 3 },
    statStrip: { flexDirection: 'row', marginTop: 12, marginBottom: 4, borderTopWidth: 1, borderTopColor: RULE, borderBottomWidth: 1, borderBottomColor: RULE, paddingVertical: 8 },
    stat: { flex: 1 },
    statLabel: { fontSize: 7, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.5 },
    statValue: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: NAVY, marginTop: 2 },
    // Sections
    section: { marginTop: 14 },
    heading: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: NAVY, borderBottomWidth: 1.5, borderBottomColor: GOLD, paddingBottom: 3, marginBottom: 6 },
    paragraph: { marginBottom: 5, textAlign: 'justify' },
    listRow: { flexDirection: 'row', marginBottom: 4, paddingLeft: 4 },
    listMark: { width: 16, color: GOLD, fontFamily: 'Helvetica-Bold' },
    listText: { flex: 1 },
    // Resource CTA
    resourceBox: { marginTop: 8, borderWidth: 1, borderColor: GOLD, borderRadius: 4, padding: 10, backgroundColor: '#fbf7ee' },
    resourceTitle: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: NAVY },
    resourceReason: { fontSize: 9, color: MUTED, marginTop: 2 },
    resourceLink: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: GOLD, marginTop: 5, textDecoration: 'none' },
    // Footer
    footer: { position: 'absolute', bottom: 24, left: 48, right: 48, flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: RULE, paddingTop: 6 },
    footerText: { fontSize: 7.5, color: MUTED },
  });

  const inlineRuns = (spans: InlineSpan[]) =>
    spans.map((span, i) => h(Text, { key: i, style: span.bold ? { fontFamily: 'Helvetica-Bold' } : undefined }, span.text));

  const blockView = (block: Block, i: number) => {
    if (block.type === 'bullet') {
      return h(View, { key: `b${i}`, style: styles.listRow },
        h(Text, { style: styles.listMark }, '•'),
        h(Text, { style: styles.listText }, ...inlineRuns(block.spans)),
      );
    }
    if (block.type === 'number') {
      return h(View, { key: `b${i}`, style: styles.listRow },
        h(Text, { style: styles.listMark }, `${block.num}.`),
        h(Text, { style: styles.listText }, ...inlineRuns(block.spans)),
      );
    }
    return h(Text, { key: `b${i}`, style: styles.paragraph }, ...inlineRuns(block.spans));
  };

  const resourceBox = (r: { title: string; url: string; reason: string }, i: number) =>
    h(View, { key: `r${i}`, style: styles.resourceBox, wrap: false },
      h(Text, { style: styles.resourceTitle }, r.title),
      h(Text, { style: styles.resourceReason }, `Recommended because ${r.reason}.`),
      h(Link, { style: styles.resourceLink, src: r.url }, `Open ${r.title} →`),
    );

  const sectionView = (section: ExportSection, i: number) =>
    h(View, { key: i, style: styles.section },
      h(Text, { style: styles.heading }, section.heading),
      ...section.blocks.map(blockView),
      // The code-authoritative resource CTAs live right after the pitch section.
      ...(section.key === 'recommended_resource' ? model.resources.map(resourceBox) : []),
    );

  const header = h(View, {},
    h(Text, { style: styles.eyebrow }, 'Career Compass Report'),
    h(Text, { style: styles.title }, model.title),
    h(Text, { style: styles.subtitle }, model.subtitle),
    model.stats.length > 0
      ? h(View, { style: styles.statStrip },
          ...model.stats.map((s, i) => h(View, { key: i, style: styles.stat },
            h(Text, { style: styles.statLabel }, s.label),
            h(Text, { style: styles.statValue }, s.value),
          )),
        )
      : null,
  );

  const footer = h(View, { style: styles.footer, fixed: true },
    h(Text, { style: styles.footerText }, `Generated with TrajectoryOS · ${model.generatedOn}`),
    h(Text, { style: styles.footerText, render: ({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) => `${pageNumber} / ${totalPages}` }),
  );

  const pdfDocument = h(Document, { title: 'Career Compass — Deep-Dive Report' },
    h(Page, { size: 'A4', style: styles.page },
      header,
      ...model.sections.map(sectionView),
      footer,
    ),
  );

  return renderToBuffer(pdfDocument as Parameters<typeof renderToBuffer>[0]);
}
