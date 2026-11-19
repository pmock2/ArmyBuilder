import React, { useState } from 'react';
import { Crown, Trash2, Copy, Eye, Skull } from 'lucide-react';
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
  getUnitPlayStatus,
  getAttachedChildrenForBodyguard,
  isUnitDestroyedInPlay
} from '../utils/playTracking';
import { DatasheetModal } from './DatasheetModal';
import { PlayTrackerRow } from './PlayTrackerRow';

interface UnitCardProps {
  unit: SelectedUnit;
  allUnitsInRoster: SelectedUnit[];
  availableEnhancements: Enhancement[];
  selectedDetachments?: SelectedDetachment[];
  isPlayMode?: boolean;
  playState?: RosterPlayState;
  isDestroyedCard?: boolean;
  onStepPlayRemaining?: (unit: SelectedUnit, delta: number) => void;
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
  onStepPlayRemaining,
  onOpenDatasheet,
  onUpdateUnit,
  onDuplicateUnit,
  onRemoveUnit,
  onSetWarlord
}) => {
  const [isDatasheetOpen, setIsDatasheetOpen] = useState(false);

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

  const primaryStatus = isPlayMode ? getUnitPlayStatus(unit, playState, allUnitsInRoster) : null;

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

        {/* Play Mode Models / Wounds Trackers */}
        {isPlayMode && primaryStatus && onStepPlayRemaining && (
          <div className="space-y-1.5 pt-0.5" onClick={(e) => e.stopPropagation()}>
            <PlayTrackerRow
              roleBadge={!isDestroyedCard && livingAttachedChildren.length > 0 ? 'Bodyguard' : undefined}
              label={
                !isDestroyedCard && livingAttachedChildren.length > 0
                  ? unit.name
                  : primaryStatus.isSingleModel
                  ? 'Wounds Remaining'
                  : 'Models Remaining'
              }
              status={primaryStatus}
              onStep={(delta) => onStepPlayRemaining(unit, delta)}
              compact
            />

            {!isDestroyedCard &&
              livingAttachedChildren.map((child) => {
                const childStatus = getUnitPlayStatus(child.unit, playState, allUnitsInRoster);
                return (
                  <PlayTrackerRow
                    key={child.unit.instanceId}
                    roleBadge={child.role}
                    label={child.unit.name}
                    subLabel={
                      child.unit.enhancement
                        ? `${child.unit.enhancement.name}${child.unit.isWarlord ? ' • Warlord' : ''}`
                        : child.unit.isWarlord
                        ? 'Warlord'
                        : undefined
                    }
                    status={childStatus}
                    onStep={(delta) => onStepPlayRemaining(child.unit, delta)}
                    compact
                  />
                );
              })}
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
