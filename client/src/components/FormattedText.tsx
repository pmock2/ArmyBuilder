import React from 'react';
import { KeywordTooltip } from './KeywordTooltip';

interface FormattedTextProps {
  text: string;
  className?: string;
  disableTooltips?: boolean;
}

// Token matching regex:
// 1. Bracketed keywords: [Melta], [Torrent], [SUSTAINED HITS 2]
// 2. Wahapedia/BSData keyword syntax: ^^**Keyword**^^, **^^Keyword^^**, ^^Keyword^^
// 3. Bold text: **bold**
// 4. Italic text: *italic*
const TOKEN_REGEX = /(\[[^\]\n]+\])|(\^\^\*\*[^*]+?\*\*\^\^|\*\*\^\^[^^]+?\^\^\*\*|\^\^[^^]+?\^\^)|(\*\*[^*]+?\*\*)|(\*[^*]+?\*)/g;

export const FormattedText: React.FC<FormattedTextProps> = ({ text, className = '', disableTooltips = false }) => {
  if (!text) return null;

  const parseInlineTokens = (line: string, lineKeyPrefix: string | number): React.ReactNode[] => {
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    const elements: React.ReactNode[] = [];
    let tokenIndex = 0;

    // Reset regex index for safety
    TOKEN_REGEX.lastIndex = 0;

    while ((match = TOKEN_REGEX.exec(line)) !== null) {
      // Plain text before token
      if (match.index > lastIndex) {
        elements.push(line.slice(lastIndex, match.index));
      }

      const matchIdx = tokenIndex++;

      if (match[1]) {
        // [Keyword]
        const raw = match[1];
        const kw = raw.slice(1, -1).trim();
        if (disableTooltips) {
          elements.push(
            <span
              key={`${lineKeyPrefix}-kw-${matchIdx}`}
              className="inline-flex items-center font-mono text-[0.88em] font-semibold text-sky-300 bg-slate-800/90 border border-sky-700/50 rounded px-1.5 py-0.5 mx-0.5 align-baseline"
            >
              [{kw}]
            </span>
          );
        } else {
          elements.push(
            <KeywordTooltip
              key={`${lineKeyPrefix}-kw-${matchIdx}`}
              keyword={kw}
              className="inline-flex items-center font-mono text-[0.88em] font-semibold text-sky-300 hover:text-sky-200 bg-slate-800/90 hover:bg-slate-750 border border-sky-700/50 hover:border-sky-500 rounded px-1.5 py-0.5 mx-0.5 transition-colors align-baseline"
            >
              [{kw}]
            </KeywordTooltip>
          );
        }
      } else if (match[2]) {
        // Wahapedia keyword: ^^**Adeptus Astartes**^^ or **^^Monster/Vehicle^^**
        const raw = match[2];
        const clean = raw.replace(/^\s*(\*\*|\^\^)+|(\*\*|\^\^)+\s*$/g, '').trim();

        // Handle slash-separated lists like Monster/Vehicle/Fortification
        if (clean.includes('/')) {
          const parts = clean.split('/');
          elements.push(
            <span key={`${lineKeyPrefix}-fkw-group-${matchIdx}`} className="inline-flex items-center gap-0.5 mx-0.5 align-baseline">
              {parts.map((p, pIdx) => {
                const partTrimmed = p.trim();
                return (
                  <React.Fragment key={pIdx}>
                    {pIdx > 0 && <span className="text-slate-500 font-normal">/</span>}
                    {disableTooltips ? (
                      <span className="inline-flex items-center font-semibold text-slate-100 uppercase tracking-wider text-[0.84em] bg-slate-800/90 px-1.5 py-0.5 rounded border border-slate-700 align-baseline">
                        {partTrimmed}
                      </span>
                    ) : (
                      <KeywordTooltip
                        keyword={partTrimmed}
                        className="inline-flex items-center font-semibold text-slate-100 hover:text-sky-200 uppercase tracking-wider text-[0.84em] bg-slate-800/90 hover:bg-slate-750 px-1.5 py-0.5 rounded border border-slate-700 hover:border-sky-600/60 transition-colors align-baseline"
                      >
                        {partTrimmed}
                      </KeywordTooltip>
                    )}
                  </React.Fragment>
                );
              })}
            </span>
          );
        } else {
          if (disableTooltips) {
            elements.push(
              <span
                key={`${lineKeyPrefix}-fkw-${matchIdx}`}
                className="inline-flex items-center font-semibold text-slate-100 uppercase tracking-wider text-[0.84em] bg-slate-800/90 px-1.5 py-0.5 rounded border border-slate-700 mx-0.5 align-baseline"
              >
                {clean}
              </span>
            );
          } else {
            elements.push(
              <KeywordTooltip
                key={`${lineKeyPrefix}-fkw-${matchIdx}`}
                keyword={clean}
                className="inline-flex items-center font-semibold text-slate-100 hover:text-sky-200 uppercase tracking-wider text-[0.84em] bg-slate-800/90 hover:bg-slate-750 px-1.5 py-0.5 rounded border border-slate-700 hover:border-sky-600/60 mx-0.5 transition-colors align-baseline"
              >
                {clean}
              </KeywordTooltip>
            );
          }
        }
      } else if (match[3]) {
        // **bold**
        const raw = match[3];
        const content = raw.slice(2, -2);
        elements.push(
          <strong key={`${lineKeyPrefix}-b-${matchIdx}`} className="font-bold text-slate-100">
            {content}
          </strong>
        );
      } else if (match[4]) {
        // *italic*
        const raw = match[4];
        const content = raw.slice(1, -1);
        elements.push(
          <em key={`${lineKeyPrefix}-i-${matchIdx}`} className="italic text-slate-200">
            {content}
          </em>
        );
      }

      lastIndex = TOKEN_REGEX.lastIndex;
    }

    if (lastIndex < line.length) {
      elements.push(line.slice(lastIndex));
    }

    return elements;
  };

  const lines = text.split('\n');

  return (
    <div className={`space-y-1.5 ${className}`}>
      {lines.map((line, lIdx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={lIdx} className="h-1.5" />;
        }

        const isBullet = /^[■•\-\*]\s+/.test(trimmed);
        const content = isBullet ? trimmed.replace(/^[■•\-\*]\s+/, '') : line;

        if (isBullet) {
          return (
            <div key={lIdx} className="flex items-start gap-2 pl-2 my-1">
              <span className="text-sky-400 font-bold select-none leading-relaxed">•</span>
              <div className="flex-1 leading-relaxed">
                {parseInlineTokens(content, lIdx)}
              </div>
            </div>
          );
        }

        return (
          <div key={lIdx} className="leading-relaxed">
            {parseInlineTokens(content, lIdx)}
          </div>
        );
      })}
    </div>
  );
};
