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
- **where_you_stand**: A direct, honest read of where they are. What does their fit band actually mean in plain English, and *why* did they land there — which parts of their profile lift them and which hold them back? How do they compare to the professionals who made it? Encouraging but grounded — never oversell, especially on a reach or long-shot. 3–4 short paragraphs.
- **matched_paths**: What did people who started from a similar point actually do? Surface the dominant pattern (e.g. "7 of 10 had a penultimate at BB"), name real firms from the data, and explain what that pattern *implies for this student's own path*. 4–6 bullets or a short narrative, always concrete.
- **what_to_do_next**: The heart of the report. The actions are given to you in priority order, each with an effort level and deadline — treat that order and those facts as fixed. For EACH action, write a full explanation (2–4 sentences) that covers: (1) **why this is the highest-leverage move for them right now** — what it unlocks and how it shifts their standing, citing the numbers in the data; (2) **why the timing matters** — tie it to their recruiting-cycle deadline; (3) **why it sits where it does in the sequence** — the ordering logic (it compounds, it's a prerequisite for the next move, or it's simply the best effort-to-impact ratio). Be their mentor explaining the plan, not a checklist. Numbered list by priority.`;
}

export function buildUserMessage(output: ScoringOutput): string {
  const {
    stage,
    stage_description,
    match_summary,
    target,
    top_paths,
    gaps,
    actions,
    context,
    probability_data,
  } = output;

  const FIT_LABELS: Record<string, string> = {
    strong_fit: 'Strong fit',
    stretch_but_achievable: 'Stretch, but achievable',
    reach: 'Reach',
    long_shot: 'Long shot',
  };

  const fitLabel = FIT_LABELS[match_summary.fit_band] ?? match_summary.fit_band;

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
    .map(
      a =>
        `  ${a.priority}. [${a.action_type}] "${a.title}"\n     ${a.description}\n     Deadline: ${a.deadline} | Effort: ${a.estimated_effort}`,
    )
    .join('\n\n');

  return `Generate a personalised career report for this student using the scoring data below.

SCORING SUMMARY
  Stage: ${stage} — ${stage_description}
  Fit band: ${fitLabel}
  Match funnel: ${match_summary.total_professionals ?? match_summary.pool_size} profiles analysed → ${match_summary.pool_size} comparable (same city, same career-stage cohort) → ${match_summary.matched_count} closest matches
  Reached target tier (${target.tier}): ${probability_data.reached_target} of ${probability_data.matched_count} matched profiles${probability_data.reached_one_below > 0 ? ` (a further ${probability_data.reached_one_below} reached one tier below)` : ''}
  Base rate: ${match_summary.pool_reached_target_count ?? 'n/a'} of ${match_summary.pool_size} in the whole comparable pool reached the target tier — frame the student's matched-cohort rate relative to this, not as an absolute probability
  Low data warning: ${match_summary.low_data_warning} (pool < 20 professionals; be appropriately measured about probability claims)
  Next recruiting window: ${context.next_recruiting_window}

TOP 5 MATCHED PROFESSIONAL PATHS (closest similarity first)
${topPathLines}

PROFILE GAPS (features common in successful matches but missing in student)
${gapLines}

RECOMMENDED ACTIONS (priority order — preserve it; explain the reasoning and the sequencing for each)
${actionLines}

Produce the JSON report now.`;
}
