import React, { useState } from 'react';
import { Crown, Trash2, Copy, Eye, Skull, Check, Zap, Flame, X } from 'lucide-react';
import {
  SelectedUnit,
  Enhancement,
  SelectedDetachment,
  isLegendsUnit,
  getUnitTotalPts,
  getUnitWargearPts,
  getUnitDuplicatePenalty
} from '../types/roster';
import { doesEnhancementAffectLedUnit } from '../utils/equippedStats';
import {
  RosterPlayState,
  UnitPlayState,
  getAttachedChildrenForBodyguard,
  isUnitDestroyedInPlay,
  unitHasMartialKatah,
  unitHasWaaagh,
  unitIsAlwaysRiledUp
} from '../utils/playTracking';
import { ASTRA_ORDERS, TrackableArmyRuleType } from '../utils/armyRuleTracking';
import { DatasheetModal } from './DatasheetModal';

interface UnitCardProps {
  unit: SelectedUnit;
  allUnitsInRoster: SelectedUnit[];
  availableEnhancements: Enhancement[];
  selectedDetachments?: SelectedDetachment[];
  isPlayMode?: boolean;
  playState?: RosterPlayState;
  isDestroyedCard?: boolean;
  armyRuleType?: TrackableArmyRuleType | null;
  onStepPlayRemaining?: (unit: SelectedUnit, delta: number) => void;
  onPatchUnitPlayState?: (unitId: string, patch: Partial<UnitPlayState>) => void;
  onOpenDatasheet?: (unit: SelectedUnit) => void;
  onUpdateUnit: (updated: SelectedUnit) => void;
  onDuplicateUnit: (unit: SelectedUnit) => void;
  onRemoveUnit: (instanceId: string) => void;
  onSetWarlord: (instanceId: string) => void;
}

