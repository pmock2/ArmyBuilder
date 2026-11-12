import React, { useState } from 'react';
import { Star, Trash2, Copy, Eye } from 'lucide-react';
import {
  SelectedUnit,
  Enhancement,
  SelectedDetachment,
  isLegendsUnit,
  getUnitTotalPts,
  getUnitWargearPts
} from '../types/roster';
import { doesEnhancementAffectLedUnit } from '../utils/equippedStats';
import { DatasheetModal } from './DatasheetModal';

interface UnitCardProps {
  unit: SelectedUnit;
  allUnitsInRoster: SelectedUnit[];
  availableEnhancements: Enhancement[];
  selectedDetachments?: SelectedDetachment[];
  isPlayMode?: boolean;
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
  onUpdateUnit,
  onDuplicateUnit,
  onRemoveUnit,
  onSetWarlord
}) => {
  const [isDatasheetOpen, setIsDatasheetOpen] = useState(false);

  const wargearPts = getUnitWargearPts(unit);
  const totalCost = getUnitTotalPts(unit);

  // Attached unit references for subtitles
  const attachedLeader = allUnitsInRoster.find((u) => u.instanceId === unit.attachedLeaderId);
  const attachedSupport = allUnitsInRoster.find((u) => u.instanceId === unit.attachedSupportId);
  const attachedToBodyguard = allUnitsInRoster.find((u) => u.instanceId === unit.attachedToBodyguardId);

  const leaderUnitEnhancement =
    attachedLeader?.enhancement && doesEnhancementAffectLedUnit(attachedLeader.enhancement)
      ? { enhancement: attachedLeader.enhancement, leaderName: attachedLeader.name }
      : null;

  const supportUnitEnhancement =
    attachedSupport?.enhancement && doesEnhancementAffectLedUnit(attachedSupport.enhancement)
      ? { enhancement: attachedSupport.enhancement, leaderName: attachedSupport.name }
      : null;

  return (
    <>
      {/* Sleek, Elevated Unit Card */}
      <div
        onClick={() => setIsDatasheetOpen(true)}
        className="card-theme-item px-3.5 sm:px-4 py-3 flex flex-col gap-2.5 cursor-pointer active:scale-[0.998] group"
      >
        <div className="flex items-center justify-between gap-3">
          {/* Left: Name, Model Count, Badges */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              {unit.isWarlord && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-theme-accent/15 text-theme-accent-soft border border-theme-accent/35 flex items-center gap-1 font-mono tracking-wider">
                  <Star className="w-2.5 h-2.5 fill-current" />
                  <span>WARLORD</span>
                </span>
              )}

              {isLegendsUnit(unit) && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-theme-elevated text-theme-text-secondary border border-theme-border font-mono tracking-wider">
                  LEGENDS
                </span>
              )}

              <h4 className="font-warhammer text-sm sm:text-base font-bold text-theme-text group-hover:text-theme-accent-soft transition-colors tracking-wide truncate">
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

              {attachedLeader && (
                <span className="text-theme-text-secondary font-medium truncate max-w-[220px]">
                  • Leader: {attachedLeader.name}
                </span>
              )}

              {leaderUnitEnhancement && (
                <span className="text-amber-300/95 font-medium truncate max-w-[280px]">
                  • {leaderUnitEnhancement.enhancement.name} (via {leaderUnitEnhancement.leaderName})
                </span>
              )}

              {attachedSupport && (
                <span className="text-theme-text-secondary font-medium truncate max-w-[220px]">
                  • Support: {attachedSupport.name}
                </span>
              )}

              {supportUnitEnhancement && (
                <span className="text-amber-300/95 font-medium truncate max-w-[280px]">
                  • {supportUnitEnhancement.enhancement.name} (via {supportUnitEnhancement.leaderName})
                </span>
              )}

              {attachedToBodyguard && (
                <span className="text-theme-text-muted font-medium truncate max-w-[200px]">
                  • Attached to: {attachedToBodyguard.name}
                </span>
              )}
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
                onClick={() => setIsDatasheetOpen(true)}
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
      </div>

      {/* Full Datasheet & Unit Configuration Modal */}
      <DatasheetModal
        unit={unit.datasheet}
        selectedUnit={unit}
        allUnitsInRoster={allUnitsInRoster}
        availableEnhancements={availableEnhancements}
        selectedDetachments={selectedDetachments}
        isPlayMode={isPlayMode}
        onUpdateUnit={onUpdateUnit}
        onSetWarlord={onSetWarlord}
        isOpen={isDatasheetOpen}
        onClose={() => setIsDatasheetOpen(false)}
      />
    </>
  );
};
