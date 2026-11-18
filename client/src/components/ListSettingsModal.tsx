import React, { useState, useEffect } from 'react';
import { X, Settings, Pencil, Coins, RotateCcw, Palette, Check } from 'lucide-react';
import { BattleSize } from '../types/roster';
import { getAllThemes, AppTheme } from '../utils/themeStorage';

interface ListSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  battleSize: BattleSize;
  onUpdateBattleSize: (size: BattleSize) => void;
  includeLegends: boolean;
  onToggleLegends: (enabled: boolean) => void;
  rosterName: string;
  onRenameRoster: (newName: string) => void;
  customPointsLimit?: number | null;
  defaultPointsLimit: number;
  onSetCustomPointsLimit: (limit: number | null) => void;
  themeId?: string | null;
  onSetThemeId?: (themeId: string | null) => void;
}

export const ListSettingsModal: React.FC<ListSettingsModalProps> = ({
  isOpen,
  onClose,
  battleSize,
  onUpdateBattleSize,
  includeLegends,
  onToggleLegends,
  rosterName,
  onRenameRoster,
  customPointsLimit,
  defaultPointsLimit,
  onSetCustomPointsLimit,
  themeId = null,
  onSetThemeId
}) => {
  const [nameDraft, setNameDraft] = useState(rosterName);
  const [pointsDraft, setPointsDraft] = useState<string>(
    String(customPointsLimit || defaultPointsLimit)
  );
  const [availableThemes, setAvailableThemes] = useState<AppTheme[]>(() => getAllThemes());

  useEffect(() => {
    if (isOpen) {
      setNameDraft(rosterName);
      setAvailableThemes(getAllThemes());
    }
  }, [isOpen, rosterName]);

  useEffect(() => {
    if (isOpen) {
      setPointsDraft(String(customPointsLimit || defaultPointsLimit));
    }
  }, [isOpen, customPointsLimit, defaultPointsLimit]);

  const isOnslaught = battleSize === 'onslaught';

  if (!isOpen) return null;

  const commitChangesAndClose = () => {
    const trimmed = nameDraft.trim();
    if (trimmed && trimmed !== rosterName) {
      onRenameRoster(trimmed);
    }
    const parsedPts = parseInt(pointsDraft, 10);
    const currentEffectiveLimit = customPointsLimit || defaultPointsLimit;
    if (!isNaN(parsedPts) && parsedPts > 0 && parsedPts !== currentEffectiveLimit) {
      if (parsedPts === defaultPointsLimit) {
        onSetCustomPointsLimit(null);
      } else {
        onSetCustomPointsLimit(parsedPts);
      }
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-theme-border-subtle bg-theme-surface">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-theme-accent/20 border border-theme-accent/40 flex items-center justify-center text-theme-accent-soft">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-warhammer text-base sm:text-lg font-bold text-theme-text">
                List Settings
              </h2>
              <p className="text-xs text-theme-text-muted truncate max-w-xs sm:max-w-sm">
                Configuration for {rosterName}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="btn-theme-icon min-w-[38px] min-h-[38px] rounded-xl"
            aria-label="Close settings"
          >
            <X className="w-4 h-4 stroke-[2]" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto">
          {/* Setting 0: Roster Name */}
          <div className="bg-slate-850 border border-slate-750 rounded-2xl p-4 sm:p-5">
            <label
              htmlFor="roster-name-input"
              className="font-warhammer text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2 mb-2"
            >
              <Pencil className="w-4 h-4 text-theme-accent-soft" />
              <span>Roster Name</span>
            </label>
            <input
              id="roster-name-input"
              type="text"
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  commitChangesAndClose();
                }
              }}
              placeholder="Enter army roster name..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-theme-accent"
            />
          </div>

          {/* Setting 1: Custom Points Limit */}
          <div className="bg-slate-850 border border-slate-750 rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="custom-points-input"
                className="font-warhammer text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2"
              >
                <Coins className="w-4 h-4 text-theme-accent-soft" />
                <span>Points Limit</span>
              </label>
              {customPointsLimit && (
                <button
                  type="button"
                  onClick={() => {
                    onSetCustomPointsLimit(null);
                    setPointsDraft(String(defaultPointsLimit));
                  }}
                  className="text-xs text-theme-text-secondary hover:text-theme-text flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset ({defaultPointsLimit})</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                id="custom-points-input"
                type="number"
                min={100}
                max={20000}
                step={50}
                value={pointsDraft}
                onChange={(e) => setPointsDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    commitChangesAndClose();
                  }
                }}
                className="w-32 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm font-mono font-bold text-slate-100 focus:outline-none focus:border-theme-accent"
              />
              <span className="text-xs text-slate-400 font-medium">pts</span>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {[500, 1000, 1500, 2000, 3000].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setPointsDraft(String(preset))}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold border transition-colors ${
                    Number(pointsDraft) === preset
                      ? 'bg-theme-accent/20 text-theme-accent-soft border-theme-accent/50'
                      : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Setting 2: Onslaught Battle Size Toggle */}
          <div className="bg-slate-850 border border-slate-750 rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4">
            <div>
              <h3 className="font-warhammer text-sm sm:text-base font-bold text-slate-100">
                Onslaught (3,000 pts)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                3,000 pts limit • 4 DP • 6 Enhancements • Up to 4 per unit
              </p>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={isOnslaught}
              onClick={() => onUpdateBattleSize(isOnslaught ? 'strike-force' : 'onslaught')}
              className={`relative inline-flex h-8 w-14 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none active:scale-95 items-center p-0.5 ${
                isOnslaught
                  ? 'bg-theme-accent ring-2 ring-theme-accent/50'
                  : 'bg-slate-800'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  isOnslaught ? 'translate-x-6' : 'translate-x-0 bg-slate-300'
                }`}
              />
            </button>
          </div>

          {/* Setting 3: Warhammer Legends Toggle */}
          <div className="bg-slate-850 border border-slate-750 rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4">
            <h3 className="font-warhammer text-sm sm:text-base font-bold text-slate-100">
              Include Legends Units
            </h3>

            <button
              type="button"
              role="switch"
              aria-checked={includeLegends}
              onClick={() => onToggleLegends(!includeLegends)}
              className={`relative inline-flex h-8 w-14 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none active:scale-95 items-center p-0.5 ${
                includeLegends
                  ? 'bg-theme-accent ring-2 ring-theme-accent/50'
                  : 'bg-slate-800'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  includeLegends ? 'translate-x-6' : 'translate-x-0 bg-slate-300'
                }`}
              />
            </button>
          </div>

          {/* Setting 4: Roster UI Theme */}
          {onSetThemeId && (
            <div className="bg-slate-850 border border-slate-750 rounded-2xl p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Palette className="w-4 h-4 text-theme-accent-soft" />
                  <h3 className="font-warhammer text-sm sm:text-base font-bold text-slate-100">
                    Roster UI Theme
                  </h3>
                </div>
                {themeId && (
                  <button
                    type="button"
                    onClick={() => onSetThemeId(null)}
                    className="text-xs text-theme-text-secondary hover:text-theme-text flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Use Global</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onSetThemeId(null)}
                  className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-left transition-colors ${
                    !themeId
                      ? 'bg-theme-accent/20 border-theme-accent/60 text-theme-accent-soft'
                      : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500'
                  }`}
                >
                  <span className="text-xs font-semibold truncate">Global Default</span>
                  {!themeId && <Check className="w-3.5 h-3.5 shrink-0" />}
                </button>

                {availableThemes.map((t) => {
                  const isSelected = themeId === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => onSetThemeId(t.id)}
                      className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-left transition-colors ${
                        isSelected
                          ? 'bg-theme-accent/20 border-theme-accent/60 text-theme-accent-soft'
                          : 'bg-slate-900 border-slate-700 text-slate-300 hover:border-slate-500'
                      }`}
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-4 h-4 rounded-full border border-white/20 shrink-0 flex items-center justify-center"
                          style={{ background: t.bgColor }}
                        >
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ background: t.accentColor }}
                          />
                        </span>
                        <span className="text-xs font-semibold truncate">{t.name}</span>
                      </span>
                      {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3.5 border-t border-slate-800 bg-slate-900/90 flex justify-end">
          <button
            type="button"
            onClick={commitChangesAndClose}
            className="btn-theme-primary w-full sm:w-auto min-h-[42px] px-6 rounded-xl text-sm tracking-wide"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
