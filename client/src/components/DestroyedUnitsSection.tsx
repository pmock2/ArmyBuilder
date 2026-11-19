import React from 'react';
import { Skull } from 'lucide-react';
import { SelectedUnit, Enhancement, SelectedDetachment, getUnitTotalPts } from '../types/roster';
import { RosterPlayState } from '../utils/playTracking';
import { UnitCard } from './UnitCard';

interface DestroyedUnitsSectionProps {
  units: SelectedUnit[];
  allUnitsInRoster: SelectedUnit[];
  availableEnhancements: Enhancement[];
  selectedDetachments?: SelectedDetachment[];
  playState: RosterPlayState;
  onStepPlayRemaining: (unit: SelectedUnit, delta: number) => void;
  onOpenDatasheet: (unit: SelectedUnit) => void;
  onUpdateUnit: (updated: SelectedUnit) => void;
  onDuplicateUnit: (unit: SelectedUnit) => void;
  onRemoveUnit: (instanceId: string) => void;
  onSetWarlord: (instanceId: string) => void;
}

export const DestroyedUnitsSection: React.FC<DestroyedUnitsSectionProps> = ({
  units,
  allUnitsInRoster,
  availableEnhancements,
  selectedDetachments = [],
  playState,
  onStepPlayRemaining,
  onOpenDatasheet,
  onUpdateUnit,
  onDuplicateUnit,
  onRemoveUnit,
  onSetWarlord
}) => {
  if (units.length === 0) return null;

  const destroyedPoints = units.reduce(
    (acc, u) => acc + getUnitTotalPts(u, allUnitsInRoster),
    0
  );

  return (
    <section
      aria-label="Destroyed Units"
      className="panel-theme-section border-red-900/50 bg-red-950/10"
    >
      <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-red-950/35 border border-red-800/40 border-l-4 border-l-red-500">
        <div className="flex items-center gap-2 min-w-0">
          <Skull className="w-4 h-4 text-red-400 shrink-0" />
          <h3 className="font-warhammer text-xs sm:text-sm font-extrabold tracking-wider uppercase text-red-300 truncate">
            Destroyed Units
          </h3>
          <span className="text-xs font-mono font-semibold text-red-300/80">
            ({units.length})
          </span>
          {destroyedPoints > 0 && (
            <span className="text-xs sm:text-sm font-mono text-red-200 font-bold whitespace-nowrap">
              • {destroyedPoints} pts
            </span>
          )}
        </div>
      </div>

      <div className="space-y-2.5 mt-3">
        {units.map((u) => (
          <UnitCard
            key={u.instanceId}
            unit={u}
            allUnitsInRoster={allUnitsInRoster}
            availableEnhancements={availableEnhancements}
            selectedDetachments={selectedDetachments}
            isPlayMode
            isDestroyedCard
            playState={playState}
            onStepPlayRemaining={onStepPlayRemaining}
            onOpenDatasheet={onOpenDatasheet}
            onUpdateUnit={onUpdateUnit}
            onDuplicateUnit={onDuplicateUnit}
            onRemoveUnit={onRemoveUnit}
            onSetWarlord={onSetWarlord}
          />
        ))}
      </div>
    </section>
  );
};
