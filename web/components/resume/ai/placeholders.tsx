import type { ReactNode } from 'react';

// Highlights bracketed truth placeholders the generators emit (e.g.
// "[add metric if truthful]", "[competition name]") so students see exactly
// what to fill in — only if true.
export function renderWithPlaceholders(text: string): ReactNode {
  const parts = text.split(/(\[[^\]]+\])/g);
  if (parts.length === 1) return text;
  return parts.map((part, index) =>
    part.startsWith('[') && part.endsWith(']')
      ? <mark key={index} className="bg-amber-400/20 text-amber-200 rounded px-1">{part}</mark>
      : part,
  );
}
