export interface LLMReportSections {
  where_you_stand: string;
  matched_paths: string;
  what_to_do_next: string;
}

export interface LLMReport {
  sections: LLMReportSections;
  /** Full joined markdown — concatenation of all three sections. */
  markdown: string;
  model: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

// ─── Downloadable deep-dive report ──────────────────────────────
// A longer (2–3 page) PDF a student generates after the on-screen report. It
// expands the same fixed scoring data into a guided, hand-holding narrative and
// ends by pointing them at the resource that closes their specific gap.

export interface DeepDiveSections {
  /** Headline read: index/band/target + the one focus that matters most. */
  executive_summary: string;
  /** The "ins and outs" of IB, personalised to their target tier + AU cycle. */
  how_ib_works: string;
  /** Expanded, honest competitiveness read. */
  where_you_stand: string;
  /** Deep gap analysis — where and why they need to improve. */
  where_to_improve: string;
  /** Their highest-leverage moves, each with the why / how / timing / order. */
  highest_leverage_moves: string;
  /** Why the code-selected resource(s) are the right next step for them. */
  recommended_resource: string;
  /** The hand-holding close: a sequenced plan tied to the next window. */
  your_roadmap: string;
}

/** A resource the engine picked for this student, passed to the generator so it
 * writes the pitch (but never invents the choice or the link). */
export interface DeepDiveResourceInput {
  slug: string;
  title: string;
  /** Plain-English reason this student was routed here (from their signals). */
  reason: string;
  /** Absolute URL, or null when the resource has no live page to link yet. */
  url: string | null;
}

export interface DeepDiveReport {
  sections: DeepDiveSections;
  /** Full joined markdown, in reading order. */
  markdown: string;
  /** The resources cited in `recommended_resource` (code-authoritative). */
  recommended_resources: DeepDiveResourceInput[];
  model: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}
