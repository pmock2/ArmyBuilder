import React, { useState, useMemo } from 'react';
import { Eye, Check, AlertCircle, Shield, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { SelectedDetachment, Enhancement, SelectedUnit } from '../types/roster';
import { DetachmentModal } from './DetachmentModal';

interface DetachmentSelectorProps {
  availableDetachments: SelectedDetachment[];
  selectedDetachments: SelectedDetachment[];
  allEnhancements?: Enhancement[];
  totalDP: number;
  dpLimit: number;
  subFactionName?: string | null;
  subFactionId?: string | null;
  rosterUnits?: SelectedUnit[];
  onToggleDetachment: (detachment: SelectedDetachment) => void;
}

interface SpecialDetachmentInfo {
  isSpecial: boolean;
  badgeLabel: string;
  tooltip: string;
  synergyActive?: boolean;
}

// Evaluates if a detachment was specially unlocked because of the army setup (sub-faction, chapter, or units)
const checkSpecialDetachment = (
  det: SelectedDetachment,
  subFactionName?: string | null,
  rosterUnits?: SelectedUnit[]
): SpecialDetachmentInfo => {
  // Check if any unit in the roster matches synergy requirements (e.g., Vulkan He'stan in army)
  let hasUnitSynergy = false;
  let synergyUnitName = '';
  if (det.constraints?.synergies && det.constraints.synergies.length > 0 && rosterUnits && rosterUnits.length > 0) {
    for (const syn of det.constraints.synergies) {
      if (syn.requiredUnit) {
        const cleanReq = syn.requiredUnit.toLowerCase().replace(/['’\-_]/g, '');
        const matched = rosterUnits.find(u => {
          const cleanU = u.name.toLowerCase().replace(/['’\-_]/g, '');
          return cleanU.includes(cleanReq) || cleanReq.includes(cleanU);
        });
        if (matched) {
          hasUnitSynergy = true;
          synergyUnitName = syn.requiredUnit;
          break;
        }
      }
    }
  }

  // 1. Unlocked specifically by catalogue gating (e.g., requiredPrimaryCatalogue)
  if (det.constraints?.requiredPrimaryCatalogue) {
    const label = subFactionName ? `${subFactionName} Unlocked` : 'Army Setup Unlocked';
    return {
      isSpecial: true,
      badgeLabel: label,
      tooltip: subFactionName
        ? `Special detachment unlocked by selecting ${subFactionName} in your army setup.`
        : 'Special detachment unlocked by your army catalogue selection.',
      synergyActive: hasUnitSynergy
    };
  }

  // 2. Sub-faction / Chapter match in detachment name or rules
  if (subFactionName) {
    const sName = subFactionName.toLowerCase();
    const nameMatch = det.name.toLowerCase().includes(sName);
    const ruleMatch = det.rules?.some(r =>
      r.name.toLowerCase().includes(sName) || r.description.toLowerCase().includes(sName)
    );
    if (nameMatch || ruleMatch) {
      return {
        isSpecial: true,
        badgeLabel: `${subFactionName} Detachment`,
        tooltip: `Special detachment exclusive to ${subFactionName} armies.`,
        synergyActive: hasUnitSynergy
      };
    }
  }

  // 3. Chapter exclusivity restriction
  if (det.constraints?.exclusiveChapters && subFactionName) {
    return {
      isSpecial: true,
      badgeLabel: `${subFactionName} Exclusive`,
      tooltip: `Exclusive detachment for ${subFactionName}.`,
      synergyActive: hasUnitSynergy
    };
  }

  // 4. Unit synergy with units currently in the army
  if (hasUnitSynergy) {
    return {
      isSpecial: true,
      badgeLabel: 'Unit Synergy',
      tooltip: `Direct detachment synergy with ${synergyUnitName} in your army.`,
      synergyActive: true
    };
  }

  return {
    isSpecial: false,
    badgeLabel: '',
    tooltip: ''
  };
};

export const DetachmentSelector: React.FC<DetachmentSelectorProps> = ({
  availableDetachments,
  selectedDetachments,
  allEnhancements = [],
  totalDP,
  dpLimit,
  subFactionName,
  subFactionId,
  rosterUnits = [],
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

  // Sort detachments: SPECIAL UNLOCKED DETACHMENTS PUSHED TO THE TOP!
  const sortedDetachments = useMemo(() => {
    return [...availableDetachments].sort((a, b) => {
      const aSpecial = checkSpecialDetachment(a, subFactionName, rosterUnits).isSpecial;
      const bSpecial = checkSpecialDetachment(b, subFactionName, rosterUnits).isSpecial;

      // 1. Special unlocked detachments pushed to the top
      if (aSpecial && !bSpecial) return -1;
      if (!aSpecial && bSpecial) return 1;

      // 2. Selected detachments prioritized within their tier
      const aSelected = selectedDetachments.some(d => d.name === a.name);
      const bSelected = selectedDetachments.some(d => d.name === b.name);
      if (aSelected && !bSelected) return -1;
      if (!aSelected && bSelected) return 1;

      // 3. Alphabetical order
      return a.name.localeCompare(b.name);
    });
  }, [availableDetachments, selectedDetachments, subFactionName, rosterUnits]);

  // Count how many special detachments are available
  const specialCount = useMemo(() => {
    return availableDetachments.filter(d => checkSpecialDetachment(d, subFactionName, rosterUnits).isSpecial).length;
  }, [availableDetachments, subFactionName, rosterUnits]);

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

              {/* Special Detachment Unlocked Indicator Pill in Header */}
              {specialCount > 0 && (
                <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-300">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                  <span>
                    {specialCount} Army-Unlocked Detachment{specialCount > 1 ? 's' : ''}
                  </span>
                </span>
              )}

              {/* Selected Detachments Preview Badges */}
              {selectedDetachments.length > 0 ? (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {selectedDetachments.map((d) => {
                    const isSpecial = checkSpecialDetachment(d, subFactionName, rosterUnits).isSpecial;
                    return (
                      <span
                        key={d.id || d.name}
                        className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-md border ${
                          isSpecial
                            ? 'bg-amber-900/90 border-amber-400 text-amber-100 shadow-sm'
                            : 'bg-amber-950/80 border-amber-500/60 text-amber-200'
                        }`}
                      >
                        {isSpecial && <Sparkles className="w-3 h-3 text-amber-400" />}
                        <span className="truncate max-w-[140px] sm:max-w-none">{d.name}</span>
                        <span className="font-mono text-[10px] text-amber-400 font-bold">
                          ({d.dpCost} DP)
                        </span>
                      </span>
                    );
                  })}
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
          <div className="flex items-center justify-between text-[11px] text-grimdark-400 mb-2.5 px-1">
            <span>
              Choose detachments within your {dpLimit} DP budget. Special unlocked detachments are highlighted at the top. Click 👁 to inspect rules.
            </span>
            <span className="font-mono text-grimdark-500 hidden sm:inline">
              {sortedDetachments.length} Available
            </span>
          </div>

          {sortedDetachments.length === 0 ? (
            <div className="text-center py-6 text-xs text-grimdark-500 italic">
              No detachments found for this faction.
            </div>
          ) : (
            <div className="space-y-1.5">
              {sortedDetachments.map((det) => {
                const isSelected = selectedDetachments.some((d) => d.name === det.name);
                const conflict = getDetachmentConflict(det);
                const specialInfo = checkSpecialDetachment(det, subFactionName, rosterUnits);

                return (
                  <div
                    key={det.id || det.name}
                    className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border transition-all text-xs sm:text-sm ${
                      isSelected
                        ? specialInfo.isSpecial
                          ? 'bg-gradient-to-r from-amber-950/70 via-amber-900/50 to-amber-950/70 border-amber-400 text-amber-100 shadow-md ring-1 ring-amber-400/60'
                          : 'bg-amber-950/40 border-amber-500/80 text-amber-100 shadow-sm ring-1 ring-amber-500/30'
                        : conflict
                        ? 'bg-grimdark-950/40 border-grimdark-850 text-grimdark-500 opacity-60'
                        : specialInfo.isSpecial
                        ? 'bg-gradient-to-r from-amber-950/35 via-grimdark-900 to-amber-950/20 border-amber-500/70 hover:border-amber-400 text-grimdark-100 shadow-sm'
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
                            : specialInfo.isSpecial
                            ? 'bg-grimdark-900 border-amber-500/60 hover:border-amber-400 text-transparent'
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
                          {/* Special Sparkles Icon */}
                          {specialInfo.isSpecial && (
                            <Sparkles className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 animate-pulse" />
                          )}

                          <span
                            onClick={() => {
                              if (!conflict || isSelected) onToggleDetachment(det);
                            }}
                            className={`font-semibold cursor-pointer select-none hover:underline truncate ${
                              isSelected
                                ? 'text-amber-200 font-bold'
                                : specialInfo.isSpecial
                                ? 'text-amber-300 font-bold'
                                : conflict
                                ? 'text-grimdark-500 cursor-not-allowed no-underline'
                                : 'text-grimdark-200'
                            }`}
                          >
                            {det.name}
                          </span>

                          {/* Highlight Badge for Special Unlocked Detachments */}
                          {specialInfo.isSpecial && (
                            <span
                              className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40"
                              title={specialInfo.tooltip}
                            >
                              <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                              <span>{specialInfo.badgeLabel}</span>
                            </span>
                          )}

                          {/* Synergy Active Pill */}
                          {specialInfo.synergyActive && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-500/50">
                              <span>⚡ Synergy Active</span>
                            </span>
                          )}

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
                            : specialInfo.isSpecial
                            ? 'bg-amber-950/60 border-amber-500/40 text-amber-300'
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
                            : specialInfo.isSpecial
                            ? 'bg-amber-950 hover:bg-amber-900/60 text-amber-200 border border-amber-500/50 hover:border-amber-400'
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
