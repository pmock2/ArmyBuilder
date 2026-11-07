import React, { useState } from 'react';
import { Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { SelectedUnit, Enhancement } from '../types/roster';
import { UnitCard } from './UnitCard';

interface UnitSectionProps {
  title: string;
  roleKey: string;
  units: SelectedUnit[];
  allUnitsInRoster: SelectedUnit[];
  availableEnhancements: Enhancement[];
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
  unitLimit,
  onOpenBrowser,
  onUpdateUnit,
  onDuplicateUnit,
  onRemoveUnit,
  onSetWarlord
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Total points for this role
  const sectionPoints = units.reduce((acc, u) => acc + u.cost + (u.enhancement ? u.enhancement.pts : 0), 0);

  return (
    <div className="bg-grimdark-950/60 border border-grimdark-800 rounded-2xl p-4 sm:p-5 mb-5 shadow-lg">
      
      {/* Section Header */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex items-center gap-2.5 cursor-pointer select-none group"
        >
          <button 
            type="button" 
            className="p-1 rounded text-grimdark-400 group-hover:text-amber-400 transition-colors"
          >
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
          
          <h3 className="font-warhammer text-sm sm:text-base font-bold text-amber-200 group-hover:text-amber-300 transition-colors">
            {title}
          </h3>

          <span className="text-xs px-2 py-0.5 rounded-full bg-grimdark-900 border border-grimdark-800 text-grimdark-400 font-mono">
            {units.length} {unitLimit ? `/ ${unitLimit}` : ''}
          </span>

          {sectionPoints > 0 && (
            <span className="text-xs font-mono text-amber-400/80 font-bold hidden sm:inline">
              ({sectionPoints} pts)
            </span>
          )}
        </div>

        {/* Add Unit Button */}
        <button
          type="button"
          onClick={() => onOpenBrowser(roleKey)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-grimdark-850 hover:bg-amber-600 hover:text-black text-amber-400 border border-amber-600/40 font-semibold text-xs transition-all shadow-sm active:scale-95"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Add {title.replace(/s$/, '')}</span>
        </button>
      </div>

      {/* Units List */}
      {!isCollapsed && (
        <div>
          {units.length === 0 ? (
            <div 
              onClick={() => onOpenBrowser(roleKey)}
              className="text-center py-6 border border-dashed border-grimdark-800 rounded-xl hover:border-amber-600/40 hover:bg-grimdark-900/30 cursor-pointer transition-all"
            >
              <p className="text-xs text-grimdark-500 font-medium">
                No {title.toLowerCase()} added yet. Click to muster units.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {units.map((u) => (
                <UnitCard
                  key={u.instanceId}
                  unit={u}
                  allUnitsInRoster={allUnitsInRoster}
                  availableEnhancements={availableEnhancements}
                  onUpdateUnit={onUpdateUnit}
                  onDuplicateUnit={onDuplicateUnit}
                  onRemoveUnit={onRemoveUnit}
                  onSetWarlord={onSetWarlord}
                />
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
};
