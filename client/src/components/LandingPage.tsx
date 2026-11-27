import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  Plus,
  Upload,
  Trash2,
  Copy,
  Shield,
  Sparkles,
  BookOpen,
  Key,
  Package,
  Layers,
  Settings,
  MessageSquarePlus,
  MoreVertical,
  ArrowUp,
  ArrowDown,
  Palette,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Check
} from 'lucide-react';
import { ArmyRoster } from '../types/roster';
import { validateClientRoster } from '../utils/validator';
import { OwnedModelsView } from './OwnedModelsView';
import { SettingsView } from './SettingsView';
import { ImportRosterModal } from './ImportRosterModal';
import { PromoteStagingModal } from './PromoteStagingModal';
import { isStagingBuild } from './StagingBanner';
import { loadAllOwnedModels, getTotalOwnedModelsCount, OwnedFactionInventory } from '../utils/ownedModelsStorage';
import { useBackNavigation } from '../utils/backNavigation';
import { AppTheme, getActiveTheme, getAllThemes } from '../utils/themeStorage';
import {
  FactionGroupPrefs,
  loadFactionGroupPrefs,
  saveFactionGroupPrefs,
  groupRostersByFaction,
  getThemeDerivedPalette,
  getFactionColorSwatches,
  getReadableTitleColor,
  hexToRgba,
  normalizeHexColor
} from '../utils/commandRosterStorage';

