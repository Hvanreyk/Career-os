import { AlertTriangle, Info, Lightbulb, ThumbsDown, ThumbsUp } from 'lucide-react';
import type { LessonBlock } from '@trajectoryos/core/courses/content';
import { renderInline, renderParagraphMd } from '@/lib/courses/inline-md';
import { KnowledgeCheck } from './KnowledgeCheck';

// Renders a lesson's typed content blocks (validated at seed time by
// lib/courses/content.ts). Server component except KnowledgeCheck,
// which is interactive.

export function LessonRenderer({ blocks }: { blocks: LessonBlock[] }) {
  return (
    <div className="space-y-5">
      {blocks.map((block, i) => (
        <Block key={i} block={block} />
      ))}
    </div>
  );
}

function Block({ block }: { block: LessonBlock }) {
  switch (block.type) {
    case 'heading':
      return (
        <h2 className="font-serif text-2xl font-bold text-white pt-4">{block.text}</h2>
      );

    case 'paragraph':
      return (
        <div className="text-slate-300 leading-relaxed">{renderParagraphMd(block.md)}</div>
      );

    case 'callout': {
      const style = {
        tip: { icon: Lightbulb, ring: 'border-gold-400/25', accent: 'text-gold-400' },
        warning: { icon: AlertTriangle, ring: 'border-amber-400/30', accent: 'text-amber-400' },
        note: { icon: Info, ring: 'border-sky-400/25', accent: 'text-sky-400' },
      }[block.variant];
      const Icon = style.icon;
      return (
        <div className={`glass rounded-xl border ${style.ring} p-5`}>
          <div className={`flex items-center gap-2 mb-2 ${style.accent}`}>
            <Icon className="w-4 h-4 shrink-0" />
            <span className="text-sm font-semibold">
              {block.title ?? block.variant.charAt(0).toUpperCase() + block.variant.slice(1)}
            </span>
          </div>
          <div className="text-slate-300 text-sm leading-relaxed">
            {renderParagraphMd(block.md)}
          </div>
        </div>
      );
    }

    case 'table':
      return (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-sm">
            {block.caption && (
              <caption className="text-left text-xs text-slate-500 px-4 pt-3 pb-1">
                {block.caption}
              </caption>
            )}
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.03]">
                {block.headers.map((h, i) => (
                  <th key={i} className="text-left px-4 py-3 text-gold-400 font-semibold whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, i) => (
                <tr key={i} className="border-b border-white/5 last:border-0">
                  {row.map((cell, j) => (
                    <td
                      key={j}
                      className={`px-4 py-3 align-top ${j === 0 ? 'text-white font-medium' : 'text-slate-400'}`}
                    >
                      {renderInline(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case 'profile_example': {
      const strong = block.strength === 'strong';
      return (
        <div
          className={`glass rounded-xl border p-5 ${
            strong ? 'border-emerald-400/25' : 'border-red-400/25'
          }`}
        >
          <div
            className={`flex items-center gap-2 mb-3 text-sm font-semibold ${
              strong ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            {strong ? <ThumbsUp className="w-4 h-4" /> : <ThumbsDown className="w-4 h-4" />}
            {block.title}
          </div>
          <ul className="list-disc pl-5 space-y-1.5 text-sm text-slate-300 mb-3">
            {block.bullets.map((b, i) => (
              <li key={i}>{renderInline(b)}</li>
            ))}
          </ul>
          <p className={`text-sm italic ${strong ? 'text-emerald-300/80' : 'text-red-300/80'}`}>
            {block.verdict}
          </p>
        </div>
      );
    }

    case 'knowledge_check':
      return <KnowledgeCheck block={block} />;
  }
}
