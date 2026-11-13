import React, { useState, useEffect, useMemo } from 'react';
import {
  Package,
  Plus,
  Minus,
  Trash2,
  Search,
  X,
  Shield,
  Loader2,
  Check,
  Sparkles
} from 'lucide-react';
import { FactionSummary, FactionDetail } from '../types/faction';
import {
  Datasheet,
  getUnitRole,
  isLegendsUnit,
  isUnitAllowedForChapter
} from '../types/roster';
import factionsIndexData from '../data/factions_index.json';
import {
  OwnedFactionInventory,
  OwnedUnitEntry,
  saveOwnedFaction,
  deleteOwnedFaction
} from '../utils/ownedModelsStorage';

interface OwnedModelsViewProps {
  ownedModels: Record<string, OwnedFactionInventory>;
  onUpdateOwnedModels: (next: Record<string, OwnedFactionInventory>) => void;
  onOpenAiArmyCreator?: () => void;
}

const ROLE_ORDER = [
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

export const OwnedModelsView: React.FC<OwnedModelsViewProps> = ({
  ownedModels,
  onUpdateOwnedModels,
  onOpenAiArmyCreator
}) => {
  const factions = factionsIndexData as FactionSummary[];
  const trackedFactionIds = Object.keys(ownedModels);

  const [selectedFactionId, setSelectedFactionId] = useState<string>(
    () => trackedFactionIds[0] || ''
  );
  const [isAddFactionOpen, setIsAddFactionOpen] = useState(false);
  const [superFactionTab, setSuperFactionTab] = useState<'Imperium' | 'Chaos' | 'Xenos'>('Imperium');
  const [factionSearch, setFactionSearch] = useState('');

  // Faction datasheets state for adding units
  const [factionData, setFactionData] = useState<FactionDetail | null>(null);
  const [isLoadingFaction, setIsLoadingFaction] = useState(false);
  const [isAddUnitModalOpen, setIsAddUnitModalOpen] = useState(false);
  const [unitSearch, setUnitSearch] = useState('');
  const [unitRoleFilter, setUnitRoleFilter] = useState('All');
  const [includeLegends, setIncludeLegends] = useState(false);
  const [ownedSearch, setOwnedSearch] = useState('');

  // Keep selectedFactionId valid if tracked list changes
  useEffect(() => {
    if (selectedFactionId && ownedModels[selectedFactionId]) return;
    const keys = Object.keys(ownedModels);
    if (keys.length > 0) {
      setSelectedFactionId(keys[0]);
    } else {
      setSelectedFactionId('');
    }
  }, [ownedModels, selectedFactionId]);

  // Fetch faction datasheets when opening Add Unit modal or switching tracked faction
  useEffect(() => {
    if (!selectedFactionId) {
      setFactionData(null);
      return;
    }

    let active = true;
    setIsLoadingFaction(true);
    fetch(`${import.meta.env.BASE_URL}data/factions/${selectedFactionId}.json`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: FactionDetail | null) => {
        if (active) setFactionData(data);
      })
      .catch((err) => {
        console.error('Failed to load faction datasheets for owned models:', err);
        if (active) setFactionData(null);
      })
      .finally(() => {
        if (active) setIsLoadingFaction(false);
      });

    return () => {
      active = false;
    };
  }, [selectedFactionId]);

  const currentInventory = selectedFactionId ? ownedModels[selectedFactionId] : null;
  const currentFactionSummary = factions.find((f) => f.id === selectedFactionId);

  const handleSelectOrCreateFaction = (fac: FactionSummary) => {
    if (!ownedModels[fac.id]) {
      const updated = saveOwnedFaction({
        factionId: fac.id,
        factionName: fac.name,
        units: [],
        updatedAt: new Date().toISOString()
      });
      onUpdateOwnedModels(updated);
    }
    setSelectedFactionId(fac.id);
    setIsAddFactionOpen(false);
    setFactionSearch('');
  };

  const handleRemoveFaction = (factionId: string) => {
    const updated = deleteOwnedFaction(factionId);
    onUpdateOwnedModels(updated);
  };

  const handleAddUnit = (ds: Datasheet) => {
    if (!currentInventory) return;
    const minModels = ds.minModels || 1;
    const maxModels = ds.maxModels || minModels;
    const existingIdx = currentInventory.units.findIndex(
      (u) => u.datasheetId === ds.id || u.name === ds.name
    );

    let nextUnits: OwnedUnitEntry[];
    if (existingIdx >= 0) {
      nextUnits = currentInventory.units.map((u, idx) =>
        idx === existingIdx
          ? { ...u, modelsCount: u.modelsCount + minModels }
          : u
      );
    } else {
      nextUnits = [
        ...currentInventory.units,
        {
          datasheetId: ds.id,
          name: ds.name,
          role: getUnitRole(ds),
          modelsCount: minModels,
          minModels,
          maxModels,
          baseCost: ds.baseCost || 0
        }
      ];
    }

    const updated = saveOwnedFaction({
      ...currentInventory,
      units: nextUnits
    });
    onUpdateOwnedModels(updated);
  };

  const handleSetModelCount = (datasheetId: string, nextCount: number) => {
    if (!currentInventory) return;
    const clamped = Math.max(0, Math.floor(nextCount));
    const nextUnits =
      clamped === 0
        ? currentInventory.units.filter((u) => u.datasheetId !== datasheetId)
        : currentInventory.units.map((u) =>
            u.datasheetId === datasheetId ? { ...u, modelsCount: clamped } : u
          );

    const updated = saveOwnedFaction({
      ...currentInventory,
      units: nextUnits
    });
    onUpdateOwnedModels(updated);
  };

  const availableUnitsForPicker = useMemo(() => {
    if (!factionData?.units || !selectedFactionId) return [];
    const subName = currentFactionSummary?.isSubFaction ? currentFactionSummary.name : undefined;
    return factionData.units
      .filter((d) => {
        if (!isUnitAllowedForChapter(d, selectedFactionId, subName)) return false;
        if (!includeLegends && isLegendsUnit(d)) return false;
        if (unitRoleFilter !== 'All' && getUnitRole(d) !== unitRoleFilter) return false;
        if (unitSearch.trim()) {
          const q = unitSearch.toLowerCase();
          if (
            !d.name.toLowerCase().includes(q) &&
            !(d.categories || []).some((c) => c.toLowerCase().includes(q))
          ) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [factionData, selectedFactionId, currentFactionSummary, includeLegends, unitRoleFilter, unitSearch]);

  const pickerRoles = useMemo(() => {
    if (!factionData?.units || !selectedFactionId) return ['All'];
    const subName = currentFactionSummary?.isSubFaction ? currentFactionSummary.name : undefined;
    const roleSet = new Set<string>();
    for (const d of factionData.units) {
      if (!isUnitAllowedForChapter(d, selectedFactionId, subName)) continue;
      if (!includeLegends && isLegendsUnit(d)) continue;
      roleSet.add(getUnitRole(d));
    }
    return ['All', ...ROLE_ORDER.filter((r) => roleSet.has(r))];
  }, [factionData, selectedFactionId, currentFactionSummary, includeLegends]);

  const groupedOwnedUnits = useMemo(() => {
    if (!currentInventory) return [];
    const q = ownedSearch.trim().toLowerCase();
    const filtered = q
      ? currentInventory.units.filter((u) => u.name.toLowerCase().includes(q))
      : currentInventory.units;

    const groups = new Map<string, OwnedUnitEntry[]>();
    for (const u of filtered) {
      const role = u.role || 'Other';
      if (!groups.has(role)) groups.set(role, []);
      groups.get(role)!.push(u);
    }

    return Array.from(groups.entries())
      .sort(([a], [b]) => {
        const ia = ROLE_ORDER.indexOf(a);
        const ib = ROLE_ORDER.indexOf(b);
        return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib);
      })
      .map(([role, units]) => ({
        role,
        units: units.sort((a, b) => a.name.localeCompare(b.name))
      }));
  }, [currentInventory, ownedSearch]);

  const totalModelsInFaction = currentInventory
    ? currentInventory.units.reduce((sum, u) => sum + u.modelsCount, 0)
    : 0;

  // Factions filtered for Add Faction modal
  const selectableFactions = useMemo(() => {
    const q = factionSearch.trim().toLowerCase();
    return factions
      .filter((f) => {
        if (q) return f.name.toLowerCase().includes(q);
        return f.superFaction.toLowerCase() === superFactionTab.toLowerCase();
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [factions, superFactionTab, factionSearch]);

  return (
    <div className="space-y-4">
      {/* Header & Tracked Armies Bar */}
      <div className="bg-theme-surface border border-theme-border-subtle rounded-2xl p-4 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
          <div>
            <h2 className="font-warhammer text-base sm:text-lg font-bold text-theme-text flex items-center gap-2">
              <Package className="w-5 h-5 text-sky-400" />
              <span>Owned Models Collection</span>
            </h2>
            <p className="text-xs text-theme-text-secondary mt-0.5">
              Track the units and model counts you own per army. The AI Army Builder will build lists using only your owned models.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {onOpenAiArmyCreator && totalModelsInFaction > 0 && (
              <button
                type="button"
                onClick={onOpenAiArmyCreator}
                className="min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white shadow-sm flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Build AI List</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsAddFactionOpen(true)}
              className="btn-theme-primary min-h-[36px] px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Track Army</span>
            </button>
          </div>
        </div>

        {/* Tracked Army Pills */}
        {trackedFactionIds.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-theme-border-subtle">
            {trackedFactionIds.map((fid) => {
              const inv = ownedModels[fid];
              const count = inv.units.reduce((s, u) => s + u.modelsCount, 0);
              const isSelected = fid === selectedFactionId;
              return (
                <button
                  key={fid}
                  type="button"
                  onClick={() => setSelectedFactionId(fid)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-2 ${
                    isSelected
                      ? 'bg-sky-950/80 border-sky-500 text-white shadow-sm'
                      : 'bg-theme-card border-theme-border text-theme-text-secondary hover:text-theme-text'
                  }`}
                >
                  <span>{inv.factionName}</span>
                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-900/90 text-sky-300 border border-slate-700/80">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Empty State: No Faction Tracked */}
      {!currentInventory ? (
        <div className="bg-theme-surface border border-theme-border-subtle rounded-2xl p-8 sm:p-12 text-center max-w-lg mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-sky-950/60 border border-sky-700/50 flex items-center justify-center mx-auto mb-4 text-sky-400">
            <Package className="w-7 h-7" />
          </div>
          <h3 className="font-warhammer text-base sm:text-lg font-bold text-theme-text mb-2">
            No Armies Tracked Yet
          </h3>
          <p className="text-xs sm:text-sm text-theme-text-secondary mb-5 leading-relaxed">
            Pick your first Warhammer 40,000 army to start logging the units and models on your shelf.
          </p>
          <button
            type="button"
            onClick={() => setIsAddFactionOpen(true)}
            className="btn-theme-primary min-h-[42px] px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Select an Army to Track</span>
          </button>
        </div>
      ) : (
        /* Active Army Collection */
        <div className="bg-theme-surface border border-theme-border-subtle rounded-2xl p-4 shadow-md space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-theme-border-subtle">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-warhammer text-base sm:text-lg font-extrabold text-theme-text">
                  {currentInventory.factionName}
                </h3>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-lg bg-sky-950/70 text-sky-300 border border-sky-700/50">
                  {currentInventory.units.length} units • {totalModelsInFaction} models
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative flex-1 sm:w-52">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={ownedSearch}
                  onChange={(e) => setOwnedSearch(e.target.value)}
                  placeholder="Filter owned units..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>

              <button
                type="button"
                onClick={() => setIsAddUnitModalOpen(true)}
                className="btn-theme-primary min-h-[36px] px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Add Unit</span>
              </button>

              <button
                type="button"
                onClick={() => handleRemoveFaction(currentInventory.factionId)}
                className="btn-theme-danger-icon min-h-[36px] min-w-[36px] rounded-xl"
                title={`Stop tracking ${currentInventory.factionName}`}
                aria-label={`Remove ${currentInventory.factionName}`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {currentInventory.units.length === 0 ? (
            <div className="py-10 text-center space-y-3">
              <p className="text-xs sm:text-sm text-theme-text-secondary">
                No units added to {currentInventory.factionName} yet.
              </p>
              <button
                type="button"
                onClick={() => setIsAddUnitModalOpen(true)}
                className="btn-theme-secondary min-h-[38px] px-4 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4 text-sky-400" />
                <span>Browse {currentInventory.factionName} Units</span>
              </button>
            </div>
          ) : groupedOwnedUnits.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No owned units match &ldquo;{ownedSearch}&rdquo;.
            </div>
          ) : (
            <div className="space-y-5">
              {groupedOwnedUnits.map((group) => (
                <div key={group.role}>
                  <h4 className="font-warhammer text-xs font-bold uppercase tracking-wider text-sky-400 mb-2 flex items-center gap-2">
                    <Shield className="w-3.5 h-3.5" />
                    <span>{group.role}</span>
                    <span className="text-slate-500 font-mono">
                      ({group.units.reduce((s, u) => s + u.modelsCount, 0)} models)
                    </span>
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {group.units.map((u) => (
                      <div
                        key={u.datasheetId}
                        className="card-theme-item px-3.5 py-2.5 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="font-warhammer text-xs sm:text-sm font-bold text-theme-text truncate">
                            {u.name}
                          </div>
                          <div className="text-[11px] text-theme-text-muted font-mono">
                            Unit size: {u.minModels}
                            {u.maxModels > u.minModels ? `–${u.maxModels}` : ''} models • {u.baseCost} pts base
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => handleSetModelCount(u.datasheetId, u.modelsCount - 1)}
                            className="btn-theme-icon w-8 h-8 rounded-lg"
                            aria-label={`Decrease ${u.name} owned count`}
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>

                          <input
                            type="number"
                            min={0}
                            value={u.modelsCount}
                            onChange={(e) =>
                              handleSetModelCount(u.datasheetId, parseInt(e.target.value, 10) || 0)
                            }
                            className="w-12 h-8 text-center font-mono text-xs font-bold bg-slate-900 border border-slate-700 rounded-lg text-sky-300 focus:outline-none focus:border-sky-500"
                            aria-label={`${u.name} model count`}
                          />

                          <button
                            type="button"
                            onClick={() => handleSetModelCount(u.datasheetId, u.modelsCount + 1)}
                            className="btn-theme-icon w-8 h-8 rounded-lg"
                            aria-label={`Increase ${u.name} owned count`}
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSetModelCount(u.datasheetId, 0)}
                            className="btn-theme-danger-icon w-8 h-8 rounded-lg ml-0.5"
                            title={`Remove ${u.name}`}
                            aria-label={`Remove ${u.name}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal: Track New Army / Faction */}
      {isAddFactionOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md"
          onClick={() => setIsAddFactionOpen(false)}
        >
          <div
            className="bg-slate-900 border border-slate-700 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-slate-800">
              <h3 className="font-warhammer text-base font-bold text-slate-100">
                Select Army to Track
              </h3>
              <button
                type="button"
                onClick={() => setIsAddFactionOpen(false)}
                className="btn-theme-icon w-9 h-9 rounded-xl"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-3 border-b border-slate-800 bg-slate-900/70">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={factionSearch}
                  onChange={(e) => setFactionSearch(e.target.value)}
                  placeholder="Search factions (e.g. Salamanders, Necrons, Orks)..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>

              {!factionSearch.trim() && (
                <div className="grid grid-cols-3 gap-2">
                  {(['Imperium', 'Chaos', 'Xenos'] as const).map((sf) => (
                    <button
                      key={sf}
                      type="button"
                      onClick={() => setSuperFactionTab(sf)}
                      className={`py-1.5 rounded-xl text-xs font-bold border transition-all ${
                        superFactionTab === sf
                          ? 'bg-sky-950/80 border-sky-500 text-sky-300'
                          : 'bg-slate-850 border-slate-750 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {sf}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 overflow-y-auto flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {selectableFactions.map((fac) => {
                const alreadyTracked = Boolean(ownedModels[fac.id]);
                return (
                  <button
                    key={fac.id}
                    type="button"
                    onClick={() => handleSelectOrCreateFaction(fac)}
                    className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between gap-2 ${
                      alreadyTracked
                        ? 'bg-sky-950/40 border-sky-600/60 text-sky-200'
                        : 'bg-slate-850 border-slate-750 hover:border-sky-500/60 text-slate-200'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="font-warhammer text-xs sm:text-sm font-bold truncate">
                        {fac.name}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {fac.superFaction}{fac.isSubFaction ? ' • Subfaction' : ''}
                      </div>
                    </div>
                    {alreadyTracked && <Check className="w-4 h-4 text-sky-400 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Units to Selected Army */}
      {isAddUnitModalOpen && currentInventory && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md"
          onClick={() => setIsAddUnitModalOpen(false)}
        >
          <div
            className="bg-slate-900 border border-slate-700 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-slate-800">
              <div>
                <h3 className="font-warhammer text-base font-bold text-slate-100">
                  Add Owned {currentInventory.factionName} Units
                </h3>
                <p className="text-[11px] text-slate-400">
                  Click + Add to log a unit with its base squad size, or adjust counts anytime.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddUnitModalOpen(false)}
                className="btn-theme-icon w-9 h-9 rounded-xl"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 sm:p-4 border-b border-slate-800 bg-slate-900/80 space-y-2.5">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={unitSearch}
                    onChange={(e) => setUnitSearch(e.target.value)}
                    placeholder="Search units by name or keyword..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500"
                  />
                </div>
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer px-2 py-1.5 rounded-lg bg-slate-850 border border-slate-750">
                  <input
                    type="checkbox"
                    checked={includeLegends}
                    onChange={(e) => setIncludeLegends(e.target.checked)}
                    className="rounded border-slate-600 bg-slate-900 text-sky-500"
                  />
                  <span>Include Legends</span>
                </label>
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {pickerRoles.map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setUnitRoleFilter(role)}
                    className={`whitespace-nowrap px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                      unitRoleFilter === role
                        ? 'bg-sky-600 text-white border-sky-400'
                        : 'bg-slate-850 text-slate-300 border-slate-750 hover:border-slate-600'
                    }`}
                  >
                    {role}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 sm:p-4 overflow-y-auto flex-1 space-y-2">
              {isLoadingFaction ? (
                <div className="py-12 flex items-center justify-center gap-2 text-sky-400 text-sm">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Loading {currentInventory.factionName} units...</span>
                </div>
              ) : availableUnitsForPicker.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-400">
                  No units match your search/filter.
                </div>
              ) : (
                availableUnitsForPicker.map((ds) => {
                  const ownedEntry = currentInventory.units.find(
                    (u) => u.datasheetId === ds.id || u.name === ds.name
                  );
                  return (
                    <div
                      key={ds.id}
                      className="p-3 rounded-xl bg-slate-850 border border-slate-750 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-warhammer text-xs sm:text-sm font-bold text-slate-100 truncate">
                            {ds.name}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-700">
                            {getUnitRole(ds)}
                          </span>
                          {ownedEntry && (
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-950/70 text-emerald-300 border border-emerald-700/50">
                              Owned: {ownedEntry.modelsCount}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                          Base squad: {ds.minModels || 1}
                          {ds.maxModels && ds.maxModels > (ds.minModels || 1)
                            ? `–${ds.maxModels}`
                            : ''}{' '}
                          models • {ds.baseCost} pts
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleAddUnit(ds)}
                        className="btn-theme-primary min-h-[34px] px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 flex-shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>{ownedEntry ? `+${ds.minModels || 1}` : 'Add'}</span>
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
