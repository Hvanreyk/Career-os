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
