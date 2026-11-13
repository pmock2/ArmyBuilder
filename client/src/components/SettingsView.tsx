import React, { useState, useMemo } from 'react';
import {
  Palette,
  Database,
  Trash2,
  Save,
  RotateCcw,
  Check,
  AlertTriangle,
  Plus,
  Sparkles,
  Package,
  Layers,
  Key
} from 'lucide-react';
import { ArmyRoster } from '../types/roster';
import {
  AppTheme,
  DEFAULT_THEMES,
  GRADIENT_DIRECTION_OPTIONS,
  GradientDirection,
  applyThemeToDocument,
  buildGradientCss,
  getActiveThemeId,
  getAllThemes,
  loadCustomThemes,
  saveCustomThemes,
  setActiveTheme,
  ACTIVE_THEME_STORAGE_KEY,
  CUSTOM_THEMES_STORAGE_KEY
} from '../utils/themeStorage';
import {
  OwnedFactionInventory,
  saveOwnedFaction,
  deleteOwnedFaction
} from '../utils/ownedModelsStorage';
import { deleteRoster } from '../utils/storage';

interface SettingsViewProps {
  rosters: ArmyRoster[];
  onRostersChange: (rosters: ArmyRoster[]) => void;
  ownedModels: Record<string, OwnedFactionInventory>;
  onUpdateOwnedModels: (next: Record<string, OwnedFactionInventory>) => void;
}

