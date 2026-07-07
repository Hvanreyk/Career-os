import { DIMENSION_LABELS, type Dimension } from '../courses/diagnostic';
import type { RoadmapInput } from './roadmap';

// Prompt builders for the recruiting roadmap. Same philosophy as
// ./prompt.ts: the model only rephrases and schedules what the
// structured input already establishes — it must not invent
// achievements, deadlines, or firm-specific facts.

export function buildRoadmapSystemPrompt(): string {
  return [
    'You are a pragmatic careers coach helping an Australian university student',
    'prepare for investment banking recruiting. You write a personalised action',
    'plan based ONLY on the structured data provided by the user message.',
    '',
    'Rules:',
    '- Ground every item in the provided data (readiness dimensions, quiz results,',
    '  bank targets, recruiting timeline). Do not invent achievements, contacts,',
    '  firm-specific deadlines, or facts.',
    '- The recruiting timeline provided lists TYPICAL windows, not guaranteed',
    '  dates. When an item depends on dates, tell the student to verify with each',
    '  firm.',
    '- Prioritise the weakest readiness dimensions and the most time-sensitive',
    '  actions first.',
    '- Items must be concrete and completable (e.g. "Draft one-page resume and get',
    '  it reviewed by one person in finance"), not vague ("work on your resume").',
    '- Plain, direct language. No hype, no guarantees of employment, no shaming.',
    '- Never suggest misrepresenting experience or using AI dishonestly in',
    '  applications or interviews.',
    '',
    'Output STRICT JSON with exactly these keys:',
    '{',
    '  "this_week": [{"title": string, "detail": string}],',
    '  "next_30_days": [{"title": string, "detail": string}],',
    '  "next_90_days": [{"title": string, "detail": string}],',
    '  "before_apps_open": [{"title": string, "detail": string}]',
    '}',
    'Each array: 3-5 items. title: short imperative (max ~8 words). detail: 1-3',
    'sentences explaining what to do and why it matters for THIS student.',
    'No markdown, no extra keys, no commentary.',
  ].join('\n');
}

function formatDimensions(dimensions: Record<string, number>): string {
  return Object.entries(dimensions)
    .sort(([, a], [, b]) => a - b)
    .map(([key, value]) => `- ${DIMENSION_LABELS[key as Dimension] ?? key}: ${value}/100`)
    .join('\n');
}

export function buildRoadmapUserMessage(input: RoadmapInput): string {
  const lines: string[] = [];

  lines.push(`Today's date: ${input.today}`);
  lines.push('');
  lines.push(`Overall readiness: ${input.readiness.score}/100`);
  lines.push('Readiness dimensions (weakest first):');
  lines.push(formatDimensions(input.readiness.dimensions));

  if (input.final_readiness) {
    lines.push('');
    lines.push(
      `Updated readiness after course work: ${input.final_readiness.score}/100 ` +
        `(completed ${Math.round(input.final_readiness.completed_lesson_ratio * 100)}% of lessons)`,
    );
  }

  const quizzes = Object.entries(input.quiz_scores);
  if (quizzes.length > 0) {
    lines.push('');
    lines.push('Module quiz results (best attempts):');
    for (const [slug, q] of quizzes) {
      lines.push(`- ${slug}: ${q.score}/${q.total}`);
    }
  }

  lines.push('');
  lines.push('Student context:');
  if (input.current_year !== null) lines.push(`- University year: ${input.current_year}`);
  if (input.expected_graduation_year !== null) {
    lines.push(`- Expected graduation: ${input.expected_graduation_year}`);
  }
  if (input.target_firm_tier) lines.push(`- Target firm tier: ${input.target_firm_tier}`);
  if (input.target_geography) lines.push(`- Target city: ${input.target_geography}`);

  if (input.bank_targets.length > 0) {
    lines.push('');
    lines.push('Bank target list (name / priority 1=high / status):');
    for (const t of input.bank_targets) {
      lines.push(`- ${t.name} / P${t.priority} / ${t.status}`);
    }
  } else {
    lines.push('');
    lines.push('Bank target list: empty (building it is a likely early action).');
  }

  lines.push('');
  lines.push(
    `Australian recruiting timeline (typical patterns, last reviewed ${input.timeline_last_reviewed} — students must verify with each firm):`,
  );
  for (const c of input.timeline) {
    lines.push(
      `- ${c.name}: applications typically ${c.typical_open} to ${c.typical_close}; ` +
        `for ${c.audience}. ${c.notes}`,
    );
  }

  lines.push('');
  lines.push('Write the four-section action plan now.');

  return lines.join('\n');
}
