import React, { useState, useEffect } from 'react';
import { ArmyRoster, BattleSize, Datasheet, SelectedUnit, SelectedDetachment, getUnitRole, isLegendsUnit, isUnitAllowedForChapter, isEnhancementEligibleForUnit, normalizeDetachmentName } from './types/roster';
import { FactionDetail } from './types/faction';
import { loadAllRosters, saveRoster, deleteRoster, duplicateRoster, loadActiveRosterId, saveActiveRosterId, loadPlayMode, savePlayMode } from './utils/storage';
import { validateClientRoster, BATTLE_SIZE_CONFIGS } from './utils/validator';
import { LandingPage } from './components/LandingPage';
import CreateArmyModal from './components/CreateArmyModal';
import { Navbar } from './components/Navbar';
import { DetachmentSelector } from './components/DetachmentSelector';
import { UnitSection } from './components/UnitSection';
import { UnitBrowserModal } from './components/UnitBrowserModal';
import { ValidationDrawer } from './components/ValidationDrawer';
import { ExportModal } from './components/ExportModal';
import { ListSettingsModal } from './components/ListSettingsModal';
import { AiSettingsModal } from './components/AiSettingsModal';
import { AiArmyCreatorModal } from './components/AiArmyCreatorModal';
import { AiRulesAssistant } from './components/AiRulesAssistant';
import { hasApiKey } from './services/geminiService';
import { Shield, Sparkles, BookOpen, Plus } from 'lucide-react';

