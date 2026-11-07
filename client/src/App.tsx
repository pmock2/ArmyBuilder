import React, { useState, useEffect } from 'react';
import { ArmyRoster, BattleSize, Datasheet, SelectedUnit, SelectedDetachment } from './types/roster';
import { FactionDetail } from './types/faction';
import { loadAllRosters, saveRoster, deleteRoster, duplicateRoster } from './utils/storage';
import { validateClientRoster, BATTLE_SIZE_CONFIGS } from './utils/validator';
import { LandingPage } from './components/LandingPage';
import { CreateArmyModal } from './components/CreateArmyModal';
import { Navbar } from './components/Navbar';
import { DetachmentSelector } from './components/DetachmentSelector';
import { UnitSection } from './components/UnitSection';
import { UnitBrowserModal } from './components/UnitBrowserModal';
import { ValidationDrawer } from './components/ValidationDrawer';
import { ExportModal } from './components/ExportModal';
import { Shield, Sparkles, BookOpen } from 'lucide-react';

export const App: React.FC = () => {
  const [rosters, setRosters] = useState<ArmyRoster[]>([]);
  const [activeRoster, setActiveRoster] = useState<ArmyRoster | null>(null);
  const [factionData, setFactionData] = useState<FactionDetail | null>(null);
  const [isLoadingFaction, setIsLoadingFaction] = useState(false);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isBrowserModalOpen, setIsBrowserModalOpen] = useState(false);
  const [browserRoleFilter, setBrowserRoleFilter] = useState('All');
  const [isValidationDrawerOpen, setIsValidationDrawerOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // 1. Initial Load of Saved Rosters
  useEffect(() => {
    const loaded = loadAllRosters();
    setRosters(loaded);
  }, []);

  // 2. Fetch Faction Data when Active Roster Changes
  useEffect(() => {
    if (!activeRoster) {
      setFactionData(null);
      return;
    }

    const fetchFaction = async () => {
      setIsLoadingFaction(true);
      const factionId = activeRoster.factionId;

      try {
        // Try Express API first
        const apiRes = await fetch(`/api/factions/${factionId}`);
        if (apiRes.ok) {
          const data = await apiRes.json();
          setFactionData(data);
          setIsLoadingFaction(false);
          return;
        }
      } catch (err) {
        // Fallback to static public file
      }

      try {
        const staticRes = await fetch(`/data/factions/${factionId}.json`);
        if (staticRes.ok) {
          const data = await staticRes.json();
          setFactionData(data);
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

    const updated = { ...activeRoster, detachments: newDetachments };
    setActiveRoster(updated);
    saveRoster(updated);
  };

  // Add Unit
  const handleAddUnit = (datasheet: Datasheet) => {
    if (!activeRoster) return;

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

  // Update Unit (Squad size, Enhancement, Attachment)
  const handleUpdateUnit = (updatedUnit: SelectedUnit) => {
    if (!activeRoster) return;
    const updatedUnits = activeRoster.units.map(u =>
      u.instanceId === updatedUnit.instanceId ? updatedUnit : u
    );
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
        />
        <CreateArmyModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onCreate={handleCreateNewRoster}
        />
      </>
    );
  }

  // Active Roster Workspace
  const validation = validateClientRoster(activeRoster);
  const limits = BATTLE_SIZE_CONFIGS[activeRoster.battleSize] || BATTLE_SIZE_CONFIGS['strike-force'];

  // Categorize Units by Role for Section rendering
  const getUnitsByRole = (role: string) => {
    return activeRoster.units.filter(u => {
      if (role === 'Epic Hero') return u.isEpicHero;
      if (role === 'Character') return u.isCharacter && !u.isEpicHero;
      if (role === 'Battleline') return u.isBattleline && !u.isCharacter && !u.isEpicHero;
      if (role === 'Dedicated Transport') return u.isDedicatedTransport;
      return u.datasheet.primaryCategory.toLowerCase() === role.toLowerCase();
    });
  };

  return (
    <div className="min-h-screen bg-grimdark-950 flex flex-col pb-16">
      
      {/* Top HUD */}
      <Navbar
        roster={activeRoster}
        validation={validation}
        onUpdateBattleSize={handleUpdateBattleSize}
        onSave={handleSaveActiveRoster}
        onExport={() => setIsExportModalOpen(true)}
        onBackToDashboard={() => setActiveRoster(null)}
        onToggleValidationDrawer={() => setIsValidationDrawerOpen(true)}
      />

      {/* Main Builder Scrollable Canvas */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6">
        
        {/* Loading Indicator */}
        {isLoadingFaction && (
          <div className="text-center py-12 text-amber-400 font-mono text-sm animate-pulse">
            Loading {activeRoster.factionName} battle archives...
          </div>
        )}

        {factionData && (
          <>
            {/* 1. Global Army Rules Banner */}
            <div className="bg-grimdark-900 border border-grimdark-800 rounded-2xl p-5 mb-6 shadow-xl flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-amber-600/20 border border-amber-500/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                <BookOpen className="w-5 h-5 text-amber-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="font-warhammer text-base font-bold text-amber-300">
                    Army Rules & Force Disposition
                  </h2>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-grimdark-950 text-grimdark-400 border border-grimdark-800 font-mono">
                    {activeRoster.factionName}
                  </span>
                </div>
                <p className="text-xs text-grimdark-300 leading-relaxed">
                  Units in your army gain the faction ability of your army faction ({activeRoster.factionName}).
                  Select your Detachments below to unlock your Detachment Rules, Enhancement options, and Stratagems.
                </p>
              </div>
            </div>

            {/* 2. Detachments Selector */}
            <DetachmentSelector
              availableDetachments={factionData.detachments}
              selectedDetachments={activeRoster.detachments}
              allEnhancements={factionData.enhancements}
              totalDP={validation.totalDP}
              dpLimit={validation.dpLimit}
              onToggleDetachment={handleToggleDetachment}
            />

            {/* 3. Battlefield Role Unit Sections */}
            <div className="space-y-4">
              {/* Epic Heroes */}
              <UnitSection
                title="Epic Heroes"
                roleKey="Epic Hero"
                units={getUnitsByRole('Epic Hero')}
                allUnitsInRoster={activeRoster.units}
                availableEnhancements={factionData.enhancements}
                unitLimit={1}
                onOpenBrowser={handleOpenBrowser}
                onUpdateUnit={handleUpdateUnit}
                onDuplicateUnit={handleDuplicateUnit}
                onRemoveUnit={handleRemoveUnit}
                onSetWarlord={handleSetWarlord}
              />

              {/* Characters */}
              <UnitSection
                title="Characters"
                roleKey="Character"
                units={getUnitsByRole('Character')}
                allUnitsInRoster={activeRoster.units}
                availableEnhancements={factionData.enhancements}
                unitLimit={limits.unitLimit}
                onOpenBrowser={handleOpenBrowser}
                onUpdateUnit={handleUpdateUnit}
                onDuplicateUnit={handleDuplicateUnit}
                onRemoveUnit={handleRemoveUnit}
                onSetWarlord={handleSetWarlord}
              />

              {/* Battleline */}
              <UnitSection
                title="Battleline"
                roleKey="Battleline"
                units={getUnitsByRole('Battleline')}
                allUnitsInRoster={activeRoster.units}
                availableEnhancements={factionData.enhancements}
                unitLimit={limits.battlelineLimit}
                onOpenBrowser={handleOpenBrowser}
                onUpdateUnit={handleUpdateUnit}
                onDuplicateUnit={handleDuplicateUnit}
                onRemoveUnit={handleRemoveUnit}
                onSetWarlord={handleSetWarlord}
              />

              {/* Infantry */}
              <UnitSection
                title="Infantry"
                roleKey="Infantry"
                units={getUnitsByRole('Infantry')}
                allUnitsInRoster={activeRoster.units}
                availableEnhancements={factionData.enhancements}
                unitLimit={limits.unitLimit}
                onOpenBrowser={handleOpenBrowser}
                onUpdateUnit={handleUpdateUnit}
                onDuplicateUnit={handleDuplicateUnit}
                onRemoveUnit={handleRemoveUnit}
                onSetWarlord={handleSetWarlord}
              />

              {/* Mounted */}
              <UnitSection
                title="Mounted"
                roleKey="Mounted"
                units={getUnitsByRole('Mounted')}
                allUnitsInRoster={activeRoster.units}
                availableEnhancements={factionData.enhancements}
                unitLimit={limits.unitLimit}
                onOpenBrowser={handleOpenBrowser}
                onUpdateUnit={handleUpdateUnit}
                onDuplicateUnit={handleDuplicateUnit}
                onRemoveUnit={handleRemoveUnit}
                onSetWarlord={handleSetWarlord}
              />

              {/* Monster */}
              <UnitSection
                title="Monsters"
                roleKey="Monster"
                units={getUnitsByRole('Monster')}
                allUnitsInRoster={activeRoster.units}
                availableEnhancements={factionData.enhancements}
                unitLimit={limits.unitLimit}
                onOpenBrowser={handleOpenBrowser}
                onUpdateUnit={handleUpdateUnit}
                onDuplicateUnit={handleDuplicateUnit}
                onRemoveUnit={handleRemoveUnit}
                onSetWarlord={handleSetWarlord}
              />

              {/* Vehicle */}
              <UnitSection
                title="Vehicles"
                roleKey="Vehicle"
                units={getUnitsByRole('Vehicle')}
                allUnitsInRoster={activeRoster.units}
                availableEnhancements={factionData.enhancements}
                unitLimit={limits.unitLimit}
                onOpenBrowser={handleOpenBrowser}
                onUpdateUnit={handleUpdateUnit}
                onDuplicateUnit={handleDuplicateUnit}
                onRemoveUnit={handleRemoveUnit}
                onSetWarlord={handleSetWarlord}
              />

              {/* Dedicated Transport */}
              <UnitSection
                title="Dedicated Transports"
                roleKey="Dedicated Transport"
                units={getUnitsByRole('Dedicated Transport')}
                allUnitsInRoster={activeRoster.units}
                availableEnhancements={factionData.enhancements}
                unitLimit={limits.battlelineLimit}
                onOpenBrowser={handleOpenBrowser}
                onUpdateUnit={handleUpdateUnit}
                onDuplicateUnit={handleDuplicateUnit}
                onRemoveUnit={handleRemoveUnit}
                onSetWarlord={handleSetWarlord}
              />

              {/* Aircraft */}
              <UnitSection
                title="Aircraft"
                roleKey="Aircraft"
                units={getUnitsByRole('Aircraft')}
                allUnitsInRoster={activeRoster.units}
                availableEnhancements={factionData.enhancements}
                unitLimit={limits.unitLimit}
                onOpenBrowser={handleOpenBrowser}
                onUpdateUnit={handleUpdateUnit}
                onDuplicateUnit={handleDuplicateUnit}
                onRemoveUnit={handleRemoveUnit}
                onSetWarlord={handleSetWarlord}
              />

              {/* Fortifications */}
              <UnitSection
                title="Fortifications"
                roleKey="Fortification"
                units={getUnitsByRole('Fortification')}
                allUnitsInRoster={activeRoster.units}
                availableEnhancements={factionData.enhancements}
                unitLimit={limits.unitLimit}
                onOpenBrowser={handleOpenBrowser}
                onUpdateUnit={handleUpdateUnit}
                onDuplicateUnit={handleDuplicateUnit}
                onRemoveUnit={handleRemoveUnit}
                onSetWarlord={handleSetWarlord}
              />
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

    </div>
  );
};
