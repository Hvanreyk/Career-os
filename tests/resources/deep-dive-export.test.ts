import { describe, it, expect } from 'vitest';
import {
  parseInline,
  parseMarkdownBlocks,
  buildDeepDiveExportModel,
} from '../../web/lib/report/export/template.js';
import type { DeepDiveReport } from '../../lib/llm/types.js';
import type { ScoringOutput } from '../../lib/scoring/types.js';

describe('parseInline', () => {
  it('splits bold runs on **', () => {
    expect(parseInline('a **b** c')).toEqual([
      { text: 'a ', bold: false },
      { text: 'b', bold: true },
      { text: ' c', bold: false },
    ]);
  });

  it('strips residual single-asterisk italics and markdown links', () => {
    expect(parseInline('a *dev* [x](http://y)')).toEqual([{ text: 'a dev x', bold: false }]);
  });
});

describe('parseMarkdownBlocks', () => {
  it('drops LLM headings and classifies bullets, numbers and wrapped paragraphs', () => {
    const blocks = parseMarkdownBlocks(
      '## Heading\nLine one\nstill one paragraph\n\n- bullet a\n- bullet b\n\n1. first\n2. second',
    );
    expect(blocks).toEqual([
      { type: 'p', spans: [{ text: 'Line one still one paragraph', bold: false }] },
      { type: 'bullet', spans: [{ text: 'bullet a', bold: false }] },
      { type: 'bullet', spans: [{ text: 'bullet b', bold: false }] },
      { type: 'number', num: 1, spans: [{ text: 'first', bold: false }] },
      { type: 'number', num: 2, spans: [{ text: 'second', bold: false }] },
    ]);
  });
});

describe('buildDeepDiveExportModel', () => {
  const deepDive = {
    sections: {
      executive_summary: '## X\nHi',
      how_ib_works: '', // empty section is dropped
      where_you_stand: 'Body',
      where_to_improve: 'Body',
      highest_leverage_moves: '1. move',
      recommended_resource: 'Start here',
      your_roadmap: 'Go',
    },
    markdown: '', recommended_resources: [
      { slug: 'investment-banking-guides', title: 'Investment Banking Guides', reason: 'r', url: 'https://x/resources/investment-banking-guides' },
    ], model: 'm', usage: { input_tokens: 0, output_tokens: 0 },
  } satisfies DeepDiveReport;

  const output = {
    target: { role: 'analyst', tier: 'bb', geography: 'Sydney' },
    competitiveness: { primary_tier: 'bb', index: 50, band: 'developing', estimated_probability: 0.05 },
  } as unknown as ScoringOutput;

  it('uses canonical headings, drops empty sections and carries the stat strip + resources', () => {
    const model = buildDeepDiveExportModel(deepDive, output, new Date('2026-07-24'));
    expect(model.sections.map((s) => s.key)).not.toContain('how_ib_works');
    expect(model.sections[0]?.heading).toBe('Executive Summary');
    expect(model.stats).toHaveLength(4);
    expect(model.stats[0]).toEqual({ label: 'Competitiveness', value: '50/100' });
    expect(model.resources[0]?.url).toContain('/resources/investment-banking-guides');
  });

  it('yields an empty stat strip for reports without a competitiveness lens', () => {
    const model = buildDeepDiveExportModel(deepDive, { target: output.target } as ScoringOutput, new Date());
    expect(model.stats).toHaveLength(0);
  });
});
