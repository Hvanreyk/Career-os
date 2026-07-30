import type { LessonBlock } from '@trajectoryos/core/courses/content';
import { renderInline, renderParagraphMd } from '@/lib/courses/inline-md';
import { KnowledgeCheck } from './KnowledgeCheck';

// Renders a lesson's typed content blocks (validated at seed time by
// lib/courses/content.ts). Server component except KnowledgeCheck,
// which is interactive.

/* Reading, not scanning. A lesson is 10–30 minutes of continuous prose, so the
   body stays on the page ground at 17px/1.75 with a ~70ch measure — no panel
   around every paragraph, and no mono anywhere in the running text.

   The descendant overrides below re-skin the inline markdown renderer
   (lib/courses/inline-md.tsx, shared with the report) without editing it:
   a descendant selector outranks the utility class it is correcting. */
const PROSE =
  'max-w-[70ch] text-[17px] leading-[1.75] text-bone/90 ' +
  '[&_a]:text-red [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-red-bright ' +
  '[&_strong]:text-bone [&_strong]:font-semibold ' +
  '[&_code]:rounded-none [&_code]:border [&_code]:border-rule [&_code]:bg-raised ' +
  '[&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-bone [&_code]:text-[0.88em] ' +
  '[&_li]:marker:text-graphite';

export function LessonRenderer({ blocks }: { blocks: LessonBlock[] }) {
  return (
    <div className={`space-y-6 ${PROSE}`}>
      {blocks.map((block, i) => (
        <Block key={i} block={block} />
      ))}
    </div>
  );
}

/* Callouts carry their kind as a word first. Only a warning earns the accent —
   a page where every aside is red says nothing. */
const CALLOUT: Record<'tip' | 'warning' | 'note', { word: string; edge: string; label: string }> = {
  tip: { word: 'Tip', edge: 'border-l-bone', label: '' },
  warning: { word: 'Warning', edge: 'border-l-red', label: 'text-red' },
  note: { word: 'Note', edge: 'border-l-rule-bright', label: '' },
};

function Block({ block }: { block: LessonBlock }) {
  switch (block.type) {
    case 'heading':
      return (
        <h2 className="mt-12 border-b border-rule pb-2.5 text-[17px] font-bold uppercase tracking-[-0.015em] text-bone first:mt-0">
          {block.text}
        </h2>
      );

    case 'paragraph':
      return <div>{renderParagraphMd(block.md)}</div>;

    case 'callout': {
      const style = CALLOUT[block.variant];
      return (
        <aside className={`border border-rule border-l-2 bg-surface p-5 ${style.edge}`}>
          <span className={`ml-label ${style.label}`}>
            {block.title ?? style.word}
          </span>
          <div className="mt-2 text-[16px] leading-[1.7]">{renderParagraphMd(block.md)}</div>
        </aside>
      );
    }

    case 'table':
      return (
        <figure className="overflow-x-auto border border-rule">
          <table className="w-full min-w-[34rem] border-collapse text-[15px]">
            {block.caption && (
              <caption className="ml-label border-b border-rule px-4 py-3 text-left">
                {block.caption}
              </caption>
            )}
            <thead>
              <tr className="bg-raised">
                {block.headers.map((h, i) => (
                  <th
                    key={i}
                    scope="col"
                    className="ml-label whitespace-nowrap border-b border-rule px-4 py-3 text-left text-bone"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, i) => (
                <tr key={i} className="ml-row">
                  {row.map((cell, j) => (
                    <td
                      key={j}
                      className={`px-4 py-3 align-top leading-[1.6] ${
                        j === 0 ? 'font-semibold text-bone' : 'text-graphite'
                      }`}
                    >
                      {renderInline(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </figure>
      );

    case 'profile_example': {
      const strong = block.strength === 'strong';
      return (
        <aside
          className={`border border-rule border-l-2 bg-surface p-5 ${
            strong ? 'border-l-ok' : 'border-l-red'
          }`}
        >
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className={`ml-label ${strong ? 'text-ok' : 'text-red'}`}>
              {strong ? 'Strong example' : 'Weak example'}
            </span>
            <h3 className="text-[15px] font-bold uppercase tracking-[-0.01em] text-bone">
              {block.title}
            </h3>
          </div>
          <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[16px] leading-[1.65]">
            {block.bullets.map((b, i) => (
              <li key={i}>{renderInline(b)}</li>
            ))}
          </ul>
          <p className="mt-3 border-t border-rule pt-3 text-[15px] leading-[1.6] text-graphite">
            <span className="ml-label mr-2">Verdict</span>
            {block.verdict}
          </p>
        </aside>
      );
    }

    case 'knowledge_check':
      return <KnowledgeCheck block={block} />;
  }
}