interface LandingPageProps {
  rosters: ArmyRoster[];
  onCreateNew: () => void;
  onSelectRoster: (roster: ArmyRoster) => void;
  onDuplicateRoster: (rosterId: string) => void;
  onDeleteRoster: (rosterId: string) => void;
  onRostersChange?: (rosters: ArmyRoster[]) => void;
  onImportRoster: (roster: ArmyRoster) => void;
  onOpenAiArmyCreator?: () => void;
  onOpenAiRules?: () => void;
  onOpenAiSettings?: () => void;
  onOpenFeedback?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  rosters,
  onCreateNew,
  onSelectRoster,
  onDuplicateRoster,
  onDeleteRoster,
  onRostersChange,
  onImportRoster,
  onOpenAiArmyCreator,
  onOpenAiRules,
  onOpenAiSettings,
  onOpenFeedback
}) => {
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isPromoteModalOpen, setIsPromoteModalOpen] = useState(false);
  const [activeNav, setActiveNav] = useState<'armies' | 'owned' | 'settings'>('armies');
  const [ownedModels, setOwnedModels] = useState<Record<string, OwnedFactionInventory>>(() => loadAllOwnedModels());
  const totalOwnedModels = getTotalOwnedModelsCount(ownedModels);
  const logoClickTimestampsRef = useRef<number[]>([]);

  const [activeTheme, setActiveThemeState] = useState<AppTheme>(() => getActiveTheme());
  const [allThemes, setAllThemes] = useState<AppTheme[]>(() => getAllThemes());
  const [factionPrefs, setFactionPrefs] = useState<FactionGroupPrefs>(() => loadFactionGroupPrefs());
  const [openOptionsFactionKey, setOpenOptionsFactionKey] = useState<string | null>(null);
  const [colorPickerFactionKey, setColorPickerFactionKey] = useState<string | null>(null);
  const openMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const syncThemeAndPrefs = () => {
      setActiveThemeState(getActiveTheme());
      setAllThemes(getAllThemes());
      setFactionPrefs(loadFactionGroupPrefs());
    };
    window.addEventListener('wh40k-theme-updated', syncThemeAndPrefs);
    window.addEventListener('storage', syncThemeAndPrefs);
    return () => {
      window.removeEventListener('wh40k-theme-updated', syncThemeAndPrefs);
      window.removeEventListener('storage', syncThemeAndPrefs);
    };
  }, []);

  useEffect(() => {
    if (activeNav === 'armies') {
      setActiveThemeState(getActiveTheme());
      setAllThemes(getAllThemes());
      setFactionPrefs(loadFactionGroupPrefs());
    } else {
      setOpenOptionsFactionKey(null);
      setColorPickerFactionKey(null);
    }
  }, [activeNav]);

  useEffect(() => {
    if (!openOptionsFactionKey) return;
    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (openMenuRef.current && !openMenuRef.current.contains(e.target as Node)) {
        setOpenOptionsFactionKey(null);
        setColorPickerFactionKey(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenOptionsFactionKey(null);
        setColorPickerFactionKey(null);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [openOptionsFactionKey]);

  const factionGroups = useMemo(
    () => groupRostersByFaction(rosters, factionPrefs.order),
    [rosters, factionPrefs.order]
  );

  const defaultColorByFactionKey = useMemo(() => {
    const palette = getThemeDerivedPalette(activeTheme, Math.max(8, factionGroups.length));
    const sortedKeys = [...factionGroups.map((g) => g.key)].sort();
    const map: Record<string, string> = {};
    sortedKeys.forEach((key, idx) => {
      map[key] = palette[idx % palette.length];
    });
    return map;
  }, [activeTheme, factionGroups]);

  const colorSwatches = useMemo(
    () => getFactionColorSwatches(activeTheme, allThemes),
    [activeTheme, allThemes]
  );

  const updateFactionPrefs = (updater: (prev: FactionGroupPrefs) => FactionGroupPrefs) => {
    setFactionPrefs((prev) => {
      const next = updater(prev);
      saveFactionGroupPrefs(next);
      return next;
    });
  };

  const handleMoveFactionGroup = (factionKey: string, direction: 'up' | 'down') => {
    const activeKeys = factionGroups.map((g) => g.key);
    const idx = activeKeys.indexOf(factionKey);
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (idx < 0 || targetIdx < 0 || targetIdx >= activeKeys.length) return;

    const nextActive = [...activeKeys];
    [nextActive[idx], nextActive[targetIdx]] = [nextActive[targetIdx], nextActive[idx]];

    updateFactionPrefs((prev) => {
      const inactiveKeys = prev.order.filter((k) => !nextActive.includes(k));
      return {
        ...prev,
        order: [...nextActive, ...inactiveKeys]
      };
    });
    setOpenOptionsFactionKey(null);
    setColorPickerFactionKey(null);
  };

  const handleToggleCollapseFaction = (factionKey: string) => {
    updateFactionPrefs((prev) => ({
      ...prev,
      collapsed: {
        ...prev.collapsed,
        [factionKey]: !prev.collapsed[factionKey]
      }
    }));
  };

  const handleSetFactionColor = (factionKey: string, hexColor: string | null) => {
    updateFactionPrefs((prev) => {
      const nextColors = { ...prev.colors };
      if (hexColor) {
        nextColors[factionKey] = normalizeHexColor(hexColor);
      } else {
        delete nextColors[factionKey];
      }
      return {
        ...prev,
        colors: nextColors
      };
    });
  };

  useBackNavigation(activeNav !== 'armies', () => setActiveNav('armies'));
  useBackNavigation(isPromoteModalOpen, () => setIsPromoteModalOpen(false));

  const handleLogoClick = () => {
    if (!isStagingBuild) return;
    const now = Date.now();
    const recent = logoClickTimestampsRef.current.filter((t) => now - t < 1800);
    recent.push(now);
    if (recent.length >= 3) {
      logoClickTimestampsRef.current = [];
      setIsPromoteModalOpen(true);
    } else {
      logoClickTimestampsRef.current = recent;
    }
  };

  return (
    <div className="fixed inset-0 overflow-hidden bg-transparent flex flex-col text-theme-text">
      {/* Top Banner */}
      <header className="border-b border-theme-border-subtle bg-theme-surface/95 backdrop-blur-sm px-4 sm:px-6 py-3.5 sm:py-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              onClick={handleLogoClick}
              className="w-10 h-10 rounded-xl overflow-hidden border border-theme-accent/30 bg-theme-accent/15 flex items-center justify-center flex-shrink-0"
            >
              <img
                src={`${import.meta.env.BASE_URL}icon-192.png`}
                alt="Warhammer 40,000 Army Builder"
                className="w-full h-full object-cover scale-[1.38]"
              />
            </div>
            <div>
              <h1 className="font-warhammer text-lg sm:text-xl font-bold tracking-wider text-theme-text">
                WARHAMMER 40k
              </h1>
              <p className="text-[11px] sm:text-xs text-theme-text-secondary tracking-wide font-medium">
                11TH EDITION ARMY ROSTER BUILDER
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsImportModalOpen(true)}
              className="btn-theme-secondary min-h-[38px] flex items-center gap-1.5 px-2.5 sm:px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold"
              title="Import Roster (GW Text or JSON)"
              aria-label="Import Roster"
            >
              <Upload className="w-4 h-4 text-theme-text-secondary" />
              <span className="hidden sm:inline">Import</span>
            </button>

            {onOpenAiArmyCreator && (
              <button
                type="button"
                onClick={onOpenAiArmyCreator}
                className="min-h-[38px] flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold tracking-wide bg-gradient-to-r from-theme-accent to-theme-accent-hover text-white shadow-md shadow-black/35 transition-all active:scale-[0.98]"
                title="Create Army with AI"
              >
                <Sparkles className="w-4 h-4" />
                <span>Create with AI</span>
              </button>
            )}

            <button
              onClick={onCreateNew}
              className="btn-theme-primary min-h-[38px] flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm tracking-wide"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>New Army</span>
            </button>
          </div>
        </div>
      </header>

      {/* Body: Left Icon Nav + Main Content */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left Navigation Rail */}
        <aside
          aria-label="Dashboard Navigation"
          className="w-14 shrink-0 h-full overflow-y-auto border-r border-theme-border-subtle bg-theme-surface/95 flex flex-col justify-between py-2.5 px-2 select-none"
        >
          <div className="flex flex-col gap-2">
            <nav className="flex flex-col gap-1.5">
              <button
                type="button"
                onClick={() => setActiveNav('armies')}
                title={`Army Lists (${rosters.length})`}
                aria-label={`Army Lists (${rosters.length})`}
                className={`flex items-center justify-center px-0 h-10 rounded-xl text-sm font-medium transition-colors ${
                  activeNav === 'armies'
                    ? 'bg-theme-accent/20 text-theme-accent-soft border border-theme-accent/40 shadow-sm'
                    : 'text-theme-text-secondary hover:bg-theme-surface-hover hover:text-theme-text border border-transparent'
                }`}
              >
                <Layers className="w-5 h-5 shrink-0" />
              </button>

              <button
                type="button"
                onClick={() => setActiveNav('owned')}
                title={`Owned Models (${totalOwnedModels})`}
                aria-label={`Owned Models (${totalOwnedModels})`}
                className={`flex items-center justify-center px-0 h-10 rounded-xl text-sm font-medium transition-colors ${
                  activeNav === 'owned'
                    ? 'bg-theme-accent/20 text-theme-accent-soft border border-theme-accent/40 shadow-sm'
                    : 'text-theme-text-secondary hover:bg-theme-surface-hover hover:text-theme-text border border-transparent'
                }`}
              >
                <Package className="w-5 h-5 shrink-0" />
              </button>

              <button
                type="button"
                onClick={() => setActiveNav('settings')}
                title="Settings (Theme & Data Manager)"
                aria-label="Settings"
                className={`flex items-center justify-center px-0 h-10 rounded-xl text-sm font-medium transition-colors ${
                  activeNav === 'settings'
                    ? 'bg-theme-accent/20 text-theme-accent-soft border border-theme-accent/40 shadow-sm'
                    : 'text-theme-text-secondary hover:bg-theme-surface-hover hover:text-theme-text border border-transparent'
                }`}
              >
                <Settings className="w-5 h-5 shrink-0" />
              </button>
            </nav>
          </div>

          {/* Secondary Tools: Feedback, Rules AI & AI Settings */}
          {(onOpenFeedback || onOpenAiRules || onOpenAiSettings) && (
            <div className="flex flex-col gap-1.5 pt-2 border-t border-theme-border-subtle">
              {onOpenFeedback && (
                <button
                  type="button"
                  onClick={onOpenFeedback}
                  title="Send Feedback / Report Issue"
                  aria-label="Send Feedback"
                  className="flex items-center justify-center px-0 h-10 rounded-xl text-sm font-medium text-emerald-300 hover:text-emerald-200 hover:bg-theme-surface-hover transition-colors"
                >
                  <MessageSquarePlus className="w-5 h-5 shrink-0 text-emerald-400" />
                </button>
              )}

              {onOpenAiRules && (
                <button
                  type="button"
                  onClick={onOpenAiRules}
                  title="Search 11th Edition Rules with AI"
                  aria-label="Rules AI"
                  className="flex items-center justify-center px-0 h-10 rounded-xl text-sm font-medium text-amber-300 hover:text-amber-200 hover:bg-theme-surface-hover transition-colors"
                >
                  <BookOpen className="w-5 h-5 shrink-0 text-amber-400" />
                </button>
              )}

              {onOpenAiSettings && (
                <button
                  type="button"
                  onClick={onOpenAiSettings}
                  title="Gemini AI Key & Settings"
                  aria-label="AI Settings"
                  className="flex items-center justify-center px-0 h-10 rounded-xl text-sm font-medium text-theme-text-secondary hover:text-theme-text hover:bg-theme-surface-hover transition-colors"
                >
                  <Key className="w-5 h-5 shrink-0 text-sky-400" />
                </button>
              )}
            </div>
          )}
        </aside>

        {/* Main Content + Footer */}
        <div className="flex-1 min-w-0 flex flex-col overflow-y-auto">
          <main className="flex-1 max-w-7xl mx-auto w-full p-3 sm:p-6">
          {activeNav === 'settings' ? (
            <SettingsView
              rosters={rosters}
              onRostersChange={(next) => onRostersChange?.(next)}
              ownedModels={ownedModels}
              onUpdateOwnedModels={setOwnedModels}
              onOpenAiSettings={onOpenAiSettings}
            />
          ) : activeNav === 'owned' ? (
            <OwnedModelsView
              ownedModels={ownedModels}
              onUpdateOwnedModels={setOwnedModels}
              onOpenAiArmyCreator={onOpenAiArmyCreator}
            />
          ) : rosters.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-12 sm:py-16 text-center max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-theme-surface border border-theme-border-subtle flex items-center justify-center mb-4 shadow-md">
              <Shield className="w-8 h-8 text-theme-accent-soft" />
            </div>
            <h2 className="font-warhammer text-lg sm:text-xl font-bold text-theme-text mb-2">
              No Armies Mustered Yet
            </h2>
            <p className="text-xs sm:text-sm text-theme-text-secondary mb-6 leading-relaxed">
              Assemble your battle-forged detachment, equip your warlord with relics, and validate your army roster according to the official 11th Edition Core Rules.
            </p>
            <div className="flex flex-col sm:flex-row gap-2.5 w-full">
              {onOpenAiArmyCreator && (
                <button
                  onClick={onOpenAiArmyCreator}
                  className="flex-1 min-h-[44px] flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold tracking-wide bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white shadow-md shadow-sky-950/50"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Create with AI</span>
                </button>
              )}
              <button
                onClick={onCreateNew}
                className="btn-theme-primary flex-1 min-h-[44px] flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm tracking-wide"
              >
                <Plus className="w-4 h-4 stroke-[2.5]" />
                <span>Manual Builder</span>
              </button>
              <button
                type="button"
                onClick={() => setIsImportModalOpen(true)}
                className="btn-theme-secondary flex-1 min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold"
              >
                <Upload className="w-4 h-4 text-theme-text-secondary" />
                <span>Import List</span>
              </button>
            </div>
          </div>
        ) : (
          /* Roster Grid Separated by Faction */
          <div className="panel-theme-section pb-6">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div>
                <h2 className="font-warhammer text-base sm:text-lg font-bold text-theme-text">
                  Command Roster ({rosters.length})
                </h2>
              </div>
            </div>

            <div className="space-y-3 sm:space-y-4">
              {factionGroups.map((group, groupIndex) => {
                const customColor = factionPrefs.colors[group.key];
                const groupColor = normalizeHexColor(
                  customColor || defaultColorByFactionKey[group.key] || activeTheme.accentColor
                );
                const titleColor = getReadableTitleColor(groupColor, activeTheme);
                const isCollapsed = Boolean(factionPrefs.collapsed[group.key]);
                const isMenuOpen = openOptionsFactionKey === group.key;
                const isColorPickerOpen = colorPickerFactionKey === group.key;
                const isFirst = groupIndex === 0;
                const isLast = groupIndex === factionGroups.length - 1;

                return (
                  <section
                    key={group.key}
                    className="rounded-xl sm:rounded-2xl border bg-theme-bg/40 p-2 sm:p-3 transition-colors"
                    style={{
                      borderColor: hexToRgba(groupColor, 0.34)
                    }}
                  >
                    {/* Faction Group Header */}
                    <div
                      className="flex items-center justify-between gap-2 px-2.5 sm:px-3 py-2 rounded-xl border border-l-4 transition-colors relative"
                      style={{
                        backgroundColor: hexToRgba(groupColor, 0.14),
                        borderColor: hexToRgba(groupColor, 0.3),
                        borderLeftColor: groupColor
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => handleToggleCollapseFaction(group.key)}
                        className="flex items-center gap-2 min-w-0 flex-1 text-left py-0.5"
                        aria-expanded={!isCollapsed}
                        aria-label={`${isCollapsed ? 'Expand' : 'Collapse'} ${group.name}`}
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0 ring-1 ring-white/25"
                          style={{ backgroundColor: groupColor }}
                        />
                        <h3
                          className="font-warhammer text-xs sm:text-sm font-extrabold tracking-wider uppercase truncate"
                          style={{ color: titleColor }}
                        >
                          {group.name}
                        </h3>
                        <span className="text-xs font-mono font-semibold text-theme-text-secondary shrink-0">
                          ({group.rosters.length})
                        </span>
                        <ChevronDown
                          className={`w-4 h-4 text-theme-text-secondary shrink-0 transition-transform duration-150 ${
                            isCollapsed ? '-rotate-90' : ''
                          }`}
                        />
                      </button>

                      {/* Faction Options Dropdown */}
                      <div
                        className="relative shrink-0"
                        ref={isMenuOpen ? openMenuRef : undefined}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setOpenOptionsFactionKey((prev) => (prev === group.key ? null : group.key));
                            setColorPickerFactionKey(null);
                          }}
                          className="btn-theme-icon w-8 h-8 rounded-lg"
                          title={`${group.name} options`}
                          aria-label={`${group.name} options`}
                          aria-haspopup="menu"
                          aria-expanded={isMenuOpen}
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {isMenuOpen && (
                          <div
                            role="menu"
                            aria-label={`${group.name} options`}
                            className={`absolute right-0 w-56 rounded-xl bg-theme-surface border border-theme-border shadow-2xl py-1.5 z-50 ${
                              isLast && factionGroups.length > 1 ? 'bottom-full mb-1.5' : 'mt-1.5'
                            }`}
                          >
                            <button
                              type="button"
                              role="menuitem"
                              disabled={isFirst}
                              onClick={() => handleMoveFactionGroup(group.key, 'up')}
                              className="w-full px-3.5 py-2 text-left text-xs font-semibold text-theme-text hover:bg-theme-elevated flex items-center gap-2.5 disabled:opacity-40 disabled:pointer-events-none"
                            >
                              <ArrowUp className="w-4 h-4 text-theme-text-secondary" />
                              <span>Move Up</span>
                            </button>

                            <button
                              type="button"
                              role="menuitem"
                              disabled={isLast}
                              onClick={() => handleMoveFactionGroup(group.key, 'down')}
                              className="w-full px-3.5 py-2 text-left text-xs font-semibold text-theme-text hover:bg-theme-elevated flex items-center gap-2.5 disabled:opacity-40 disabled:pointer-events-none"
                            >
                              <ArrowDown className="w-4 h-4 text-theme-text-secondary" />
                              <span>Move Down</span>
                            </button>

                            <button
                              type="button"
                              role="menuitem"
                              onClick={() => {
                                handleToggleCollapseFaction(group.key);
                                setOpenOptionsFactionKey(null);
                                setColorPickerFactionKey(null);
                              }}
                              className="w-full px-3.5 py-2 text-left text-xs font-semibold text-theme-text hover:bg-theme-elevated flex items-center gap-2.5"
                            >
                              {isCollapsed ? (
                                <>
                                  <ChevronDown className="w-4 h-4 text-theme-text-secondary" />
                                  <span>Expand Group</span>
                                </>
                              ) : (
                                <>
                                  <ChevronUp className="w-4 h-4 text-theme-text-secondary" />
                                  <span>Collapse Group</span>
                                </>
                              )}
                            </button>

                            <div className="my-1 border-t border-theme-border-subtle" />

                            <button
                              type="button"
                              role="menuitem"
                              onClick={() =>
                                setColorPickerFactionKey((prev) =>
                                  prev === group.key ? null : group.key
                                )
                              }
                              className="w-full px-3.5 py-2 text-left text-xs font-semibold text-theme-text hover:bg-theme-elevated flex items-center justify-between gap-2"
                            >
                              <span className="flex items-center gap-2.5">
                                <Palette className="w-4 h-4 text-theme-text-secondary" />
                                <span>Change Color</span>
                              </span>
                              <span
                                className="w-4 h-4 rounded-full border border-white/25 shrink-0"
                                style={{ backgroundColor: groupColor }}
                              />
                            </button>

                            {isColorPickerOpen && (
                              <div className="px-3 py-2.5 mt-1 border-t border-theme-border-subtle bg-theme-bg/50 space-y-2.5">
                                <div className="grid grid-cols-6 gap-1.5">
                                  {colorSwatches.slice(0, 12).map((swatch) => {
                                    const selected = groupColor === swatch;
                                    return (
                                      <button
                                        key={swatch}
                                        type="button"
                                        onClick={() => handleSetFactionColor(group.key, swatch)}
                                        className={`w-6 h-6 rounded-full border flex items-center justify-center transition-transform active:scale-90 ${
                                          selected
                                            ? 'border-white ring-2 ring-theme-accent scale-105'
                                            : 'border-white/25 hover:scale-105'
                                        }`}
                                        style={{ backgroundColor: swatch }}
                                        title={swatch}
                                        aria-label={`Select color ${swatch}`}
                                      >
                                        {selected && <Check className="w-3 h-3 text-white drop-shadow" />}
                                      </button>
                                    );
                                  })}
                                </div>

                                <div className="flex items-center justify-between gap-2 pt-1">
                                  <label className="flex items-center gap-2 text-[11px] font-medium text-theme-text-secondary cursor-pointer">
                                    <input
                                      type="color"
                                      value={groupColor}
                                      onChange={(e) => handleSetFactionColor(group.key, e.target.value)}
                                      className="w-6 h-6 rounded border border-theme-border bg-transparent cursor-pointer p-0"
                                      aria-label={`Custom color for ${group.name}`}
                                    />
                                    <span className="font-mono uppercase">{groupColor}</span>
                                  </label>

                                  {customColor && (
                                    <button
                                      type="button"
                                      onClick={() => handleSetFactionColor(group.key, null)}
                                      className="text-[11px] font-semibold text-theme-accent-soft hover:underline flex items-center gap-1"
                                      title="Reset to theme color"
                                    >
                                      <RotateCcw className="w-3 h-3" />
                                      <span>Reset</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Faction Roster Cards */}
                    {!isCollapsed && (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1.5 sm:gap-3 mt-2 sm:mt-3">
                        {group.rosters.map((roster) => {
                          const validation = validateClientRoster(roster);
                          return (
                            <div
                              key={roster.id}
                              onClick={() => onSelectRoster(roster)}
                              className="card-theme-item px-3 py-2 sm:px-3.5 sm:py-2.5 cursor-pointer flex items-center justify-between gap-2.5 active:scale-[0.995] group"
                              style={{
                                borderLeftWidth: '3px',
                                borderLeftColor: hexToRgba(groupColor, 0.85)
                              }}
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <h4 className="font-warhammer text-sm sm:text-base font-bold text-theme-text group-hover:text-theme-accent-soft transition-colors leading-tight tracking-wide truncate">
                                    {roster.name}
                                  </h4>
                                  {roster.includeLegends && (
                                    <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded bg-theme-elevated text-theme-text-secondary border border-theme-border font-mono">
                                      LEGENDS
                                    </span>
                                  )}
                                </div>

                                <p className="text-[11px] sm:text-xs text-theme-text-secondary font-medium truncate mt-0.5">
                                  {roster.subFactionName && roster.subFactionName !== group.name
                                    ? `${group.name} • ${roster.subFactionName}`
                                    : roster.factionName}
                                </p>

                                <div className="text-[11px] sm:text-xs font-mono font-semibold text-theme-accent-soft mt-0.5">
                                  {validation.totalPoints}/{validation.pointsLimit} pts
                                </div>
                              </div>

                              <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                                <button
                                  onClick={() => onDuplicateRoster(roster.id)}
                                  className="btn-theme-icon min-w-[28px] min-h-[28px] sm:min-w-[30px] sm:min-h-[30px] rounded-lg"
                                  title="Duplicate Roster"
                                  aria-label="Duplicate Roster"
                                >
                                  <Copy className="w-3.5 h-3.5 stroke-[2]" />
                                </button>
                                <button
                                  onClick={() => {
                                    if (confirm(`Delete '${roster.name}'?`)) onDeleteRoster(roster.id);
                                  }}
                                  className="btn-theme-danger-icon min-w-[28px] min-h-[28px] sm:min-w-[30px] sm:min-h-[30px] rounded-lg"
                                  title="Delete Roster"
                                  aria-label="Delete Roster"
                                >
                                  <Trash2 className="w-3.5 h-3.5 stroke-[2]" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </section>
                );
              })}
            </div>
          </div>
        )}

          </main>
        </div>
      </div>

      <ImportRosterModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportRoster={onImportRoster}
      />

      {isStagingBuild && (
        <PromoteStagingModal
          isOpen={isPromoteModalOpen}
          onClose={() => setIsPromoteModalOpen(false)}
        />
      )}
    </div>
  );
};
