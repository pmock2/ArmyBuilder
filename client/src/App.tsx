import React, { useState, useEffect } from 'react';
import { ArmyRoster, BattleSize, Datasheet, SelectedUnit, SelectedDetachment, getUnitRole, isLegendsUnit, isUnitAllowedForChapter, isEnhancementEligibleForUnit, getMandatoryEnhancementForUnit, normalizeDetachmentName, isRetinueUnit, hasAttachedCryptek } from './types/roster';
import { FactionDetail } from './types/faction';
import { loadAllRosters, saveRoster, deleteRoster, duplicateRoster, loadActiveRosterId, saveActiveRosterId, loadPlayMode, savePlayMode } from './utils/storage';
import { validateClientRoster, BATTLE_SIZE_CONFIGS } from './utils/validator';
import { LandingPage } from './components/LandingPage';
import CreateArmyModal from './components/CreateArmyModal';
import { Navbar } from './components/Navbar';
import { DetachmentSelector } from './components/DetachmentSelector';
import { getUnlockedDispositions } from './components/ForceDispositionSelector';
import { UnitSection } from './components/UnitSection';
import { DestroyedUnitsSection } from './components/DestroyedUnitsSection';
import { DatasheetModal } from './components/DatasheetModal';
import { UnitBrowserModal } from './components/UnitBrowserModal';
import { ValidationDrawer } from './components/ValidationDrawer';
import { ExportModal } from './components/ExportModal';
import { ListSettingsModal } from './components/ListSettingsModal';
import { AiSettingsModal } from './components/AiSettingsModal';
import { AiArmyCreatorModal } from './components/AiArmyCreatorModal';
import { AiRulesAssistant } from './components/AiRulesAssistant';
import { AiListEvaluatorModal } from './components/AiListEvaluatorModal';
import { FeedbackModal } from './components/FeedbackModal';
import { StagingBanner } from './components/StagingBanner';
import { InstallPromptBanner } from './components/InstallPromptBanner';
import { useBackNavigation } from './utils/backNavigation';
import { getAllThemes, applyThemeToDocument, initTheme } from './utils/themeStorage';
import {
  RosterPlayState,
  UnitPlayState,
  ArmyRulePlayState,
  loadRosterPlayState,
  saveRosterPlayState,
  loadArmyRulePlayState,
  saveArmyRulePlayState,
  hasArmyRulePlayStateChanges,
  clearRosterPlayState,
  stepUnitPlayRemaining,
  patchUnitPlayState,
  resetAllKaTahInPlayState,
  clearAllOrdersInPlayState,
  isUnitDestroyedInPlay,
  isUnitConsolidatedUnderBodyguard
} from './utils/playTracking';
import { detectTrackableArmyRule } from './utils/armyRuleTracking';
import { hasApiKey } from './services/geminiService';
import { Shield, Sparkles, BookOpen, Plus, RotateCcw } from 'lucide-react';

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
  const [playState, setPlayState] = useState<RosterPlayState>(() => {
    const savedActiveId = loadActiveRosterId();
    return savedActiveId ? loadRosterPlayState(savedActiveId) : {};
  });
  const [armyRuleState, setArmyRuleState] = useState<ArmyRulePlayState>(() => {
    const savedActiveId = loadActiveRosterId();
    return savedActiveId ? loadArmyRulePlayState(savedActiveId) : {};
  });
  const [activeDatasheetUnitId, setActiveDatasheetUnitId] = useState<string | null>(null);
  const [isAiSettingsModalOpen, setIsAiSettingsModalOpen] = useState(false);
  const [isAiArmyCreatorOpen, setIsAiArmyCreatorOpen] = useState(false);
  const [isAiRulesAssistantOpen, setIsAiRulesAssistantOpen] = useState(false);
  const [isAiEvaluatorOpen, setIsAiEvaluatorOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [pendingAiFeature, setPendingAiFeature] = useState<'creator' | 'rules' | 'evaluator' | null>(null);

  // Android / mobile hardware Back button navigation stack
  useBackNavigation(Boolean(activeRoster), () => {
    setIsPlayMode(false);
    setRosters(loadAllRosters());
    setActiveRoster(null);
  });
  useBackNavigation(Boolean(activeRoster) && isPlayMode, () => setIsPlayMode(false));
  useBackNavigation(isCreateModalOpen, () => setIsCreateModalOpen(false));
  useBackNavigation(isBrowserModalOpen, () => setIsBrowserModalOpen(false));
  useBackNavigation(isValidationDrawerOpen, () => setIsValidationDrawerOpen(false));
  useBackNavigation(isExportModalOpen, () => setIsExportModalOpen(false));
  useBackNavigation(isSettingsModalOpen, () => setIsSettingsModalOpen(false));
  useBackNavigation(isAiSettingsModalOpen, () => setIsAiSettingsModalOpen(false));
  useBackNavigation(isAiArmyCreatorOpen, () => setIsAiArmyCreatorOpen(false));
  useBackNavigation(isAiRulesAssistantOpen, () => setIsAiRulesAssistantOpen(false));
  useBackNavigation(isAiEvaluatorOpen, () => setIsAiEvaluatorOpen(false));
  useBackNavigation(isFeedbackOpen, () => setIsFeedbackOpen(false));

  // 1. Persist Active Roster ID & Play Mode across mobile browser reloads / sleep wakeups
  useEffect(() => {
    saveActiveRosterId(activeRoster?.id || null);
    setActiveDatasheetUnitId(null);
    if (activeRoster?.id) {
      setPlayState(loadRosterPlayState(activeRoster.id));
      setArmyRuleState(loadArmyRulePlayState(activeRoster.id));
    } else {
      setPlayState({});
      setArmyRuleState({});
    }
  }, [activeRoster?.id]);

  useEffect(() => {
    savePlayMode(isPlayMode);
  }, [isPlayMode]);

  // Apply per-roster UI theme when viewing an army list, or restore global theme on home page
  useEffect(() => {
    if (activeRoster?.themeId) {
      const found = getAllThemes().find(t => t.id === activeRoster.themeId);
      if (found) {
        applyThemeToDocument(found);
        return;
      }
    }
    initTheme();
  }, [activeRoster?.id, activeRoster?.themeId]);

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
          JSON.stringify(u.datasheet.abilities || []) !== JSON.stringify(freshDs.abilities || []) ||
          JSON.stringify(u.datasheet.extraStats || []) !== JSON.stringify(freshDs.extraStats || []) ||
          u.datasheet.minModels !== freshDs.minModels ||
          u.datasheet.maxModels !== freshDs.maxModels ||
          !u.datasheet.baseProfileNames ||
          !u.datasheet.baseWeaponCounts ||
          JSON.stringify(u.datasheet.enhancementGroupIds || []) !== JSON.stringify(freshDs.enhancementGroupIds || []) ||
          JSON.stringify(u.datasheet.duplicatePenalties || []) !== JSON.stringify(freshDs.duplicatePenalties || []) ||
          Boolean(u.datasheet.isLegends) !== Boolean(freshDs.isLegends) ||
          u.datasheet.baseCost !== freshDs.baseCost ||
          (u.cost === 0 && freshDs.baseCost > 0) ||
          u.datasheet.canBeLed === undefined ||
          u.datasheet.canHaveSupport === undefined
        ) {
          const nextModelsCount = Math.min(
            Math.max(u.modelsCount || 1, freshDs.minModels || 1),
            freshDs.maxModels || freshDs.minModels || 1
          );
          const matchedTier = freshDs.costTiers?.find(t => t.models === nextModelsCount);
          const updatedCost = u.cost === 0 && freshDs.baseCost > 0
            ? (matchedTier ? matchedTier.cost : freshDs.baseCost)
            : u.cost;
          nextUnit = {
            ...nextUnit,
            modelsCount: nextModelsCount,
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
        if (!nextUnit.enhancement && data.enhancements) {
          const mandatoryEnh = getMandatoryEnhancementForUnit(nextUnit, data.enhancements, hydratedDetachments);
          if (mandatoryEnh) {
            nextUnit = { ...nextUnit, enhancement: mandatoryEnh };
            changed = true;
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
    const updated = { ...activeRoster, battleSize: size, customPointsLimit: null };
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
      const unlocked = getUnlockedDispositions(newDetachments);
      if (!unlocked.some((d) => d.meta.key === newDisposition)) {
        newDisposition = null;
      }
    }

    // Remove any equipped enhancements whose detachment is no longer selected,
    // and auto-apply mandatory enhancements for newly active detachments
    const updatedUnits = activeRoster.units.map(u => {
      let nextUnit = u;
      if (nextUnit.enhancement) {
        if (nextUnit.enhancement.detachment) {
          const enhDetNorm = normalizeDetachmentName(nextUnit.enhancement.detachment);
          const stillHasDet = newDetachments.some(d => normalizeDetachmentName(d.name) === enhDetNorm);
          if (!stillHasDet) {
            const { enhancement, ...rest } = nextUnit;
            nextUnit = { ...rest, enhancement: undefined };
          }
        } else if (!isEnhancementEligibleForUnit(nextUnit, nextUnit.enhancement, newDetachments)) {
          const { enhancement, ...rest } = nextUnit;
          nextUnit = { ...rest, enhancement: undefined };
        }
      }
      if (!nextUnit.enhancement && factionData?.enhancements) {
        const mandatoryEnh = getMandatoryEnhancementForUnit(nextUnit, factionData.enhancements, newDetachments);
        if (mandatoryEnh) {
          nextUnit = { ...nextUnit, enhancement: mandatoryEnh };
        }
      }
      return nextUnit;
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

  // Rename Roster
  const handleRenameRoster = (newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setActiveRoster(prev => {
      if (!prev) return prev;
      const updated: ArmyRoster = {
        ...prev,
        name: trimmed
      };
      setRosters(saveRoster(updated));
      return updated;
    });
  };

  // Set Custom Points Limit
  const handleSetCustomPointsLimit = (limit: number | null) => {
    setActiveRoster(prev => {
      if (!prev) return prev;
      const updated: ArmyRoster = {
        ...prev,
        customPointsLimit: limit
      };
      setRosters(saveRoster(updated));
      return updated;
    });
  };

  // Set Per-Roster UI Theme
  const handleSetRosterTheme = (themeId: string | null) => {
    setActiveRoster(prev => {
      if (!prev) return prev;
      const updated: ArmyRoster = {
        ...prev,
        themeId
      };
      setRosters(saveRoster(updated));
      return updated;
    });
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

    // Auto-apply any mandatory detachment enhancement (e.g. Pantheon of Woe Necrodermal Binding)
    if (factionData?.enhancements) {
      const mandatoryEnh = getMandatoryEnhancementForUnit(
        datasheet,
        factionData.enhancements,
        activeRoster.detachments
      );
      if (mandatoryEnh) {
        newUnit.enhancement = mandatoryEnh;
      }
    }

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

    // 3. If attachedRetinueId changed on a bodyguard
    if (oldUnit && oldUnit.attachedRetinueId !== updatedUnit.attachedRetinueId) {
      const oldRetinueId = oldUnit.attachedRetinueId;
      const newRetinueId = updatedUnit.attachedRetinueId;
      updatedUnits = updatedUnits.map(u => {
        if (oldRetinueId && u.instanceId === oldRetinueId) {
          return { ...u, attachedToBodyguardId: undefined };
        }
        if (newRetinueId && u.instanceId === newRetinueId) {
          return { ...u, attachedToBodyguardId: updatedUnit.instanceId };
        }
        // Clear any other bodyguard that previously pointed to newRetinueId
        if (newRetinueId && u.instanceId !== updatedUnit.instanceId && u.attachedRetinueId === newRetinueId) {
          return { ...u, attachedRetinueId: undefined };
        }
        return u;
      });
    }

    // 4. If attachedToBodyguardId changed on a Leader/Support/Retinue
    if (oldUnit && oldUnit.attachedToBodyguardId !== updatedUnit.attachedToBodyguardId) {
      const oldBgId = oldUnit.attachedToBodyguardId;
      const newBgId = updatedUnit.attachedToBodyguardId;
      const isRet = isRetinueUnit(updatedUnit);
      updatedUnits = updatedUnits.map(u => {
        if (oldBgId && u.instanceId === oldBgId) {
          const uCopy = { ...u };
          if (uCopy.attachedLeaderId === updatedUnit.instanceId) uCopy.attachedLeaderId = undefined;
          if (uCopy.attachedSupportId === updatedUnit.instanceId) uCopy.attachedSupportId = undefined;
          if (uCopy.attachedRetinueId === updatedUnit.instanceId) uCopy.attachedRetinueId = undefined;
          return uCopy;
        }
        if (newBgId && u.instanceId === newBgId) {
          const uCopy = { ...u };
          if (isRet) uCopy.attachedRetinueId = updatedUnit.instanceId;
          else if (updatedUnit.isLeader) uCopy.attachedLeaderId = updatedUnit.instanceId;
          else if (updatedUnit.isSupport) uCopy.attachedSupportId = updatedUnit.instanceId;
          return uCopy;
        }
        return u;
      });
    }

    // 5. Ensure any Retinue unit attached to a bodyguard without an active Cryptek is unlinked cleanly
    const orphanedRetinueIds = new Set<string>();
    updatedUnits = updatedUnits.map(u => {
      if (u.attachedRetinueId && !hasAttachedCryptek(u, updatedUnits)) {
        orphanedRetinueIds.add(u.attachedRetinueId);
        return { ...u, attachedRetinueId: undefined };
      }
      return u;
    });
    if (orphanedRetinueIds.size > 0) {
      updatedUnits = updatedUnits.map(u =>
        orphanedRetinueIds.has(u.instanceId) ? { ...u, attachedToBodyguardId: undefined } : u
      );
    }

    const updated = { ...activeRoster, units: updatedUnits };
    setActiveRoster(updated);
    saveRoster(updated);
  };

  // Remove Unit
  const handleRemoveUnit = (instanceId: string) => {
    if (!activeRoster) return;
    let updatedUnits = activeRoster.units.filter(u => u.instanceId !== instanceId);
    // Unlink any attachments pointing to this unit
    updatedUnits = updatedUnits.map(u => {
      const copy = { ...u };
      if (copy.attachedToBodyguardId === instanceId) copy.attachedToBodyguardId = undefined;
      if (copy.attachedLeaderId === instanceId) copy.attachedLeaderId = undefined;
      if (copy.attachedSupportId === instanceId) copy.attachedSupportId = undefined;
      if (copy.attachedRetinueId === instanceId) copy.attachedRetinueId = undefined;
      return copy;
    });

    // If removing a Cryptek left a bodyguard without any Cryptek, unlink its Retinue
    const orphanedRetinueIds = new Set<string>();
    updatedUnits = updatedUnits.map(u => {
      if (u.attachedRetinueId && !hasAttachedCryptek(u, updatedUnits)) {
        orphanedRetinueIds.add(u.attachedRetinueId);
        return { ...u, attachedRetinueId: undefined };
      }
      return u;
    });
    if (orphanedRetinueIds.size > 0) {
      updatedUnits = updatedUnits.map(u =>
        orphanedRetinueIds.has(u.instanceId) ? { ...u, attachedToBodyguardId: undefined } : u
      );
    }

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
      attachedSupportId: undefined,
      attachedRetinueId: undefined
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

  // Play Mode Tracking Handlers
  const handleStepPlayRemaining = (unit: SelectedUnit, delta: number) => {
    if (!activeRoster) return;
    setPlayState((prev) => {
      const next = stepUnitPlayRemaining(unit, delta, prev, activeRoster.units);
      saveRosterPlayState(activeRoster.id, next);
      return next;
    });
  };

  const handleResetPlayState = () => {
    if (!activeRoster) return;
    clearRosterPlayState(activeRoster.id);
    setPlayState({});
    setArmyRuleState({});
  };

  const handleChangeArmyRuleState = (next: ArmyRulePlayState) => {
    if (!activeRoster) return;
    setArmyRuleState(next);
    saveArmyRulePlayState(activeRoster.id, next);
  };

  const handlePatchUnitPlayState = (unitId: string, patch: Partial<UnitPlayState>) => {
    if (!activeRoster) return;
    setPlayState((prev) => {
      const next = patchUnitPlayState(unitId, patch, prev);
      saveRosterPlayState(activeRoster.id, next);
      return next;
    });
  };

  const handleResetAllKaTah = () => {
    if (!activeRoster) return;
    setPlayState((prev) => {
      const next = resetAllKaTahInPlayState(prev);
      saveRosterPlayState(activeRoster.id, next);
      return next;
    });
  };

  const handleClearAllOrders = () => {
    if (!activeRoster) return;
    setPlayState((prev) => {
      const next = clearAllOrdersInPlayState(prev);
      saveRosterPlayState(activeRoster.id, next);
      return next;
    });
  };

  // Launch Unit Browser
  const handleOpenBrowser = (roleKey: string) => {
    setBrowserRoleFilter(roleKey);
    setIsBrowserModalOpen(true);
  };

  // AI Modal Launchers with Strict API Key Gate
  const handleOpenAiArmyCreator = () => {
    if (!hasApiKey()) {
      setPendingAiFeature('creator');
      setIsAiSettingsModalOpen(true);
      return;
    }
    setIsAiArmyCreatorOpen(true);
  };

  const handleOpenAiRules = () => {
    if (!hasApiKey()) {
      setPendingAiFeature('rules');
      setIsAiSettingsModalOpen(true);
      return;
    }
    setIsAiRulesAssistantOpen(true);
  };

  const handleOpenAiEvaluate = () => {
    if (!hasApiKey()) {
      setPendingAiFeature('evaluator');
      setIsAiSettingsModalOpen(true);
      return;
    }
    setIsAiEvaluatorOpen(true);
  };

  const handleCloseAiSettings = () => {
    setIsAiSettingsModalOpen(false);
    setPendingAiFeature(null);
  };

  const handleAiKeySaved = (hasKey: boolean) => {
    if (hasKey && pendingAiFeature) {
      const target = pendingAiFeature;
      setPendingAiFeature(null);
      setIsAiSettingsModalOpen(false);
      if (target === 'creator') {
        setIsAiArmyCreatorOpen(true);
      } else if (target === 'rules') {
        setIsAiRulesAssistantOpen(true);
      } else if (target === 'evaluator') {
        setIsAiEvaluatorOpen(true);
      }
    }
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
          onRostersChange={setRosters}
          onImportRoster={handleImportRoster}
          onOpenAiArmyCreator={handleOpenAiArmyCreator}
          onOpenAiRules={handleOpenAiRules}
          onOpenAiSettings={() => setIsAiSettingsModalOpen(true)}
          onOpenFeedback={() => setIsFeedbackOpen(true)}
        />
        <CreateArmyModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onCreate={handleCreateNewRoster}
          onOpenAiCreator={handleOpenAiArmyCreator}
        />
        <AiSettingsModal
          isOpen={isAiSettingsModalOpen}
          onClose={handleCloseAiSettings}
          onKeySaved={handleAiKeySaved}
        />
        <FeedbackModal
        isOpen={isFeedbackOpen}
        onClose={() => setIsFeedbackOpen(false)}
        activeRoster={activeRoster}
      />

      <InstallPromptBanner />
        <AiArmyCreatorModal
          isOpen={isAiArmyCreatorOpen}
          onClose={() => setIsAiArmyCreatorOpen(false)}
          onOpenSettings={() => {
            setIsAiArmyCreatorOpen(false);
            setPendingAiFeature('creator');
            setIsAiSettingsModalOpen(true);
          }}
          onCreateRoster={handleCreateNewRoster}
        />
        <AiRulesAssistant
          isOpen={isAiRulesAssistantOpen}
          onClose={() => setIsAiRulesAssistantOpen(false)}
          onOpenSettings={() => {
            setIsAiRulesAssistantOpen(false);
            setPendingAiFeature('rules');
            setIsAiSettingsModalOpen(true);
          }}
          activeRoster={null}
        />
        <FeedbackModal
          isOpen={isFeedbackOpen}
          onClose={() => setIsFeedbackOpen(false)}
          activeRoster={null}
        />
        <StagingBanner />
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
      { key: 'Beast', title: 'Beasts', limit: limits.unitLimit },
      { key: 'Swarm', title: 'Swarms', limit: limits.unitLimit },
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
  const destroyedUnits = isPlayMode
    ? activeRoster.units.filter((u) => isUnitDestroyedInPlay(u, playState, activeRoster.units))
    : [];

  const activeUnitsInPlay = isPlayMode
    ? activeRoster.units.filter((u) => !isUnitDestroyedInPlay(u, playState, activeRoster.units))
    : activeRoster.units;

  const hasAnyPlayTrackingChanges =
    Object.keys(playState).some((id) =>
      activeRoster.units.some((u) => u.instanceId === id)
    ) || hasArmyRulePlayStateChanges(armyRuleState);

  const trackableArmyRuleType = detectTrackableArmyRule(factionData?.armyRules);

  const activeDatasheetUnit = activeDatasheetUnitId
    ? activeRoster.units.find((u) => u.instanceId === activeDatasheetUnitId) || null
    : null;

  const getUnitsByRole = (role: string) => {
    return activeRoster.units.filter((u) => {
      if (getUnitRole(u) !== role) return false;
      if (!isPlayMode) return true;
      if (isUnitDestroyedInPlay(u, playState, activeRoster.units)) return false;
      if (isUnitConsolidatedUnderBodyguard(u, playState, activeRoster.units)) return false;
      return true;
    });
  };

  return (
    <div className="min-h-screen bg-transparent flex flex-col pb-8">
      
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
        onOpenAiEvaluate={handleOpenAiEvaluate}
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
              armyRules={factionData.armyRules}
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
              battleSize={activeRoster.battleSize}
              playState={playState}
              armyRuleState={armyRuleState}
              onToggleDetachment={handleToggleDetachment}
              onSelectDisposition={handleSelectDisposition}
              onChangeArmyRuleState={handleChangeArmyRuleState}
              onResetAllKaTah={handleResetAllKaTah}
              onClearAllOrders={handleClearAllOrders}
            />

            {/* 2. Battlefield Role Unit Sections */}
            {isPlayMode && (activeRoster.units.length > 0 || hasAnyPlayTrackingChanges) && (
              <div className="mb-3 px-3 py-2 rounded-xl bg-theme-surface/85 border border-theme-border-subtle flex items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                  <span className="font-semibold text-theme-text">
                    Active:{' '}
                    <span className="font-mono text-emerald-400 font-bold">
                      {activeUnitsInPlay.length}
                    </span>
                  </span>
                  <span className="text-theme-border">•</span>
                  <span className="font-semibold text-theme-text">
                    Destroyed:{' '}
                    <span
                      className={`font-mono font-bold ${
                        destroyedUnits.length > 0 ? 'text-red-400' : 'text-theme-text-muted'
                      }`}
                    >
                      {destroyedUnits.length}
                    </span>
                  </span>
                </div>

                {hasAnyPlayTrackingChanges && (
                  <button
                    type="button"
                    onClick={handleResetPlayState}
                    className="btn-theme-secondary min-h-[30px] px-2.5 py-1 rounded-lg flex items-center gap-1.5 text-xs font-semibold shrink-0"
                    title="Restore all units to full models and wounds"
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                    <span>Reset Game</span>
                  </button>
                )}
              </div>
            )}

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
                  playState={playState}
                  armyRuleType={trackableArmyRuleType}
                  unitLimit={cat.limit}
                  onOpenBrowser={handleOpenBrowser}
                  onStepPlayRemaining={handleStepPlayRemaining}
                  onPatchUnitPlayState={handlePatchUnitPlayState}
                  onOpenDatasheet={(u) => setActiveDatasheetUnitId(u.instanceId)}
                  onUpdateUnit={handleUpdateUnit}
                  onDuplicateUnit={handleDuplicateUnit}
                  onRemoveUnit={handleRemoveUnit}
                  onSetWarlord={handleSetWarlord}
                />
              ))}

              {isPlayMode && (
                <DestroyedUnitsSection
                  units={destroyedUnits}
                  allUnitsInRoster={activeRoster.units}
                  availableEnhancements={factionData.enhancements}
                  selectedDetachments={activeRoster.detachments}
                  playState={playState}
                  onStepPlayRemaining={handleStepPlayRemaining}
                  onOpenDatasheet={(u) => setActiveDatasheetUnitId(u.instanceId)}
                  onUpdateUnit={handleUpdateUnit}
                  onDuplicateUnit={handleDuplicateUnit}
                  onRemoveUnit={handleRemoveUnit}
                  onSetWarlord={handleSetWarlord}
                />
              )}
            </div>
          </>
        )}

      </main>

      {/* Modals & Drawers */}
      {factionData && (
        <DatasheetModal
          unit={activeDatasheetUnit?.datasheet || null}
          selectedUnit={activeDatasheetUnit}
          allUnitsInRoster={activeRoster.units}
          availableEnhancements={factionData.enhancements}
          selectedDetachments={activeRoster.detachments}
          isPlayMode={isPlayMode}
          playState={playState}
          onStepPlayRemaining={handleStepPlayRemaining}
          onUpdateUnit={handleUpdateUnit}
          onSetWarlord={handleSetWarlord}
          isOpen={Boolean(activeDatasheetUnit)}
          onClose={() => setActiveDatasheetUnitId(null)}
        />
      )}

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
        battleSize={activeRoster.battleSize}
        onUpdateBattleSize={handleUpdateBattleSize}
        includeLegends={activeRoster.includeLegends || false}
        onToggleLegends={handleToggleLegends}
        rosterName={activeRoster.name}
        onRenameRoster={handleRenameRoster}
        customPointsLimit={activeRoster.customPointsLimit}
        defaultPointsLimit={
          activeRoster.battleSize === 'incursion'
            ? 1000
            : activeRoster.battleSize === 'onslaught'
            ? 3000
            : 2000
        }
        onSetCustomPointsLimit={handleSetCustomPointsLimit}
        themeId={activeRoster.themeId || null}
        onSetThemeId={handleSetRosterTheme}
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
        onClose={handleCloseAiSettings}
        onKeySaved={handleAiKeySaved}
      />

      <AiArmyCreatorModal
        isOpen={isAiArmyCreatorOpen}
        onClose={() => setIsAiArmyCreatorOpen(false)}
        onOpenSettings={() => {
          setIsAiArmyCreatorOpen(false);
          setPendingAiFeature('creator');
          setIsAiSettingsModalOpen(true);
        }}
        onCreateRoster={handleCreateNewRoster}
      />

      <AiRulesAssistant
        isOpen={isAiRulesAssistantOpen}
        onClose={() => setIsAiRulesAssistantOpen(false)}
        onOpenSettings={() => {
          setIsAiRulesAssistantOpen(false);
          setPendingAiFeature('rules');
          setIsAiSettingsModalOpen(true);
        }}
        activeRoster={activeRoster}
      />

      <AiListEvaluatorModal
        isOpen={isAiEvaluatorOpen}
        onClose={() => setIsAiEvaluatorOpen(false)}
        onOpenSettings={() => {
          setIsAiEvaluatorOpen(false);
          setPendingAiFeature('evaluator');
          setIsAiSettingsModalOpen(true);
        }}
        roster={activeRoster}
        validation={validation}
        factionData={factionData}
      />

      <FeedbackModal
        isOpen={isFeedbackOpen}
        onClose={() => setIsFeedbackOpen(false)}
        activeRoster={activeRoster}
      />

      <InstallPromptBanner />
      <StagingBanner />
    </div>
  );
};

