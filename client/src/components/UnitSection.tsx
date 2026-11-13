import React from 'react';
import { Plus } from 'lucide-react';
import { SelectedUnit, Enhancement, SelectedDetachment, getUnitTotalPts } from '../types/roster';
import { UnitCard } from './UnitCard';

interface UnitSectionProps {
  title: string;
  roleKey: string;
  units: SelectedUnit[];
  allUnitsInRoster: SelectedUnit[];
  availableEnhancements: Enhancement[];
  selectedDetachments?: SelectedDetachment[];
  isPlayMode?: boolean;
  unitLimit: number;
  onOpenBrowser: (roleKey: string) => void;
  onUpdateUnit: (updated: SelectedUnit) => void;
  onDuplicateUnit: (unit: SelectedUnit) => void;
  onRemoveUnit: (instanceId: string) => void;
  onSetWarlord: (instanceId: string) => void;
}

export const UnitSection: React.FC<UnitSectionProps> = ({
  title,
  roleKey,
  units,
  allUnitsInRoster,
  availableEnhancements,
  selectedDetachments = [],
  isPlayMode = false,
  onOpenBrowser,
  onUpdateUnit,
  onDuplicateUnit,
  onRemoveUnit,
  onSetWarlord
}) => {
  const sectionPoints = units.reduce((acc, u) => acc + getUnitTotalPts(u), 0);
  const hasUnits = units.length > 0;

  if (isPlayMode && !hasUnits) {
    return null;
  }

  return (
    <section
      className={
        hasUnits
          ? 'panel-theme-section'
          : 'bg-theme-surface/40 border border-theme-border-subtle/60 rounded-xl px-3.5 py-2.5 transition-colors hover:bg-theme-surface/70'
      }
    >
      {/* Section Header */}
      <div className={hasUnits ? 'section-theme-header' : 'flex items-center justify-between gap-2 pl-2 border-l-2 border-theme-accent/60'}>
        <div className="flex items-center gap-2 min-w-0">
          <h3
            className={
              hasUnits
                ? 'section-theme-title truncate'
                : 'font-warhammer text-xs sm:text-sm font-bold tracking-wider uppercase text-theme-accent-soft/85 truncate'
            }
          >
            {title}
          </h3>
          <span className={`text-xs font-mono font-semibold ${hasUnits ? 'text-theme-accent-soft/80' : 'text-theme-text-muted'}`}>
            ({units.length})
          </span>
          {sectionPoints > 0 && (
            <span className="text-xs sm:text-sm font-mono text-theme-text font-bold whitespace-nowrap">
              • {sectionPoints} pts
            </span>
          )}
        </div>

        {!isPlayMode && (
          <button
            type="button"
            onClick={() => onOpenBrowser(roleKey)}
            className="btn-theme-secondary min-h-[30px] px-2.5 py-1 rounded-lg flex items-center gap-1 text-xs font-semibold tracking-wide shrink-0"
            title={`Add ${title}`}
            aria-label={`Add ${title}`}
          >
            <Plus className="w-3.5 h-3.5 text-theme-accent-soft stroke-[2.5]" />
            <span>Add</span>
          </button>
        )}
      </div>

      {/* Units List */}
      {hasUnits && (
        <div className={isPlayMode ? 'space-y-3 mt-3' : 'space-y-2 mt-3'}>
          {units.map((u) => (
            <UnitCard
              key={u.instanceId}
              unit={u}
              allUnitsInRoster={allUnitsInRoster}
              availableEnhancements={availableEnhancements}
              selectedDetachments={selectedDetachments}
              isPlayMode={isPlayMode}
              onUpdateUnit={onUpdateUnit}
              onDuplicateUnit={onDuplicateUnit}
              onRemoveUnit={onRemoveUnit}
              onSetWarlord={onSetWarlord}
            />
          ))}
        </div>
      )}
    </section>
  );
};
