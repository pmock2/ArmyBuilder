import React, { useState, useMemo } from 'react';
import { X, Search, Plus, Eye, Check, AlertCircle, Sparkles } from 'lucide-react';
import { SelectedDetachment, Enhancement, SelectedUnit } from '../types/roster';
import { DetachmentModal } from './DetachmentModal';

interface DetachmentBrowserModalProps {
  isOpen: boolean;
  onClose: () => void;
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

const checkSpecialDetachment = (
  det: SelectedDetachment,
  subFactionName?: string | null,
  rosterUnits?: SelectedUnit[]
): SpecialDetachmentInfo => {
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

  if (det.constraints?.exclusiveChapters && subFactionName) {
    return {
      isSpecial: true,
      badgeLabel: `${subFactionName} Exclusive`,
      tooltip: `Exclusive detachment for ${subFactionName}.`,
      synergyActive: hasUnitSynergy
    };
  }

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

export const DetachmentBrowserModal: React.FC<DetachmentBrowserModalProps> = ({
  isOpen,
  onClose,
  availableDetachments,
  selectedDetachments,
  allEnhancements = [],
  totalDP,
  dpLimit,
  subFactionName,
  rosterUnits = [],
  onToggleDetachment
}) => {
  const [search, setSearch] = useState('');
  const [activeModalDetachment, setActiveModalDetachment] = useState<SelectedDetachment | null>(null);

  // Check mutual exclusivity / tag conflicts
  const getDetachmentConflict = (det: SelectedDetachment): string | null => {
    const isAlreadySelected = selectedDetachments.some(d => d.name === det.name);
    if (isAlreadySelected) return null;

    const exclusiveTags = det.constraints?.exclusiveTags || [];
    const myTags = det.tags || [];

    for (const selected of selectedDetachments) {
      const selectedExclusiveTags = selected.constraints?.exclusiveTags || [];
      const selectedTags = selected.tags || [];

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

  // Sort: Special unlocked detachments pushed to the top
  const sortedAndFiltered = useMemo(() => {
    return [...availableDetachments]
      .filter(d => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        const matchName = d.name.toLowerCase().includes(q);
        const matchTag = (d.tags || []).some(t => t.toLowerCase().includes(q));
        const matchRule = (d.rules || []).some(r => r.name.toLowerCase().includes(q) || r.description.toLowerCase().includes(q));
        return matchName || matchTag || matchRule;
      })
      .sort((a, b) => {
        const aSpecial = checkSpecialDetachment(a, subFactionName, rosterUnits).isSpecial;
        const bSpecial = checkSpecialDetachment(b, subFactionName, rosterUnits).isSpecial;
        if (aSpecial && !bSpecial) return -1;
        if (!aSpecial && bSpecial) return 1;
        return a.name.localeCompare(b.name);
      });
  }, [availableDetachments, search, subFactionName, rosterUnits]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-theme-bg/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-theme-surface border border-theme-border w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-theme-border-subtle bg-theme-surface">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-warhammer text-base sm:text-lg font-bold text-theme-text">
                Detachment Selection ({sortedAndFiltered.length})
              </h2>
              <span className={`text-xs px-2 py-0.5 rounded-full font-mono font-semibold border ${
                totalDP > dpLimit
                  ? 'bg-red-950/70 text-red-300 border-red-700/60'
                  : 'bg-theme-accent/15 text-theme-accent-soft border-theme-accent/35'
              }`}>
                {totalDP} / {dpLimit} DP
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="btn-theme-icon min-w-[38px] min-h-[38px] rounded-xl"
            aria-label="Close detachment browser"
          >
            <X className="w-4 h-4 stroke-[2]" />
          </button>
        </div>

        {/* Search */}
        <div className="p-2.5 sm:p-3 border-b border-theme-border-subtle bg-theme-bg/50">
          <div className="relative">
            <Search className="w-4 h-4 text-theme-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search detachment name, rule, or disposition..."
              className="w-full pl-9 pr-3 min-h-[40px] rounded-xl bg-theme-bg border border-theme-border text-theme-text text-base sm:text-sm focus:outline-none focus:border-theme-accent placeholder-theme-text-muted"
            />
          </div>
        </div>

        {/* Detachments Grid */}
        <div className="p-2.5 sm:p-4 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3">
          {sortedAndFiltered.length === 0 ? (
            <div className="col-span-full py-16 text-center text-sm font-medium text-theme-text-secondary">
              No matching detachments found.
            </div>
          ) : (
            sortedAndFiltered.map((det) => {
              const isSelected = selectedDetachments.some((d) => d.name === det.name);
              const conflict = getDetachmentConflict(det);

              return (
                <div
                  key={det.id || det.name}
                  className={`rounded-xl p-3 sm:p-3.5 border transition-all flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-theme-accent/10 border-theme-accent/60 shadow-sm'
                      : conflict
                      ? 'bg-theme-bg/50 border-theme-border-subtle opacity-60'
                      : 'card-theme-item'
                  }`}
                >
                  {/* Left: Name & DP Cost */}
                  <div className="min-w-0 flex-1">
                    <h3
                      onClick={() => setActiveModalDetachment(det)}
                      className={`font-warhammer text-sm sm:text-base font-bold mb-1 cursor-pointer transition-colors truncate ${
                        isSelected ? 'text-theme-accent-soft' : 'text-theme-text hover:text-theme-accent-soft'
                      }`}
                    >
                      {det.name}
                    </h3>

                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-sm font-bold text-theme-text-secondary">
                        {det.dpCost} DP
                      </span>

                      {conflict && (
                        <span className="text-[11px] text-red-400 font-medium truncate">
                          • {conflict}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: Eyeball to inspect & Plus/Check to toggle */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => setActiveModalDetachment(det)}
                      className="btn-theme-icon min-h-[38px] min-w-[38px] rounded-xl"
                      title="View rules and description"
                      aria-label={`Inspect ${det.name} rules`}
                    >
                      <Eye className="w-4 h-4 stroke-[2]" />
                    </button>

                    <button
                      type="button"
                      disabled={!!conflict && !isSelected}
                      onClick={() => onToggleDetachment(det)}
                      className={`min-h-[38px] min-w-[38px] px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all ${
                        isSelected
                          ? 'bg-emerald-700/80 hover:bg-emerald-600/80 text-white border border-emerald-500/40 shadow-sm'
                          : conflict
                          ? 'bg-theme-elevated/40 text-theme-text-muted border border-theme-border-subtle cursor-not-allowed'
                          : 'btn-theme-primary'
                      }`}
                      title={isSelected ? 'Remove detachment' : conflict ? conflict : 'Add detachment'}
                      aria-label={`${isSelected ? 'Remove' : 'Add'} ${det.name}`}
                    >
                      {isSelected ? (
                        <>
                          <Check className="w-4 h-4 stroke-[2.5]" />
                          <span className="hidden sm:inline">Added</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 stroke-[2.5]" />
                          <span className="hidden sm:inline">Add</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

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
    </div>
  );
};
