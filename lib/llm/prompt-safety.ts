const ZERO_WIDTH_SPACE = String.fromCharCode(0x200b);

/**
 * Breaks literal closing-tag sequences in untrusted text so it cannot mimic
 * the end of a prompt delimiter block (e.g. `</resume_text>`). Invisible to
 * both a human reader and the model's understanding of the content, but
 * prevents the text from textually closing our declared boundary early.
 */
export function neutralizeTagSequences(text: string): string {
  return text.replace(/<\//g, `<${ZERO_WIDTH_SPACE}/`);
}
