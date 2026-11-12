import React, { useState, useEffect } from 'react';
import { X, Shield, Swords, Crosshair, Sparkles, Tag, Users, Star, Eye, Check, ChevronDown, ChevronRight, Plus, Minus } from 'lucide-react';
import {
  Datasheet,
  SelectedUnit,
  Enhancement,
  SelectedDetachment,
  WargearOption,
  isLegendsUnit,
  getUnitWargearPts,
  getUnitTotalPts,
  getEligibleEnhancementsForUnit,
  getUnitBaseCostForModelCount,
  getEffectiveOptionMaxCount
} from '../types/roster';
import { computeUnitEquippedData, computeModifiedStat } from '../utils/equippedStats';
import { KeywordTooltip } from './KeywordTooltip';
import { FormattedText } from './FormattedText';

interface DatasheetModalProps {
  unit: Datasheet | null;
  selectedUnit?: SelectedUnit | null;
  allUnitsInRoster?: SelectedUnit[];
  availableEnhancements?: Enhancement[];
  selectedDetachments?: SelectedDetachment[];
  isPlayMode?: boolean;
  onUpdateUnit?: (updated: SelectedUnit) => void;
  onSetWarlord?: (instanceId: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const DatasheetModal: React.FC<DatasheetModalProps> = ({
  unit,
  selectedUnit,
  allUnitsInRoster = [],
  availableEnhancements = [],
  selectedDetachments = [],
  isPlayMode = false,
  onUpdateUnit,
  onSetWarlord,
  isOpen,
  onClose
}) => {
  const [inspectingOption, setInspectingOption] = useState<WargearOption | null>(null);
  const [previewSelectedOptions, setPreviewSelectedOptions] = useState<Record<string, string[]>>({});
  const [isWargearOpen, setIsWargearOpen] = useState(false);
  const [isEnhancementsOpen, setIsEnhancementsOpen] = useState(false);

  useEffect(() => {
    setIsWargearOpen(false);
    setIsEnhancementsOpen(false);
    setInspectingOption(null);
  }, [unit?.id, selectedUnit?.instanceId, isOpen]);

  if (!isOpen || !unit) return null;

  const currentModelsCount = selectedUnit?.modelsCount || unit.minModels || 1;
  const wargearPts = getUnitWargearPts(selectedUnit, previewSelectedOptions, unit);
  const currentCost = selectedUnit
    ? getUnitTotalPts(selectedUnit)
    : unit.baseCost + wargearPts;

  const wargearGroups = unit.wargearGroups || [];

  const {
    getGroupSelectedIds,
    getEquippedWeaponDisplayName,
    activeStatModifiers,
    inheritedLeaderEnhancements,
    abilitySourceMap,
    weaponSourceMap,
    equippedRangedWeapons,
    equippedMeleeWeapons,
    equippedAbilities,
    modM,
    modT,
    modSv,
    modW,
    modLd,
    modOC,
    modInSv
  } = computeUnitEquippedData(unit, selectedUnit, previewSelectedOptions, allUnitsInRoster);

  const totalSpecialModels = wargearGroups
    .filter((g) => !g.isExclusive)
    .reduce((acc, g) => acc + getGroupSelectedIds(g.id, g.defaultOptionIds).length, 0);

  const normalModelsCount = Math.max(1, currentModelsCount - totalSpecialModels);

  const handleStepSquadModels = (delta: number) => {
    if (!selectedUnit || !onUpdateUnit) return;
    const maxM = unit.maxModels || unit.minModels || 1;
    const nextCount = Math.min(Math.max(selectedUnit.modelsCount + delta, 1), maxM);
    if (nextCount === selectedUnit.modelsCount) return;

    const newBaseCost = getUnitBaseCostForModelCount(unit, nextCount);

    // If models decreased, clamp any special options whose counts exceed effective max for the new model count
    let updatedSelectedOptions = selectedUnit.selectedOptions;
    if (unit.wargearGroups && selectedUnit.selectedOptions) {
      let optionsChanged = false;
      const nextOptMap = { ...selectedUnit.selectedOptions };
      for (const group of unit.wargearGroups) {
        const curList = nextOptMap[group.id];
        if (curList && curList.length > 0) {
          const counts: Record<string, number> = {};
          for (const optId of curList) {
            counts[optId] = (counts[optId] || 0) + 1;
          }
          let groupNeedsClamp = false;
          for (const opt of group.options) {
            const effMax = getEffectiveOptionMaxCount(opt, unit, nextCount);
            if ((counts[opt.id] || 0) > effMax) {
              groupNeedsClamp = true;
              break;
            }
          }
          if (groupNeedsClamp) {
            optionsChanged = true;
            const newGroupList: string[] = [];
            const running: Record<string, number> = {};
            for (const optId of curList) {
              const opt = group.options.find((o) => o.id === optId);
              const effMax = opt ? getEffectiveOptionMaxCount(opt, unit, nextCount) : 1;
              if ((running[optId] || 0) < effMax) {
                running[optId] = (running[optId] || 0) + 1;
                newGroupList.push(optId);
              }
            }
            nextOptMap[group.id] = newGroupList;
          }
        }
      }
      if (optionsChanged) {
        updatedSelectedOptions = nextOptMap;
      }
    }

    onUpdateUnit({
      ...selectedUnit,
      modelsCount: nextCount,
      cost: newBaseCost,
      selectedOptions: updatedSelectedOptions
    });
  };

  const handleStepOptionCount = (
    groupId: string,
    optionId: string,
    delta: number,
    effectiveMax: number,
    defaultIds: string[],
    isSpecialistModel: boolean = false
  ) => {
    const currentSelected = getGroupSelectedIds(groupId, defaultIds);
    const curCount = currentSelected.filter((id) => id === optionId).length;
    const nextCount = Math.max(0, Math.min(curCount + delta, effectiveMax));
    if (nextCount === curCount) return;

    let nextSelected: string[];
    if (delta > 0) {
      nextSelected = [...currentSelected, optionId];
    } else {
      const idx = currentSelected.indexOf(optionId);
      if (idx >= 0) {
        nextSelected = [...currentSelected];
        nextSelected.splice(idx, 1);
      } else {
        nextSelected = currentSelected;
      }
    }

    if (selectedUnit && onUpdateUnit) {
      let nextModelsCount = selectedUnit.modelsCount;
      let newBaseCost = selectedUnit.cost;

      if (isSpecialistModel) {
        const maxM = unit.maxModels || unit.minModels || 1;
        nextModelsCount = Math.min(Math.max(selectedUnit.modelsCount + delta, 1), maxM);
        newBaseCost = getUnitBaseCostForModelCount(unit, nextModelsCount);
      }

      onUpdateUnit({
        ...selectedUnit,
        modelsCount: nextModelsCount,
        cost: newBaseCost,
        selectedOptions: {
          ...(selectedUnit.selectedOptions || {}),
          [groupId]: nextSelected
        }
      });
    } else {
      setPreviewSelectedOptions((prev) => ({
        ...prev,
        [groupId]: nextSelected
      }));
    }
  };

  const handleToggleOption = (
    groupId: string,
    optionId: string,
    isExclusive: boolean,
    max: number,
    min: number,
    defaultIds: string[]
  ) => {
    const currentSelected = getGroupSelectedIds(groupId, defaultIds);
    let nextSelected: string[];

    if (isExclusive) {
      if (currentSelected.includes(optionId) && min === 0) {
        nextSelected = [];
      } else {
        nextSelected = [optionId];
      }
    } else {
      const isCurrentlySelected = currentSelected.includes(optionId);
      if (isCurrentlySelected) {
        if (currentSelected.length <= min) {
          return;
        }
        nextSelected = currentSelected.filter((id) => id !== optionId);
      } else {
        if (max > 0 && currentSelected.length >= max) {
          nextSelected = [...currentSelected.slice(1), optionId];
        } else {
          nextSelected = [...currentSelected, optionId];
        }
      }
    }

    if (selectedUnit && onUpdateUnit) {
      onUpdateUnit({
        ...selectedUnit,
        selectedOptions: {
          ...(selectedUnit.selectedOptions || {}),
          [groupId]: nextSelected
        }
      });
    } else {
      setPreviewSelectedOptions((prev) => ({
        ...prev,
        [groupId]: nextSelected
      }));
    }
  };

  const handleToggleEnhancement = (enh: Enhancement) => {
    if (!selectedUnit || !onUpdateUnit) return;
    const isCurrentlySelected = selectedUnit.enhancement?.id === enh.id;
    if (isCurrentlySelected) {
      const { enhancement, ...rest } = selectedUnit;
      onUpdateUnit({ ...rest, enhancement: undefined });
    } else {
      onUpdateUnit({ ...selectedUnit, enhancement: enh });
    }
  };

  const handleInspectEnhancement = (enh: Enhancement) => {
    const profiles =
      enh.profiles && enh.profiles.length > 0
        ? enh.profiles
        : enh.description
        ? [{ name: enh.name, type: 'ability' as const, description: enh.description }]
        : [];
    setInspectingOption({
      id: enh.id,
      name: `${enh.name} (+${enh.pts} pts)`,
      maxCount: 1,
      pts: enh.pts,
      profiles,
      statModifiers: enh.statModifiers
    });
  };

  const unitModifiedStatEntries = [
    { label: 'M', stat: modM },
    { label: 'T', stat: modT },
    { label: 'SV', stat: modSv },
    { label: 'W', stat: modW },
    { label: 'LD', stat: modLd },
    { label: 'OC', stat: modOC },
    { label: 'INSV', stat: modInSv }
  ].filter((x) => x.stat.isModified);

  const matchesBodyguardTarget = (target: string): boolean => {
    const uName = unit.name.toUpperCase();
    const tName = target.toUpperCase();
    if (uName === tName || uName.includes(tName) || tName.includes(uName)) return true;
    if (tName.includes('BATTLELINE') && unit.isBattleline) return true;
    return false;
  };

  // Eligible leaders in roster that can attach to this bodyguard
  const eligibleLeaders = allUnitsInRoster.filter((u) => {
    if (!u.isLeader || !selectedUnit || u.instanceId === selectedUnit.instanceId) return false;
    if (u.datasheet.canLead && u.datasheet.canLead.length > 0) {
      return u.datasheet.canLead.some((target) => matchesBodyguardTarget(target));
    }
    return false;
  });

  // Eligible supports in roster that can attach to this bodyguard
  const eligibleSupports = allUnitsInRoster.filter((u) => {
    if (!u.isSupport || !selectedUnit || u.instanceId === selectedUnit.instanceId) return false;
    if (u.datasheet.canLead && u.datasheet.canLead.length > 0) {
      return u.datasheet.canLead.some((target) => matchesBodyguardTarget(target));
    }
    return false;
  });

  // Eligible enhancements for this unit based on active detachments & unit restrictions
  const eligibleEnhancements = getEligibleEnhancementsForUnit(
    selectedUnit || unit,
    availableEnhancements,
    selectedDetachments
  ).filter((enh) => {
    if (selectedUnit?.enhancement?.id === enh.id) return true;
    const maxAllowed = enh.maxPerRoster || (enh.isUpgrade ? 3 : 1);
    const otherEquippedCount = allUnitsInRoster.filter(
      (u) => (!selectedUnit || u.instanceId !== selectedUnit.instanceId) && u.enhancement?.name === enh.name
    ).length;
    return otherEquippedCount < maxAllowed;
  });

  const canUnitBeLed = Boolean(unit.canBeLed || eligibleLeaders.length > 0 || selectedUnit?.attachedLeaderId);
  const canUnitHaveSupport = Boolean(unit.canHaveSupport || eligibleSupports.length > 0 || selectedUnit?.attachedSupportId);
  const hasSquadSizeChoices = Boolean((unit.maxModels || 1) > (unit.minModels || 1) || (unit.costTiers && unit.costTiers.length > 1));
  const hasEnhancementChoices = Boolean(
    selectedUnit &&
      !selectedUnit.isEpicHero &&
      onUpdateUnit &&
      (eligibleEnhancements.length > 0 || Boolean(selectedUnit.enhancement))
  );
  const hasAnyLoadoutConfig = Boolean(
    selectedUnit &&
      onUpdateUnit &&
      (selectedUnit.isCharacter ||
        hasSquadSizeChoices ||
        (!selectedUnit.isLeader && !selectedUnit.isSupport && (canUnitBeLed || canUnitHaveSupport)) ||
        selectedUnit.attachedToBodyguardId)
  );

  // Format keyword pills inside text or lists (with optional added keywords from modifiers)
  const renderKeywordsWithTooltips = (keywordsStr: string, addedKeywords: { kw: string; source: string }[] = []) => {
    const baseParts = keywordsStr ? keywordsStr.split(/,\s*/).filter(Boolean) : [];
    const baseSet = new Set(baseParts.map((k) => k.toLowerCase()));
    const extraParts = addedKeywords.filter((a) => a.kw && !baseSet.has(a.kw.toLowerCase()));

    if (baseParts.length === 0 && extraParts.length === 0) return null;

    return (
      <div className="flex flex-wrap gap-1 mt-1">
        {baseParts.map((kw, i) => (
          <span
            key={`base-${i}`}
            className="inline-flex items-center text-[11px] font-semibold px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-750 text-sky-300 hover:text-sky-200 border border-sky-700/40 transition-colors leading-tight"
          >
            <KeywordTooltip keyword={kw}>{kw}</KeywordTooltip>
          </span>
        ))}
        {extraParts.map((item, i) => (
          <span
            key={`added-${i}`}
            title={`Added by ${item.source}`}
            className="inline-flex items-center gap-1 text-[11px] font-bold px-1.5 py-0.5 rounded bg-amber-950/40 text-amber-300 border border-amber-500/50 transition-colors leading-tight"
          >
            <KeywordTooltip keyword={item.kw}>{item.kw}</KeywordTooltip>
            <span className="text-[9px] font-mono text-amber-400/90">★</span>
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header Banner */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-800 bg-slate-900/95">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                {unit.primaryCategory}
              </span>
              {isLegendsUnit(unit) && (
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-950/80 text-purple-300 border border-purple-600/50 font-mono">
                  LEGENDS
                </span>
              )}
              {unit.stats.Base && (
                <span className="text-xs font-mono text-slate-400 font-semibold">
                  Base: {unit.stats.Base}
                </span>
              )}
            </div>
            <h2 className="font-warhammer text-lg sm:text-xl font-bold text-slate-100 mt-1">
              {unit.name}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="font-mono text-sky-400 font-bold text-base sm:text-lg">
                {currentCost} pts
              </div>
              <div className="text-xs text-slate-400 font-medium">
                {currentModelsCount} {currentModelsCount === 1 ? 'Model' : 'Models'}
              </div>
            </div>

            <button
              onClick={onClose}
              className="btn-theme-icon min-w-[38px] min-h-[38px] rounded-xl"
              aria-label="Close datasheet"
            >
              <X className="w-4 h-4 stroke-[2]" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-3.5 sm:p-6 overflow-y-auto space-y-5 text-xs sm:text-sm flex-1">
          
          {/* Unit Makeup & Attachment Status Header */}
          <div className="p-3 sm:p-3.5 rounded-xl bg-slate-850 border border-slate-750 flex flex-wrap items-center justify-between gap-2.5 text-xs sm:text-sm">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-sky-400 flex-shrink-0" />
              <span className="text-slate-300 font-medium">Squad:</span>
              <span className="font-bold text-slate-100">
                {currentModelsCount}x {unit.stats.name || unit.name}
              </span>
            </div>

            {selectedUnit && (
              <div className="flex items-center gap-2 flex-wrap">
                {selectedUnit.isWarlord && (
                  <span className="text-xs px-2.5 py-1 rounded-md font-bold flex items-center gap-1 bg-indigo-950/80 text-indigo-300 border border-indigo-700/50">
                    <Star className="w-3.5 h-3.5 fill-indigo-400 text-indigo-400" />
                    <span>Warlord</span>
                  </span>
                )}
                {selectedUnit.enhancement && (
                  <span className="text-xs px-2.5 py-1 rounded-md font-semibold bg-amber-950/60 text-amber-300 border border-amber-600/50">
                    Enhancement: {selectedUnit.enhancement.name} (+{selectedUnit.enhancement.pts} pts)
                  </span>
                )}
                {inheritedLeaderEnhancements.map(({ enhancement: lEnh, leaderName }, idx) => (
                  <span
                    key={`${lEnh.id}-${idx}`}
                    className="text-xs px-2.5 py-1 rounded-md font-semibold bg-amber-950/50 text-amber-300 border border-amber-500/45"
                  >
                    Leader Enhancement: {lEnh.name} (via {leaderName})
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Loadout & Squad Configuration (when selected in roster and not in Play Mode) */}
          {!isPlayMode && selectedUnit && onUpdateUnit && hasAnyLoadoutConfig && (
            <div className="p-3.5 sm:p-4 rounded-xl bg-slate-850 border border-slate-700 space-y-3.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="font-warhammer text-xs sm:text-sm font-bold uppercase tracking-wider text-sky-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-sky-400" />
                  <span>Unit Loadout & Configuration</span>
                </span>

                {/* Character Warlord Button */}
                {selectedUnit.isCharacter && onSetWarlord && (
                  <button
                    type="button"
                    onClick={() => onSetWarlord(selectedUnit.instanceId)}
                    className={`min-h-[38px] px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-bold transition-all shadow-md active:translate-y-[1px] active:shadow-sm ${
                      selectedUnit.isWarlord
                        ? 'bg-gradient-to-b from-indigo-500 to-indigo-600 text-white shadow-indigo-950/60 border border-indigo-400/60 border-t-indigo-300/60'
                        : 'bg-gradient-to-b from-slate-750 to-slate-800 hover:from-slate-700 hover:to-slate-750 text-slate-200 hover:text-white border border-slate-650/80 border-t-slate-500/50 shadow-slate-950/40'
                    }`}
                  >
                    <Star className={`w-3.5 h-3.5 ${selectedUnit.isWarlord ? 'fill-white' : ''}`} />
                    <span>{selectedUnit.isWarlord ? 'Supreme Commander (Warlord)' : 'Appoint as Warlord'}</span>
                  </button>
                )}
              </div>

              {/* Squad Size Selector & Stepper */}
              {hasSquadSizeChoices && (
                <div className="space-y-2.5 p-3 rounded-xl bg-slate-800/60 border border-slate-700/80">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="font-warhammer text-xs sm:text-sm font-bold text-slate-200">
                        Squad Models & Composition
                      </span>
                      <span className="text-[11px] text-slate-400 block">
                        Total: {currentModelsCount} models • Base Cost: <span className="text-sky-400 font-mono font-bold">{selectedUnit.cost} pts</span>
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-400">
                      Min: {unit.minModels || 1} • Max: {unit.maxModels || 1}
                    </span>
                  </div>

                  {/* Standard / Normal Models Stepper */}
                  <div className="flex items-center justify-between gap-3 p-2 rounded-lg bg-slate-850 border border-slate-750">
                    <div className="min-w-0 flex-1">
                      <span className="text-xs font-bold text-slate-200 block truncate">
                        Standard Models
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {totalSpecialModels > 0
                          ? `${normalModelsCount} standard + ${totalSpecialModels} specialist = ${currentModelsCount} total`
                          : `Total standard squad models`}
                      </span>
                    </div>

                    <div className="inline-flex items-center gap-1 rounded-lg bg-slate-900 border border-slate-700 p-0.5 shadow-sm">
                      <button
                        type="button"
                        disabled={normalModelsCount <= 1}
                        onClick={() => handleStepSquadModels(-1)}
                        className="w-7 h-7 rounded flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-750 disabled:opacity-25 disabled:pointer-events-none transition-colors"
                        title="Decrease standard models"
                        aria-label="Decrease standard models"
                      >
                        <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
                      </button>

                      <span className="text-xs font-mono font-bold text-slate-200 px-2 min-w-[24px] text-center">
                        {normalModelsCount}
                      </span>

                      <button
                        type="button"
                        disabled={currentModelsCount >= (unit.maxModels || unit.minModels || 1)}
                        onClick={() => handleStepSquadModels(1)}
                        className="w-7 h-7 rounded flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-750 disabled:opacity-25 disabled:pointer-events-none transition-colors"
                        title={`Increase standard models (Max: ${unit.maxModels || unit.minModels || 1})`}
                        aria-label="Increase standard models"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                      </button>
                    </div>
                  </div>

                  {/* Quick Tier Jump Buttons (if multiple tiers exist) */}
                  {unit.costTiers && unit.costTiers.length > 1 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {unit.costTiers.map((tier) => (
                        <button
                          key={tier.models}
                          type="button"
                          onClick={() => {
                            const newBaseCost = getUnitBaseCostForModelCount(unit, tier.models);
                            onUpdateUnit({
                              ...selectedUnit,
                              modelsCount: tier.models,
                              cost: newBaseCost
                            });
                          }}
                          className={`min-h-[32px] px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all border ${
                            currentModelsCount === tier.models
                              ? 'bg-blue-600/90 border-blue-400 text-white shadow-sm shadow-blue-950/60'
                              : 'bg-slate-800/90 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-750'
                          }`}
                        >
                          {tier.models} models ({tier.cost} pts)
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Attachment Controls for Bodyguards (only rendered if this unit can be led or supported) */}
              {!selectedUnit.isLeader && !selectedUnit.isSupport && (canUnitBeLed || canUnitHaveSupport) && (
                <div className={`grid grid-cols-1 ${canUnitBeLed && canUnitHaveSupport ? 'sm:grid-cols-2' : ''} gap-3 pt-1`}>
                  {canUnitBeLed && (
                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-1.5">
                        Attached Leader (Max 1):
                      </label>
                      <select
                        value={selectedUnit.attachedLeaderId || ''}
                        onChange={(e) => {
                          onUpdateUnit({
                            ...selectedUnit,
                            attachedLeaderId: e.target.value || undefined
                          });
                        }}
                        className="w-full min-h-[42px] px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-sky-500"
                      >
                        <option value="">No Leader Attached</option>
                        {eligibleLeaders.map((l) => (
                          <option key={l.instanceId} value={l.instanceId}>
                            {l.name} ({l.cost} pts)
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {canUnitHaveSupport && (
                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-1.5">
                        Attached Support (Max 1):
                      </label>
                      <select
                        value={selectedUnit.attachedSupportId || ''}
                        onChange={(e) => {
                          onUpdateUnit({
                            ...selectedUnit,
                            attachedSupportId: e.target.value || undefined
                          });
                        }}
                        className="w-full min-h-[42px] px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 text-sm focus:outline-none focus:border-sky-500"
                      >
                        <option value="">No Support Unit Attached</option>
                        {eligibleSupports.map((s) => (
                          <option key={s.instanceId} value={s.instanceId}>
                            {s.name} ({s.cost} pts)
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {/* Detach option if attached to a Bodyguard */}
              {selectedUnit.attachedToBodyguardId && (
                <div className="pt-1 flex items-center justify-between text-xs p-2.5 rounded-lg bg-slate-800 border border-slate-700">
                  <span className="text-slate-300">
                    Currently attached to a bodyguard unit.
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateUnit({
                        ...selectedUnit,
                        attachedToBodyguardId: undefined
                      });
                    }}
                    className="px-3 py-1 rounded bg-red-950/70 text-red-300 hover:text-white font-semibold transition-colors"
                  >
                    Detach Unit
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Enhancements & Detachment Upgrades (Toggle Checkboxes, same pattern as Wargear Options, Hidden in Play Mode) */}
          {!isPlayMode && hasEnhancementChoices && selectedUnit && (
            <div className="rounded-xl bg-slate-850 border border-slate-700 overflow-hidden">
              <button
                type="button"
                onClick={() => setIsEnhancementsOpen((prev) => !prev)}
                className="w-full p-3.5 sm:p-4 flex items-center justify-between gap-2 text-left hover:bg-slate-800/60 transition-colors"
                aria-expanded={isEnhancementsOpen}
              >
                <div className="flex items-center gap-2 min-w-0 flex-wrap">
                  <span className="font-warhammer text-xs sm:text-sm font-bold uppercase tracking-wider text-sky-300 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-sky-400 flex-shrink-0" />
                    <span>Enhancements</span>
                  </span>
                  {selectedUnit.enhancement && (
                    <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-md bg-amber-950/60 text-amber-300 border border-amber-500/45 truncate">
                      {selectedUnit.enhancement.name} (+{selectedUnit.enhancement.pts} pts)
                    </span>
                  )}
                </div>
                <span className="btn-theme-icon min-h-[30px] min-w-[30px] rounded-lg flex-shrink-0 pointer-events-none">
                  {isEnhancementsOpen ? (
                    <ChevronDown className="w-4 h-4 stroke-[2.2]" />
                  ) : (
                    <ChevronRight className="w-4 h-4 stroke-[2.2]" />
                  )}
                </span>
              </button>

              {isEnhancementsOpen && (
                <div className="px-3.5 sm:px-4 pb-3.5 sm:pb-4 pt-1 border-t border-slate-800 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      Available Detachment Enhancements
                    </span>
                    <span className="text-[11px] font-mono text-slate-400 font-semibold">
                      {selectedUnit.enhancement ? '1/1' : '0/1'}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {eligibleEnhancements.map((enh) => {
                      const isSelected = selectedUnit.enhancement?.id === enh.id;

                      return (
                        <div
                          key={enh.id}
                          onClick={() => handleToggleEnhancement(enh)}
                          className={`flex items-center justify-between gap-3 px-3 py-2 rounded-xl border transition-all cursor-pointer active:scale-[0.99] ${
                            isSelected
                              ? 'bg-slate-800 border-sky-500/60 shadow-sm shadow-sky-950/40'
                              : 'bg-slate-900/60 border-slate-750/80 hover:border-slate-650'
                          }`}
                        >
                          {/* Left: Toggle Checkbox + Enhancement Name + Points + Detachment */}
                          <div className="flex items-center gap-2.5 min-w-0 flex-1 flex-wrap">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleEnhancement(enh);
                              }}
                              className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-all border ${
                                isSelected
                                  ? 'bg-gradient-to-b from-blue-500 to-blue-600 border-blue-400 text-white shadow-sm shadow-blue-950/60'
                                  : 'bg-slate-900 border-slate-600 text-transparent hover:border-slate-400'
                              }`}
                              aria-label={`Select ${enh.name}`}
                            >
                              <Check className="w-3.5 h-3.5 stroke-[3]" />
                            </button>

                            <span
                              className={`font-warhammer text-xs sm:text-sm font-bold truncate ${
                                isSelected ? 'text-slate-100' : 'text-slate-400'
                              }`}
                            >
                              {enh.name}
                            </span>

                            <span
                              className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-md border flex-shrink-0 ${
                                isSelected
                                  ? 'bg-sky-950/80 text-sky-300 border-sky-600/50'
                                  : 'bg-slate-800/80 text-slate-400 border-slate-700'
                              }`}
                            >
                              +{enh.pts} pts
                            </span>

                            {enh.detachment && (
                              <span className="text-[10px] font-mono text-slate-400 px-2 py-0.5 rounded bg-slate-900/80 border border-slate-750 truncate">
                                {enh.detachment}
                              </span>
                            )}
                          </div>

                          {/* Right: Eyeball Button to Inspect Enhancement Rules */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleInspectEnhancement(enh);
                            }}
                            className="btn-theme-icon min-h-[32px] min-w-[32px] rounded-lg flex-shrink-0"
                            title={`Inspect ${enh.name}`}
                            aria-label={`Inspect ${enh.name}`}
                          >
                            <Eye className="w-4 h-4 stroke-[2]" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Configurable Wargear & Weapon Options (Collapsible, Default Collapsed, Hidden in Play Mode) */}
          {!isPlayMode && wargearGroups.length > 0 && (
            <div className="rounded-xl bg-slate-850 border border-slate-700 overflow-hidden">
              <button
                type="button"
                onClick={() => setIsWargearOpen((prev) => !prev)}
                className="w-full p-3.5 sm:p-4 flex items-center justify-between gap-2 text-left hover:bg-slate-800/60 transition-colors"
                aria-expanded={isWargearOpen}
              >
                <span className="font-warhammer text-xs sm:text-sm font-bold uppercase tracking-wider text-sky-300 flex items-center gap-2">
                  <Crosshair className="w-4 h-4 text-sky-400 flex-shrink-0" />
                  <span>Weapon & Wargear Options</span>
                </span>
                <span className="btn-theme-icon min-h-[30px] min-w-[30px] rounded-lg flex-shrink-0 pointer-events-none">
                  {isWargearOpen ? (
                    <ChevronDown className="w-4 h-4 stroke-[2.2]" />
                  ) : (
                    <ChevronRight className="w-4 h-4 stroke-[2.2]" />
                  )}
                </span>
              </button>

              {isWargearOpen && (
                <div className="px-3.5 sm:px-4 pb-3.5 sm:pb-4 pt-1 border-t border-slate-800 space-y-3.5">
                  {wargearGroups.map((group) => {
                    const selectedIds = getGroupSelectedIds(group.id, group.defaultOptionIds);
                    const canToggle = true;

                    return (
                      <div key={group.id} className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                            {group.name}
                          </span>
                          <span className="text-[11px] font-mono text-slate-400 font-semibold">
                            {group.isExclusive
                              ? 'Select 1'
                              : `${selectedIds.length} selected`}
                          </span>
                        </div>

                        <div className="space-y-1.5">
                          {group.options.map((opt) => {
                            const isExclusive = group.isExclusive;
                            const isSpecialistModel = (unit.maxModels || 1) > 1 && !isExclusive;
                            const maxModels = unit.maxModels || unit.minModels || 1;

                            // If this option is a specialist model, adding 1 increases total squad model count
                            const projectedSquadSize = isSpecialistModel ? currentModelsCount + 1 : currentModelsCount;
                            const effectiveMaxAtProjected = getEffectiveOptionMaxCount(opt, unit, projectedSquadSize);
                            const effectiveMaxCurrent = getEffectiveOptionMaxCount(opt, unit, currentModelsCount);

                            const currentCount = selectedIds.filter((id) => id === opt.id).length;
                            const isSelected = currentCount > 0;
                            const isAtSquadMax = isSpecialistModel && currentModelsCount >= maxModels;
                            const exceedsAllowance = currentCount >= effectiveMaxAtProjected;
                            const groupHasRoom = !group.max || group.max <= 0 || selectedIds.length < group.max;

                            const canAddOption = !isAtSquadMax && !exceedsAllowance && groupHasRoom;

                            return (
                              <div
                                key={opt.id}
                                onClick={() => {
                                  if (isExclusive && canToggle) {
                                    handleToggleOption(
                                      group.id,
                                      opt.id,
                                      group.isExclusive,
                                      group.max,
                                      group.min,
                                      group.defaultOptionIds
                                    );
                                  }
                                }}
                                className={`flex items-center justify-between gap-3 px-3 py-2 rounded-xl border transition-all ${
                                  isExclusive && canToggle ? 'cursor-pointer active:scale-[0.99]' : ''
                                } ${
                                  isSelected
                                    ? 'bg-slate-800 border-sky-500/60 shadow-sm shadow-sky-950/40'
                                    : 'bg-slate-900/60 border-slate-750/80 hover:border-slate-650'
                                }`}
                              >
                                {/* Left: Toggle / Stepper Box + Option Name */}
                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                  {isExclusive ? (
                                    <button
                                      type="button"
                                      disabled={!canToggle}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (canToggle) {
                                          handleToggleOption(
                                            group.id,
                                            opt.id,
                                            group.isExclusive,
                                            group.max,
                                            group.min,
                                            group.defaultOptionIds
                                          );
                                        }
                                      }}
                                      className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-all border ${
                                        isSelected
                                          ? 'bg-gradient-to-b from-blue-500 to-blue-600 border-blue-400 text-white shadow-sm shadow-blue-950/60'
                                          : 'bg-slate-900 border-slate-600 text-transparent hover:border-slate-400'
                                      }`}
                                      aria-label={`Select ${opt.name}`}
                                    >
                                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                                    </button>
                                  ) : (
                                    <div
                                      className="inline-flex items-center gap-1 rounded-lg bg-slate-900 border border-slate-700 p-0.5 shadow-sm"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <button
                                        type="button"
                                        disabled={currentCount === 0}
                                        onClick={() =>
                                          handleStepOptionCount(
                                            group.id,
                                            opt.id,
                                            -1,
                                            effectiveMaxCurrent,
                                            group.defaultOptionIds,
                                            isSpecialistModel
                                          )
                                        }
                                        className="w-6 h-6 rounded flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-750 disabled:opacity-25 disabled:pointer-events-none transition-colors"
                                        title={`Remove 1 ${opt.name}`}
                                        aria-label={`Decrease ${opt.name}`}
                                      >
                                        <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
                                      </button>

                                      <span className="text-xs font-mono font-bold text-slate-200 px-1 min-w-[20px] text-center">
                                        {currentCount}
                                        {effectiveMaxCurrent > 1 && (
                                          <span className="text-slate-400 font-normal text-[10px]">
                                            /{effectiveMaxCurrent}
                                          </span>
                                        )}
                                      </span>

                                      <button
                                        type="button"
                                        disabled={!canAddOption}
                                        onClick={() =>
                                          handleStepOptionCount(
                                            group.id,
                                            opt.id,
                                            1,
                                            effectiveMaxAtProjected,
                                            group.defaultOptionIds,
                                            isSpecialistModel
                                          )
                                        }
                                        className="w-6 h-6 rounded flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-750 disabled:opacity-25 disabled:pointer-events-none transition-colors"
                                        title={
                                          isAtSquadMax
                                            ? `Squad is at maximum capacity (${maxModels} models). Reduce standard models to add specialist models.`
                                            : exceedsAllowance
                                            ? `Limit reached for ${projectedSquadSize} models (${opt.maxCount || 1} allowed at ${maxModels} models)`
                                            : !groupHasRoom
                                            ? `Group limit reached`
                                            : `Add 1 ${opt.name}`
                                        }
                                        aria-label={`Increase ${opt.name}`}
                                      >
                                        <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                                      </button>
                                    </div>
                                  )}

                                  <span
                                    className={`font-warhammer text-xs sm:text-sm font-bold truncate ${
                                      isSelected ? 'text-slate-100' : 'text-slate-400'
                                    }`}
                                  >
                                    {opt.name}
                                  </span>

                                  {opt.pts && opt.pts > 0 && (
                                    <span
                                      className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-md border flex-shrink-0 ${
                                        isSelected
                                          ? 'bg-sky-950/80 text-sky-300 border-sky-600/50'
                                          : 'bg-slate-800/80 text-slate-400 border-slate-700'
                                      }`}
                                    >
                                      +{opt.pts} pts
                                    </span>
                                  )}
                                </div>

                                {/* Right: Eyeball Button to Inspect Stat Profile / Description */}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setInspectingOption(opt);
                                  }}
                                  className="btn-theme-icon min-h-[32px] min-w-[32px] rounded-lg flex-shrink-0"
                                  title={`Inspect ${opt.name}`}
                                  aria-label={`Inspect ${opt.name}`}
                                >
                                  <Eye className="w-4 h-4 stroke-[2]" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 1. Model Stat Profile (Condensed Mobile-First 7-Column Grid) */}
          <div>
            <h3 className="font-warhammer text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-200 mb-2 flex items-center gap-2">
              <Shield className="w-4 h-4 text-sky-400" />
              <span>Model Profiles</span>
            </h3>

            <div className="rounded-xl border border-slate-750 bg-slate-850 p-2.5 sm:p-3 space-y-2">
              <div className="text-xs font-bold text-slate-100 flex items-center justify-between">
                <span>x{currentModelsCount} {unit.stats.name || unit.name}</span>
                {unit.stats.Base && (
                  <span className="text-[11px] font-mono text-slate-400 font-semibold">
                    Base: {unit.stats.Base}
                  </span>
                )}
              </div>

              {/* Condensed 7-column stat grid spanning 100% width with zero horizontal scrolling */}
              <div className="grid grid-cols-7 gap-1 sm:gap-1.5 text-center font-mono">
                {[
                  { key: 'M', stat: modM, defaultTextClass: 'text-slate-100', defaultBorder: 'border-slate-700/80', labelClass: 'text-slate-400' },
                  { key: 'T', stat: modT, defaultTextClass: 'text-slate-100', defaultBorder: 'border-slate-700/80', labelClass: 'text-slate-400' },
                  { key: 'SV', stat: modSv, defaultTextClass: 'text-slate-100', defaultBorder: 'border-slate-700/80', labelClass: 'text-slate-400' },
                  { key: 'W', stat: modW, defaultTextClass: 'text-sky-300', defaultBorder: 'border-slate-700/80', labelClass: 'text-slate-400' },
                  { key: 'LD', stat: modLd, defaultTextClass: 'text-slate-100', defaultBorder: 'border-slate-700/80', labelClass: 'text-slate-400' },
                  { key: 'OC', stat: modOC, defaultTextClass: 'text-sky-300', defaultBorder: 'border-slate-700/80', labelClass: 'text-slate-400' },
                  { key: 'INSV', stat: modInSv, defaultTextClass: 'text-sky-300', defaultBorder: 'border-sky-600/40', labelClass: 'text-sky-400' }
                ].map(({ key, stat, defaultTextClass, defaultBorder, labelClass }) => (
                  <div
                    key={key}
                    title={
                      stat.isModified
                        ? `Modified (${stat.baseValue || '—'} → ${stat.value || '—'}) • ${stat.sources.join(', ')}`
                        : undefined
                    }
                    className={`py-1.5 px-0.5 rounded-lg border transition-colors ${
                      stat.isModified
                        ? 'bg-amber-950/25 border-amber-500/50'
                        : `bg-slate-800/90 ${defaultBorder}`
                    }`}
                  >
                    <span
                      className={`text-[10px] font-sans font-bold block ${
                        stat.isModified ? 'text-amber-400' : labelClass
                      }`}
                    >
                      {key}
                    </span>
                    <span
                      className={`text-xs sm:text-sm ${
                        stat.isModified
                          ? 'font-extrabold text-amber-300 underline decoration-amber-400/60 decoration-dotted underline-offset-2'
                          : `font-bold ${defaultTextClass}`
                      }`}
                    >
                      {stat.value || '—'}
                    </span>
                  </div>
                ))}
              </div>

              {unitModifiedStatEntries.length > 0 && (
                <div className="pt-1 flex flex-wrap gap-1.5">
                  {unitModifiedStatEntries.map(({ label, stat }) => (
                    <span
                      key={label}
                      className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-amber-950/30 text-amber-300/95 border border-amber-500/35"
                    >
                      <strong>{label}</strong>: {stat.baseValue || '—'} → <strong>{stat.value}</strong> ({stat.sources.join(', ')})
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 2. Ranged Weapons (Condensed Table) */}
          <div>
            <h3 className="font-warhammer text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-200 mb-2 flex items-center gap-2">
              <Crosshair className="w-4 h-4 text-sky-400" />
              <span>Ranged Weapons</span>
            </h3>

            {equippedRangedWeapons.length > 0 ? (
              <div className="rounded-xl border border-slate-750 bg-slate-850 overflow-hidden divide-y divide-slate-800">
                <div className="bg-slate-800/80 px-2.5 sm:px-3 py-1.5 grid grid-cols-[1fr_repeat(6,2.1rem)] sm:grid-cols-[1fr_repeat(6,2.75rem)] gap-1 items-center text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <span>Weapon</span>
                  <span className="text-center">Rng</span>
                  <span className="text-center">A</span>
                  <span className="text-center">BS</span>
                  <span className="text-center">S</span>
                  <span className="text-center">AP</span>
                  <span className="text-center">D</span>
                </div>

                {equippedRangedWeapons.map((w, idx) => {
                  const rRange = computeModifiedStat(w.range, 'range', activeStatModifiers, 'ranged', w.keywords);
                  const rA = computeModifiedStat(w.A, 'A', activeStatModifiers, 'ranged', w.keywords);
                  const rBS = computeModifiedStat(w.BS || '3+', 'BS', activeStatModifiers, 'ranged', w.keywords);
                  const rS = computeModifiedStat(w.S, 'S', activeStatModifiers, 'ranged', w.keywords);
                  const rAP = computeModifiedStat(w.AP, 'AP', activeStatModifiers, 'ranged', w.keywords);
                  const rD = computeModifiedStat(w.D, 'D', activeStatModifiers, 'ranged', w.keywords);
                  const addedKws = activeStatModifiers
                    .filter((m) => m.mod.target === 'ranged' && m.mod.stat === 'keywords' && m.mod.type === 'append')
                    .map((m) => ({ kw: String(m.mod.value), source: m.source }));
                  const weaponSource = weaponSourceMap[w.name];

                  return (
                    <div key={idx} className="px-2.5 sm:px-3 py-2">
                      <div className="grid grid-cols-[1fr_repeat(6,2.1rem)] sm:grid-cols-[1fr_repeat(6,2.75rem)] gap-1 items-center">
                        <div className="min-w-0 pr-1 flex items-center gap-1.5 flex-wrap">
                          <span className="font-warhammer text-xs sm:text-sm font-bold text-slate-100 leading-snug">
                            {getEquippedWeaponDisplayName(w.name, 'ranged')}
                          </span>
                          {weaponSource && (
                            <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-amber-950/40 text-amber-300 border border-amber-500/40">
                              {weaponSource.label}
                            </span>
                          )}
                        </div>
                        <span
                          title={rRange.isModified ? `Base: ${rRange.baseValue} → ${rRange.value} (${rRange.sources.join(', ')})` : undefined}
                          className={`text-center font-mono text-[11px] sm:text-xs ${
                            rRange.isModified
                              ? 'font-extrabold text-amber-300 underline decoration-amber-400/60 decoration-dotted underline-offset-2'
                              : 'font-medium text-slate-300'
                          }`}
                        >
                          {rRange.value}
                        </span>
                        <span
                          title={rA.isModified ? `Base: ${rA.baseValue} → ${rA.value} (${rA.sources.join(', ')})` : undefined}
                          className={`text-center font-mono text-xs sm:text-sm ${
                            rA.isModified
                              ? 'font-extrabold text-amber-300 underline decoration-amber-400/60 decoration-dotted underline-offset-2'
                              : 'font-semibold text-slate-200'
                          }`}
                        >
                          {rA.value}
                        </span>
                        <span
                          title={rBS.isModified ? `Base: ${rBS.baseValue} → ${rBS.value} (${rBS.sources.join(', ')})` : undefined}
                          className={`text-center font-mono text-xs sm:text-sm ${
                            rBS.isModified
                              ? 'font-extrabold text-amber-300 underline decoration-amber-400/60 decoration-dotted underline-offset-2'
                              : 'font-semibold text-slate-100'
                          }`}
                        >
                          {rBS.value}
                        </span>
                        <span
                          title={rS.isModified ? `Base: ${rS.baseValue} → ${rS.value} (${rS.sources.join(', ')})` : undefined}
                          className={`text-center font-mono text-xs sm:text-sm ${
                            rS.isModified
                              ? 'font-extrabold text-amber-300 underline decoration-amber-400/60 decoration-dotted underline-offset-2'
                              : 'font-bold text-sky-300'
                          }`}
                        >
                          {rS.value}
                        </span>
                        <span
                          title={rAP.isModified ? `Base: ${rAP.baseValue} → ${rAP.value} (${rAP.sources.join(', ')})` : undefined}
                          className={`text-center font-mono text-xs sm:text-sm ${
                            rAP.isModified
                              ? 'font-extrabold text-amber-300 underline decoration-amber-400/60 decoration-dotted underline-offset-2'
                              : 'font-semibold text-slate-200'
                          }`}
                        >
                          {rAP.value}
                        </span>
                        <span
                          title={rD.isModified ? `Base: ${rD.baseValue} → ${rD.value} (${rD.sources.join(', ')})` : undefined}
                          className={`text-center font-mono text-xs sm:text-sm ${
                            rD.isModified
                              ? 'font-extrabold text-amber-300 underline decoration-amber-400/60 decoration-dotted underline-offset-2'
                              : 'font-bold text-sky-300'
                          }`}
                        >
                          {rD.value}
                        </span>
                      </div>

                      {(w.keywords || addedKws.length > 0) && renderKeywordsWithTooltips(w.keywords, addedKws)}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-slate-400 italic p-2.5 bg-slate-850 rounded-xl border border-slate-750 text-xs">
                This unit has no ranged weapons equipped.
              </p>
            )}
          </div>

          {/* 3. Melee Weapons (Condensed Table) */}
          <div>
            <h3 className="font-warhammer text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-200 mb-2 flex items-center gap-2">
              <Swords className="w-4 h-4 text-sky-400" />
              <span>Melee Weapons</span>
            </h3>

            {equippedMeleeWeapons.length > 0 ? (
              <div className="rounded-xl border border-slate-750 bg-slate-850 overflow-hidden divide-y divide-slate-800">
                <div className="bg-slate-800/80 px-2.5 sm:px-3 py-1.5 grid grid-cols-[1fr_repeat(6,2.1rem)] sm:grid-cols-[1fr_repeat(6,2.75rem)] gap-1 items-center text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  <span>Weapon</span>
                  <span className="text-center">Rng</span>
                  <span className="text-center">A</span>
                  <span className="text-center">WS</span>
                  <span className="text-center">S</span>
                  <span className="text-center">AP</span>
                  <span className="text-center">D</span>
                </div>

                {equippedMeleeWeapons.map((w, idx) => {
                  const mA = computeModifiedStat(w.A, 'A', activeStatModifiers, 'melee', w.keywords);
                  const mWS = computeModifiedStat(w.WS || '3+', 'WS', activeStatModifiers, 'melee', w.keywords);
                  const mS = computeModifiedStat(w.S, 'S', activeStatModifiers, 'melee', w.keywords);
                  const mAP = computeModifiedStat(w.AP, 'AP', activeStatModifiers, 'melee', w.keywords);
                  const mD = computeModifiedStat(w.D, 'D', activeStatModifiers, 'melee', w.keywords);
                  const addedKws = activeStatModifiers
                    .filter((m) => m.mod.target === 'melee' && m.mod.stat === 'keywords' && m.mod.type === 'append')
                    .map((m) => ({ kw: String(m.mod.value), source: m.source }));
                  const weaponSource = weaponSourceMap[w.name];

                  return (
                    <div key={idx} className="px-2.5 sm:px-3 py-2">
                      <div className="grid grid-cols-[1fr_repeat(6,2.1rem)] sm:grid-cols-[1fr_repeat(6,2.75rem)] gap-1 items-center">
                        <div className="min-w-0 pr-1 flex items-center gap-1.5 flex-wrap">
                          <span className="font-warhammer text-xs sm:text-sm font-bold text-slate-100 leading-snug">
                            {getEquippedWeaponDisplayName(w.name, 'melee')}
                          </span>
                          {weaponSource && (
                            <span className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded bg-amber-950/40 text-amber-300 border border-amber-500/40">
                              {weaponSource.label}
                            </span>
                          )}
                        </div>
                        <span className="text-center font-mono text-[11px] sm:text-xs font-medium text-slate-400">
                          Melee
                        </span>
                        <span
                          title={mA.isModified ? `Base: ${mA.baseValue} → ${mA.value} (${mA.sources.join(', ')})` : undefined}
                          className={`text-center font-mono text-xs sm:text-sm ${
                            mA.isModified
                              ? 'font-extrabold text-amber-300 underline decoration-amber-400/60 decoration-dotted underline-offset-2'
                              : 'font-semibold text-slate-200'
                          }`}
                        >
                          {mA.value}
                        </span>
                        <span
                          title={mWS.isModified ? `Base: ${mWS.baseValue} → ${mWS.value} (${mWS.sources.join(', ')})` : undefined}
                          className={`text-center font-mono text-xs sm:text-sm ${
                            mWS.isModified
                              ? 'font-extrabold text-amber-300 underline decoration-amber-400/60 decoration-dotted underline-offset-2'
                              : 'font-semibold text-slate-100'
                          }`}
                        >
                          {mWS.value}
                        </span>
                        <span
                          title={mS.isModified ? `Base: ${mS.baseValue} → ${mS.value} (${mS.sources.join(', ')})` : undefined}
                          className={`text-center font-mono text-xs sm:text-sm ${
                            mS.isModified
                              ? 'font-extrabold text-amber-300 underline decoration-amber-400/60 decoration-dotted underline-offset-2'
                              : 'font-bold text-sky-300'
                          }`}
                        >
                          {mS.value}
                        </span>
                        <span
                          title={mAP.isModified ? `Base: ${mAP.baseValue} → ${mAP.value} (${mAP.sources.join(', ')})` : undefined}
                          className={`text-center font-mono text-xs sm:text-sm ${
                            mAP.isModified
                              ? 'font-extrabold text-amber-300 underline decoration-amber-400/60 decoration-dotted underline-offset-2'
                              : 'font-semibold text-slate-200'
                          }`}
                        >
                          {mAP.value}
                        </span>
                        <span
                          title={mD.isModified ? `Base: ${mD.baseValue} → ${mD.value} (${mD.sources.join(', ')})` : undefined}
                          className={`text-center font-mono text-xs sm:text-sm ${
                            mD.isModified
                              ? 'font-extrabold text-amber-300 underline decoration-amber-400/60 decoration-dotted underline-offset-2'
                              : 'font-bold text-sky-300'
                          }`}
                        >
                          {mD.value}
                        </span>
                      </div>

                      {(w.keywords || addedKws.length > 0) && renderKeywordsWithTooltips(w.keywords, addedKws)}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-slate-400 italic p-2.5 bg-slate-850 rounded-xl border border-slate-750 text-xs">
                This unit has no melee weapons equipped.
              </p>
            )}
          </div>

          {/* 4. Abilities */}
          <div>
            <h3 className="font-warhammer text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-200 mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-sky-400" />
              <span>Abilities</span>
            </h3>

            {equippedAbilities.length > 0 ? (
              <div className="space-y-2.5">
                {equippedAbilities.map((ab, idx) => {
                  const sourceInfo = abilitySourceMap[ab.name];
                  return (
                    <div
                      key={idx}
                      className={`p-3 sm:p-4 rounded-xl bg-slate-850 border ${
                        sourceInfo
                          ? sourceInfo.type === 'enhancement'
                            ? 'border-amber-500/45 bg-amber-950/10'
                            : 'border-sky-600/45 bg-sky-950/10'
                          : 'border-slate-750'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap mb-1.5">
                        <h4
                          className={`font-warhammer font-bold text-xs sm:text-sm ${
                            sourceInfo && sourceInfo.type === 'enhancement'
                              ? 'text-amber-300'
                              : 'text-sky-300'
                          }`}
                        >
                          {ab.name}
                        </h4>
                        {sourceInfo && (
                          <span
                            className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border ${
                              sourceInfo.type === 'enhancement'
                                ? 'bg-amber-950/60 text-amber-300 border-amber-500/40'
                                : 'bg-sky-950/60 text-sky-300 border-sky-600/40'
                            }`}
                          >
                            {sourceInfo.label}
                          </span>
                        )}
                      </div>
                      <FormattedText
                        text={ab.description}
                        className="text-slate-300 text-xs sm:text-sm font-sans"
                      />
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-slate-400 italic text-xs">No special abilities listed.</p>
            )}
          </div>

          {/* 5. Leader / Support Attachment Eligibility (Hidden in Play Mode) */}
          {!isPlayMode && (unit.isLeader || unit.isSupport) && unit.canLead.length > 0 && (
            <div className="p-3 sm:p-4 rounded-xl bg-slate-850 border border-sky-700/40">
              <h4 className="font-warhammer font-bold text-sky-300 text-xs sm:text-sm mb-1.5">
                Eligible Bodyguard Units
              </h4>
              <p className="text-xs text-slate-300 mb-2.5">
                This {unit.isSupport && !unit.isLeader ? 'Support unit' : 'Leader'} can attach to any of the following units to form an Attached Unit (1 Leader + 1 Support max):
              </p>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {unit.canLead.map((target, i) => (
                  <span key={i} className="min-h-[28px] inline-flex items-center text-xs font-semibold px-2.5 py-0.5 rounded-lg bg-slate-800 border border-slate-700 text-sky-200">
                    {target}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 6. Keywords & Categories */}
          <div>
            <h3 className="font-warhammer text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-200 mb-2 flex items-center gap-2">
              <Tag className="w-4 h-4 text-sky-400" />
              <span>Keywords & Faction Tags</span>
            </h3>

            <div className="flex flex-wrap gap-1.5 sm:gap-2">
              {unit.categories.map((cat, i) => (
                <span
                  key={i}
                  className={`min-h-[28px] inline-flex items-center text-xs px-2.5 py-0.5 rounded-lg border font-semibold ${
                    cat.startsWith('Faction:')
                      ? 'bg-sky-950/70 text-sky-300 border-sky-700/50 font-bold'
                      : 'bg-slate-800 text-slate-300 border border-slate-700'
                  }`}
                >
                  <KeywordTooltip keyword={cat}>{cat}</KeywordTooltip>
                </span>
              ))}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3.5 border-t border-slate-800 bg-slate-900/90 flex justify-end">
          <button
            onClick={onClose}
            className="btn-theme-secondary w-full sm:w-auto min-h-[42px] px-6 rounded-xl text-sm font-semibold"
          >
            Close Datasheet
          </button>
        </div>

      </div>

      {/* Wargear / Enhancement Option Profile & Description Pop-up Modal */}
      {inspectingOption && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setInspectingOption(null)}
        >
          <div
            className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-800 bg-slate-900/95">
              <h3 className="font-warhammer text-base sm:text-lg font-extrabold text-slate-100 truncate">
                {inspectingOption.name}
              </h3>
              <button
                type="button"
                onClick={() => setInspectingOption(null)}
                className="btn-theme-icon min-w-[36px] min-h-[36px] rounded-xl"
                aria-label="Close option details"
              >
                <X className="w-4 h-4 stroke-[2]" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-2.5 text-xs sm:text-sm">
              {inspectingOption.profiles && inspectingOption.profiles.length > 0 ? (
                inspectingOption.profiles.map((p, idx) => {
                  if (p.type === 'ranged' || p.type === 'melee') {
                    return (
                      <div key={idx} className="rounded-xl border border-slate-750 bg-slate-850 overflow-hidden">
                        <div className="bg-slate-800/80 px-2.5 py-1 grid grid-cols-[1fr_repeat(6,2.1rem)] sm:grid-cols-[1fr_repeat(6,2.5rem)] gap-1 items-center text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                          <span>Profile</span>
                          <span className="text-center">Rng</span>
                          <span className="text-center">A</span>
                          <span className="text-center">{p.type === 'melee' ? 'WS' : 'BS'}</span>
                          <span className="text-center">S</span>
                          <span className="text-center">AP</span>
                          <span className="text-center">D</span>
                        </div>

                        <div className="px-2.5 py-2">
                          <div className="grid grid-cols-[1fr_repeat(6,2.1rem)] sm:grid-cols-[1fr_repeat(6,2.5rem)] gap-1 items-center">
                            <span className="font-warhammer text-xs sm:text-sm font-bold text-slate-100 leading-snug pr-1">
                              {p.count && p.count > 1 && !/^\d+x\s/i.test(p.name) ? `${p.count}x ${p.name}` : p.name}
                            </span>
                            <span className="text-center font-mono text-[11px] sm:text-xs font-medium text-slate-300">
                              {p.type === 'melee' ? 'Melee' : p.range || '24"'}
                            </span>
                            <span className="text-center font-mono text-xs sm:text-sm font-semibold text-slate-200">
                              {p.A || '1'}
                            </span>
                            <span className="text-center font-mono text-xs sm:text-sm font-semibold text-slate-100">
                              {p.type === 'melee' ? p.WS || '3+' : p.BS || '3+'}
                            </span>
                            <span className="text-center font-mono text-xs sm:text-sm font-bold text-sky-300">
                              {p.S || '4'}
                            </span>
                            <span className="text-center font-mono text-xs sm:text-sm font-semibold text-slate-200">
                              {p.AP || '0'}
                            </span>
                            <span className="text-center font-mono text-xs sm:text-sm font-bold text-sky-300">
                              {p.D || '1'}
                            </span>
                          </div>

                          {p.keywords && renderKeywordsWithTooltips(p.keywords)}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={idx} className="p-3 rounded-xl bg-slate-850 border border-slate-750">
                      <h4 className="font-warhammer font-bold text-sky-300 text-xs sm:text-sm mb-1.5">
                        {p.name}
                      </h4>
                      <FormattedText
                        text={p.description || ''}
                        className="text-slate-300 text-xs sm:text-sm font-sans"
                      />
                    </div>
                  );
                })
              ) : (
                <p className="text-slate-400 italic text-xs p-3 bg-slate-850 rounded-xl border border-slate-750">
                  Standard configuration option ({inspectingOption.name}).
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
