import React, { useState, useMemo, useEffect } from 'react';
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
  Wand2,
  Loader2,
  Sliders,
  AlertCircle,
  Package,
  Layers,
  Key,
  Smartphone
} from 'lucide-react';
import { hasApiKey, setStoredApiKey } from '../services/geminiService';
import {
  generateThemeWithAi,
  THEME_PROMPT_EXAMPLES
} from '../services/aiThemeGenerator';
import {
  isHapticsEnabled,
  setHapticsEnabled,
  isVibrationSupported,
  triggerHaptic
} from '../utils/haptics';
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
  onOpenAiSettings?: () => void;
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
  onUpdateOwnedModels,
  onOpenAiSettings
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
  const [themeBuilderMode, setThemeBuilderMode] = useState<'manual' | 'ai'>('manual');
  const [aiPrompt, setAiPrompt] = useState<string>('');
  const [isGeneratingTheme, setIsGeneratingTheme] = useState<boolean>(false);
  const [aiThemeError, setAiThemeError] = useState<string | null>(null);
  const [hasAiGeneratedPreview, setHasAiGeneratedPreview] = useState<boolean>(false);

  // Data Manager State
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [hasGeminiKey, setHasGeminiKey] = useState<boolean>(() => hasApiKey());
  const [hapticsOn, setHapticsOn] = useState<boolean>(() => isHapticsEnabled());
  const vibrationSupported = isVibrationSupported();

  useEffect(() => {
    const syncKeyStatus = () => setHasGeminiKey(hasApiKey());
    window.addEventListener('wh40k-ai-key-updated', syncKeyStatus);
    window.addEventListener('storage', syncKeyStatus);
    return () => {
      window.removeEventListener('wh40k-ai-key-updated', syncKeyStatus);
      window.removeEventListener('storage', syncKeyStatus);
    };
  }, []);

  const handleSelectTheme = (theme: AppTheme) => {
    setHasAiGeneratedPreview(false);
    setAiThemeError(null);
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
    setHasAiGeneratedPreview(false);
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
    setHasAiGeneratedPreview(false);
    setAiThemeError(null);
    handleSelectTheme(DEFAULT_THEMES[0]);
  };

  const handleGenerateThemeWithAi = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!aiPrompt.trim() || isGeneratingTheme) return;

    if (!hasApiKey()) {
      setAiThemeError('Gemini API key is required to generate themes.');
      onOpenAiSettings?.();
      return;
    }

    setIsGeneratingTheme(true);
    setAiThemeError(null);

    try {
      const generated = await generateThemeWithAi(aiPrompt, draft);
      const previewTheme: AppTheme = {
        ...generated,
        id: `ai-draft-${Date.now()}`,
        isDefault: false
      };
      setDraft(previewTheme);
      setCustomName(generated.name);
      setHasAiGeneratedPreview(true);
      applyThemeToDocument(previewTheme);
    } catch (err: any) {
      setAiThemeError(err?.message || 'Failed to generate theme. Please try again.');
    } finally {
      setIsGeneratingTheme(false);
    }
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
    setStoredApiKey('');
    localStorage.removeItem('wh40k_gemini_api_key');
    localStorage.removeItem('wh40k_gemini_model');
    setHasGeminiKey(hasApiKey());
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
          {/* Mobile Haptics Toggle */}
          <section className="panel-theme-section flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <Smartphone className="w-5 h-5 text-theme-accent-soft shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-bold text-theme-text">
                  Mobile Haptic Vibration
                </h3>
                <p className="text-xs text-theme-text-secondary">
                  {vibrationSupported
                    ? 'Subtle vibration feedback when tapping buttons and controls on supported mobile devices.'
                    : 'Subtle vibration feedback on supported Android browsers (not supported by this browser/device).'}
                </p>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={hapticsOn}
              onClick={() => {
                const next = !hapticsOn;
                setHapticsOn(next);
                setHapticsEnabled(next);
                if (next) triggerHaptic('medium');
              }}
              className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 items-center p-0.5 ${
                hapticsOn ? 'bg-theme-accent' : 'bg-theme-elevated'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${
                  hapticsOn ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </section>

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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-theme-text flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-theme-accent-soft" />
                  <span>Customize &amp; Save Theme</span>
                </h3>
                <p className="text-xs text-theme-text-secondary">
                  {themeBuilderMode === 'ai'
                    ? 'Describe a faction, mood, or palette and let AI design a complete theme for you.'
                    : 'Changes preview live across the entire app. Save to keep your custom palette.'}
                </p>
              </div>

              <div className="flex items-center gap-3 self-start sm:self-auto flex-wrap">
                {themeSavedMsg && (
                  <span className="text-xs font-semibold text-theme-success flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    {themeSavedMsg}
                  </span>
                )}

                <div className="inline-flex bg-theme-surface border border-theme-border-subtle rounded-xl p-1">
                  <button
                    type="button"
                    onClick={() => setThemeBuilderMode('manual')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      themeBuilderMode === 'manual'
                        ? 'bg-theme-accent text-white shadow-sm'
                        : 'text-theme-text-secondary hover:text-theme-text'
                    }`}
                  >
                    <Sliders className="w-3.5 h-3.5" />
                    <span>Manual</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setThemeBuilderMode('ai');
                      setAiThemeError(null);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      themeBuilderMode === 'ai'
                        ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-sm'
                        : 'text-theme-text-secondary hover:text-theme-text'
                    }`}
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                    <span>Create with AI</span>
                  </button>
                </div>
              </div>
            </div>

            {themeBuilderMode === 'ai' ? (
              <div className="space-y-3.5">
                {!hasGeminiKey ? (
                  <div className="p-4 rounded-xl bg-theme-card border border-theme-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-400/35 flex items-center justify-center text-sky-400 shrink-0">
                        <Key className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-theme-text">
                          Gemini API Key Required
                        </h4>
                        <p className="text-xs text-theme-text-secondary mt-0.5">
                          Add your free Google Gemini API key to generate custom themes from natural-language prompts.
                        </p>
                      </div>
                    </div>
                    {onOpenAiSettings && (
                      <button
                        type="button"
                        onClick={onOpenAiSettings}
                        className="btn-theme-primary px-3.5 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 shrink-0"
                      >
                        <Key className="w-3.5 h-3.5" />
                        <span>Configure API Key</span>
                      </button>
                    )}
                  </div>
                ) : (
                  <form onSubmit={handleGenerateThemeWithAi} className="space-y-3">
                    <div className="p-3.5 rounded-xl bg-theme-card border border-theme-border-subtle space-y-3">
                      <label
                        htmlFor="ai-theme-prompt"
                        className="text-xs font-semibold text-theme-text-secondary block"
                      >
                        Describe your theme
                      </label>
                      <textarea
                        id="ai-theme-prompt"
                        rows={2}
                        value={aiPrompt}
                        onChange={(e) => setAiPrompt(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                            handleGenerateThemeWithAi();
                          }
                        }}
                        disabled={isGeneratingTheme}
                        placeholder="e.g. 'Deep Necron blackstone & glowing tesseract emerald with radial aura' or 'Warm Imperial parchment light theme with crimson ink'"
                        className="w-full bg-theme-elevated border border-theme-border rounded-xl px-3 py-2.5 text-xs sm:text-sm text-theme-text placeholder-theme-text-muted focus:outline-none focus:border-theme-accent resize-none"
                      />

                      <div className="space-y-1.5">
                        <span className="text-[11px] font-semibold text-theme-text-muted block">
                          Quick ideas (tap to use):
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {THEME_PROMPT_EXAMPLES.map((example) => (
                            <button
                              key={example}
                              type="button"
                              disabled={isGeneratingTheme}
                              onClick={() => {
                                setAiPrompt(example);
                                setAiThemeError(null);
                              }}
                              className="text-[11px] px-2.5 py-1 rounded-lg bg-theme-elevated border border-theme-border-subtle text-theme-text-secondary hover:text-theme-text hover:border-theme-accent/60 transition-colors text-left disabled:opacity-50"
                            >
                              {example}
                            </button>
                          ))}
                        </div>
                      </div>

                      {aiThemeError && (
                        <div className="p-2.5 rounded-lg bg-red-950/50 border border-red-700/60 text-xs text-red-200 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                          <span>{aiThemeError}</span>
                        </div>
                      )}

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                        <span className="text-[11px] text-theme-text-muted">
                          Tip: You can also ask to tweak colors after generating (e.g. &quot;make the accent brighter gold&quot;).
                        </span>
                        <button
                          type="submit"
                          disabled={isGeneratingTheme || !aiPrompt.trim()}
                          className="min-h-[38px] px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none shrink-0"
                        >
                          {isGeneratingTheme ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Designing Theme...</span>
                            </>
                          ) : (
                            <>
                              <Wand2 className="w-4 h-4" />
                              <span>Generate Theme</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {hasAiGeneratedPreview && (
                      <div className="p-3 rounded-xl bg-theme-card border border-theme-accent/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-1.5 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-theme-text">
                              Live AI Preview: {customName || draft.name}
                            </span>
                            <span className="text-[11px] text-theme-text-muted font-mono">
                              Gradient: {draft.gradientDirection}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {[
                              { label: 'Bg', color: draft.bgColor },
                              { label: 'Grad', color: draft.bgSecondaryColor },
                              { label: 'Panel', color: draft.surfaceColor },
                              { label: 'Card', color: draft.cardColor },
                              { label: 'Border', color: draft.borderColor },
                              { label: 'Text', color: draft.textColor },
                              { label: 'Accent', color: draft.accentColor }
                            ].map((sw) => (
                              <span
                                key={sw.label}
                                title={`${sw.label}: ${sw.color}`}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-theme-elevated border border-theme-border-subtle text-[10px] font-mono text-theme-text-secondary"
                              >
                                <span
                                  className="w-3 h-3 rounded-sm border border-white/20 shrink-0"
                                  style={{ backgroundColor: sw.color }}
                                />
                                {sw.label}
                              </span>
                            ))}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setThemeBuilderMode('manual')}
                          className="btn-theme-secondary px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 shrink-0 self-start sm:self-center"
                        >
                          <Sliders className="w-3.5 h-3.5" />
                          <span>Fine-tune Manually</span>
                        </button>
                      </div>
                    )}
                  </form>
                )}
              </div>
            ) : (
              <>
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
              </>
            )}

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
                {draft.isDefault || !customThemes.some((t) => t.id === draft.id) ? (
                  <Plus className="w-4 h-4" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>
                  {draft.isDefault || !customThemes.some((t) => t.id === draft.id)
                    ? 'Save as Custom Theme'
                    : 'Update / Save Theme'}
                </span>
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
