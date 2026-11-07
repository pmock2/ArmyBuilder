import React, { useState } from 'react';
import keywordsData from '../data/keywords.json';

interface KeywordTooltipProps {
  keyword: string;
  children?: React.ReactNode;
  className?: string;
}

export const KeywordTooltip: React.FC<KeywordTooltipProps> = ({ keyword, children, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false);

  // Normalize keyword search
  const cleanKey = keyword.trim().replace(/^\[|\]$/g, '').toUpperCase();
  const entry = keywordsData.allKeywordsList.find(k => {
    const norm = k.name.trim().replace(/^\[|\]$/g, '').toUpperCase();
    return norm === cleanKey || norm.startsWith(cleanKey);
  });

  return (
    <span className="relative inline-block">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        className={`underline decoration-dotted decoration-amber-500/60 hover:text-amber-400 hover:decoration-solid cursor-help transition-colors ${className}`}
        title="Click to view rule description"
      >
        {children || keyword}
      </button>

      {isOpen && entry && (
        <div 
          className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 p-3 bg-grimdark-900 border border-amber-600/50 rounded-lg shadow-2xl text-left pointer-events-none backdrop-blur-md"
          style={{ minWidth: '240px' }}
        >
          <div className="flex items-center justify-between border-b border-grimdark-700 pb-1 mb-1.5">
            <span className="font-warhammer text-xs font-bold text-amber-400 tracking-wider">
              {entry.name}
            </span>
            {entry.ruleRef && (
              <span className="text-[10px] text-grimdark-400 font-mono">
                Sec {entry.ruleRef}
              </span>
            )}
          </div>
          <p className="text-xs text-amber-200/90 font-medium mb-1">
            {entry.summary}
          </p>
          <p className="text-[11px] text-grimdark-300 leading-relaxed max-h-40 overflow-y-auto">
            {entry.description}
          </p>
          <div className="mt-1.5 pt-1 border-t border-grimdark-800 flex justify-between items-center text-[10px] text-grimdark-400">
            <span>{entry.category}</span>
            <span className="text-amber-500/80">11th Edition Core</span>
          </div>
        </div>
      )}
    </span>
  );
};
