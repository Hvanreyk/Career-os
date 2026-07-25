import type { DeepDiveReport, DeepDiveSections } from '@trajectoryos/core/llm/types';
import type { ScoringOutput } from '@trajectoryos/core/scoring/types';

// Renderer-facing model for the Career Compass deep-dive PDF. Turns the LLM's
// per-section markdown into a small block tree (headings / paragraphs / list
// items with bold runs) the react-pdf renderer can walk, plus a headline stat
// strip drawn from the fixed scoring output and the code-selected resource
// links. No external markdown dependency — the model is deliberately tiny.

export interface InlineSpan {
  text: string;
  bold: boolean;
}

export type Block =
  | { type: 'p'; spans: InlineSpan[] }
  | { type: 'bullet'; spans: InlineSpan[] }
  | { type: 'number'; num: number; spans: InlineSpan[] };

export interface ExportSection {
  key: keyof DeepDiveSections;
  heading: string;
  blocks: Block[];
}

export interface ExportResource {
  title: string;
  url: string;
  reason: string;
}

export interface DeepDiveExportModel {
  title: string;
  subtitle: string;
  /** Headline stat strip; empty for reports predating the competitiveness lens. */
  stats: { label: string; value: string }[];
  sections: ExportSection[];
  resources: ExportResource[];
  generatedOn: string;
}

const TIER_LABELS: Record<string, string> = {
  bb: 'Bulge Bracket', elite_boutique: 'Elite Boutique', mid_market: 'Mid-Market',
  boutique: 'Boutique', any: 'any tier',
};
const BAND_LABELS: Record<string, string> = {
  strong: 'Strong', competitive: 'Competitive', developing: 'Developing', reach: 'Reach',
};
const tierLabel = (t: string) => TIER_LABELS[t] ?? t;
const pctText = (p: number) => `${(p * 100).toFixed(p < 0.1 ? 1 : 0)}%`;

// Canonical section headings, so the document reads consistently regardless of
// whatever heading the model wrote as the first line of each section.
const SECTION_HEADINGS: Record<keyof DeepDiveSections, string> = {
  executive_summary: 'Executive Summary',
  how_ib_works: 'How Investment Banking Works',
  where_you_stand: 'Where You Stand',
  where_to_improve: 'Where You Need to Improve',
  highest_leverage_moves: 'Your Highest-Leverage Moves',
  recommended_resource: 'Start Here Next',
  your_roadmap: 'Your Roadmap to the Finish Line',
};

const SECTION_ORDER: (keyof DeepDiveSections)[] = [
  'executive_summary', 'how_ib_works', 'where_you_stand', 'where_to_improve',
  'highest_leverage_moves', 'recommended_resource', 'your_roadmap',
];

/** Splits a line into bold / non-bold runs on `**…**`, after stripping any
 * markdown link syntax down to its visible text. */
export function parseInline(text: string): InlineSpan[] {
  const cleaned = text.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');
  const spans: InlineSpan[] = [];
  const parts = cleaned.split(/\*\*/);
  parts.forEach((part, i) => {
    // Drop any residual single-asterisk italic markers left after bold splitting.
    const clean = part.replace(/\*/g, '');
    if (clean === '') return;
    // Odd segments are between a pair of `**` → bold.
    spans.push({ text: clean, bold: i % 2 === 1 });
  });
  return spans.length > 0 ? spans : [{ text: cleaned.replace(/\*/g, ''), bold: false }];
}

/** Minimal markdown → block tree. Handles headings (dropped — we supply our
 * own), `-`/`*` bullets, `N.` numbered items, and wrapped paragraphs. */
export function parseMarkdownBlocks(md: string): Block[] {
  const blocks: Block[] = [];
  let paragraph: string[] = [];

  const flush = () => {
    if (paragraph.length === 0) return;
    blocks.push({ type: 'p', spans: parseInline(paragraph.join(' ')) });
    paragraph = [];
  };

  for (const raw of md.split('\n')) {
    const line = raw.trim();
    if (line === '') { flush(); continue; }
    if (/^#{1,6}\s+/.test(line)) { flush(); continue; } // drop LLM headings
    const bullet = line.match(/^[-*]\s+(.*)$/);
    if (bullet) { flush(); blocks.push({ type: 'bullet', spans: parseInline(bullet[1]!) }); continue; }
    const numbered = line.match(/^(\d+)\.\s+(.*)$/);
    if (numbered) { flush(); blocks.push({ type: 'number', num: Number(numbered[1]), spans: parseInline(numbered[2]!) }); continue; }
    paragraph.push(line);
  }
  flush();
  return blocks;
}

function buildStats(output: ScoringOutput): { label: string; value: string }[] {
  const c = output.competitiveness;
  if (!c) return [];
  return [
    { label: 'Competitiveness', value: `${c.index}/100` },
    { label: 'Band', value: BAND_LABELS[c.band] ?? c.band },
    { label: 'Target', value: tierLabel(c.primary_tier) },
    { label: 'This cycle', value: `~${pctText(c.estimated_probability)}` },
  ];
}

/** Builds the full render model from a stored deep-dive + its scoring output. */
export function buildDeepDiveExportModel(
  deepDive: DeepDiveReport,
  output: ScoringOutput,
  generatedOn: Date,
): DeepDiveExportModel {
  const sections: ExportSection[] = SECTION_ORDER.map((key) => ({
    key,
    heading: SECTION_HEADINGS[key],
    blocks: parseMarkdownBlocks(deepDive.sections[key] ?? ''),
  })).filter((s) => s.blocks.length > 0);

  return {
    title: 'Your Career Compass',
    subtitle: `Investment Banking Deep-Dive · ${tierLabel(output.target.tier)} · ${output.target.geography}`,
    stats: buildStats(output),
    sections,
    resources: deepDive.recommended_resources
      .filter((r) => Boolean(r.url))
      .map((r) => ({ title: r.title, url: r.url as string, reason: r.reason })),
    generatedOn: generatedOn.toLocaleDateString('en-AU', {
      day: 'numeric', month: 'long', year: 'numeric',
    }),
  };
}

/** Header-safe Content-Disposition filename values (ASCII fallback + RFC 5987). */
export function contentDispositionFilename(name: string): { ascii: string; encoded: string } {
  const ascii = name.normalize('NFKD').replace(/[^\x20-\x7E]/g, '').replace(/["\\]/g, '').trim();
  return { ascii: ascii || 'Career-Compass-Report.pdf', encoded: encodeURIComponent(name) };
}
