import React, { useState } from 'react';
import { Eye, Check, AlertCircle, Shield } from 'lucide-react';
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
  const [activeModalDetachment, setActiveModalDetachment] = useState<SelectedDetachment | null>(null);

  // Check if a detachment is conflicted with already selected detachments
  const getDetachmentConflict = (det: SelectedDetachment): string | null => {
    const isAlreadySelected = selectedDetachments.some(d => d.name === det.name);
    if (isAlreadySelected) return null;

    // 1. Tag conflict check (e.g. ARMIGERS)
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
    <section className="bg-grimdark-900 border border-grimdark-800 rounded-2xl p-5 mb-6 shadow-xl">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-grimdark-800">
        <div>
          <h2 className="font-warhammer text-base sm:text-lg font-bold text-amber-300 flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-500" />
            <span>Detachment Selection</span>
          </h2>
          <p className="text-xs text-grimdark-400 mt-0.5">
            Spend Detachment Points (DP) to unlock force rules, enhancements, and stratagems.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-grimdark-950 px-3 py-1.5 rounded-lg border border-grimdark-800 text-xs font-mono">
          <span className="text-grimdark-400">DP Spent:</span>
          <span className={`font-bold ${totalDP > dpLimit ? 'text-red-400' : 'text-amber-400'}`}>
            {totalDP}
          </span>
          <span className="text-grimdark-600">/</span>
          <span className="text-grimdark-300">{dpLimit} DP</span>
        </div>
      </div>

      {availableDetachments.length === 0 ? (
        <div className="text-center py-6 text-xs text-grimdark-500 italic">
          No detachments found for this faction.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {availableDetachments.map((det) => {
            const isSelected = selectedDetachments.some(d => d.name === det.name);
            const conflict = getDetachmentConflict(det);

            return (
              <div
                key={det.id || det.name}
                className={`relative p-3.5 rounded-xl border transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'bg-amber-950/40 border-amber-500/80 shadow-md ring-1 ring-amber-500/30'
                    : conflict
                    ? 'bg-grimdark-950/40 border-grimdark-800 opacity-60 cursor-not-allowed'
                    : 'bg-grimdark-950 hover:bg-grimdark-850 border-grimdark-800 hover:border-grimdark-700'
                }`}
              >
                <div>
                  {/* Top Bar: DP Badge & Eyeball Inspector */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded bg-grimdark-900 border border-amber-600/30 text-amber-400">
                      {det.dpCost} DP
                    </span>

                    <button
                      type="button"
                      onClick={() => setActiveModalDetachment(det)}
                      className="p-1 rounded hover:bg-grimdark-700 text-grimdark-400 hover:text-amber-300 transition-colors"
                      title="View detachment rules & description"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Detachment Name */}
                  <h3 className="font-warhammer text-xs font-bold text-amber-200 mb-1.5 truncate" title={det.name}>
                    {det.name}
                  </h3>

                  {/* Tags */}
                  {det.tags && det.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-2">
                      {det.tags.slice(0, 3).map((tag) => (
                        <span
                          key={tag}
                          className="text-[9px] px-1.5 py-0.2 rounded bg-grimdark-900 text-grimdark-400 border border-grimdark-800"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Conflict Notice if blocked */}
                  {conflict && (
                    <div className="flex items-center gap-1 text-[10px] text-amber-400/90 bg-amber-950/30 p-1.5 rounded border border-amber-800/40 mb-2">
                      <AlertCircle className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate" title={conflict}>{conflict}</span>
                    </div>
                  )}
                </div>

                {/* Selection Action Button */}
                <button
                  type="button"
                  disabled={!!conflict && !isSelected}
                  onClick={() => onToggleDetachment(det)}
                  className={`w-full py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all mt-2 ${
                    isSelected
                      ? 'bg-amber-600 hover:bg-amber-500 text-black shadow'
                      : conflict
                      ? 'bg-grimdark-800 text-grimdark-500 cursor-not-allowed'
                      : 'bg-grimdark-800 hover:bg-grimdark-700 text-grimdark-200 border border-grimdark-700'
                  }`}
                >
                  {isSelected ? (
                    <>
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      <span>Active</span>
                    </>
                  ) : (
                    <span>Select Detachment</span>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Detachment Description Modal */}
      <DetachmentModal
        detachment={activeModalDetachment}
        allEnhancements={allEnhancements}
        isOpen={!!activeModalDetachment}
        onClose={() => setActiveModalDetachment(null)}
        isSelected={activeModalDetachment ? selectedDetachments.some(d => d.name === activeModalDetachment.name) : false}
        onSelect={activeModalDetachment ? () => onToggleDetachment(activeModalDetachment) : undefined}
      />
    </section>
  );
};
