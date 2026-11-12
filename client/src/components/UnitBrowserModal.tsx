import React, { useState, useEffect, useMemo } from 'react';
import { X, Search, Plus, Eye } from 'lucide-react';
import { Datasheet, SelectedUnit, BattleSize, getUnitRole, isLegendsUnit, isUnitAllowedForChapter } from '../types/roster';
import { BATTLE_SIZE_CONFIGS } from '../utils/validator';
import { DatasheetModal } from './DatasheetModal';

interface UnitBrowserModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableDatasheets: Datasheet[];
  unitsInRoster: SelectedUnit[];
  battleSize: BattleSize;
  initialRoleFilter?: string;
  includeLegends?: boolean;
  factionId?: string;
  subFactionName?: string | null;
  onToggleLegends?: (enabled: boolean) => void;
  onAddUnit: (datasheet: Datasheet) => void;
}

export const UnitBrowserModal: React.FC<UnitBrowserModalProps> = ({
  isOpen,
  onClose,
  availableDatasheets,
  unitsInRoster,
  battleSize,
  initialRoleFilter = 'All',
  includeLegends = false,
  factionId = '',
  subFactionName = null,
  onAddUnit
}) => {
  const [search, setSearch] = useState('');
  const [inspectDatasheet, setInspectDatasheet] = useState<Datasheet | null>(null);

  // Reset search whenever modal opens or role changes
  useEffect(() => {
    if (isOpen) {
      setSearch('');
    }
  }, [isOpen, initialRoleFilter]);

  const limits = BATTLE_SIZE_CONFIGS[battleSize] || BATTLE_SIZE_CONFIGS['strike-force'];

  // Filter datasheets strictly by initialRoleFilter, legends setting, chapter exclusivity, and search query
  const filtered = useMemo(() => {
    return availableDatasheets.filter(d => {
      if (!isUnitAllowedForChapter(d, factionId, subFactionName)) {
        return false;
      }
      if (!includeLegends && isLegendsUnit(d)) {
        return false;
      }

      const unitRole = getUnitRole(d);
      if (initialRoleFilter && initialRoleFilter !== 'All') {
        if (unitRole !== initialRoleFilter) return false;
      }

      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = d.name.toLowerCase().includes(q);
        const matchCat = d.categories.some(c => c.toLowerCase().includes(q));
        const matchWeapon = [...d.rangedWeapons, ...d.meleeWeapons].some(w => w.name.toLowerCase().includes(q));
        if (!matchName && !matchCat && !matchWeapon) return false;
      }

      return true;
    });
  }, [availableDatasheets, initialRoleFilter, search, includeLegends, factionId, subFactionName]);

  if (!isOpen) return null;

  const getCountInRoster = (datasheetId: string) => {
    return unitsInRoster.filter(u => u.datasheetId === datasheetId).length;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-theme-bg/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-theme-surface border border-theme-border w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-theme-border-subtle bg-theme-surface">
          <div className="flex items-center gap-2">
            <h2 className="font-warhammer text-base sm:text-lg font-bold text-theme-text">
              {initialRoleFilter && initialRoleFilter !== 'All' ? initialRoleFilter : 'Muster Units'} ({filtered.length})
            </h2>
          </div>

          <button
            onClick={onClose}
            className="btn-theme-icon min-w-[38px] min-h-[38px] rounded-xl"
            aria-label="Close unit browser"
          >
            <X className="w-4 h-4 stroke-[2]" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-2.5 sm:p-3 border-b border-theme-border-subtle bg-theme-bg/50">
          <div className="relative">
            <Search className="w-4 h-4 text-theme-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search unit name, weapon, keyword..."
              className="w-full pl-9 pr-3 min-h-[40px] rounded-xl bg-theme-bg border border-theme-border text-theme-text text-base sm:text-sm focus:outline-none focus:border-theme-accent placeholder-theme-text-muted"
            />
          </div>
        </div>

        {/* Datasheet Cards Grid */}
        <div className="p-2.5 sm:p-4 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3">
          {filtered.length === 0 ? (
            <div className="col-span-full py-16 text-center text-sm font-medium text-theme-text-secondary">
              No matching {initialRoleFilter !== 'All' ? initialRoleFilter.toLowerCase() : ''} units found.
            </div>
          ) : (
            filtered.map((datasheet) => {
              const inRosterCount = getCountInRoster(datasheet.id);
              const maxAllowed = datasheet.isEpicHero ? 1 : datasheet.isBattleline ? limits.battlelineLimit : limits.unitLimit;
              const isMaxedOut = inRosterCount >= maxAllowed;

              return (
                <div
                  key={datasheet.id}
                  className="card-theme-item p-3 sm:p-3.5 flex items-center justify-between gap-3"
                >
                  {/* Left: Name, Points, and Count vs Allowed */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <h3
                        onClick={() => setInspectDatasheet(datasheet)}
                        className="font-warhammer text-sm sm:text-base font-bold text-theme-text hover:text-theme-accent-soft transition-colors cursor-pointer truncate"
                      >
                        {datasheet.name}
                      </h3>
                      <span className={`text-xs font-mono font-semibold px-2 py-0.5 rounded-md border ${
                        isMaxedOut
                          ? 'bg-amber-950/60 text-amber-300 border-amber-700/50'
                          : inRosterCount > 0
                          ? 'bg-theme-accent/15 text-theme-accent-soft border-theme-accent/35'
                          : 'bg-theme-bg/70 text-theme-text-muted border-theme-border-subtle'
                      }`}>
                        {inRosterCount}/{maxAllowed}
                      </span>
                    </div>

                    <div className="font-mono text-sm font-bold text-theme-text-secondary">
                      {datasheet.baseCost} pts
                    </div>
                  </div>

                  {/* Right: Eyeball to inspect & Plus to add */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => setInspectDatasheet(datasheet)}
                      className="btn-theme-icon min-h-[38px] min-w-[38px] rounded-xl"
                      title="Inspect datasheet"
                      aria-label={`Inspect ${datasheet.name} datasheet`}
                    >
                      <Eye className="w-4 h-4 stroke-[2]" />
                    </button>

                    <button
                      type="button"
                      disabled={isMaxedOut}
                      onClick={() => onAddUnit(datasheet)}
                      className={`min-h-[38px] min-w-[38px] px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition-all ${
                        isMaxedOut
                          ? 'bg-theme-elevated/40 text-theme-text-muted border border-theme-border-subtle cursor-not-allowed'
                          : 'btn-theme-primary'
                      }`}
                      title={isMaxedOut ? 'Maximum limit reached' : 'Add unit to roster'}
                      aria-label={`Add ${datasheet.name}`}
                    >
                      <Plus className="w-4 h-4 stroke-[2.5]" />
                      <span className="hidden sm:inline">Add</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Datasheet Inspection Modal */}
      <DatasheetModal
        unit={inspectDatasheet}
        isOpen={!!inspectDatasheet}
        onClose={() => setInspectDatasheet(null)}
      />
    </div>
  );
};
