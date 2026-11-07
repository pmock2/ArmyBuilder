import React, { useState, useEffect, useMemo } from 'react';
import { X, Search, Plus, Eye, Check } from 'lucide-react';
import { Datasheet, SelectedUnit, BattleSize, getUnitRole } from '../types/roster';
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

  // Sync selectedRole whenever modal opens or initialRoleFilter changes
  useEffect(() => {
    if (isOpen) {
      setSelectedRole(initialRoleFilter || 'All');
      setSearch('');
    }
  }, [isOpen, initialRoleFilter]);

  const limits = BATTLE_SIZE_CONFIGS[battleSize] || BATTLE_SIZE_CONFIGS['strike-force'];

  // Calculate only the roles that this army actually has access to
  const roles = useMemo(() => {
    const rolesSet = new Set<string>();
    for (const d of availableDatasheets) {
      rolesSet.add(getUnitRole(d));
    }
    const canonical = [
      'Epic Hero',
      'Character',
      'Battleline',
      'Infantry',
      'Mounted',
      'Monster',
      'Vehicle',
      'Dedicated Transport',
      'Aircraft',
      'Fortification',
      'Allied Units'
    ];
    const active = canonical.filter(r => rolesSet.has(r));
    return ['All', ...active];
  }, [availableDatasheets]);

  // Filter datasheets strictly by getUnitRole and search query
  const filtered = useMemo(() => {
    return availableDatasheets.filter(d => {
      const unitRole = getUnitRole(d);

      // Strict role filter
      if (selectedRole !== 'All') {
        if (unitRole !== selectedRole) return false;
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
  }, [availableDatasheets, selectedRole, search]);

  if (!isOpen) return null;

  // Helper: Count how many times a datasheet is already in roster
  const getCountInRoster = (datasheetId: string) => {
    return unitsInRoster.filter(u => u.datasheetId === datasheetId).length;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-grimdark-900 border border-grimdark-700 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-grimdark-800 bg-grimdark-950/80">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-warhammer text-lg font-bold text-amber-300">
                Muster Units ({filtered.length})
              </h2>
              {selectedRole !== 'All' && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 font-semibold font-mono">
                  {selectedRole}
                </span>
              )}
            </div>
            <p className="text-xs text-grimdark-400 mt-0.5">
              Select datasheets to add to your army roster.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-grimdark-400 hover:text-white hover:bg-grimdark-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Role Filter Tabs (Only categories available to this army) */}
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
            {roles.map((r) => {
              const count = r === 'All' 
                ? availableDatasheets.length 
                : availableDatasheets.filter(d => getUnitRole(d) === r).length;

              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => setSelectedRole(r)}
                  className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition-all text-xs flex items-center gap-1.5 ${
                    selectedRole === r
                      ? 'bg-amber-600 text-black font-bold shadow'
                      : 'bg-grimdark-900 text-grimdark-400 hover:text-grimdark-200 hover:bg-grimdark-800 border border-grimdark-800'
                  }`}
                >
                  <span>{r}</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                    selectedRole === r ? 'bg-amber-800/40 text-black' : 'bg-grimdark-950 text-grimdark-500'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Datasheet Cards Grid */}
        <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.length === 0 ? (
            <div className="col-span-full py-12 text-center text-xs text-grimdark-500">
              No matching {selectedRole !== 'All' ? selectedRole.toLowerCase() : ''} units found.
            </div>
          ) : (
            filtered.map((datasheet) => {
              const inRosterCount = getCountInRoster(datasheet.id);
              const maxAllowed = datasheet.isEpicHero ? 1 : datasheet.isBattleline ? limits.battlelineLimit : limits.unitLimit;
              const isMaxedOut = inRosterCount >= maxAllowed;
              const role = getUnitRole(datasheet);

              return (
                <div
                  key={datasheet.id}
                  className="p-4 rounded-xl bg-grimdark-950 border border-grimdark-800 hover:border-grimdark-700 transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Top Tag & Cost */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-grimdark-900 text-grimdark-300 border border-grimdark-800">
                          {role}
                        </span>
                        {datasheet.isLeader && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-amber-950/60 text-amber-400 border border-amber-800/40">
                            Leader
                          </span>
                        )}
                        {datasheet.isSupport && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded bg-indigo-950/60 text-indigo-400 border border-indigo-800/40">
                            Support
                          </span>
                        )}
                      </div>

                      <span className="font-mono text-sm font-bold text-amber-400">
                        {datasheet.baseCost} pts
                      </span>
                    </div>

                    {/* Unit Name */}
                    <h3 className="font-warhammer text-sm font-bold text-amber-200 mb-1">
                      {datasheet.name}
                    </h3>

                    {/* Keywords preview */}
                    <div className="flex flex-wrap gap-1 mb-3">
                      {datasheet.keywords.slice(0, 4).map((kw) => (
                        <span
                          key={kw}
                          className="text-[9px] px-1.5 py-0.2 rounded bg-grimdark-900 text-grimdark-400 border border-grimdark-800"
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Action Bar */}
                  <div className="flex items-center justify-between gap-2 pt-3 border-t border-grimdark-800/60">
                    <button
                      type="button"
                      onClick={() => setInspectDatasheet(datasheet)}
                      className="p-1.5 rounded-lg bg-grimdark-900 hover:bg-grimdark-800 text-grimdark-400 hover:text-amber-300 border border-grimdark-800 transition-colors flex items-center gap-1 text-xs"
                      title="Inspect full datasheet"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Datasheet</span>
                    </button>

                    <button
                      type="button"
                      disabled={isMaxedOut}
                      onClick={() => onAddUnit(datasheet)}
                      className={`px-3 py-1.5 rounded-lg font-semibold text-xs flex items-center gap-1.5 transition-all ${
                        isMaxedOut
                          ? 'bg-grimdark-900 text-grimdark-600 border border-grimdark-850 cursor-not-allowed'
                          : 'bg-amber-600 hover:bg-amber-500 text-black shadow active:scale-95'
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>{inRosterCount > 0 ? `Add (${inRosterCount}/${maxAllowed})` : 'Add Unit'}</span>
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