function adjustHexBrightness(hex: string, amount: number): string {
  const clean = (hex || '').replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return hex;
  const clamp = (n: number) => Math.max(0, Math.min(255, n));
  const r = clamp(parseInt(clean.slice(0, 2), 16) + amount);
  const g = clamp(parseInt(clean.slice(2, 4), 16) + amount);
  const b = clamp(parseInt(clean.slice(4, 6), 16) + amount);
  return `#${[r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('')}`;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  rosters,
  onRostersChange,
  ownedModels,
  onUpdateOwnedModels
}) => {
  const [activeTab, setActiveTab] = useState<'theme' | 'data'>('theme');

  // Theme Manager State
  const [customThemes, setCustomThemes] = useState<AppTheme[]>(() => loadCustomThemes());
  const [activeThemeId, setActiveThemeIdState] = useState<string>(() => getActiveThemeId());
  const allThemes = useMemo(() => [...DEFAULT_THEMES, ...customThemes], [customThemes]);
  const initialTheme = useMemo(
    () => allThemes.find((t) => t.id === activeThemeId) || DEFAULT_THEMES[0],
    [allThemes, activeThemeId]
  );

  const [draft, setDraft] = useState<AppTheme>(() => ({ ...initialTheme }));
  const [customName, setCustomName] = useState<string>('');
  const [themeSavedMsg, setThemeSavedMsg] = useState<string | null>(null);

  // Data Manager State
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [hasGeminiKey, setHasGeminiKey] = useState<boolean>(
    () => Boolean(localStorage.getItem('wh40k_gemini_api_key'))
  );

  const handleSelectTheme = (theme: AppTheme) => {
    setActiveTheme(theme);
    setActiveThemeIdState(theme.id);
    setDraft({ ...theme });
    if (!theme.isDefault) {
      setCustomName(theme.name);
    } else {
      setCustomName('');
    }
  };

  const updateDraft = (patch: Partial<AppTheme>) => {
    const next: AppTheme = { ...draft, ...patch };
    if (patch.accentColor && !patch.accentHoverColor) {
      next.accentHoverColor = adjustHexBrightness(patch.accentColor, 22);
      next.accentSoftColor = adjustHexBrightness(patch.accentColor, 72);
    }
    setDraft(next);
    applyThemeToDocument(next);
  };

  const handleSaveCustomTheme = () => {
    const name = customName.trim() || `Custom Theme ${customThemes.length + 1}`;
    const existingCustom = !draft.isDefault && customThemes.find((t) => t.id === draft.id);
    let nextCustom: AppTheme[];
    let savedTheme: AppTheme;

    if (existingCustom) {
      savedTheme = { ...draft, name, isDefault: false };
      nextCustom = customThemes.map((t) => (t.id === draft.id ? savedTheme : t));
    } else {
      savedTheme = {
        ...draft,
        id: `custom-theme-${Date.now()}`,
        name,
        isDefault: false
      };
      nextCustom = [...customThemes, savedTheme];
    }

    saveCustomThemes(nextCustom);
    setCustomThemes(nextCustom);
    setActiveTheme(savedTheme);
    setActiveThemeIdState(savedTheme.id);
    setDraft(savedTheme);
    setCustomName(savedTheme.name);
    setThemeSavedMsg(`Saved "${savedTheme.name}"`);
    setTimeout(() => setThemeSavedMsg(null), 2500);
  };

  const handleDeleteCustomTheme = (id: string) => {
    const nextCustom = customThemes.filter((t) => t.id !== id);
    saveCustomThemes(nextCustom);
    setCustomThemes(nextCustom);
    if (activeThemeId === id) {
      handleSelectTheme(DEFAULT_THEMES[0]);
    }
  };

  const handleResetDefaultTheme = () => {
    handleSelectTheme(DEFAULT_THEMES[0]);
  };

  // Data Manager Handlers
  const ownedInventories = Object.values(ownedModels);
  const totalStorageBytes = useMemo(() => {
    let bytes = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('wh40k_')) {
        bytes += (localStorage.getItem(k) || '').length * 2;
      }
    }
    return bytes;
  }, [rosters, ownedModels, customThemes, activeThemeId, hasGeminiKey]);

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  const handleDeleteRoster = (rosterId: string) => {
    const next = deleteRoster(rosterId);
    onRostersChange(next);
  };

  const handleClearAllRosters = () => {
    localStorage.removeItem('wh40k_11e_rosters');
    localStorage.removeItem('wh40k_11e_active_roster_id');
    onRostersChange([]);
  };

  const handleDeleteOwnedFaction = (factionId: string) => {
    deleteOwnedFaction(factionId);
    const next = { ...ownedModels };
    delete next[factionId];
    onUpdateOwnedModels(next);
  };

  const handleClearAllOwned = () => {
    localStorage.removeItem('wh40k_11e_owned_models');
    onUpdateOwnedModels({});
  };

  const handleClearAiKey = () => {
    localStorage.removeItem('wh40k_gemini_api_key');
    localStorage.removeItem('wh40k_gemini_model');
    setHasGeminiKey(false);
  };

  const handleResetAllThemes = () => {
    localStorage.removeItem(CUSTOM_THEMES_STORAGE_KEY);
    localStorage.removeItem(ACTIVE_THEME_STORAGE_KEY);
    setCustomThemes([]);
    handleSelectTheme(DEFAULT_THEMES[0]);
  };

  const handleClearAllData = () => {
    const keysToDelete: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('wh40k_')) keysToDelete.push(k);
    }
    for (const k of keysToDelete) {
      localStorage.removeItem(k);
    }
    onRostersChange([]);
    onUpdateOwnedModels({});
    setCustomThemes([]);
    setHasGeminiKey(false);
    setConfirmClearAll(false);
    handleSelectTheme(DEFAULT_THEMES[0]);
  };

  // Ensure unused import lint stays happy if saveOwnedFaction isn't called directly
  void saveOwnedFaction;
  void getAllThemes;

  return (
    <div className="space-y-5">
      {/* Header + Sub-tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-warhammer text-lg sm:text-xl font-bold text-theme-text">
            Settings
          </h2>
          <p className="text-xs sm:text-sm text-theme-text-secondary">
            Customize your app theme, gradients, and manage saved local data.
          </p>
        </div>

        <div className="inline-flex bg-theme-surface border border-theme-border-subtle rounded-xl p-1 self-start">
          <button
            type="button"
            onClick={() => setActiveTab('theme')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors ${
              activeTab === 'theme'
                ? 'bg-theme-accent text-white shadow-sm'
                : 'text-theme-text-secondary hover:text-theme-text'
            }`}
          >
            <Palette className="w-4 h-4" />
            <span>Theme Manager</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('data')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors ${
              activeTab === 'data'
                ? 'bg-theme-accent text-white shadow-sm'
                : 'text-theme-text-secondary hover:text-theme-text'
            }`}
          >
            <Database className="w-4 h-4" />
            <span>Data Manager</span>
          </button>
        </div>
      </div>

      {activeTab === 'theme' ? (
        <div className="space-y-5">
          {/* Preset & Saved Themes Grid */}
          <section className="panel-theme-section space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-theme-text">
                Themes ({allThemes.length})
              </h3>
              <button
                type="button"
                onClick={handleResetDefaultTheme}
                className="text-xs text-theme-text-secondary hover:text-theme-text flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset to Default</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {allThemes.map((t) => {
                const isSelected = activeThemeId === t.id;
                const previewBg = buildGradientCss(t);
                return (
                  <div
                    key={t.id}
                    className={`rounded-xl border p-3 transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'border-theme-accent bg-theme-accent/15 shadow-sm'
                        : 'border-theme-border bg-theme-card hover:border-theme-accent/50'
                    }`}
                    onClick={() => handleSelectTheme(t)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Swatch Preview */}
                      <div
                        className="w-11 h-11 rounded-lg border border-white/15 shrink-0 relative overflow-hidden shadow-inner"
                        style={{
                          backgroundColor: t.bgColor,
                          backgroundImage: previewBg
                        }}
                      >
                        <div
                          className="absolute bottom-1 left-1 right-1 h-2 rounded-sm"
                          style={{ backgroundColor: t.accentColor }}
                        />
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-bold text-theme-text truncate">
                            {t.name}
                          </span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-theme-accent-soft shrink-0" />}
                        </div>
                        <span className="text-[11px] text-theme-text-muted block">
                          {t.isDefault ? 'Built-in Preset' : 'Custom Theme'}
                        </span>
                      </div>
                    </div>

                    {!t.isDefault && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteCustomTheme(t.id);
                        }}
                        className="btn-theme-danger-icon w-8 h-8 rounded-lg shrink-0"
                        title="Delete custom theme"
                        aria-label={`Delete ${t.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Custom Theme Builder */}
          <section className="panel-theme-section space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold text-theme-text flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-theme-accent-soft" />
                  <span>Customize &amp; Save Theme</span>
                </h3>
                <p className="text-xs text-theme-text-secondary">
                  Changes preview live across the entire app. Save to keep your custom palette.
                </p>
              </div>
              {themeSavedMsg && (
                <span className="text-xs font-semibold text-theme-success flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  {themeSavedMsg}
                </span>
              )}
            </div>

            {/* Background & Gradient Controls */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-3 rounded-xl bg-theme-card border border-theme-border-subtle">
              <div>
                <label className="text-xs font-semibold text-theme-text-secondary block mb-1.5">
                  Primary Background
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={draft.bgColor}
                    onChange={(e) => updateDraft({ bgColor: e.target.value })}
                    className="w-9 h-9 rounded-lg border border-theme-border bg-transparent cursor-pointer"
                  />
                  <input
                    type="text"
                    value={draft.bgColor}
                    onChange={(e) => updateDraft({ bgColor: e.target.value })}
                    className="flex-1 bg-theme-elevated border border-theme-border rounded-lg px-2.5 py-1.5 text-xs font-mono text-theme-text"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-theme-text-secondary block mb-1.5">
                  Secondary Gradient Color
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={draft.bgSecondaryColor}
                    disabled={draft.gradientDirection === 'none'}
                    onChange={(e) => updateDraft({ bgSecondaryColor: e.target.value })}
                    className="w-9 h-9 rounded-lg border border-theme-border bg-transparent cursor-pointer disabled:opacity-40"
                  />
                  <input
                    type="text"
                    value={draft.bgSecondaryColor}
                    disabled={draft.gradientDirection === 'none'}
                    onChange={(e) => updateDraft({ bgSecondaryColor: e.target.value })}
                    className="flex-1 bg-theme-elevated border border-theme-border rounded-lg px-2.5 py-1.5 text-xs font-mono text-theme-text disabled:opacity-40"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-theme-text-secondary block mb-1.5">
                  Gradient Direction
                </label>
                <select
                  value={draft.gradientDirection}
                  onChange={(e) =>
                    updateDraft({ gradientDirection: e.target.value as GradientDirection })
                  }
                  className="w-full h-9 bg-theme-elevated border border-theme-border rounded-lg px-2.5 text-xs text-theme-text"
                >
                  {GRADIENT_DIRECTION_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Surface / Card / Border / Text / Accent Color Pickers */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {[
                { key: 'surfaceColor' as const, label: 'Panels & Header' },
                { key: 'cardColor' as const, label: 'Cards' },
                { key: 'borderColor' as const, label: 'Borders' },
                { key: 'textColor' as const, label: 'Primary Text' },
                { key: 'accentColor' as const, label: 'Accent Color' }
              ].map(({ key, label }) => (
                <div
                  key={key}
                  className="p-2.5 rounded-xl bg-theme-card border border-theme-border-subtle"
                >
                  <label className="text-[11px] font-semibold text-theme-text-secondary block mb-1.5">
                    {label}
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={draft[key]}
                      onChange={(e) => updateDraft({ [key]: e.target.value })}
                      className="w-8 h-8 rounded-lg border border-theme-border bg-transparent cursor-pointer shrink-0"
                    />
                    <span className="text-[11px] font-mono text-theme-text truncate">
                      {draft[key]}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Save Custom Theme Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-2 border-t border-theme-border-subtle">
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Name your custom theme..."
                className="flex-1 bg-theme-elevated border border-theme-border rounded-xl px-3 py-2 text-xs sm:text-sm text-theme-text placeholder-theme-text-muted focus:outline-none focus:border-theme-accent"
              />
              <button
                type="button"
                onClick={handleSaveCustomTheme}
                className="btn-theme-primary min-h-[38px] px-4 py-2 rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2"
              >
                {draft.isDefault ? <Plus className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                <span>{draft.isDefault ? 'Save as Custom Theme' : 'Update / Save Theme'}</span>
              </button>
            </div>
          </section>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Storage Summary + Clear All */}
          <section className="panel-theme-section flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-theme-text">
                Local Browser Storage ({formatBytes(totalStorageBytes)})
              </h3>
              <p className="text-xs text-theme-text-secondary">
                All army lists, owned models, custom themes, and AI settings are stored locally in your browser.
              </p>
            </div>

            {!confirmClearAll ? (
              <button
                type="button"
                onClick={() => setConfirmClearAll(true)}
                className="btn-theme-secondary px-3.5 py-2 rounded-xl text-xs font-semibold text-red-300 border-red-700/50 hover:bg-red-950/60 flex items-center gap-1.5 self-start sm:self-auto"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All App Data</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-300 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Delete everything?
                </span>
                <button
                  type="button"
                  onClick={handleClearAllData}
                  className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold"
                >
                  Confirm
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClearAll(false)}
                  className="btn-theme-secondary px-3 py-1.5 rounded-lg text-xs"
                >
                  Cancel
                </button>
              </div>
            )}
          </section>

          {/* Saved Army Lists */}
          <section className="panel-theme-section space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-theme-text flex items-center gap-2">
                <Layers className="w-4 h-4 text-theme-accent-soft" />
                <span>Saved Army Lists ({rosters.length})</span>
              </h3>
              {rosters.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAllRosters}
                  className="text-xs text-red-300 hover:text-red-200 font-semibold"
                >
                  Delete All Lists
                </button>
              )}
            </div>

            {rosters.length === 0 ? (
              <p className="text-xs text-theme-text-muted">No saved army lists.</p>
            ) : (
              <div className="space-y-2">
                {rosters.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-theme-card border border-theme-border-subtle"
                  >
                    <div className="min-w-0">
                      <span className="text-xs sm:text-sm font-bold text-theme-text block truncate">
                        {r.name}
                      </span>
                      <span className="text-[11px] text-theme-text-secondary block">
                        {r.factionName} • {r.units.length} units
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteRoster(r.id)}
                      className="btn-theme-danger-icon w-8 h-8 rounded-lg shrink-0"
                      title={`Delete ${r.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Owned Models */}
          <section className="panel-theme-section space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-theme-text flex items-center gap-2">
                <Package className="w-4 h-4 text-theme-accent-soft" />
                <span>Owned Models ({ownedInventories.length} Factions)</span>
              </h3>
              {ownedInventories.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAllOwned}
                  className="text-xs text-red-300 hover:text-red-200 font-semibold"
                >
                  Clear All Owned
                </button>
              )}
            </div>

            {ownedInventories.length === 0 ? (
              <p className="text-xs text-theme-text-muted">No owned models tracked.</p>
            ) : (
              <div className="space-y-2">
                {ownedInventories.map((inv) => {
                  const totalModels = inv.units.reduce((s, u) => s + u.modelsCount, 0);
                  return (
                    <div
                      key={inv.factionId}
                      className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-theme-card border border-theme-border-subtle"
                    >
                      <div className="min-w-0">
                        <span className="text-xs sm:text-sm font-bold text-theme-text block truncate">
                          {inv.factionName}
                        </span>
                        <span className="text-[11px] text-theme-text-secondary block">
                          {inv.units.length} units • {totalModels} models
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteOwnedFaction(inv.factionId)}
                        className="btn-theme-danger-icon w-8 h-8 rounded-lg shrink-0"
                        title={`Delete ${inv.factionName} owned models`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Custom Themes & AI Settings */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <section className="panel-theme-section flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-theme-text flex items-center gap-2">
                  <Palette className="w-4 h-4 text-theme-accent-soft" />
                  <span>Custom Themes ({customThemes.length})</span>
                </h3>
                <p className="text-xs text-theme-text-muted">
                  Reset custom themes and active theme selection.
                </p>
              </div>
              <button
                type="button"
                onClick={handleResetAllThemes}
                className="btn-theme-secondary px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0"
              >
                Reset
              </button>
            </section>

            <section className="panel-theme-section flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-theme-text flex items-center gap-2">
                  <Key className="w-4 h-4 text-theme-accent-soft" />
                  <span>Gemini AI Key</span>
                </h3>
                <p className="text-xs text-theme-text-muted">
                  {hasGeminiKey ? 'API key is saved locally.' : 'No API key saved.'}
                </p>
              </div>
              {hasGeminiKey && (
                <button
                  type="button"
                  onClick={handleClearAiKey}
                  className="btn-theme-danger-icon px-3 h-8 rounded-lg text-xs font-semibold gap-1.5 shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear</span>
                </button>
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  );
};
