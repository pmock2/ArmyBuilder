import React, { useState } from 'react';
import { Plus, Eye, Trash2, Compass, Check, Sparkles, X } from 'lucide-react';
import { SelectedDetachment, Enhancement, SelectedUnit } from '../types/roster';
import { FactionArmyRule } from '../types/faction';
import { DetachmentBrowserModal } from './DetachmentBrowserModal';
import { DetachmentModal } from './DetachmentModal';
import { StratagemsModal } from './StratagemsModal';
import { FormattedText } from './FormattedText';
import { getUnlockedDispositions } from './ForceDispositionSelector';
import { useBackNavigation } from '../utils/backNavigation';

interface DetachmentSelectorProps {
  armyRules?: FactionArmyRule[];
  availableDetachments: SelectedDetachment[];
  selectedDetachments: SelectedDetachment[];
  allEnhancements?: Enhancement[];
  totalDP: number;
  dpLimit: number;
  subFactionName?: string | null;
  subFactionId?: string | null;
  rosterUnits?: SelectedUnit[];
  currentDisposition?: string | null;
  isPlayMode?: boolean;
  onToggleDetachment: (detachment: SelectedDetachment) => void;
  onSelectDisposition?: (disposition: string | null) => void;
}

export const DetachmentSelector: React.FC<DetachmentSelectorProps> = ({
  armyRules = [],
  availableDetachments,
  selectedDetachments,
  allEnhancements = [],
  totalDP,
  dpLimit,
  subFactionName,
  subFactionId,
  rosterUnits = [],
  currentDisposition,
  isPlayMode = false,
  onToggleDetachment,
  onSelectDisposition
}) => {
  const [isBrowserOpen, setIsBrowserOpen] = useState(false);
  const [inspectDetachment, setInspectDetachment] = useState<SelectedDetachment | null>(null);
  const [isStratagemsOpen, setIsStratagemsOpen] = useState(false);
  const [isArmyRuleOpen, setIsArmyRuleOpen] = useState(false);

  useBackNavigation(isBrowserOpen, () => setIsBrowserOpen(false));
  useBackNavigation(Boolean(inspectDetachment), () => setInspectDetachment(null));
  useBackNavigation(isStratagemsOpen, () => setIsStratagemsOpen(false));
  useBackNavigation(isArmyRuleOpen, () => setIsArmyRuleOpen(false));

  const hasDetachments = selectedDetachments.length > 0;
  const unlockedDispositions = getUnlockedDispositions(selectedDetachments);

  return (
    <div className="space-y-3 mb-3">
      {/* 0. Army Ability Card (Above Detachments) */}
      {armyRules.length > 0 && (
        <section className="panel-theme-section">
          <div className="section-theme-header mb-3">
            <h3 className="section-theme-title flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-theme-accent-soft" />
              <span>Army Ability</span>
            </h3>
          </div>

          <div
            onClick={() => setIsArmyRuleOpen(true)}
            className="card-theme-item px-3.5 sm:px-4 py-3 cursor-pointer flex items-center justify-between gap-3 active:scale-[0.995] group"
          >
            <div className="min-w-0 flex-1">
              <h4 className="font-warhammer text-sm sm:text-base font-bold text-theme-text group-hover:text-theme-accent-soft transition-colors tracking-wide truncate">
                {armyRules.map((r) => r.name).join(' • ')}
              </h4>
            </div>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsArmyRuleOpen(true);
              }}
              className="btn-theme-icon min-h-[34px] min-w-[34px] rounded-lg flex-shrink-0"
              title="View Army Ability"
              aria-label="View Army Ability"
            >
              <Eye className="w-3.5 h-3.5 stroke-[2]" />
            </button>
          </div>
        </section>
      )}

      {/* 1. Detachments Section */}
      <section
        className={
          hasDetachments
            ? 'panel-theme-section'
            : 'bg-theme-surface/40 border border-theme-border-subtle/60 rounded-xl px-3.5 py-2.5 transition-colors hover:bg-theme-surface/70'
        }
      >
        <div className="section-theme-header">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="section-theme-title truncate">
              Detachments
            </h3>
            <span className="text-xs font-mono font-semibold text-theme-accent-soft/80">
              ({selectedDetachments.length})
            </span>
            <span className="text-xs sm:text-sm font-mono text-theme-text font-bold">
              • {totalDP}/{dpLimit} DP
            </span>
          </div>

          {!isPlayMode && (
            <button
              type="button"
              onClick={() => setIsBrowserOpen(true)}
              className="btn-theme-secondary min-h-[30px] px-2.5 py-1 rounded-lg flex items-center gap-1 text-xs font-semibold tracking-wide shrink-0"
              title="Add Detachment"
              aria-label="Add Detachment"
            >
              <Plus className="w-3.5 h-3.5 text-theme-accent-soft stroke-[2.5]" />
              <span>Add</span>
            </button>
          )}
        </div>

        {/* Chosen Detachment Cards (Stacked in line breaks) */}
        {hasDetachments && (
          <div className="space-y-2 mt-3">
            {selectedDetachments.map((det) => (
              <div
                key={det.id || det.name}
                onClick={() => setInspectDetachment(det)}
                className="card-theme-item px-3.5 sm:px-4 py-3 cursor-pointer flex flex-col gap-2.5 active:scale-[0.995] group"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h4 className="font-warhammer text-sm sm:text-base font-bold text-theme-text group-hover:text-theme-accent-soft transition-colors tracking-wide truncate">
                      {det.name}
                    </h4>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-2.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <span className="font-mono text-sm sm:text-base font-bold text-theme-text whitespace-nowrap mr-0.5">
                      {det.dpCost} <span className="text-xs font-normal text-theme-text-secondary">DP</span>
                    </span>

                    <button
                      type="button"
                      onClick={() => setInspectDetachment(det)}
                      className="btn-theme-icon min-h-[34px] min-w-[34px] rounded-lg"
                      title="Inspect Detachment Rules"
                      aria-label={`Inspect ${det.name} rules`}
                    >
                      <Eye className="w-3.5 h-3.5 stroke-[2]" />
                    </button>

                    {!isPlayMode && (
                      <button
                        type="button"
                        onClick={() => onToggleDetachment(det)}
                        className="btn-theme-danger-icon min-h-[34px] min-w-[34px] rounded-lg"
                        title="Remove Detachment"
                        aria-label={`Remove ${det.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5 stroke-[2]" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Force Disposition Selector (Sourced from Chosen Detachments) */}
        {hasDetachments && (
          <div className="mt-3 pt-3 border-t border-theme-border-subtle space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 min-w-0">
                <Compass className="w-3.5 h-3.5 text-theme-accent-soft shrink-0" />
                <span className="text-xs font-bold uppercase tracking-wider text-theme-text-secondary">
                  Force Disposition
                </span>
                {currentDisposition ? (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-theme-accent/20 border border-theme-accent/50 text-theme-accent-soft font-semibold font-mono truncate">
                    {currentDisposition}
                  </span>
                ) : (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-theme-surface border border-theme-border-subtle text-theme-text-muted font-mono">
                    None selected
                  </span>
                )}
              </div>

              {!isPlayMode && currentDisposition && onSelectDisposition && (
                <button
                  type="button"
                  onClick={() => onSelectDisposition(null)}
                  className="text-[11px] font-semibold text-theme-text-muted hover:text-theme-accent-soft underline transition-colors"
                >
                  Clear
                </button>
              )}
            </div>

            {unlockedDispositions.length === 0 ? (
              <p className="text-xs text-theme-text-muted italic">
                Selected detachments do not grant any Force Dispositions.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {unlockedDispositions.map(({ meta: disp, sourceDetachments }) => {
                  const isSelected = currentDisposition === disp.key;
                  return (
                    <button
                      key={disp.key}
                      type="button"
                      disabled={isPlayMode || !onSelectDisposition}
                      onClick={() => onSelectDisposition?.(isSelected ? null : disp.key)}
                      className={`text-left px-3 py-2 rounded-xl border transition-all flex items-center justify-between gap-2.5 ${
                        isSelected
                          ? 'bg-theme-accent/20 border-theme-accent text-theme-text shadow-sm'
                          : 'bg-theme-card/80 border-theme-border-subtle hover:border-theme-accent/60 text-theme-text-secondary hover:text-theme-text'
                      } ${isPlayMode ? 'cursor-default opacity-90' : 'cursor-pointer active:scale-[0.99]'}`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="p-1.5 rounded-lg bg-theme-surface border border-theme-border-subtle shrink-0">
                          {disp.icon}
                        </span>
                        <div className="min-w-0">
                          <span className="font-warhammer text-xs sm:text-sm font-bold text-theme-text block truncate">
                            {disp.name}
                          </span>
                          <span className="text-[10px] text-theme-text-muted block truncate">
                            Via {sourceDetachments.join(', ')}
                          </span>
                        </div>
                      </div>

                      <span
                        className={`w-5 h-5 rounded-md flex items-center justify-center border shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-theme-accent border-theme-accent text-white'
                            : 'bg-theme-surface border-theme-border-subtle text-transparent'
                        }`}
                      >
                        <Check className={`w-3.5 h-3.5 stroke-[3] ${isSelected ? 'block' : 'hidden'}`} />
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </section>

      {/* 2. Stratagems Section (Simple Card with Eye Icon underneath Detachments) */}
      <section className="panel-theme-section">
        <div className="section-theme-header mb-3">
          <h3 className="section-theme-title">
            Stratagems
          </h3>
        </div>

        <div
          onClick={() => setIsStratagemsOpen(true)}
          className="card-theme-item px-3.5 sm:px-4 py-3 cursor-pointer flex items-center justify-between gap-3 active:scale-[0.995] group"
        >
          <div className="min-w-0 flex-1">
            <h4 className="font-warhammer text-sm sm:text-base font-bold text-theme-text group-hover:text-theme-accent-soft transition-colors tracking-wide truncate">
              Stratagems
            </h4>
            <p className="text-xs text-theme-text-secondary font-medium mt-0.5 truncate">
              Detachment &amp; Core Stratagems
            </p>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsStratagemsOpen(true);
            }}
            className="btn-theme-icon min-h-[34px] min-w-[34px] rounded-lg flex-shrink-0"
            title="View Stratagems"
            aria-label="View Stratagems"
          >
            <Eye className="w-3.5 h-3.5 stroke-[2]" />
          </button>
        </div>
      </section>

      {/* Detachment Browser Modal */}
      <DetachmentBrowserModal
        isOpen={isBrowserOpen}
        onClose={() => setIsBrowserOpen(false)}
        availableDetachments={availableDetachments}
        selectedDetachments={selectedDetachments}
        allEnhancements={allEnhancements}
        totalDP={totalDP}
        dpLimit={dpLimit}
        subFactionName={subFactionName}
        subFactionId={subFactionId}
        rosterUnits={rosterUnits}
        onToggleDetachment={onToggleDetachment}
      />

      {/* Detachment Rules Modal */}
      <DetachmentModal
        detachment={inspectDetachment}
        allEnhancements={allEnhancements}
        isOpen={!!inspectDetachment}
        onClose={() => setInspectDetachment(null)}
        isSelected={inspectDetachment ? selectedDetachments.some((d) => d.name === inspectDetachment.name) : false}
        isPlayMode={isPlayMode}
        onSelect={!isPlayMode && inspectDetachment ? () => onToggleDetachment(inspectDetachment) : undefined}
      />

      {/* Stratagems Reference Modal */}
      <StratagemsModal
        isOpen={isStratagemsOpen}
        onClose={() => setIsStratagemsOpen(false)}
        selectedDetachments={selectedDetachments}
      />

      {/* Army Ability Modal */}
      {isArmyRuleOpen && armyRules.length > 0 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setIsArmyRuleOpen(false)}
        >
          <div
            className="w-full max-w-2xl bg-theme-surface border border-theme-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-theme-border-subtle bg-theme-card">
              <div className="flex items-center gap-2.5 min-w-0">
                <Sparkles className="w-4 h-4 text-theme-accent-soft shrink-0" />
                <h2 className="font-warhammer text-base sm:text-lg font-bold text-theme-text tracking-wide truncate">
                  Army Ability
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsArmyRuleOpen(false)}
                className="btn-theme-icon min-w-[32px] min-h-[32px] rounded-lg"
                aria-label="Close Army Ability"
              >
                <X className="w-4 h-4 stroke-[2]" />
              </button>
            </div>

            <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
              {armyRules.map((rule) => (
                <div
                  key={rule.name}
                  className="p-3.5 sm:p-4 rounded-xl bg-theme-card border border-theme-border-subtle space-y-2"
                >
                  <h3 className="font-warhammer text-sm sm:text-base font-bold text-theme-accent-soft">
                    {rule.name}
                  </h3>
                  <FormattedText
                    text={rule.description}
                    className="text-xs sm:text-sm text-theme-text-secondary leading-relaxed"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
