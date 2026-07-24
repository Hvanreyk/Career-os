import type { ScoringOutput } from '../scoring/types';

export function buildSystemPrompt(): string {
  return `You are a career coach helping Australian university students break into investment banking. You speak like a mentor who has been in the industry and genuinely wants the student to succeed — warm, direct, and specific. Never vague. Never corporate-speak.

You receive structured scoring data about a student's profile and produce a personalised career report in JSON format.

Output ONLY valid JSON with exactly this structure (no code block, no extra text):
{
  "where_you_stand": "<markdown string>",
  "matched_paths": "<markdown string>",
  "what_to_do_next": "<markdown string>"
}

Each value is a self-contained Markdown string that will be rendered in the app as its own section. Include the section heading (##) as the first line of each value. Use bold, bullet points, and short paragraphs freely. Be specific — cite numbers, firm names, and timelines drawn from the data. Be generous with explanation: this report should read like a mentor who has studied *this* student's profile and is walking them through the reasoning, not a generic summary. Explain the "why" behind every claim.

Hard rule — explain the data, never invent it. The stage, fit, matched statistics, gaps, and recommended actions (including their order, effort, and deadlines) are already computed and fixed. Do not add, drop, reorder, or contradict them. Your job is to make the reasoning behind them clear, specific, and motivating.

Section guidance:
- **where_you_stand**: A direct, honest read of their competitiveness. Lead with what their index and band mean for their target tier in plain English, then explain *why* they sit there — walk through the biggest positive and negative drivers from "what's driving the score". Cover the per-tier ladder: where they're genuinely competitive vs a stretch, and the recommended aim (anchor tier) with the stretch above it. Be honest about the odds — these are anchored on real market base rates, so a single-digit BB probability is normal and not a failure; frame the wider "any front-office seat" on-ramp so it never reads as bleak. Never oversell. 3–4 short paragraphs.
- **matched_paths**: What did people who started from a similar point actually do? Surface the dominant pattern (e.g. "7 of 10 had a penultimate at BB"), name real firms from the data, and explain what that pattern *implies for this student's own path* — especially the ladder-up route (e.g. boutique/MM seat then converting toward BB). 4–6 bullets or a short narrative, always concrete.
- **what_to_do_next**: The heart of the report. The actions are given to you in priority order, each with an effort level, deadline, and (where known) a competitiveness point-impact — treat that order and those facts as fixed. For EACH action, write a full explanation (2–4 sentences) covering: (1) **why this is the highest-leverage move for them right now** — what it unlocks and how it shifts their index/standing, citing the point-impact and numbers in the data; (2) **why the timing matters** — tie it to their recruiting-cycle deadline; (3) **why it sits where it does in the sequence** — the ordering logic (it compounds, it's a prerequisite for the next move, or it's the best effort-to-impact ratio). Be their mentor explaining the plan, not a checklist. Numbered list by priority.`;
}

const BAND_LABELS: Record<string, string> = {
  strong: 'Strong', competitive: 'Competitive', developing: 'Developing', reach: 'Reach',
};
const TIER_LABELS: Record<string, string> = {
  bb: 'Bulge Bracket', elite_boutique: 'Elite Boutique', mid_market: 'Mid-Market',
  boutique: 'Boutique', any: 'any tier',
};
const tierLabel = (t: string) => TIER_LABELS[t] ?? t;
const pctText = (p: number) => `${(p * 100).toFixed(p < 0.1 ? 1 : 0)}%`;

export function buildUserMessage(output: ScoringOutput): string {
  const {
    match_summary,
    target,
    top_paths,
    gaps,
    actions,
    context,
    probability_data,
    competitiveness: c,
  } = output;

  const topPathLines = top_paths
    .slice(0, 5)
    .map((p, i) => `  ${i + 1}. [${p.anonymised_profile_id}] ${p.path_summary}`)
    .join('\n');

  const gapLines =
    gaps.length > 0
      ? gaps
          .map(
            g =>
              `  - ${g.display_name}: ${Math.round(g.match_pct * 100)}% of matched professionals had this; student does not`,
          )
          .join('\n')
      : '  None identified — profile is well-rounded relative to the match pool.';

  const actionLines = actions
    .map((a) => {
      const roi = (a as { index_impact?: number }).index_impact;
      const roiText = roi != null ? ` | Competitiveness impact: ${roi > 0 ? '+' : ''}${roi} pts` : '';
      return `  ${a.priority}. [${a.action_type}] "${a.title}"\n     ${a.description}\n     Deadline: ${a.deadline} | Effort: ${a.estimated_effort}${roiText}`;
    })
    .join('\n\n');

  const competitivenessBlock = c
    ? `COMPETITIVENESS (the report's primary lens — lead with this, not stage)
  Index for ${tierLabel(c.primary_tier)}: ${c.index}/100 — ${BAND_LABELS[c.band] ?? c.band}
  Honest odds: ~${pctText(c.estimated_probability)} shot at a ${tierLabel(c.primary_tier)} seat this cycle (${c.multiplier_vs_field.toFixed(1)}x the typical serious candidate); ~${pctText(c.any_front_office_probability)} chance of landing SOME front-office IB seat across the tier ladder
  Per-tier ladder: ${c.per_tier.map(t => `${tierLabel(t.tier)} ${t.index}/100 ${BAND_LABELS[t.band] ?? t.band} (~${pctText(t.estimated_probability)})`).join(' · ')}
  Recommended aim: ${tierLabel(c.recommended_target)}  |  stretch: ${tierLabel(c.stretch_target)}  |  safety: ${tierLabel(c.safety_target)}
  What's driving the score (signed points): ${c.contributions.map(f => `${f.label} ${f.points > 0 ? '+' : ''}${f.points}`).join(', ')}
`
    : '';

  return `Generate a personalised career report for this student using the scoring data below.

${competitivenessBlock}
MATCH CONTEXT (evidence for the "people like you" section — do NOT lead the report with these raw numbers)
  Analysed ${match_summary.total_professionals ?? match_summary.pool_size} professionals → ${match_summary.pool_size} comparable (same city + career-stage cohort) → ${match_summary.matched_count} closest matches
  Of the matched cohort, ${probability_data.reached_target} of ${probability_data.matched_count} reached ${tierLabel(target.tier)}${probability_data.reached_one_below > 0 ? ` (a further ${probability_data.reached_one_below} reached one tier below)` : ''} — pool base rate ${match_summary.pool_reached_target_count ?? 'n/a'} of ${match_summary.pool_size}
  ${match_summary.low_data_warning ? 'Note: fewer than 20 close matches — be measured about the cohort statistics.' : ''}
  Next recruiting window: ${context.next_recruiting_window}

TOP 5 MATCHED PROFESSIONAL PATHS (closest similarity first)
${topPathLines}

PROFILE GAPS (features common in successful matches but missing in student)
${gapLines}

RECOMMENDED ACTIONS (priority order — preserve it; explain the reasoning and the sequencing for each)
${actionLines}

Produce the JSON report now.`;
}
