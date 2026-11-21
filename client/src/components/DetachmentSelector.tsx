import React, { useState } from 'react';
import { Plus, Eye, Trash2, Compass, Check, Sparkles, X, ChevronDown, ChevronUp } from 'lucide-react';
import { BattleSize, SelectedDetachment, Enhancement, SelectedUnit } from '../types/roster';
import { FactionArmyRule } from '../types/faction';
import { DetachmentBrowserModal } from './DetachmentBrowserModal';
import { DetachmentModal } from './DetachmentModal';
import { StratagemsModal } from './StratagemsModal';
import { FormattedText } from './FormattedText';
import { getUnlockedDispositions } from './ForceDispositionSelector';
import { useBackNavigation } from '../utils/backNavigation';
import { ArmyRuleTracker } from './ArmyRuleTracker';
import { detectTrackableArmyRule } from '../utils/armyRuleTracking';
import { ArmyRulePlayState, RosterPlayState } from '../utils/playTracking';

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
  battleSize?: BattleSize;
  playState?: RosterPlayState;
  armyRuleState?: ArmyRulePlayState;
  onToggleDetachment: (detachment: SelectedDetachment) => void;
  onSelectDisposition?: (disposition: string | null) => void;
  onChangeArmyRuleState?: (next: ArmyRulePlayState) => void;
  onResetAllKaTah?: () => void;
  onClearAllOrders?: () => void;
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
  battleSize = 'strike-force',
  playState = {},
  armyRuleState = {},
  onToggleDetachment,
  onSelectDisposition,
  onChangeArmyRuleState,
  onResetAllKaTah,
  onClearAllOrders
}) => {
  const [isBrowserOpen, setIsBrowserOpen] = useState(false);
  const [inspectDetachment, setInspectDetachment] = useState<SelectedDetachment | null>(null);
  const [isStratagemsOpen, setIsStratagemsOpen] = useState(false);
  const [isArmyRuleOpen, setIsArmyRuleOpen] = useState(false);
  const [isTrackerExpanded, setIsTrackerExpanded] = useState(true);

  useBackNavigation(isBrowserOpen, () => setIsBrowserOpen(false));
  useBackNavigation(Boolean(inspectDetachment), () => setInspectDetachment(null));
  useBackNavigation(isStratagemsOpen, () => setIsStratagemsOpen(false));
  useBackNavigation(isArmyRuleOpen, () => setIsArmyRuleOpen(false));

  const hasDetachments = selectedDetachments.length > 0;
  const unlockedDispositions = getUnlockedDispositions(selectedDetachments);
  const trackableRuleType = detectTrackableArmyRule(armyRules);
  const showPlayTracker = Boolean(isPlayMode && trackableRuleType && onChangeArmyRuleState);

  return (
    <div className="space-y-2 mb-4 pb-3 border-b border-theme-border-subtle/50">
      {/* 0. Army Ability Strip + Play Mode Interactive Tracker (Amber Command Ledger Style) */}
      {armyRules.length > 0 && (
        <section className="ledger-theme-panel px-3.5 py-2.5 space-y-2.5">
          <div
            onClick={() => setIsArmyRuleOpen(true)}
            className="cursor-pointer flex items-center justify-between gap-3 group"
          >
            <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
              <span className="ledger-theme-label flex items-center gap-1.5 shrink-0">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Army Ability</span>
              </span>
              <span className="text-amber-500/40 hidden sm:inline">•</span>
              <h4 className="font-warhammer text-xs sm:text-sm font-bold text-theme-text group-hover:text-amber-300 transition-colors tracking-wide truncate">
                {armyRules.map((r) => r.name).join(' • ')}
              </h4>
            </div>

            <div className="flex items-center gap-1.5 shrink-0" onClick={(e) => e.stopPropagation()}>
              {showPlayTracker && (
                <button
                  type="button"
                  onClick={() => setIsTrackerExpanded((v) => !v)}
                  className="min-h-[30px] px-2 rounded-lg border border-amber-500/35 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 flex items-center gap-1 text-[11px] font-semibold transition-colors"
                  title={isTrackerExpanded ? 'Collapse Army Rule Tracker' : 'Expand Army Rule Tracker'}
                  aria-label={isTrackerExpanded ? 'Collapse Army Rule Tracker' : 'Expand Army Rule Tracker'}
                >
                  <span className="hidden sm:inline">{isTrackerExpanded ? 'Hide' : 'Track'}</span>
                  {isTrackerExpanded ? (
                    <ChevronUp className="w-3.5 h-3.5 stroke-[2.2]" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 stroke-[2.2]" />
                  )}
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsArmyRuleOpen(true)}
                className="min-h-[30px] min-w-[30px] rounded-lg border border-amber-500/35 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 flex items-center justify-center flex-shrink-0 transition-colors"
                title="View Army Ability"
                aria-label="View Army Ability"
              >
                <Eye className="w-3.5 h-3.5 stroke-[2]" />
              </button>
            </div>
          </div>

          {showPlayTracker && isTrackerExpanded && trackableRuleType && onChangeArmyRuleState && (
            <div className="pt-2.5 border-t border-amber-500/20">
              <ArmyRuleTracker
                ruleType={trackableRuleType}
                battleSize={battleSize}
                selectedDetachments={selectedDetachments}
                rosterUnits={rosterUnits}
                playState={playState}
                armyRuleState={armyRuleState}
                onChangeArmyRuleState={onChangeArmyRuleState}
                onResetAllKaTah={onResetAllKaTah}
                onClearAllOrders={onClearAllOrders}
              />
            </div>
          )}
        </section>
      )}

      {/* 1. Detachments Ledger Section */}
      <section
        className={
          hasDetachments
            ? 'ledger-theme-panel px-3.5 py-2.5 space-y-2'
            : 'rounded-xl bg-amber-500/[0.04] border border-dashed border-amber-500/25 px-3.5 py-2 transition-colors hover:bg-amber-500/[0.08]'
        }
      >
        <div
          className={`flex items-center justify-between gap-2 ${
            hasDetachments ? 'pb-2 border-b border-amber-500/20' : ''
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="ledger-theme-label truncate">
              Detachments
            </h3>
            <span className="text-xs font-mono font-semibold text-amber-400/75">
              ({selectedDetachments.length})
            </span>
            <span className="text-xs font-mono text-theme-text-secondary font-semibold">
              • {totalDP}/{dpLimit} DP
            </span>
          </div>

          {!isPlayMode && (
            <button
              type="button"
              onClick={() => setIsBrowserOpen(true)}
              className="min-h-[28px] px-2.5 py-1 rounded-lg border border-amber-500/35 bg-amber-500/10 hover:bg-amber-500/20 text-amber-200 flex items-center gap-1 text-xs font-semibold tracking-wide shrink-0 transition-colors"
              title="Add Detachment"
              aria-label="Add Detachment"
            >
              <Plus className="w-3.5 h-3.5 text-amber-400 stroke-[2.5]" />
              <span>Add</span>
            </button>
          )}
        </div>

        {/* Chosen Detachment Ledger Rows (Flat hairline rows, no nested unit card boxes) */}
        {hasDetachments && (
          <div className="divide-y divide-amber-500/15">
            {selectedDetachments.map((det) => (
              <div
                key={det.id || det.name}
                onClick={() => setInspectDetachment(det)}
                className="py-1.5 first:pt-0.5 last:pb-0.5 cursor-pointer flex items-center justify-between gap-3 group"
              >
                <div className="min-w-0 flex-1">
                  <h4 className="font-warhammer text-xs sm:text-sm font-bold text-theme-text group-hover:text-amber-300 transition-colors tracking-wide truncate">
                    {det.name}
                  </h4>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                  <span className="font-mono text-xs font-semibold text-amber-200/85 whitespace-nowrap">
                    {det.dpCost} <span className="text-[10px] font-normal text-theme-text-muted">DP</span>
                  </span>

                  <button
                    type="button"
                    onClick={() => setInspectDetachment(det)}
                    className="min-h-[30px] min-w-[30px] rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 flex items-center justify-center transition-colors"
                    title="Inspect Detachment Rules"
                    aria-label={`Inspect ${det.name} rules`}
                  >
                    <Eye className="w-3.5 h-3.5 stroke-[2]" />
                  </button>

                  {!isPlayMode && (
                    <button
                      type="button"
                      onClick={() => onToggleDetachment(det)}
                      className="btn-theme-danger-icon min-h-[30px] min-w-[30px] rounded-lg"
                      title="Remove Detachment"
                      aria-label={`Remove ${det.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5 stroke-[2]" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Force Disposition Selector (Compact in Play Mode, Interactive Grid in Build Mode) */}
        {hasDetachments && (
          isPlayMode ? (
            <div className="mt-2 pt-2 border-t border-amber-500/20 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 min-w-0">
                <Compass className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="ledger-theme-label">
                  Force Disposition
                </span>
              </div>
              {currentDisposition ? (
                <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-200 font-semibold">
                  {unlockedDispositions.find((d) => d.meta.key === currentDisposition)?.meta.icon}
                  <span>{currentDisposition}</span>
                </span>
              ) : (
                <span className="text-xs text-theme-text-muted italic">
                  None selected
                </span>
              )}
            </div>
          ) : (
            <div className="mt-2.5 pt-2.5 border-t border-amber-500/20 space-y-2">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 min-w-0">
                  <Compass className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span className="ledger-theme-label">
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

                {currentDisposition && onSelectDisposition && (
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
                        disabled={!onSelectDisposition}
                        onClick={() => onSelectDisposition?.(isSelected ? null : disp.key)}
                        className={`text-left px-3 py-2 rounded-xl border transition-all flex items-center justify-between gap-2.5 cursor-pointer active:scale-[0.99] ${
                          isSelected
                            ? 'bg-theme-accent/20 border-theme-accent text-theme-text shadow-sm'
                            : 'bg-theme-card/80 border-theme-border-subtle hover:border-theme-accent/60 text-theme-text-secondary hover:text-theme-text'
                        }`}
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
          )
        )}
      </section>

      {/* 2. Stratagems Strip (Underneath Detachments — Amber Command Ledger Style) */}
      <section
        onClick={() => setIsStratagemsOpen(true)}
        className="ledger-theme-panel hover:bg-amber-500/[0.1] hover:border-amber-400/50 px-3.5 py-2.5 cursor-pointer flex items-center justify-between gap-3 active:scale-[0.998] group"
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
          <span className="ledger-theme-label shrink-0">
            Stratagems
          </span>
          <span className="text-amber-500/40 hidden sm:inline">•</span>
          <span className="text-xs sm:text-sm font-medium text-theme-text-secondary group-hover:text-amber-300 transition-colors truncate">
            Detachment &amp; Core Stratagems
          </span>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsStratagemsOpen(true);
          }}
          className="min-h-[30px] min-w-[30px] rounded-lg border border-amber-500/35 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 flex items-center justify-center flex-shrink-0 transition-colors"
          title="View Stratagems"
          aria-label="View Stratagems"
        >
          <Eye className="w-3.5 h-3.5 stroke-[2]" />
        </button>
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
                  className="p-3.5 sm:p-4 rounded-xl bg-theme-card border border-theme-border-subtle space-y-3"
                >
                  <h3 className="font-warhammer text-sm sm:text-base font-bold text-theme-accent-soft">
                    {rule.name}
                  </h3>
                  {rule.description && (
                    <FormattedText
                      text={rule.description}
                      className="text-xs sm:text-sm text-theme-text-secondary leading-relaxed"
                    />
                  )}
                  {rule.tables && rule.tables.length > 0 && (
                    <div className="space-y-3 pt-1">
                      {rule.tables.map((table) => {
                        const hasRoll = table.rows.some((r) => Boolean(r.roll));
                        return (
                          <div
                            key={table.title}
                            className="rounded-xl border border-theme-border-subtle bg-theme-surface/70 overflow-hidden"
                          >
                            <div className="px-3 py-2 border-b border-theme-border-subtle bg-theme-card/80 flex items-center justify-between">
                              <span className="text-[11px] font-bold uppercase tracking-wider text-theme-accent-soft">
                                {table.title}
                              </span>
                            </div>
                            <div className="overflow-x-auto">
                              <table className="w-full text-left border-collapse">
                                <thead>
                                  <tr className="border-b border-theme-border-subtle/70 text-[10px] font-bold uppercase tracking-wider text-theme-text-muted bg-theme-card/40">
                                    {hasRoll && <th className="py-1.5 px-3 w-20 whitespace-nowrap">D6</th>}
                                    <th className="py-1.5 px-3">Ability / Effect</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-theme-border-subtle/60">
                                  {table.rows.map((row, idx) => (
                                    <tr key={`${table.title}-${idx}`} className="align-top">
                                      {hasRoll && (
                                        <td className="py-2 px-3 whitespace-nowrap">
                                          {row.roll ? (
                                            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-300 font-mono text-[11px] font-bold">
                                              {row.roll}
                                            </span>
                                          ) : (
                                            <span className="text-theme-text-muted text-xs">—</span>
                                          )}
                                        </td>
                                      )}
                                      <td className="py-2 px-3 space-y-1">
                                        {row.name && (
                                          <div className="text-xs sm:text-sm font-semibold text-theme-text">
                                            {row.name}
                                          </div>
                                        )}
                                        {row.description && (
                                          <FormattedText
                                            text={row.description}
                                            className="text-xs text-theme-text-secondary leading-relaxed"
                                          />
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
