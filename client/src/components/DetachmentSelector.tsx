import React, { useState } from 'react';
import { Eye, Check, AlertCircle, Shield, ChevronDown, ChevronUp } from 'lucide-react';
import { SelectedDetachment, Enhancement } from '../types/roster';
import { DetachmentModal } from './DetachmentModal';

interface DetachmentSelectorProps {
  availableDetachments: SelectedDetachment[];
  selectedDetachments: SelectedDetachment[];
  allEnhancements?: Enhancement[];
  totalDP: number;
  dpLimit: number;
  onToggleDetachment: (detachment: SelectedDetachment) => void;
}

export const DetachmentSelector: React.FC<DetachmentSelectorProps> = ({
  availableDetachments,
  selectedDetachments,
  allEnhancements = [],
  totalDP,
  dpLimit,
  onToggleDetachment
}) => {
  // Collapsed by default as requested
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeModalDetachment, setActiveModalDetachment] = useState<SelectedDetachment | null>(null);

  // Check if a detachment is conflicted with already selected detachments
  const getDetachmentConflict = (det: SelectedDetachment): string | null => {
    const isAlreadySelected = selectedDetachments.some(d => d.name === det.name);
    if (isAlreadySelected) return null;

    // Tag conflict check (e.g. ARMIGERS)
    const exclusiveTags = det.constraints?.exclusiveTags || [];
    const myTags = det.tags || [];

    for (const selected of selectedDetachments) {
      const selectedExclusiveTags = selected.constraints?.exclusiveTags || [];
      const selectedTags = selected.tags || [];

      // If either has an exclusive tag that matches any tag on the other
      for (const tag of myTags) {
        if (selectedExclusiveTags.includes(tag.toUpperCase())) {
          return `Conflicts with '${selected.name}' (shared exclusive tag: ${tag})`;
        }
      }
      for (const tag of selectedTags) {
        if (exclusiveTags.includes(tag.toUpperCase())) {
          return `Conflicts with '${selected.name}' (shared exclusive tag: ${tag})`;
        }
      }
    }

    return null;
  };

  return (
    <section className="bg-grimdark-900 border border-grimdark-800 rounded-2xl mb-6 shadow-xl overflow-hidden transition-all">
      {/* Compact Collapsed / Summary Header (Always Visible) */}
      <div
        className="flex items-center justify-between cursor-pointer select-none px-4 py-3 sm:px-5 sm:py-3.5 hover:bg-grimdark-850/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
              selectedDetachments.length > 0
                ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                : 'bg-grimdark-800 text-grimdark-400 border border-grimdark-700'
            }`}
          >
            <Shield className="w-4 h-4" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-warhammer text-sm sm:text-base font-bold text-amber-300">
                Detachments
              </h2>

              {/* Selected Detachments Preview Badges */}
              {selectedDetachments.length > 0 ? (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {selectedDetachments.map((d) => (
                    <span
                      key={d.id || d.name}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-md bg-amber-950/80 border border-amber-500/60 text-amber-200"
                    >
                      <span className="truncate max-w-[140px] sm:max-w-none">{d.name}</span>
                      <span className="font-mono text-[10px] text-amber-400 font-bold">
                        ({d.dpCost} DP)
                      </span>
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-xs text-grimdark-400 italic">
                  No detachment selected
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: DP Allocation & Expand/Collapse Toggle */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {/* DP Allocation Counter */}
          <div className="flex items-center gap-1.5 bg-grimdark-950 px-2.5 py-1 rounded-lg border border-grimdark-800 text-xs font-mono">
            <span className="text-grimdark-400">DP:</span>
            <span className={`font-bold ${totalDP > dpLimit ? 'text-red-400' : 'text-amber-400'}`}>
              {totalDP}
            </span>
            <span className="text-grimdark-600">/</span>
            <span className="text-grimdark-300">{dpLimit} DP</span>
          </div>

          {/* Toggle Button */}
          <button
            type="button"
            className="p-1.5 px-2.5 rounded-lg bg-grimdark-800 hover:bg-grimdark-700 text-grimdark-300 hover:text-amber-300 border border-grimdark-700 transition-colors flex items-center gap-1.5 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            aria-expanded={isExpanded}
            title={isExpanded ? 'Collapse detachment list' : 'Expand detachment list'}
          >
            <span className="text-[11px] font-medium hidden sm:inline">
              {isExpanded ? 'Collapse' : 'Select'}
            </span>
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-amber-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-amber-400" />
            )}
          </button>
        </div>
      </div>

      {/* Expanded Detachment Simple List */}
      {isExpanded && (
        <div className="border-t border-grimdark-800 p-3 sm:p-4 bg-grimdark-950/50">
          <div className="flex items-center justify-between text-[11px] text-grimdark-400 mb-2 px-1">
            <span>
              Choose detachments within your {dpLimit} DP budget. Click the 👁 icon to inspect detachment rules.
            </span>
            <span className="font-mono text-grimdark-500 hidden sm:inline">
              {availableDetachments.length} Available
            </span>
          </div>

          {availableDetachments.length === 0 ? (
            <div className="text-center py-6 text-xs text-grimdark-500 italic">
              No detachments found for this faction.
            </div>
          ) : (
            <div className="space-y-1.5">
              {availableDetachments.map((det) => {
                const isSelected = selectedDetachments.some((d) => d.name === det.name);
                const conflict = getDetachmentConflict(det);

                return (
                  <div
                    key={det.id || det.name}
                    className={`flex items-center justify-between gap-3 px-3 py-2 rounded-xl border transition-all text-xs sm:text-sm ${
                      isSelected
                        ? 'bg-amber-950/40 border-amber-500/80 text-amber-100 shadow-sm ring-1 ring-amber-500/30'
                        : conflict
                        ? 'bg-grimdark-950/40 border-grimdark-850 text-grimdark-500 opacity-60'
                        : 'bg-grimdark-950 hover:bg-grimdark-850 border-grimdark-800 text-grimdark-200'
                    }`}
                  >
                    {/* Left: Indicator & Detachment Name & Info */}
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <button
                        type="button"
                        disabled={!!conflict && !isSelected}
                        onClick={() => onToggleDetachment(det)}
                        className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-colors border ${
                          isSelected
                            ? 'bg-amber-500 border-amber-400 text-black'
                            : conflict
                            ? 'bg-grimdark-900 border-grimdark-800 text-transparent cursor-not-allowed'
                            : 'bg-grimdark-900 border-grimdark-700 hover:border-amber-500/60 text-transparent'
                        }`}
                        title={isSelected ? 'Deselect detachment' : 'Select detachment'}
                      >
                        <Check
                          className={`w-3.5 h-3.5 stroke-[3] ${isSelected ? 'block' : 'hidden'}`}
                        />
                      </button>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            onClick={() => {
                              if (!conflict || isSelected) onToggleDetachment(det);
                            }}
                            className={`font-semibold cursor-pointer select-none hover:underline truncate ${
                              isSelected
                                ? 'text-amber-200 font-bold'
                                : conflict
                                ? 'text-grimdark-500 cursor-not-allowed no-underline'
                                : 'text-grimdark-200'
                            }`}
                          >
                            {det.name}
                          </span>

                          {/* Tags preview */}
                          {det.tags && det.tags.length > 0 && (
                            <div className="flex items-center gap-1">
                              {det.tags.slice(0, 2).map((tag) => (
                                <span
                                  key={tag}
                                  className="text-[9px] px-1.5 py-0.2 rounded bg-grimdark-900 text-grimdark-400 border border-grimdark-800 uppercase"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Conflict notice if any */}
                        {conflict && (
                          <div className="flex items-center gap-1 text-[10px] text-amber-400/90 mt-0.5">
                            <AlertCircle className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{conflict}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: DP Cost & Eyeball & Action Button */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* DP Cost Badge */}
                      <span
                        className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded border ${
                          isSelected
                            ? 'bg-amber-900/60 border-amber-500/60 text-amber-300'
                            : 'bg-grimdark-900 border-grimdark-800 text-grimdark-400'
                        }`}
                      >
                        {det.dpCost} DP
                      </span>

                      {/* Eyeball Inspector Button */}
                      <button
                        type="button"
                        onClick={() => setActiveModalDetachment(det)}
                        className="p-1.5 rounded-lg bg-grimdark-900 hover:bg-grimdark-800 text-grimdark-400 hover:text-amber-300 border border-grimdark-800 hover:border-amber-500/30 transition-colors"
                        title={`View rules and description for ${det.name}`}
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {/* Selection Action Button */}
                      <button
                        type="button"
                        disabled={!!conflict && !isSelected}
                        onClick={() => onToggleDetachment(det)}
                        className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors ${
                          isSelected
                            ? 'bg-amber-600 hover:bg-amber-500 text-black font-bold shadow'
                            : conflict
                            ? 'bg-grimdark-900 text-grimdark-600 border border-grimdark-850 cursor-not-allowed'
                            : 'bg-grimdark-900 hover:bg-grimdark-800 text-grimdark-300 hover:text-white border border-grimdark-700'
                        }`}
                      >
                        {isSelected ? 'Active' : 'Select'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Detachment Description Modal */}
      <DetachmentModal
        detachment={activeModalDetachment}
        allEnhancements={allEnhancements}
        isOpen={!!activeModalDetachment}
        onClose={() => setActiveModalDetachment(null)}
        isSelected={
          activeModalDetachment
            ? selectedDetachments.some((d) => d.name === activeModalDetachment.name)
            : false
        }
        onSelect={
          activeModalDetachment
            ? () => onToggleDetachment(activeModalDetachment)
            : undefined
        }
      />
    </section>
  );
};
