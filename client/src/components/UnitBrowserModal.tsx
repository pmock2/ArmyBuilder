import React, { useState } from 'react';
import { X, Search, Plus, Eye, Check } from 'lucide-react';
import { Datasheet, SelectedUnit, BattleSize } from '../types/roster';
import { BATTLE_SIZE_CONFIGS } from '../utils/validator';
import { DatasheetModal } from './DatasheetModal';

interface UnitBrowserModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableDatasheets: Datasheet[];
  unitsInRoster: SelectedUnit[];
  battleSize: BattleSize;
  initialRoleFilter?: string;
  onAddUnit: (datasheet: Datasheet) => void;
}

export const UnitBrowserModal: React.FC<UnitBrowserModalProps> = ({
  isOpen,
  onClose,
  availableDatasheets,
  unitsInRoster,
  battleSize,
  initialRoleFilter = 'All',
  onAddUnit
}) => {
  const [search, setSearch] = useState('');
  const [selectedRole, setSelectedRole] = useState(initialRoleFilter);
  const [inspectDatasheet, setInspectDatasheet] = useState<Datasheet | null>(null);

  if (!isOpen) return null;

  const limits = BATTLE_SIZE_CONFIGS[battleSize] || BATTLE_SIZE_CONFIGS['strike-force'];

  // All roles
  const roles = [
    'All',
    'Epic Hero',
    'Character',
    'Battleline',
    'Infantry',
    'Mounted',
    'Monster',
    'Vehicle',
    'Dedicated Transport',
    'Aircraft',
    'Fortification'
  ];

  // Filter datasheets
  const filtered = availableDatasheets.filter(d => {
    // Role filter
    if (selectedRole !== 'All') {
      if (selectedRole === 'Epic Hero' && !d.isEpicHero) return false;
      if (selectedRole === 'Character' && (!d.isCharacter || d.isEpicHero)) return false;
      if (selectedRole === 'Battleline' && !d.isBattleline) return false;
      if (selectedRole === 'Dedicated Transport' && !d.isDedicatedTransport) return false;
      if (
        selectedRole !== 'Epic Hero' &&
        selectedRole !== 'Character' &&
        selectedRole !== 'Battleline' &&
        selectedRole !== 'Dedicated Transport' &&
        d.primaryCategory.toLowerCase() !== selectedRole.toLowerCase()
      ) {
        return false;
      }
    }

    // Search query
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = d.name.toLowerCase().includes(q);
      const matchCat = d.categories.some(c => c.toLowerCase().includes(q));
      const matchWeapon = [...d.rangedWeapons, ...d.meleeWeapons].some(w => w.name.toLowerCase().includes(q));
      if (!matchName && !matchCat && !matchWeapon) return false;
    }

    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-grimdark-900 border border-grimdark-700 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-grimdark-800 bg-grimdark-950/80">
          <div>
            <h2 className="font-warhammer text-lg font-bold text-amber-300">
              Muster Units ({filtered.length})
            </h2>
            <p className="text-xs text-grimdark-400">
              Browse and select datasheets available to your army faction.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-grimdark-400 hover:text-white hover:bg-grimdark-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Role Filter Tabs */}
        <div className="p-4 border-b border-grimdark-800 bg-grimdark-950/50 space-y-3">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-grimdark-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by unit name, weapon, or keyword..."
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-grimdark-900 border border-grimdark-700 text-grimdark-200 text-xs focus:outline-none focus:border-amber-500 placeholder-grimdark-500"
            />
          </div>

          {/* Role Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {roles.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setSelectedRole(r)}
                className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition-all ${
                  selectedRole === r
                    ? 'bg-amber-600 text-black font-bold shadow'
                    : 'bg-grimdark-900 text-grimdark-400 hover:text-grimdark-200 hover:bg-grimdark-800 border border-grimdark-800'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        {/* Datasheet Cards Grid */}
        <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.length === 0 ? (
            <div className="col-span-full py-12 text-center text-xs text-grimdark-500">
              No matching units found.
            </div>
          ) : (
            filtered.map((d) => {
              // Count how many copies of this datasheet are currently in roster
              const currentCopies = unitsInRoster.filter(u => u.name === d.name).length;
              const maxAllowed = d.isEpicHero
                ? 1
                : (d.isBattleline || d.isDedicatedTransport)
                ? limits.battlelineLimit
                : limits.unitLimit;

              const isMaxReached = currentCopies >= maxAllowed;

              return (
                <div
                  key={d.id}
                  className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                    isMaxReached
                      ? 'bg-grimdark-950/40 border-grimdark-800 opacity-60'
                      : 'bg-grimdark-950 hover:bg-grimdark-850 border-grimdark-800 hover:border-amber-600/40'
                  }`}
                >
                  <div>
                    {/* Header: Category Badge & Points */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-grimdark-900 text-grimdark-300 border border-grimdark-800">
                          {d.primaryCategory}
                        </span>
                        {currentCopies > 0 && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-700/40">
                            {currentCopies} in Army
                          </span>
                        )}
                      </div>

                      <div className="font-mono text-sm font-bold text-amber-400">
                        {d.baseCost} pts
                      </div>
                    </div>

                    {/* Unit Title */}
                    <h3 className="font-warhammer text-sm font-bold text-amber-200 mb-2 truncate" title={d.name}>
                      {d.name}
                    </h3>

                    {/* Quick Stat Bar */}
                    <div className="grid grid-cols-6 gap-1 text-center font-mono text-[10px] py-1.5 px-2 bg-grimdark-900 rounded border border-grimdark-800 text-grimdark-300 mb-3">
                      <div><span className="text-grimdark-500 font-sans block">M</span>{d.stats.M}</div>
                      <div><span className="text-grimdark-500 font-sans block">T</span>{d.stats.T}</div>
                      <div><span className="text-grimdark-500 font-sans block">SV</span>{d.stats.Sv}</div>
                      <div><span className="text-grimdark-500 font-sans block">W</span><span className="text-amber-300">{d.stats.W}</span></div>
                      <div><span className="text-grimdark-500 font-sans block">LD</span>{d.stats.Ld}</div>
                      <div><span className="text-grimdark-500 font-sans block">OC</span><span className="text-amber-300">{d.stats.OC}</span></div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-2 border-t border-grimdark-800/80 flex items-center justify-between gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setInspectDatasheet(d)}
                      className="flex items-center gap-1 py-1 px-2 rounded hover:bg-grimdark-800 text-grimdark-400 hover:text-amber-300 transition-colors"
                      title="Inspect full datasheet"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Inspect</span>
                    </button>

                    <button
                      type="button"
                      disabled={isMaxReached}
                      onClick={() => onAddUnit(d)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
                        isMaxReached
                          ? 'bg-grimdark-800 text-grimdark-500 cursor-not-allowed'
                          : 'bg-amber-600 hover:bg-amber-500 text-black shadow active:scale-95'
                      }`}
                    >
                      {isMaxReached ? (
                        <span>Max Limit ({maxAllowed})</span>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                          <span>Add to Army</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-grimdark-800 bg-grimdark-950/80 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-grimdark-800 hover:bg-grimdark-700 text-grimdark-200 hover:text-white text-xs font-medium transition-colors"
          >
            Done
          </button>
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
