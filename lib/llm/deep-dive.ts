import OpenAI from 'openai';
import 'dotenv/config';
import type { ScoringOutput } from '../scoring/types';
import type {
  DeepDiveReport,
  DeepDiveResourceInput,
  DeepDiveSections,
  LLMReportSections,
} from './types';

// The downloadable Career Compass deep-dive. A longer, guided expansion of the
// same fixed scoring data the on-screen report shows — written to hold the
// student's hand end to end and to point them at the resource that closes their
// specific gap. Same OpenAI setup and "explain, never invent" contract as the
// on-screen report generator (./index.ts); larger token budget for 2–3 pages.

const MODEL = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';
const MAX_RETRIES = 2;
const TIMEOUT_MS = 60_000;

export class DeepDiveError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = 'DeepDiveError';
  }
}

const SECTION_KEYS: (keyof DeepDiveSections)[] = [
  'executive_summary',
  'how_ib_works',
  'where_you_stand',
  'where_to_improve',
  'highest_leverage_moves',
  'recommended_resource',
  'your_roadmap',
];

function isDeepDiveShape(value: unknown): value is DeepDiveSections {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return SECTION_KEYS.every((k) => typeof v[k] === 'string');
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

function buildSystemPrompt(): string {
  return `You are a career coach helping Australian university students break into investment banking. You speak like a mentor who has been in the industry and genuinely wants this student to succeed — warm, direct, specific, and encouraging. Never vague, never corporate-speak.

You are writing a longer DOWNLOADABLE deep-dive report (roughly 2–3 pages) that expands on the short on-screen summary the student has already seen. The whole point is to hold their hand all the way to the end: explain the industry, be honest about where they need to improve, and make the plan feel doable.

Output ONLY valid JSON with exactly these keys (no code block, no extra text), each a self-contained Markdown string that begins with its own \`##\` heading:
{
  "executive_summary": "<markdown>",
  "how_ib_works": "<markdown>",
  "where_you_stand": "<markdown>",
  "where_to_improve": "<markdown>",
  "highest_leverage_moves": "<markdown>",
  "recommended_resource": "<markdown>",
  "your_roadmap": "<markdown>"
}

Use bold, short paragraphs and bullet/numbered lists freely. Cite concrete numbers, firm names and timelines from the data.

Hard rule — explain the data, never invent it. The competitiveness index/band, odds, gaps, and recommended actions (their order, effort, deadlines, and point-impacts) are already computed and fixed. Do not add, drop, reorder, or contradict them. Do NOT invent any URLs, links, or resource names — you are told exactly which resource(s) to recommend and why; name only those.

Section guidance:
- **executive_summary**: 1 short paragraph. Their competitiveness index/band for the target tier in plain English, the honest headline odds (framed on real market base rates — a single-digit BB probability is normal, not failure), and the single most important thing they should focus on next.
- **how_ib_works**: The "ins and outs" of the industry, pitched at THIS student's target tier and the Australian recruiting reality. What the work actually is (analyst life, deal types, coverage vs product), how the tiers differ (${tierLabel('bb')} vs ${tierLabel('elite_boutique')} vs ${tierLabel('mid_market')} vs ${tierLabel('boutique')}), and how the AU penultimate → graduate timeline actually works. Educational and motivating — this is where a student who is early gets oriented. 3–5 short paragraphs.
- **where_you_stand**: An honest, specific read of their competitiveness. Walk through the biggest positive and negative drivers, the per-tier ladder (where they're genuinely competitive vs a stretch), and the recommended aim with the stretch above it. Never oversell; never read as bleak — surface the wider "any front-office seat" on-ramp.
- **where_to_improve**: The gaps, in priority order, explained like a mentor. For each: what it is, why it matters to their target, and how quickly it's fixable. Be honest but constructive.
- **highest_leverage_moves**: The heart of the report. For EACH recommended action in the given order, write a full explanation (2–4 sentences): why it's the highest-leverage move right now (cite its point-impact and numbers), why the timing matters (tie to their recruiting deadline), and why it sits where it does in the sequence. Numbered list by priority.
- **recommended_resource**: Point them to the resource(s) named in the RECOMMENDED RESOURCE(S) block below — and ONLY those. For each, explain in the student's own terms WHY it's the right next step, citing the specific gap/action/driver that selected it (given to you). Tell them what to do first inside it. Make it feel like the obvious next click. Do not print raw URLs (the document adds the button); refer to the resource by its title.
- **your_roadmap**: The hand-holding close. A short, sequenced "here's exactly what to do, in order" tied to their next recruiting window (provided in the data) — the first move this week, then the next few. End on genuine encouragement.`;
}

function buildUserMessage(
  output: ScoringOutput,
  existing: LLMReportSections | undefined,
  resources: DeepDiveResourceInput[],
): string {
  const { match_summary, target, gaps, actions, context, probability_data, competitiveness: c } = output;

  const gapLines = gaps.length > 0
    ? gaps.map((g) => `  - ${g.display_name}: ${Math.round(g.match_pct * 100)}% of matched professionals had this; student does not (actionability: ${g.actionability}, ~${g.time_to_address_months} months to address)`).join('\n')
    : '  None identified — profile is well-rounded relative to the match pool.';

  const actionLines = actions.map((a) => {
    const roi = (a as { index_impact?: number }).index_impact;
    const roiText = roi != null ? ` | Competitiveness impact: ${roi > 0 ? '+' : ''}${roi} pts` : '';
    return `  ${a.priority}. [${a.action_type}] "${a.title}"\n     ${a.description}\n     Deadline: ${a.deadline ?? 'n/a'} | Effort: ${a.estimated_effort}${roiText}`;
  }).join('\n\n');

  const competitivenessBlock = c
    ? `COMPETITIVENESS (the report's primary lens)
  Index for ${tierLabel(c.primary_tier)}: ${c.index}/100 — ${BAND_LABELS[c.band] ?? c.band}
  Honest odds: ~${pctText(c.estimated_probability)} at a ${tierLabel(c.primary_tier)} seat this cycle (${c.multiplier_vs_field.toFixed(1)}x the typical serious candidate); ~${pctText(c.any_front_office_probability)} of landing SOME front-office IB seat across the ladder
  Per-tier ladder: ${c.per_tier.map((t) => `${tierLabel(t.tier)} ${t.index}/100 ${BAND_LABELS[t.band] ?? t.band} (~${pctText(t.estimated_probability)})`).join(' · ')}
  Recommended aim: ${tierLabel(c.recommended_target)} | stretch: ${tierLabel(c.stretch_target)} | safety: ${tierLabel(c.safety_target)}
  What's driving the score (signed points): ${c.contributions.map((f) => `${f.label} ${f.points > 0 ? '+' : ''}${f.points}`).join(', ')}
`
    : '';

  const resourceBlock = resources.length > 0
    ? resources.map((r, i) => `  ${i + 1}. "${r.title}" — recommend because: ${r.reason}`).join('\n')
    : '  (none)';

  const existingBlock = existing
    ? `\nFOR CONTINUITY — the short on-screen report already told them (EXPAND on this, never contradict it):\n${[existing.where_you_stand, existing.matched_paths, existing.what_to_do_next].join('\n\n')}\n`
    : '';

  return `Write the downloadable deep-dive for this student.

TARGET: ${target.role} · ${tierLabel(target.tier)} · ${target.geography}

${competitivenessBlock}
MATCH CONTEXT
  ${match_summary.matched_count} closest matches out of ${match_summary.pool_size} comparable peers; ${probability_data.reached_target} of ${probability_data.matched_count} reached ${tierLabel(target.tier)}.
  Next recruiting window: ${context.next_recruiting_window}

PROFILE GAPS (priority order)
${gapLines}

RECOMMENDED ACTIONS (priority order — preserve it)
${actionLines}

RECOMMENDED RESOURCE(S) — recommend ONLY these, by title, and say why for this student:
${resourceBlock}
${existingBlock}
Produce the JSON deep-dive now.`;
}

export async function generateDeepDive(
  scoringOutput: ScoringOutput,
  opts: {
    existingSections?: LLMReportSections;
    recommendedResources: DeepDiveResourceInput[];
  },
): Promise<DeepDiveReport> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new DeepDiveError('OPENAI_API_KEY is not set');

  const client = new OpenAI({ apiKey, timeout: TIMEOUT_MS, maxRetries: MAX_RETRIES });

  let response;
  try {
    response = await client.chat.completions.create({
      model: MODEL,
      // Room for a 2–3 page report across seven sections.
      max_completion_tokens: 6144,
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: buildSystemPrompt() },
        { role: 'user', content: buildUserMessage(scoringOutput, opts.existingSections, opts.recommendedResources) },
      ],
    });
  } catch (err) {
    throw new DeepDiveError(`OpenAI request failed (model: ${MODEL})`, err);
  }

  const text = response.choices[0]?.message?.content;
  if (!text) throw new DeepDiveError('Empty response from OpenAI API');

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new DeepDiveError(`Model returned non-JSON output. First 300 chars: ${text.slice(0, 300)}`);
  }
  if (!isDeepDiveShape(parsed)) {
    throw new DeepDiveError('Response missing one or more required section keys');
  }
  const sections = parsed;

  const markdown = SECTION_KEYS.map((k) => sections[k]).join('\n\n');

  return {
    sections,
    markdown,
    recommended_resources: opts.recommendedResources,
    model: MODEL,
    usage: {
      input_tokens: response.usage?.prompt_tokens ?? 0,
      output_tokens: response.usage?.completion_tokens ?? 0,
    },
  };
}
