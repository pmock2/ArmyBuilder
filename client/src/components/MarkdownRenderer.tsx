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
  | { type: 'blockquote'; content: string }
  | { type: 'ul'; items: string[] }
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

function parseBlocks(markdown: string): Block[] {
  const lines = markdown.split('\n');
  const blocks: Block[] = [];
  let currentList: { type: 'ul'; items: string[] } | { type: 'ol'; items: { num: string; content: string }[] } | null = null;

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

    // Unordered List (* ... or - ...)
    const ulMatch = trimmed.match(/^[\*\-]\s+(.+)$/);
    if (ulMatch) {
      if (!currentList || currentList.type !== 'ul') {
        flushList();
        currentList = { type: 'ul', items: [] };
      }
      currentList.items.push(ulMatch[1]);
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
    <div className={`space-y-2.5 text-xs sm:text-sm leading-relaxed text-slate-200 ${className}`}>
      {blocks.map((block, idx) => {
        switch (block.type) {
          case 'heading': {
            if (block.level === 1) {
              return (
                <h3
                  key={idx}
                  className="font-warhammer text-base font-bold text-amber-400 mt-3 mb-1 pb-1 border-b border-amber-500/20"
                >
                  {renderInline(block.content)}
                </h3>
              );
            }
            if (block.level === 2) {
              return (
                <h4
                  key={idx}
                  className="font-warhammer text-sm font-bold text-amber-300 mt-2.5 mb-1"
                >
                  {renderInline(block.content)}
                </h4>
              );
            }
            return (
              <h5
                key={idx}
                className="font-semibold text-xs sm:text-sm text-slate-100 flex items-center gap-1.5 mt-2 mb-0.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>{renderInline(block.content)}</span>
              </h5>
            );
          }

          case 'blockquote':
            return (
              <blockquote
                key={idx}
                className="border-l-2 border-amber-500/70 bg-amber-500/10 px-3 py-2 rounded-r-lg text-amber-200/95 italic my-2 shadow-inner"
              >
                {renderInline(block.content)}
              </blockquote>
            );

          case 'ul':
            return (
              <ul key={idx} className="space-y-2 my-1.5 pl-0.5">
                {block.items.map((item, itemIdx) => (
                  <li key={itemIdx} className="flex items-start gap-2.5 text-slate-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 flex-shrink-0 shadow-sm shadow-amber-400/50" />
                    <div className="flex-1 leading-relaxed">
                      {renderInline(item)}
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

