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

Each value is a self-contained Markdown string that will be rendered in the app as its own section. Include the section heading (##) as the first line of each value. Use bold, bullet points, and short paragraphs freely. Be specific — cite numbers, firm names, and timelines drawn from the data.

Section guidance:
- **where_you_stand**: Start with a direct, honest assessment. What stage are they at? What does their fit band actually mean in plain English? How does their profile compare to the professionals who made it? Be encouraging but grounded — don't oversell. 2–3 short paragraphs.
- **matched_paths**: What did the professionals who succeeded from a similar starting point actually do? Surface the most common pattern (e.g. "7 of 10 had a penultimate at BB"). Name real firms from the data. Give the student a mental model of the path ahead. 3–5 bullet points or a short narrative.
- **what_to_do_next**: Turn the recommended actions into coaching advice. Explain the *why* behind each action — what does it unlock, why does timing matter? Be specific about deadlines and effort. Numbered list by priority. Max 3 actions.`;
}

export function buildUserMessage(output: ScoringOutput): string {
  const {
    stage,
    stage_description,
    match_summary,
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
  Match pool: ${match_summary.pool_size} professionals
  Reached target (BB or above): ${probability_data.reached_target} of ${probability_data.matched_count}
  Low data warning: ${match_summary.low_data_warning} (pool < 20 professionals; be appropriately measured about probability claims)
  Next recruiting window: ${context.next_recruiting_window}

TOP 5 MATCHED PROFESSIONAL PATHS (closest similarity first)
${topPathLines}

PROFILE GAPS (features common in successful matches but missing in student)
${gapLines}

RECOMMENDED ACTIONS
${actionLines}

Produce the JSON report now.`;
}