export const UnitCard: React.FC<UnitCardProps> = ({
  unit,
  allUnitsInRoster,
  availableEnhancements,
  selectedDetachments = [],
  isPlayMode = false,
  playState = {},
  isDestroyedCard = false,
  armyRuleType = null,
  onStepPlayRemaining,
  onPatchUnitPlayState,
  onOpenDatasheet,
  onUpdateUnit,
  onDuplicateUnit,
  onRemoveUnit,
  onSetWarlord
}) => {
  const [isDatasheetOpen, setIsDatasheetOpen] = useState(false);
  const [isOrderPickerOpen, setIsOrderPickerOpen] = useState(false);

  const openDatasheet = () => {
    if (onOpenDatasheet) {
      onOpenDatasheet(unit);
    } else {
      setIsDatasheetOpen(true);
    }
  };

  const wargearPts = getUnitWargearPts(unit);
  const dupPenalty = getUnitDuplicatePenalty(unit, allUnitsInRoster);

  // Attached unit references
  const attachedLeader = allUnitsInRoster.find((u) => u.instanceId === unit.attachedLeaderId);
  const attachedSupport = allUnitsInRoster.find((u) => u.instanceId === unit.attachedSupportId);
  const attachedRetinue = allUnitsInRoster.find((u) => u.instanceId === unit.attachedRetinueId);
  const attachedToBodyguard = allUnitsInRoster.find((u) => u.instanceId === unit.attachedToBodyguardId);

  const attachedChildren =
    isPlayMode && !isDestroyedCard && !unit.attachedToBodyguardId
      ? getAttachedChildrenForBodyguard(unit, allUnitsInRoster)
      : [];
  const livingAttachedChildren = attachedChildren.filter(
    (c) => !isUnitDestroyedInPlay(c.unit, playState, allUnitsInRoster)
  );
  const destroyedAttachedChildren = attachedChildren.filter((c) =>
    isUnitDestroyedInPlay(c.unit, playState, allUnitsInRoster)
  );

  const totalCost =
    isPlayMode && !isDestroyedCard && livingAttachedChildren.length > 0
      ? getUnitTotalPts(unit, allUnitsInRoster) +
        livingAttachedChildren.reduce((sum, c) => sum + getUnitTotalPts(c.unit, allUnitsInRoster), 0)
      : getUnitTotalPts(unit, allUnitsInRoster);

  const leaderUnitEnhancement =
    attachedLeader?.enhancement && doesEnhancementAffectLedUnit(attachedLeader.enhancement)
      ? { enhancement: attachedLeader.enhancement, leaderName: attachedLeader.name }
      : null;

  const supportUnitEnhancement =
    attachedSupport?.enhancement && doesEnhancementAffectLedUnit(attachedSupport.enhancement)
      ? { enhancement: attachedSupport.enhancement, leaderName: attachedSupport.name }
      : null;

  const bodyguardDestroyedWhileIndependent = Boolean(
    isPlayMode &&
      !isDestroyedCard &&
      attachedToBodyguard &&
      isUnitDestroyedInPlay(attachedToBodyguard, playState, allUnitsInRoster)
  );

  const hasWarlordInCard =
    unit.isWarlord ||
    (isPlayMode && !isDestroyedCard && livingAttachedChildren.some((c) => c.unit.isWarlord));

  const showKatahToggle = Boolean(
    isPlayMode &&
      !isDestroyedCard &&
      armyRuleType === 'martial-katah' &&
      onPatchUnitPlayState &&
      unitHasMartialKatah(unit, livingAttachedChildren)
  );
  const isKatahUsed = Boolean(playState[unit.instanceId]?.kaTahUsed);

  const showOrderControl = Boolean(
    isPlayMode &&
      !isDestroyedCard &&
      armyRuleType === 'voice-of-command' &&
      onPatchUnitPlayState &&
      !unit.datasheet?.isAllied
  );
  const activeOrderId = playState[unit.instanceId]?.activeOrder || null;
  const activeOrderDef = activeOrderId
    ? ASTRA_ORDERS.find((o) => o.id === activeOrderId) || null
    : null;

  const showRiledUpControl = Boolean(
    isPlayMode &&
      !isDestroyedCard &&
      armyRuleType === 'waaagh' &&
      onPatchUnitPlayState &&
      unitHasWaaagh(unit, livingAttachedChildren)
  );
  const isAlwaysRiledUp =
    showRiledUpControl && unitIsAlwaysRiledUp(unit, livingAttachedChildren);
  const isRiledUp = isAlwaysRiledUp || Boolean(playState[unit.instanceId]?.riledUp);

  return (
    <>
      {/* Sleek, Elevated Unit Card */}
      <div
        onClick={openDatasheet}
        className={`card-theme-item px-3.5 sm:px-4 py-3 flex flex-col gap-2.5 cursor-pointer active:scale-[0.998] group ${
          isDestroyedCard ? '!border-red-900/55 !bg-theme-card/65 opacity-90 hover:opacity-100' : ''
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          {/* Left: Name, Model Count, Badges */}
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-1.5 min-w-0">
              {hasWarlordInCard && (
                <span
                  title="Warlord"
                  aria-label="Warlord"
                  className="shrink-0 mt-0.5 text-amber-400"
                >
                  <Crown className="w-4 h-4 fill-amber-400/20 stroke-[2.2]" />
                </span>
              )}

              {isDestroyedCard && (
                <span
                  title="Destroyed"
                  aria-label="Destroyed"
                  className="shrink-0 mt-0.5 text-red-400"
                >
                  <Skull className="w-4 h-4 stroke-[2.2]" />
                </span>
              )}

              {isLegendsUnit(unit) && (
                <span className="shrink-0 mt-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-theme-elevated text-theme-text-secondary border border-theme-border font-mono tracking-wider">
                  LEGENDS
                </span>
              )}

              <h4
                className={`font-warhammer text-sm sm:text-base font-bold transition-colors tracking-wide leading-snug line-clamp-2 min-w-0 flex-1 ${
                  isDestroyedCard
                    ? 'text-red-200/90 group-hover:text-red-100'
                    : 'text-theme-text group-hover:text-theme-accent-soft'
                }`}
              >
                {unit.name}
              </h4>
            </div>

            <div className="flex items-center gap-2 text-xs text-theme-text-secondary flex-wrap mt-1">
              <span className="font-medium">
                {unit.modelsCount} {unit.modelsCount === 1 ? 'Model' : 'Models'}
              </span>

              {unit.enhancement && (
                <span className="text-amber-300/95 font-medium truncate max-w-[260px]">
                  • {unit.enhancement.name} (+{unit.enhancement.pts} pts)
                </span>
              )}

              {wargearPts > 0 && (
                <span className="text-theme-accent-soft/85 font-mono font-medium">
                  • Wargear (+{wargearPts} pts)
                </span>
              )}

              {dupPenalty > 0 && (
                <span
                  title="Additional points penalty applied for taking multiple copies of this unit"
                  className="text-amber-400/95 font-mono font-medium"
                >
                  • Duplicate Penalty (+{dupPenalty} pts)
                </span>
              )}

              {!isPlayMode && attachedLeader && (
                <span className="text-theme-text-secondary font-medium truncate max-w-[220px]">
                  • Leader: {attachedLeader.name}
                </span>
              )}

              {leaderUnitEnhancement && (
                <span className="text-amber-300/95 font-medium truncate max-w-[280px]">
                  • {leaderUnitEnhancement.enhancement.name} (via {leaderUnitEnhancement.leaderName})
                </span>
              )}

              {!isPlayMode && attachedSupport && (
                <span className="text-theme-text-secondary font-medium truncate max-w-[220px]">
                  • Support: {attachedSupport.name}
                </span>
              )}

              {!isPlayMode && attachedRetinue && (
                <span className="text-teal-300/90 font-medium truncate max-w-[220px]">
                  • Retinue: {attachedRetinue.name}
                </span>
              )}

              {supportUnitEnhancement && (
                <span className="text-amber-300/95 font-medium truncate max-w-[280px]">
                  • {supportUnitEnhancement.enhancement.name} (via {supportUnitEnhancement.leaderName})
                </span>
              )}

              {!isPlayMode && attachedToBodyguard && (
                <span className="text-theme-text-muted font-medium truncate max-w-[200px]">
                  • Attached to: {attachedToBodyguard.name}
                </span>
              )}

              {bodyguardDestroyedWhileIndependent && attachedToBodyguard && (
                <span className="text-amber-300/85 font-medium truncate max-w-[240px]">
                  • Operating Solo ({attachedToBodyguard.name} destroyed)
                </span>
              )}

              {isPlayMode && isDestroyedCard && attachedToBodyguard && (
                <span className="text-theme-text-muted font-medium truncate max-w-[220px]">
                  • Was attached to: {attachedToBodyguard.name}
                </span>
              )}

              {isPlayMode &&
                !isDestroyedCard &&
                livingAttachedChildren.map((child) => (
                  <span
                    key={child.unit.instanceId}
                    className={`${
                      child.role === 'Retinue'
                        ? 'text-teal-300/90'
                        : 'text-theme-text-secondary'
                    } font-medium truncate max-w-[260px]`}
                  >
                    • {child.role}: {child.unit.name}
                    {child.unit.enhancement && !doesEnhancementAffectLedUnit(child.unit.enhancement)
                      ? ` (${child.unit.enhancement.name})`
                      : ''}
                  </span>
                ))}

              {isPlayMode &&
                !isDestroyedCard &&
                destroyedAttachedChildren.map((dc) => (
                  <span
                    key={dc.unit.instanceId}
                    className="text-red-300/85 font-medium truncate max-w-[220px]"
                  >
                    • {dc.role}: {dc.unit.name} (Destroyed)
                  </span>
                ))}
            </div>
          </div>

          {/* Right: Cost & Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-2.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            <span className="font-mono text-sm sm:text-base font-bold text-theme-text whitespace-nowrap mr-0.5">
              {totalCost} <span className="text-xs font-normal text-theme-text-secondary">pts</span>
            </span>

            {isPlayMode ? (
              <button
                type="button"
                onClick={openDatasheet}
                className="btn-theme-icon min-h-[34px] min-w-[34px] rounded-lg"
                title="View Datasheet"
                aria-label={`View ${unit.name} datasheet`}
              >
                <Eye className="w-3.5 h-3.5 stroke-[2]" />
              </button>
            ) : (
              <>
                {!unit.isEpicHero && (
                  <button
                    type="button"
                    onClick={() => onDuplicateUnit(unit)}
                    className="btn-theme-icon min-h-[34px] min-w-[34px] rounded-lg"
                    title="Duplicate unit"
                    aria-label="Duplicate unit"
                  >
                    <Copy className="w-3.5 h-3.5 stroke-[2]" />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => onRemoveUnit(unit.instanceId)}
                  className="btn-theme-danger-icon min-h-[34px] min-w-[34px] rounded-lg"
                  title="Remove unit"
                  aria-label="Remove unit"
                >
                  <Trash2 className="w-3.5 h-3.5 stroke-[2]" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Play Mode Per-Unit Army Rule Controls (Custodes Ka'tah / Astra Militarum Orders / Orks Waaagh!) */}
        {(showKatahToggle || showOrderControl || showRiledUpControl) && (
          <div
            className="pt-2 border-t border-theme-border-subtle/60 space-y-1.5"
            onClick={(e) => e.stopPropagation()}
          >
            {showKatahToggle && onPatchUnitPlayState && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-theme-text-muted">
                  Martial Ka&apos;tah
                </span>
                <button
                  type="button"
                  onClick={() =>
                    onPatchUnitPlayState(unit.instanceId, {
                      kaTahUsed: !isKatahUsed
                    })
                  }
                  className={`min-h-[28px] px-2.5 py-0.5 rounded-lg border text-[11px] font-bold flex items-center gap-1.5 transition-colors ${
                    isKatahUsed
                      ? 'bg-theme-surface border-theme-border-subtle text-theme-text-muted'
                      : 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300 hover:bg-emerald-500/25'
                  }`}
                >
                  {isKatahUsed ? (
                    <span>Ka&apos;tah Used</span>
                  ) : (
                    <>
                      <Check className="w-3 h-3 stroke-[2.5]" />
                      <span>Readied</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {showOrderControl && onPatchUnitPlayState && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="text-[11px] font-semibold text-theme-text-muted">
                    Order
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setIsOrderPickerOpen((v) => !v)}
                      className={`min-h-[28px] px-2.5 py-0.5 rounded-lg border text-[11px] font-bold flex items-center gap-1 transition-colors ${
                        activeOrderDef
                          ? 'bg-amber-500/15 border-amber-400/60 text-amber-200 hover:bg-amber-500/25'
                          : 'bg-theme-surface border-theme-border-subtle text-theme-text-secondary hover:border-amber-500/40'
                      }`}
                    >
                      <Zap className="w-3 h-3 text-amber-400 shrink-0" />
                      <span>
                        {activeOrderDef
                          ? `${activeOrderDef.name} (${activeOrderDef.shortName})`
                          : '+ Issue Order'}
                      </span>
                    </button>
                    {activeOrderDef && (
                      <button
                        type="button"
                        onClick={() => {
                          onPatchUnitPlayState(unit.instanceId, { activeOrder: null });
                          setIsOrderPickerOpen(false);
                        }}
                        className="min-h-[28px] min-w-[28px] rounded-lg bg-theme-surface border border-theme-border-subtle text-theme-text-muted hover:text-theme-text flex items-center justify-center"
                        title="Clear Order"
                        aria-label="Clear Order"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {isOrderPickerOpen && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 pt-1">
                    {ASTRA_ORDERS.map((ord) => {
                      const selected = activeOrderId === ord.id;
                      return (
                        <button
                          key={ord.id}
                          type="button"
                          onClick={() => {
                            onPatchUnitPlayState(unit.instanceId, {
                              activeOrder: selected ? null : ord.id
                            });
                            setIsOrderPickerOpen(false);
                          }}
                          className={`text-left px-2 py-1.5 rounded-lg border text-[11px] transition-colors ${
                            selected
                              ? 'bg-amber-500/20 border-amber-400/70 text-amber-200 font-bold'
                              : 'bg-theme-surface border-theme-border-subtle text-theme-text-secondary hover:border-amber-500/40'
                          }`}
                        >
                          <div className="font-bold truncate text-theme-text">{ord.name}</div>
                          <div className="text-[10px] text-amber-300/90 font-mono">{ord.shortName}</div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {showRiledUpControl && onPatchUnitPlayState && (
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[11px] font-semibold text-theme-text-muted shrink-0">
                    Waaagh!
                  </span>
                  {isRiledUp && (
                    <span className="text-[10px] text-emerald-300/85 font-mono truncate">
                      5+ InSv • Assault • Adv+Chg
                    </span>
                  )}
                </div>
                {isAlwaysRiledUp ? (
                  <span className="min-h-[28px] px-2.5 py-0.5 rounded-lg border border-emerald-500/50 bg-emerald-500/15 text-emerald-300 text-[11px] font-bold flex items-center gap-1 shrink-0">
                    <Flame className="w-3 h-3 stroke-[2.2]" />
                    <span>Riled Up (Always)</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      onPatchUnitPlayState(unit.instanceId, {
                        riledUp: !isRiledUp
                      })
                    }
                    className={`min-h-[28px] px-2.5 py-0.5 rounded-lg border text-[11px] font-bold flex items-center gap-1.5 transition-colors shrink-0 ${
                      isRiledUp
                        ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300 hover:bg-emerald-500/30'
                        : 'bg-theme-surface border-theme-border-subtle text-theme-text-secondary hover:border-amber-500/40'
                    }`}
                  >
                    {isRiledUp ? (
                      <>
                        <Flame className="w-3 h-3 stroke-[2.2]" />
                        <span>Riled Up</span>
                      </>
                    ) : (
                      <span>+ Riled Up</span>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Fallback local Datasheet Modal when not hoisted to parent */}
      {!onOpenDatasheet && (
        <DatasheetModal
          unit={unit.datasheet}
          selectedUnit={unit}
          allUnitsInRoster={allUnitsInRoster}
          availableEnhancements={availableEnhancements}
          selectedDetachments={selectedDetachments}
          isPlayMode={isPlayMode}
          playState={playState}
          onStepPlayRemaining={onStepPlayRemaining}
          onUpdateUnit={onUpdateUnit}
          onSetWarlord={onSetWarlord}
          isOpen={isDatasheetOpen}
          onClose={() => setIsDatasheetOpen(false)}
        />
      )}
    </>
  );
};
