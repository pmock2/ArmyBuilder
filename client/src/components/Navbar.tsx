import React from 'react';
import { CheckCircle2, AlertTriangle, Save, Printer, ArrowLeft, Settings, Swords, BookOpen, Key, Sparkles } from 'lucide-react';
import { ArmyRoster, BattleSize, ValidationResult } from '../types/roster';

interface NavbarProps {
  roster: ArmyRoster;
  validation: ValidationResult;
  isPlayMode: boolean;
  onTogglePlayMode: () => void;
  onUpdateBattleSize: (size: BattleSize) => void;
  onSave: () => void;
  onExport: () => void;
  onBackToDashboard: () => void;
  onToggleValidationDrawer: () => void;
  onOpenSettings: () => void;
  onOpenAiRules?: () => void;
  onOpenAiSettings?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  roster,
  validation,
  isPlayMode,
  onTogglePlayMode,
  onUpdateBattleSize,
  onSave,
  onExport,
  onBackToDashboard,
  onToggleValidationDrawer,
  onOpenSettings,
  onOpenAiRules,
  onOpenAiSettings
}) => {
  // Points color
  let pointsColor = 'text-theme-text';
  if (validation.totalPoints > validation.pointsLimit) pointsColor = 'text-theme-danger font-bold';
  else if (validation.totalPoints === validation.pointsLimit) pointsColor = 'text-theme-success font-bold';

  // DP color
  let dpColor = 'text-theme-text';
  if (validation.totalDP > validation.dpLimit) dpColor = 'text-theme-danger font-bold';
  else if (validation.totalDP === validation.dpLimit) dpColor = 'text-theme-accent-soft';

  return (
    <header className="sticky top-0 z-40 bg-theme-surface/95 border-b border-theme-border-subtle backdrop-blur-md px-3 sm:px-6 py-2.5 shadow-md shadow-black/40">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-2.5">
        
        {/* Top/Left: Back, Roster Info & Mobile Actions */}
        <div className="flex items-center justify-between gap-2 min-w-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              onClick={onBackToDashboard}
              className="btn-theme-secondary min-h-[36px] min-w-[36px] sm:px-3 flex items-center justify-center gap-1.5 rounded-xl text-xs font-semibold flex-shrink-0"
              title="Return to Armies Dashboard"
              aria-label="Return to Armies Dashboard"
            >
              <ArrowLeft className="w-4 h-4 stroke-[2]" />
              <span className="hidden sm:inline">Armies</span>
            </button>

            <div className="min-w-0 flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <h1 className="font-warhammer text-base sm:text-lg font-extrabold text-theme-text tracking-wide truncate">
                {roster.name}
              </h1>
              <span className="text-xs sm:text-sm text-theme-text-secondary font-medium truncate">
                • {roster.subFactionName || roster.factionName}
              </span>
              {roster.includeLegends && (
                <span className="text-[10px] px-2 py-0.5 rounded-md bg-theme-elevated text-theme-text-secondary border border-theme-border font-bold font-mono">
                  LEGENDS
                </span>
              )}
            </div>
          </div>

          {/* Mobile Quick Action Buttons */}
          <div className="flex items-center gap-1.5 md:hidden flex-shrink-0">
            {onOpenAiRules && (
              <button
                type="button"
                onClick={onOpenAiRules}
                className="btn-theme-secondary min-h-[36px] px-2.5 flex items-center gap-1 rounded-xl text-xs font-bold text-amber-300 border-amber-500/40"
                title="Rules AI Assistant"
                aria-label="Rules AI"
              >
                <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                <span>Rules</span>
              </button>
            )}

            <button
              type="button"
              onClick={onTogglePlayMode}
              className={`min-h-[36px] px-3 flex items-center gap-1.5 rounded-xl text-xs font-bold tracking-wide transition-all border ${
                isPlayMode
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm shadow-amber-950/50'
                  : 'btn-theme-secondary'
              }`}
              title={isPlayMode ? 'Exit Play Mode' : 'Enter Play Mode'}
              aria-label={isPlayMode ? 'Exit Play Mode' : 'Enter Play Mode'}
            >
              <Swords className="w-3.5 h-3.5 stroke-[2.2]" />
              <span>{isPlayMode ? 'Playing' : 'Play'}</span>
            </button>

            {!isPlayMode && (
              <>
                <button
                  onClick={onOpenSettings}
                  className={`min-h-[36px] min-w-[36px] rounded-xl ${
                    roster.includeLegends
                      ? 'bg-theme-accent/15 text-theme-accent-soft border border-theme-accent/40 flex items-center justify-center'
                      : 'btn-theme-icon'
                  }`}
                  title="List Settings"
                  aria-label="List Settings"
                >
                  <Settings className="w-4 h-4 stroke-[2]" />
                </button>

                <button
                  onClick={onExport}
                  className="btn-theme-icon min-h-[36px] min-w-[36px] rounded-xl"
                  title="Export tournament sheet"
                  aria-label="Export tournament sheet"
                >
                  <Printer className="w-4 h-4 stroke-[2]" />
                </button>

                <button
                  onClick={onSave}
                  className="btn-theme-primary min-h-[36px] px-3.5 flex items-center gap-1.5 rounded-xl text-xs tracking-wide"
                  aria-label="Save army roster"
                >
                  <Save className="w-3.5 h-3.5 stroke-[2.25]" />
                  <span>Save</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Bottom/Right: Battle Size, Combined Points/DP, Legal Pill & Desktop Actions */}
        <div className="flex items-center justify-between md:justify-end gap-2 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Battle Size Toggle (Hidden in Play Mode) */}
            {!isPlayMode && (
              <div className="flex items-center bg-theme-bg/90 rounded-xl p-1 border border-theme-border-subtle text-xs">
                {(['incursion', 'strike-force'] as BattleSize[]).map((size) => {
                  const active = roster.battleSize === size;
                  return (
                    <button
                      key={size}
                      onClick={() => onUpdateBattleSize(size)}
                      className={`min-h-[28px] px-3 py-0.5 rounded-lg transition-all font-semibold text-xs ${
                        active
                          ? 'bg-theme-elevated text-theme-text border border-theme-border shadow-sm'
                          : 'text-theme-text-muted hover:text-theme-text-secondary'
                      }`}
                    >
                      {size === 'incursion' ? '1,000' : '2,000'}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Combined Points & DP Bar */}
            <div className="flex items-center gap-2 bg-theme-bg/90 px-3 py-1.5 rounded-xl border border-theme-border-subtle font-mono text-xs">
              <div className="flex items-baseline gap-1">
                <span className={`text-sm sm:text-base font-bold ${pointsColor}`}>
                  {validation.totalPoints}
                </span>
                <span className="text-[11px] sm:text-xs font-medium text-theme-text-muted">
                  /{validation.pointsLimit} pts
                </span>
              </div>
              <span className="text-theme-border font-bold">•</span>
              <div className="flex items-baseline gap-1">
                <span className={`text-sm sm:text-base font-bold ${dpColor}`}>
                  {validation.totalDP}
                </span>
                <span className="text-[11px] sm:text-xs font-medium text-theme-text-muted">
                  /{validation.dpLimit} DP
                </span>
              </div>
            </div>

            {/* Legal Status Pill (Hidden in Play Mode to reduce clutter) */}
            {!isPlayMode && (
              <button
                onClick={onToggleValidationDrawer}
                className={`min-h-[34px] flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border transition-all active:translate-y-[1px] flex-shrink-0 ${
                  validation.isValid
                    ? 'bg-emerald-950/50 text-emerald-300 border-emerald-700/40 hover:bg-emerald-950/70'
                    : 'bg-red-950/60 text-red-300 border-red-700/50 hover:bg-red-950/80'
                }`}
              >
                {validation.isValid ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 stroke-[2.25]" />
                    <span>Legal</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5 text-red-400 stroke-[2.25]" />
                    <span>{validation.errorsCount} {validation.errorsCount === 1 ? 'Error' : 'Errors'}</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-2 flex-shrink-0 ml-1">
            {onOpenAiRules && (
              <button
                type="button"
                onClick={onOpenAiRules}
                className="btn-theme-secondary min-h-[34px] flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold text-amber-300 hover:text-amber-200 border-amber-500/40 shadow-sm transition-all"
                title="Search 11th Edition Rules with AI"
              >
                <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                <span>Rules AI</span>
              </button>
            )}

            <button
              type="button"
              onClick={onTogglePlayMode}
              className={`min-h-[34px] flex items-center gap-1.5 px-3.5 py-1 rounded-xl text-xs font-bold tracking-wide transition-all border ${
                isPlayMode
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 hover:bg-amber-500/30 shadow-sm shadow-amber-950/50'
                  : 'btn-theme-secondary'
              }`}
              title={isPlayMode ? 'Exit Play Mode and return to list editing' : 'Enter Play Mode for tabletop reference'}
              aria-label={isPlayMode ? 'Exit Play Mode' : 'Enter Play Mode'}
            >
              <Swords className="w-3.5 h-3.5 stroke-[2.2]" />
              <span>{isPlayMode ? 'Play Mode: ON' : 'Play Mode'}</span>
            </button>

            {!isPlayMode && (
              <>
                {onOpenAiSettings && (
                  <button
                    onClick={onOpenAiSettings}
                    className="btn-theme-icon min-h-[34px] min-w-[34px] rounded-xl"
                    title="Gemini AI Key & Settings"
                    aria-label="AI Settings"
                  >
                    <Key className="w-4 h-4 text-sky-400" />
                  </button>
                )}

                <button
                  onClick={onOpenSettings}
                  className={`min-h-[34px] min-w-[34px] rounded-xl ${
                    roster.includeLegends
                      ? 'bg-theme-accent/15 text-theme-accent-soft border border-theme-accent/40 flex items-center justify-center'
                      : 'btn-theme-icon'
                  }`}
                  title="List Settings"
                  aria-label="List Settings"
                >
                  <Settings className="w-4 h-4 stroke-[2]" />
                </button>

                <button
                  onClick={onExport}
                  className="btn-theme-secondary min-h-[34px] flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold"
                  title="Export tournament sheet"
                  aria-label="Export tournament sheet"
                >
                  <Printer className="w-3.5 h-3.5 stroke-[2]" />
                  <span>Export</span>
                </button>

                <button
                  onClick={onSave}
                  className="btn-theme-primary min-h-[34px] flex items-center gap-1.5 px-4 py-1 rounded-xl text-xs tracking-wide"
                  aria-label="Save army roster"
                >
                  <Save className="w-3.5 h-3.5 stroke-[2.25]" />
                  <span>Save</span>
                </button>
              </>
            )}
          </div>

        </div>

      </div>
    </header>
  );
};
