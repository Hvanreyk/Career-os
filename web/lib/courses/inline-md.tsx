import type { ReactNode } from 'react';

// Tiny inline-markdown renderer for lesson paragraph/callout text:
// **bold**, *italic*, `code` and [links](https://...). Deliberately
// minimal — block structure comes from typed content blocks, so a full
// markdown library isn't needed (same approach as the report's Prose).

const INLINE_TOKEN = /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\))/g;

export function renderInline(text: string): ReactNode[] {
  return text.split(INLINE_TOKEN).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="text-white font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} className="px-1.5 py-0.5 rounded bg-white/10 text-gold-300 text-[0.9em]">
          {part.slice(1, -1)}
        </code>
      );
    }
    const link = part.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
    if (link) {
      return (
        <a
          key={i}
          href={link[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-gold-400 hover:text-gold-300 underline underline-offset-2"
        >
          {link[1]}
        </a>
      );
    }
    return part;
  });
}

/**
 * Render multi-line paragraph markdown: consecutive `- ` lines become a
 * bullet list; everything else joins into text runs.
 */
export function renderParagraphMd(md: string): ReactNode[] {
  const lines = md.split('\n');
  const nodes: ReactNode[] = [];
  let text: string[] = [];
  let bullets: string[] = [];

  const flushText = () => {
    const joined = text.join(' ').trim();
    if (joined) nodes.push(<span key={`t${nodes.length}`}>{renderInline(joined)}</span>);
    text = [];
  };
  const flushBullets = () => {
    if (bullets.length) {
      nodes.push(
        <ul key={`u${nodes.length}`} className="list-disc pl-5 space-y-1.5 my-2">
          {bullets.map((b, i) => (
            <li key={i}>{renderInline(b)}</li>
          ))}
        </ul>,
      );
    }
    bullets = [];
  };

  for (const line of lines) {
    const bullet = line.match(/^\s*-\s+(.*)$/);
    if (bullet) {
      flushText();
      bullets.push(bullet[1] ?? '');
    } else {
      flushBullets();
      text.push(line);
    }
  }
  flushText();
  flushBullets();
  return nodes;
}