export const App: React.FC = () => {
  const [rosters, setRosters] = useState<ArmyRoster[]>(() => loadAllRosters());
  const [activeRoster, setActiveRoster] = useState<ArmyRoster | null>(() => {
    const loaded = loadAllRosters();
    const savedActiveId = loadActiveRosterId();
    if (!savedActiveId) return null;
    return loaded.find(r => r.id === savedActiveId) || null;
  });
  const [factionData, setFactionData] = useState<FactionDetail | null>(null);
  const [isLoadingFaction, setIsLoadingFaction] = useState(false);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isBrowserModalOpen, setIsBrowserModalOpen] = useState(false);
  const [browserRoleFilter, setBrowserRoleFilter] = useState('All');
  const [isValidationDrawerOpen, setIsValidationDrawerOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isPlayMode, setIsPlayMode] = useState<boolean>(() => loadPlayMode());
  const [isAiSettingsModalOpen, setIsAiSettingsModalOpen] = useState(false);
  const [isAiArmyCreatorOpen, setIsAiArmyCreatorOpen] = useState(false);
  const [isAiRulesAssistantOpen, setIsAiRulesAssistantOpen] = useState(false);

  // 1. Persist Active Roster ID & Play Mode across mobile browser reloads / sleep wakeups
  useEffect(() => {
    saveActiveRosterId(activeRoster?.id || null);
  }, [activeRoster?.id]);

  useEffect(() => {
    savePlayMode(isPlayMode);
  }, [isPlayMode]);

  // 2. Fetch Faction Data when Active Roster Changes
  useEffect(() => {
    if (!activeRoster) {
      setFactionData(null);
      return;
    }

    const hydrateRosterUnits = (data: FactionDetail) => {
      if (!data.units || !activeRoster) return;
      let changed = false;

      // Hydrate selected detachments with latest rules/descriptions from indexed data
      let hydratedDetachments = activeRoster.detachments;
      if (data.detachments && activeRoster.detachments.length > 0) {
        hydratedDetachments = activeRoster.detachments.map(det => {
          const freshDet = data.detachments.find(
            fd => fd.id === det.id || normalizeDetachmentName(fd.name) === normalizeDetachmentName(det.name)
          );
          if (!freshDet) return det;
          const oldRulesJson = JSON.stringify(det.rules || []);
          const newRulesJson = JSON.stringify(freshDet.rules || []);
          if (oldRulesJson !== newRulesJson || det.dpCost !== freshDet.dpCost) {
            changed = true;
            return freshDet;
          }
          return det;
        });
      }

      const hydratedUnits = activeRoster.units.map(u => {
        const freshDs = data.units.find(du => du.id === u.datasheetId || du.name === u.name);
        if (!freshDs) return u;
        let nextUnit = u;
        const oldWgJson = JSON.stringify(u.datasheet.wargearGroups || []);
        const newWgJson = JSON.stringify(freshDs.wargearGroups || []);
        if (
          oldWgJson !== newWgJson ||
          !u.datasheet.baseProfileNames ||
          !u.datasheet.baseWeaponCounts ||
          JSON.stringify(u.datasheet.enhancementGroupIds || []) !== JSON.stringify(freshDs.enhancementGroupIds || []) ||
          u.datasheet.baseCost !== freshDs.baseCost ||
          (u.cost === 0 && freshDs.baseCost > 0) ||
          u.datasheet.canBeLed === undefined ||
          u.datasheet.canHaveSupport === undefined
        ) {
          const matchedTier = freshDs.costTiers?.find(t => t.models === u.modelsCount);
          const updatedCost = u.cost === 0 && freshDs.baseCost > 0
            ? (matchedTier ? matchedTier.cost : freshDs.baseCost)
            : u.cost;
          nextUnit = {
            ...nextUnit,
            cost: updatedCost,
            isLeader: freshDs.isLeader,
            isSupport: freshDs.isSupport,
            datasheet: freshDs
          };
          changed = true;
        }
        if (nextUnit.enhancement && data.enhancements) {
          const freshEnh = data.enhancements.find(e => e.id === nextUnit.enhancement?.id || e.name === nextUnit.enhancement?.name);
          if (freshEnh) {
            if (!isEnhancementEligibleForUnit(nextUnit, freshEnh, hydratedDetachments)) {
              const { enhancement, ...rest } = nextUnit;
              nextUnit = { ...rest, enhancement: undefined };
              changed = true;
            } else if (JSON.stringify(nextUnit.enhancement) !== JSON.stringify(freshEnh)) {
              nextUnit = { ...nextUnit, enhancement: freshEnh };
              changed = true;
            }
          }
        }
        if (freshDs.wargearGroups && freshDs.wargearGroups.length > 0) {
          const nextSelectedOptions: Record<string, string[]> = { ...(nextUnit.selectedOptions || {}) };
          let optsChanged = !nextUnit.selectedOptions;
          for (const g of freshDs.wargearGroups) {
            const validIds = new Set(g.options.map(o => o.id));
            const currentSel = nextSelectedOptions[g.id];
            if (currentSel === undefined) {
              nextSelectedOptions[g.id] = g.defaultOptionIds || [];
              optsChanged = true;
            } else {
              const filtered = currentSel.filter(id => validIds.has(id));
              const totalCount = filtered.length;
              if (
                filtered.length !== currentSel.length ||
                (g.max > 0 && totalCount > g.max) ||
                (g.min > 0 && totalCount < g.min)
              ) {
                nextSelectedOptions[g.id] = g.defaultOptionIds || [];
                optsChanged = true;
              }
            }
          }
          if (optsChanged) {
            nextUnit = { ...nextUnit, selectedOptions: nextSelectedOptions };
            changed = true;
          }
        }
        return nextUnit;
      });
      if (changed) {
        const updatedRoster = {
          ...activeRoster,
          detachments: hydratedDetachments,
          units: hydratedUnits
        };
        setActiveRoster(updatedRoster);
        setRosters(saveRoster(updatedRoster));
      }
    };

    const fetchFaction = async () => {
      setIsLoadingFaction(true);
      const factionId = activeRoster.factionId;

      try {
        const staticRes = await fetch(`${import.meta.env.BASE_URL}data/factions/${factionId}.json`, { cache: 'no-cache' });
        if (staticRes.ok) {
          const data = await staticRes.json();
          setFactionData(data);
          hydrateRosterUnits(data);
          setIsLoadingFaction(false);
          return;
        }
      } catch (err) {
        // Fallback to Express API if static fetch fails
      }

      try {
        const apiRes = await fetch(`/api/factions/${factionId}`, { cache: 'no-cache' });
        if (apiRes.ok) {
          const data = await apiRes.json();
          setFactionData(data);
          hydrateRosterUnits(data);
        } else {
          console.error(`Failed to load faction data for ${factionId}`);
        }
      } catch (err) {
        console.error('Error loading faction data:', err);
      } finally {
        setIsLoadingFaction(false);
      }
    };

    fetchFaction();
  }, [activeRoster?.factionId]);

  // Handle Roster Actions
  const handleSaveActiveRoster = () => {
    if (!activeRoster) return;
    const updated = saveRoster(activeRoster);
    setRosters(updated);
  };

  const handleCreateNewRoster = (newRoster: ArmyRoster) => {
    const updated = saveRoster(newRoster);
    setRosters(updated);
    setActiveRoster(newRoster);
    setIsCreateModalOpen(false);
  };

  const handleDeleteRoster = (rosterId: string) => {
    const updated = deleteRoster(rosterId);
    setRosters(updated);
    if (activeRoster?.id === rosterId) {
      setActiveRoster(null);
    }
  };

  const handleDuplicateRoster = (rosterId: string) => {
    const copy = duplicateRoster(rosterId);
    if (copy) {
      setRosters(loadAllRosters());
    }
  };

  const handleImportRoster = (imported: ArmyRoster) => {
    const updated = saveRoster(imported);
    setRosters(updated);
    setActiveRoster(imported);
  };

  const handleUpdateBattleSize = (size: BattleSize) => {
    if (!activeRoster) return;
    const updated = { ...activeRoster, battleSize: size };
    setActiveRoster(updated);
    saveRoster(updated);
  };

  // Detachment Toggle
  const handleToggleDetachment = (detachment: SelectedDetachment) => {
    if (!activeRoster) return;
    const exists = activeRoster.detachments.some(d => d.name === detachment.name);
    let newDetachments: SelectedDetachment[];

    if (exists) {
      newDetachments = activeRoster.detachments.filter(d => d.name !== detachment.name);
    } else {
      newDetachments = [...activeRoster.detachments, detachment];
    }

    // Check if current force disposition is still supported by the new detachments
    let newDisposition = activeRoster.forceDisposition;
    if (newDisposition) {
      const stillSupported = newDetachments.some(d =>
        d.tags?.some(t => t.toUpperCase() === newDisposition!.toUpperCase())
      );
      if (!stillSupported) {
        newDisposition = null;
      }
    }

    // Remove any equipped enhancements whose detachment is no longer selected
    const updatedUnits = activeRoster.units.map(u => {
      if (!u.enhancement) return u;
      if (u.enhancement.detachment) {
        const enhDetNorm = normalizeDetachmentName(u.enhancement.detachment);
        const stillHasDet = newDetachments.some(d => normalizeDetachmentName(d.name) === enhDetNorm);
        if (!stillHasDet) {
          const { enhancement, ...rest } = u;
          return { ...rest, enhancement: undefined };
        }
      } else if (!isEnhancementEligibleForUnit(u, u.enhancement, newDetachments)) {
        const { enhancement, ...rest } = u;
        return { ...rest, enhancement: undefined };
      }
      return u;
    });

    const updated: ArmyRoster = {
      ...activeRoster,
      detachments: newDetachments,
      units: updatedUnits,
      forceDisposition: newDisposition,
      forceDispositions: newDisposition ? [newDisposition] : []
    };
    setActiveRoster(updated);
    saveRoster(updated);
  };

  // Force Disposition Selection
  const handleSelectDisposition = (disposition: string | null) => {
    if (!activeRoster) return;
    const updated: ArmyRoster = {
      ...activeRoster,
      forceDisposition: disposition,
      forceDispositions: disposition ? [disposition] : []
    };
    setActiveRoster(updated);
    saveRoster(updated);
  };

  // Toggle Legends Units
  const handleToggleLegends = (enabled: boolean) => {
    if (!activeRoster) return;
    const updated: ArmyRoster = {
      ...activeRoster,
      includeLegends: enabled
    };
    setActiveRoster(updated);
    saveRoster(updated);
  };

  // Add Unit
  const handleAddUnit = (datasheet: Datasheet) => {
    if (!activeRoster) return;

    const defaultSelectedOptions: Record<string, string[]> = {};
    if (datasheet.wargearGroups) {
      for (const g of datasheet.wargearGroups) {
        defaultSelectedOptions[g.id] = g.defaultOptionIds || [];
      }
    }

    const newUnit: SelectedUnit = {
      instanceId: `unit-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      datasheetId: datasheet.id,
      name: datasheet.name,
      cost: datasheet.baseCost,
      modelsCount: datasheet.minModels || 1,
      isCharacter: datasheet.isCharacter,
      isEpicHero: datasheet.isEpicHero,
      isBattleline: datasheet.isBattleline,
      isDedicatedTransport: datasheet.isDedicatedTransport,
      isLeader: datasheet.isLeader,
      isSupport: datasheet.isSupport,
      isWarlord: false,
      selectedOptions: defaultSelectedOptions,
      datasheet
    };

    // If this is the first character and no warlord exists, make it Warlord automatically!
    const hasWarlord = activeRoster.units.some(u => u.isWarlord);
    if (datasheet.isCharacter && !hasWarlord) {
      newUnit.isWarlord = true;
    }

    const updated = {
      ...activeRoster,
      units: [...activeRoster.units, newUnit]
    };
    setActiveRoster(updated);
    saveRoster(updated);
  };

  // Update Unit (Squad size, Enhancement, Attachment) with bi-directional sync
  const handleUpdateUnit = (updatedUnit: SelectedUnit) => {
    if (!activeRoster) return;
    const oldUnit = activeRoster.units.find(u => u.instanceId === updatedUnit.instanceId);
    let updatedUnits = activeRoster.units.map(u =>
      u.instanceId === updatedUnit.instanceId ? updatedUnit : { ...u }
    );

    // 1. If attachedLeaderId changed on a bodyguard
    if (oldUnit && oldUnit.attachedLeaderId !== updatedUnit.attachedLeaderId) {
      const oldLeaderId = oldUnit.attachedLeaderId;
      const newLeaderId = updatedUnit.attachedLeaderId;
      updatedUnits = updatedUnits.map(u => {
        if (oldLeaderId && u.instanceId === oldLeaderId) {
          return { ...u, attachedToBodyguardId: undefined };
        }
        if (newLeaderId && u.instanceId === newLeaderId) {
          return { ...u, attachedToBodyguardId: updatedUnit.instanceId };
        }
        return u;
      });
    }

    // 2. If attachedSupportId changed on a bodyguard
    if (oldUnit && oldUnit.attachedSupportId !== updatedUnit.attachedSupportId) {
      const oldSupportId = oldUnit.attachedSupportId;
      const newSupportId = updatedUnit.attachedSupportId;
      updatedUnits = updatedUnits.map(u => {
        if (oldSupportId && u.instanceId === oldSupportId) {
          return { ...u, attachedToBodyguardId: undefined };
        }
        if (newSupportId && u.instanceId === newSupportId) {
          return { ...u, attachedToBodyguardId: updatedUnit.instanceId };
        }
        return u;
      });
    }

    // 3. If attachedToBodyguardId changed on a Leader/Support
    if (oldUnit && oldUnit.attachedToBodyguardId !== updatedUnit.attachedToBodyguardId) {
      const oldBgId = oldUnit.attachedToBodyguardId;
      const newBgId = updatedUnit.attachedToBodyguardId;
      updatedUnits = updatedUnits.map(u => {
        if (oldBgId && u.instanceId === oldBgId) {
          const uCopy = { ...u };
          if (uCopy.attachedLeaderId === updatedUnit.instanceId) uCopy.attachedLeaderId = undefined;
          if (uCopy.attachedSupportId === updatedUnit.instanceId) uCopy.attachedSupportId = undefined;
          return uCopy;
        }
        if (newBgId && u.instanceId === newBgId) {
          const uCopy = { ...u };
          if (updatedUnit.isLeader) uCopy.attachedLeaderId = updatedUnit.instanceId;
          else if (updatedUnit.isSupport) uCopy.attachedSupportId = updatedUnit.instanceId;
          return uCopy;
        }
        return u;
      });
    }

    const updated = { ...activeRoster, units: updatedUnits };
    setActiveRoster(updated);
    saveRoster(updated);
  };

  // Remove Unit
  const handleRemoveUnit = (instanceId: string) => {
    if (!activeRoster) return;
    const updatedUnits = activeRoster.units.filter(u => u.instanceId !== instanceId);
    // Unlink any attachments pointing to this unit
    updatedUnits.forEach(u => {
      if (u.attachedToBodyguardId === instanceId) u.attachedToBodyguardId = undefined;
      if (u.attachedLeaderId === instanceId) u.attachedLeaderId = undefined;
      if (u.attachedSupportId === instanceId) u.attachedSupportId = undefined;
    });

    const updated = { ...activeRoster, units: updatedUnits };
    setActiveRoster(updated);
    saveRoster(updated);
  };

  // Duplicate Unit
  const handleDuplicateUnit = (unit: SelectedUnit) => {
    if (!activeRoster || unit.isEpicHero) return;
    const clone: SelectedUnit = {
      ...unit,
      instanceId: `unit-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      isWarlord: false,
      attachedToBodyguardId: undefined,
      attachedLeaderId: undefined,
      attachedSupportId: undefined
    };
    const updated = {
      ...activeRoster,
      units: [...activeRoster.units, clone]
    };
    setActiveRoster(updated);
    saveRoster(updated);
  };

  // Set Warlord
  const handleSetWarlord = (instanceId: string) => {
    if (!activeRoster) return;
    const updatedUnits = activeRoster.units.map(u => ({
      ...u,
      isWarlord: u.instanceId === instanceId
    }));
    const updated = { ...activeRoster, units: updatedUnits };
    setActiveRoster(updated);
    saveRoster(updated);
  };

  // Launch Unit Browser
  const handleOpenBrowser = (roleKey: string) => {
    setBrowserRoleFilter(roleKey);
    setIsBrowserModalOpen(true);
  };

  // AI Modal Launchers with Strict API Key Gate
  const handleOpenAiArmyCreator = () => {
    if (!hasApiKey()) {
      setIsAiSettingsModalOpen(true);
      return;
    }
    setIsAiArmyCreatorOpen(true);
  };

  const handleOpenAiRules = () => {
    if (!hasApiKey()) {
      setIsAiSettingsModalOpen(true);
      return;
    }
    setIsAiRulesAssistantOpen(true);
  };

  // If No Active Roster, Show Landing Page
  if (!activeRoster) {
    return (
      <>
        <LandingPage
          rosters={rosters}
          onCreateNew={() => setIsCreateModalOpen(true)}
          onSelectRoster={(r) => setActiveRoster(r)}
          onDuplicateRoster={handleDuplicateRoster}
          onDeleteRoster={handleDeleteRoster}
          onImportRoster={handleImportRoster}
          onOpenAiArmyCreator={handleOpenAiArmyCreator}
          onOpenAiRules={handleOpenAiRules}
          onOpenAiSettings={() => setIsAiSettingsModalOpen(true)}
        />
        <CreateArmyModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onCreate={handleCreateNewRoster}
          onOpenAiCreator={handleOpenAiArmyCreator}
        />
        <AiSettingsModal
          isOpen={isAiSettingsModalOpen}
          onClose={() => setIsAiSettingsModalOpen(false)}
        />
        <AiArmyCreatorModal
          isOpen={isAiArmyCreatorOpen}
          onClose={() => setIsAiArmyCreatorOpen(false)}
          onOpenSettings={() => {
            setIsAiArmyCreatorOpen(false);
            setIsAiSettingsModalOpen(true);
          }}
          onCreateRoster={handleCreateNewRoster}
        />
        <AiRulesAssistant
          isOpen={isAiRulesAssistantOpen}
          onClose={() => setIsAiRulesAssistantOpen(false)}
          onOpenSettings={() => {
            setIsAiRulesAssistantOpen(false);
            setIsAiSettingsModalOpen(true);
          }}
          activeRoster={null}
        />
      </>
    );
  }

  // Active Roster Workspace
  const validation = validateClientRoster(activeRoster);
  const limits = BATTLE_SIZE_CONFIGS[activeRoster.battleSize] || BATTLE_SIZE_CONFIGS['strike-force'];

  // Dynamically compute only categories that this army actually has access to
  const getActiveArmyCategories = () => {
    if (!factionData?.units) return [];
    const rolesSet = new Set<string>();

    for (const d of factionData.units) {
      if (!isUnitAllowedForChapter(d, activeRoster.factionId, activeRoster.subFactionName)) continue;
      if (!activeRoster.includeLegends && isLegendsUnit(d)) continue;
      rolesSet.add(getUnitRole(d));
    }
    for (const u of activeRoster.units) {
      rolesSet.add(getUnitRole(u));
    }

    const canonical = [
      { key: 'Epic Hero', title: 'Epic Heroes', limit: 1 },
      { key: 'Character', title: 'Characters', limit: limits.unitLimit },
      { key: 'Battleline', title: 'Battleline', limit: limits.battlelineLimit },
      { key: 'Infantry', title: 'Infantry', limit: limits.unitLimit },
      { key: 'Mounted', title: 'Mounted', limit: limits.unitLimit },
      { key: 'Monster', title: 'Monsters', limit: limits.unitLimit },
      { key: 'Vehicle', title: 'Vehicles', limit: limits.unitLimit },
      { key: 'Dedicated Transport', title: 'Dedicated Transports', limit: limits.battlelineLimit },
      { key: 'Aircraft', title: 'Aircraft', limit: limits.unitLimit },
      { key: 'Fortification', title: 'Fortifications', limit: limits.unitLimit },
      { key: 'Allied Units', title: 'Allied Units', limit: limits.unitLimit }
    ];

    // Only categories available to this army!
    return canonical.filter(c => rolesSet.has(c.key));
  };

  const activeArmyCategories = getActiveArmyCategories();

  // Categorize Units by Role for Section rendering strictly using getUnitRole
  const getUnitsByRole = (role: string) => {
    return activeRoster.units.filter(u => getUnitRole(u) === role);
  };

  return (
    <div className="min-h-screen bg-grimdark-950 flex flex-col pb-8">
      
      {/* Top HUD */}
      <Navbar
        roster={activeRoster}
        validation={validation}
        isPlayMode={isPlayMode}
        onTogglePlayMode={() => setIsPlayMode(prev => !prev)}
        onUpdateBattleSize={handleUpdateBattleSize}
        onSave={handleSaveActiveRoster}
        onExport={() => setIsExportModalOpen(true)}
        onBackToDashboard={() => {
          setIsPlayMode(false);
          setRosters(loadAllRosters());
          setActiveRoster(null);
        }}
        onToggleValidationDrawer={() => setIsValidationDrawerOpen(true)}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onOpenAiRules={handleOpenAiRules}
        onOpenAiSettings={() => setIsAiSettingsModalOpen(true)}
      />

      {/* Main Builder Scrollable Canvas */}
      <main className="max-w-7xl mx-auto w-full px-3 sm:px-6 py-3 sm:py-4">
        
        {/* Loading Indicator */}
        {isLoadingFaction && (
          <div className="text-center py-8 text-sky-400 font-mono text-sm animate-pulse">
            Loading {activeRoster.factionName} battle archives...
          </div>
        )}

        {factionData && (
          <>
            {/* 1. Detachments & Force Disposition (Unified Compact Header) */}
            <DetachmentSelector
              availableDetachments={factionData.detachments}
              selectedDetachments={activeRoster.detachments}
              allEnhancements={factionData.enhancements}
              totalDP={validation.totalDP}
              dpLimit={validation.dpLimit}
              subFactionName={activeRoster.subFactionName}
              subFactionId={activeRoster.subFactionId}
              rosterUnits={activeRoster.units}
              currentDisposition={activeRoster.forceDisposition}
              isPlayMode={isPlayMode}
              onToggleDetachment={handleToggleDetachment}
              onSelectDisposition={handleSelectDisposition}
            />

            {/* 2. Battlefield Role Unit Sections */}
            <div className="space-y-3 pb-6">
              {activeArmyCategories.map((cat) => (
                <UnitSection
                  key={cat.key}
                  title={cat.title}
                  roleKey={cat.key}
                  units={getUnitsByRole(cat.key)}
                  allUnitsInRoster={activeRoster.units}
                  availableEnhancements={factionData.enhancements}
                  selectedDetachments={activeRoster.detachments}
                  isPlayMode={isPlayMode}
                  unitLimit={cat.limit}
                  onOpenBrowser={handleOpenBrowser}
                  onUpdateUnit={handleUpdateUnit}
                  onDuplicateUnit={handleDuplicateUnit}
                  onRemoveUnit={handleRemoveUnit}
                  onSetWarlord={handleSetWarlord}
                />
              ))}
            </div>
          </>
        )}

      </main>

      {/* Modals & Drawers */}
      {factionData && (
        <UnitBrowserModal
          isOpen={isBrowserModalOpen}
          onClose={() => setIsBrowserModalOpen(false)}
          availableDatasheets={factionData.units}
          unitsInRoster={activeRoster.units}
          battleSize={activeRoster.battleSize}
          initialRoleFilter={browserRoleFilter}
          includeLegends={activeRoster.includeLegends || false}
          factionId={activeRoster.factionId}
          subFactionName={activeRoster.subFactionName}
          onToggleLegends={handleToggleLegends}
          onAddUnit={handleAddUnit}
        />
      )}

      <ValidationDrawer
        isOpen={isValidationDrawerOpen}
        onClose={() => setIsValidationDrawerOpen(false)}
        validation={validation}
      />

      <ExportModal
        roster={activeRoster}
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />

      <ListSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        includeLegends={activeRoster.includeLegends || false}
        onToggleLegends={handleToggleLegends}
        rosterName={activeRoster.name}
      />

      {/* Floating Rules AI Assistant Pill in Play Mode */}
      {isPlayMode && (
        <button
          type="button"
          onClick={handleOpenAiRules}
          className="fixed bottom-5 right-5 z-40 flex items-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs sm:text-sm shadow-xl shadow-amber-950/70 border border-amber-300/60 active:scale-95 transition-all"
          title="Open Rules Arbiter AI"
          aria-label="Open Rules Arbiter AI"
        >
          <BookOpen className="w-4 h-4 stroke-[2.5]" />
          <span>Rules AI</span>
        </button>
      )}

      {/* Gemini AI Modals */}
      <AiSettingsModal
        isOpen={isAiSettingsModalOpen}
        onClose={() => setIsAiSettingsModalOpen(false)}
      />

      <AiArmyCreatorModal
        isOpen={isAiArmyCreatorOpen}
        onClose={() => setIsAiArmyCreatorOpen(false)}
        onOpenSettings={() => {
          setIsAiArmyCreatorOpen(false);
          setIsAiSettingsModalOpen(true);
        }}
        onCreateRoster={handleCreateNewRoster}
      />

      <AiRulesAssistant
        isOpen={isAiRulesAssistantOpen}
        onClose={() => setIsAiRulesAssistantOpen(false)}
        onOpenSettings={() => {
          setIsAiRulesAssistantOpen(false);
          setIsAiSettingsModalOpen(true);
        }}
        activeRoster={activeRoster}
      />

    </div>
  );
};

