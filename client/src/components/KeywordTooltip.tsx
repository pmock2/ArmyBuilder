import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, BookOpen, Shield, Sparkles } from 'lucide-react';
import { FormattedText } from './FormattedText';
import { useBackNavigation } from '../utils/backNavigation';
import keywordsData from '../data/keywords.json';

interface KeywordTooltipProps {
  keyword: string;
  children?: React.ReactNode;
  className?: string;
}

export const KeywordTooltip: React.FC<KeywordTooltipProps> = ({ keyword, children, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);

  useBackNavigation(isOpen, () => setIsOpen(false));

  // Close popup on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Robust keyword lookup:
  // Handles plain keywords, bracketed [KEYWORD], and parameterized forms (e.g. "Rapid Fire 1", "Anti-Infantry 4+", "Melta 2")
  const cleanKey = keyword.trim().replace(/^\[|\]$/g, '').toUpperCase();
  const baseKey = cleanKey
    .replace(/\s+([0-9+D-]+|X\+?)$/, '')
    .replace(/-(INFANTRY|VEHICLE|MONSTER|MOUNTED|TITANIC|FLY|CHARACTER).*$/, '');

  const entry = keywordsData.allKeywordsList.find(k => {
    const norm = k.name.trim().replace(/^\[|\]$/g, '').toUpperCase();
    const strippedNorm = norm.replace(/^(FACTION|MODEL|UNIT):\s*/, '');
    return (
      norm === cleanKey ||
      norm === baseKey ||
      strippedNorm === cleanKey ||
      strippedNorm === baseKey ||
      norm.startsWith(baseKey) ||
      cleanKey.startsWith(norm) ||
      norm.endsWith(cleanKey)
    );
  });

  return (
    <>
      {/* Clickable Trigger Button (No hover tooltip) */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(true);
        }}
        className={`cursor-pointer inline-flex items-center text-left hover:text-sky-200 transition-colors active:scale-95 ${className}`}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
      >
        <span>{children || keyword}</span>
      </button>

      {/* Pop-up Dialog via Portal (Never clipped by table overflow or modal containers) */}
      {isOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150"
            onClick={() => setIsOpen(false)}
          >
            <div
              role="dialog"
              aria-modal="true"
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden p-5 sm:p-6 text-left animate-in zoom-in-95 duration-150 space-y-4 ring-1 ring-slate-700/50"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-md bg-sky-950/80 text-sky-300 border border-sky-700/50 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-sky-400" />
                      <span>{entry ? entry.category : 'Keyword Reference'}</span>
                    </span>

                    {entry?.ruleRef && (
                      <span className="text-xs font-mono font-semibold text-slate-300 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                        Rule {entry.ruleRef}
                      </span>
                    )}
                  </div>

                  <h3 className="font-warhammer text-lg sm:text-xl font-bold text-slate-100 tracking-wide">
                    {entry ? entry.name : keyword}
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="min-w-[40px] min-h-[40px] rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center transition-colors active:scale-95"
                  aria-label="Close rule reference"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Summary Box */}
              {entry?.summary ? (
                <div className="p-3.5 rounded-xl bg-sky-950/30 border border-sky-700/40 text-sky-200 text-xs sm:text-sm font-medium leading-relaxed">
                  {entry.summary}
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 text-xs sm:text-sm font-medium leading-relaxed">
                  Official rule definition and keyword interaction for <strong>{keyword}</strong>.
                </div>
              )}

              {/* Full Rule Text */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
                  <BookOpen className="w-3.5 h-3.5 text-sky-400" />
                  <span>Rule Description</span>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 max-h-56 overflow-y-auto text-xs sm:text-sm text-slate-300 leading-relaxed font-sans scrollbar-thin scrollbar-thumb-slate-700">
                  <FormattedText
                    text={
                      entry?.description ||
                      `Units and weapons with the ${keyword} keyword follow all relevant rules for targeting, detachment synergies, and abilities as outlined in the Warhammer 40,000 11th Edition Core Rules.`
                    }
                    disableTooltips={true}
                    className="text-xs sm:text-sm text-slate-300 leading-relaxed font-sans"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-sky-400" />
                  <span className="font-mono text-slate-400">Warhammer 40k 11th Edition</span>
                </div>

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="min-h-[42px] px-6 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs sm:text-sm tracking-wide transition-all active:scale-95 shadow-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
