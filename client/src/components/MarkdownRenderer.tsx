import React from 'react';
import { Bookmark, Sparkles } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

interface InlineToken {
  type: 'text' | 'bold' | 'italic' | 'code' | 'badge' | 'badge-sky';
  text: string;
}

type Block =
  | { type: 'heading'; level: number; content: string }
  | { type: 'hr' }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'blockquote'; content: string }
  | { type: 'ul'; items: { text: string; nested: boolean }[] }
  | { type: 'ol'; items: { num: string; content: string }[] }
  | { type: 'paragraph'; content: string };

function parseInlineTokens(raw: string): InlineToken[] {
  // Tokenize bold (**...**), code (`...`), italic (*...* not surrounded by *), and bracketed rule tags
  const tokens = raw.split(/(\*\*[^*]+?\*\*|`[^`]+?`|(?<!\*)\*[^*]+?\*(?!\*)|\[(?:KEYWORD|Ref|SECTION|RULE)[^\]]*\])/g);
  
  return tokens
    .filter(t => t.length > 0)
    .map((t): InlineToken => {
      // Bold
      if (t.startsWith('**') && t.endsWith('**')) {
        const inner = t.slice(2, -2).trim();
        // Check if bold is wrapping a bracketed rule or keyword, e.g. **[KEYWORD: ... Ref: 24.09]**
        if (inner.startsWith('[') && inner.endsWith(']')) {
          return { type: 'badge', text: inner.slice(1, -1).trim() };
        }
        return { type: 'bold', text: inner };
      }

      // Inline code
      if (t.startsWith('`') && t.endsWith('`')) {
        return { type: 'code', text: t.slice(1, -1) };
      }

      // Italic
      if (t.startsWith('*') && t.endsWith('*')) {
        return { type: 'italic', text: t.slice(1, -1) };
      }

      // Standalone bracket tag, e.g. [Ref: 24.09] or [KEYWORD: ...]
      if (t.startsWith('[') && t.endsWith(']')) {
        return { type: 'badge-sky', text: t.slice(1, -1).trim() };
      }

      return { type: 'text', text: t };
    });
}

const renderInline = (content: string): React.ReactNode => {
  const tokens = parseInlineTokens(content);
  return tokens.map((token, idx) => {
    switch (token.type) {
      case 'badge':
        return (
          <span
            key={idx}
            className="inline-flex items-center gap-1 px-2 py-0.5 my-0.5 rounded-md bg-amber-500/15 border border-amber-500/40 text-amber-300 font-mono text-[11px] font-bold tracking-tight shadow-sm"
          >
            <Bookmark className="w-3 h-3 text-amber-400 flex-shrink-0" />
            <span>{token.text}</span>
          </span>
        );
      case 'badge-sky':
        return (
          <span
            key={idx}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 my-0.5 rounded bg-sky-950/80 border border-sky-600/40 text-sky-300 font-mono text-[10px] font-medium"
          >
            <span>{token.text}</span>
          </span>
        );
      case 'bold':
        return (
          <strong key={idx} className="font-bold text-slate-100">
            {token.text}
          </strong>
        );
      case 'italic':
        return (
          <em key={idx} className="italic text-slate-300">
            {token.text}
          </em>
        );
      case 'code':
        return (
          <code
            key={idx}
            className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-sky-300 font-semibold"
          >
            {token.text}
          </code>
        );
      case 'text':
      default:
        return <span key={idx}>{token.text}</span>;
    }
  });
};

function parseTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

function isTableSeparator(line: string): boolean {
  return /^\|?[\s:-]+(?:\|[\s:-]+)+\|?$/.test(line.trim());
}

function parseBlocks(markdown: string): Block[] {
  const lines = markdown.split(/\r?\n/);
  const blocks: Block[] = [];
  let currentList:
    | { type: 'ul'; items: { text: string; nested: boolean }[] }
    | { type: 'ol'; items: { num: string; content: string }[] }
    | null = null;

  const flushList = () => {
    if (currentList) {
      blocks.push(currentList);
      currentList = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      flushList();
      continue;
    }

    // Horizontal Rule (---, ***, ___)
    if (/^(?:[-*_]){3,}$/.test(trimmed)) {
      flushList();
      blocks.push({ type: 'hr' });
      continue;
    }

    // Markdown Table (| col | col |)
    if (trimmed.includes('|') && i + 1 < lines.length && isTableSeparator(lines[i + 1])) {
      flushList();
      const headers = parseTableRow(trimmed);
      const rows: string[][] = [];
      i += 2;
      while (i < lines.length && lines[i].trim().includes('|')) {
        rows.push(parseTableRow(lines[i]));
        i++;
      }
      i--;
      blocks.push({ type: 'table', headers, rows });
      continue;
    }

    // Heading (# .. ####)
    const headerMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (headerMatch) {
      flushList();
      blocks.push({
        type: 'heading',
        level: headerMatch[1].length,
        content: headerMatch[2]
      });
      continue;
    }

    // Blockquote (> ...)
    const quoteMatch = trimmed.match(/^>\s*(.+)$/);
    if (quoteMatch) {
      flushList();
      blocks.push({
        type: 'blockquote',
        content: quoteMatch[1]
      });
      continue;
    }

    // Unordered List (* ..., - ..., or • ...)
    const ulMatch = rawLine.match(/^(\s*)[\*\-•◦]\s+(.+)$/);
    if (ulMatch) {
      if (!currentList || currentList.type !== 'ul') {
        flushList();
        currentList = { type: 'ul', items: [] };
      }
      currentList.items.push({
        nested: ulMatch[1].length >= 2,
        text: ulMatch[2].trim()
      });
      continue;
    }

    // Ordered List (1. ... or 2. ...)
    const olMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);
    if (olMatch) {
      if (!currentList || currentList.type !== 'ol') {
        flushList();
        currentList = { type: 'ol', items: [] };
      }
      currentList.items.push({ num: olMatch[1], content: olMatch[2] });
      continue;
    }

    // Standard paragraph line
    flushList();
    blocks.push({
      type: 'paragraph',
      content: trimmed
    });
  }

  flushList();
  return blocks;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  className = ''
}) => {
  const blocks = parseBlocks(content);

  return (
    <div className={`space-y-3 text-sm leading-relaxed text-slate-200 ${className}`}>
      {blocks.map((block, idx) => {
        switch (block.type) {
          case 'heading': {
            if (block.level === 1) {
              return (
                <h3
                  key={idx}
                  className="font-warhammer text-base sm:text-lg font-bold text-amber-400 mt-4 first:mt-0 mb-1.5 pb-1.5 border-b border-amber-500/25"
                >
                  {renderInline(block.content)}
                </h3>
              );
            }
            if (block.level === 2) {
              return (
                <h4
                  key={idx}
                  className="font-warhammer text-sm sm:text-base font-bold text-amber-300 mt-4 first:mt-0 pt-2 first:pt-0 border-t border-slate-700/60 first:border-t-0 mb-1"
                >
                  {renderInline(block.content)}
                </h4>
              );
            }
            if (block.level === 3) {
              return (
                <h5
                  key={idx}
                  className="font-warhammer text-sm font-bold text-sky-300 flex items-center gap-1.5 mt-4 first:mt-0 pt-2.5 first:pt-0 border-t border-slate-700/50 first:border-t-0 mb-1"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>{renderInline(block.content)}</span>
                </h5>
              );
            }
            return (
              <h6
                key={idx}
                className="font-semibold text-xs sm:text-sm uppercase tracking-wider text-slate-300 mt-2.5 mb-0.5"
              >
                {renderInline(block.content)}
              </h6>
            );
          }

          case 'hr':
            return <hr key={idx} className="border-slate-700/60 my-3" />;

          case 'table':
            return (
              <div key={idx} className="overflow-x-auto rounded-lg border border-slate-700/70 my-2">
                <table className="w-full text-left text-xs sm:text-sm border-collapse">
                  <thead className="bg-slate-800/80 text-amber-300">
                    <tr>
                      {block.headers.map((h, hIdx) => (
                        <th key={hIdx} className="px-3 py-2 font-semibold border-b border-slate-700">
                          {renderInline(h)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {block.rows.map((row, rIdx) => (
                      <tr key={rIdx} className="bg-slate-900/35">
                        {row.map((cell, cIdx) => (
                          <td key={cIdx} className="px-3 py-2 text-slate-200">
                            {renderInline(cell)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );

          case 'blockquote':
            return (
              <blockquote
                key={idx}
                className="border-l-2 border-amber-500/70 bg-amber-500/10 px-3.5 py-2.5 rounded-r-lg text-amber-200/95 italic my-2 shadow-inner"
              >
                {renderInline(block.content)}
              </blockquote>
            );

          case 'ul':
            return (
              <ul key={idx} className="space-y-2.5 my-2 pl-0.5">
                {block.items.map((item, itemIdx) => (
                  <li
                    key={itemIdx}
                    className={`flex items-start gap-2.5 text-slate-200 ${item.nested ? 'ml-5' : ''}`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0 ${
                        item.nested
                          ? 'bg-sky-400/80'
                          : 'bg-amber-400 shadow-sm shadow-amber-400/50'
                      }`}
                    />
                    <div className="flex-1 leading-relaxed">
                      {renderInline(item.text)}
                    </div>
                  </li>
                ))}
              </ul>
            );

          case 'ol':
            return (
              <ol key={idx} className="space-y-2 my-1.5 pl-0.5">
                {block.items.map((item, itemIdx) => (
                  <li key={itemIdx} className="flex items-start gap-2 text-slate-200">
                    <span className="font-mono text-[10px] font-bold text-amber-400 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 rounded flex-shrink-0 mt-0.5">
                      {item.num}
                    </span>
                    <div className="flex-1 leading-relaxed">
                      {renderInline(item.content)}
                    </div>
                  </li>
                ))}
              </ol>
            );

          case 'paragraph':
          default:
            return (
              <p key={idx} className="leading-relaxed">
                {renderInline(block.content)}
              </p>
            );
        }
      })}
    </div>
  );
};

