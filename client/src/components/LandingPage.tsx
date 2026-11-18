import React, { useState } from 'react';
import { Plus, Upload, Trash2, Copy, Shield, Sparkles, BookOpen, Key, Package, Layers, Settings } from 'lucide-react';
import { ArmyRoster } from '../types/roster';
import { validateClientRoster } from '../utils/validator';
import { OwnedModelsView } from './OwnedModelsView';
import { SettingsView } from './SettingsView';
import { ImportRosterModal } from './ImportRosterModal';
import { loadAllOwnedModels, getTotalOwnedModelsCount, OwnedFactionInventory } from '../utils/ownedModelsStorage';
import { useBackNavigation } from '../utils/backNavigation';

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
  onOpenAiSettings
}) => {
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [activeNav, setActiveNav] = useState<'armies' | 'owned' | 'settings'>('armies');
  const [ownedModels, setOwnedModels] = useState<Record<string, OwnedFactionInventory>>(() => loadAllOwnedModels());
  const totalOwnedModels = getTotalOwnedModelsCount(ownedModels);

  useBackNavigation(activeNav !== 'armies', () => setActiveNav('armies'));

  return (
    <div className="h-screen h-[100dvh] overflow-hidden bg-transparent flex flex-col text-theme-text">
      {/* Top Banner */}
      <header className="border-b border-theme-border-subtle bg-theme-surface/95 backdrop-blur-sm px-4 sm:px-6 py-3.5 sm:py-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden border border-theme-accent/30 bg-theme-accent/15 flex items-center justify-center flex-shrink-0">
              <img
                src={`${import.meta.env.BASE_URL}icon-192.png`}
                alt="Warhammer 40,000 Army Builder"
                className="w-full h-full object-cover scale-[1.38]"
              />
            </div>
            <div>
              <h1 className="font-warhammer text-lg sm:text-xl font-bold tracking-wider text-theme-text">
                WARHAMMER 40,000
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

          {/* Secondary Tools: Rules AI & AI Settings */}
          {(onOpenAiRules || onOpenAiSettings) && (
            <div className="flex flex-col gap-1.5 pt-2 border-t border-theme-border-subtle">
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
          /* Roster Grid */
          <div className="panel-theme-section">
            <div className="flex items-center justify-between mb-2.5 sm:mb-3.5">
              <div>
                <h2 className="font-warhammer text-base sm:text-lg font-bold text-theme-text">
                  Command Roster ({rosters.length})
                </h2>
                <p className="text-[11px] sm:text-xs text-theme-text-secondary">
                  Select a force to edit, duplicate, or export.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-1.5 sm:gap-3">
              {rosters.map((roster) => {
                const validation = validateClientRoster(roster);
                return (
                  <div
                    key={roster.id}
                    onClick={() => onSelectRoster(roster)}
                    className="card-theme-item px-3 py-2 sm:px-3.5 sm:py-2.5 cursor-pointer flex items-center justify-between gap-2.5 active:scale-[0.995] group"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <h3 className="font-warhammer text-sm sm:text-base font-bold text-theme-text group-hover:text-theme-accent-soft transition-colors leading-tight tracking-wide truncate">
                          {roster.name}
                        </h3>
                        {roster.includeLegends && (
                          <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded bg-theme-elevated text-theme-text-secondary border border-theme-border font-mono">
                            LEGENDS
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-theme-text-secondary mt-0.5 min-w-0">
                        <span className="font-medium truncate">
                          {roster.factionName}
                          {roster.subFactionName ? ` • ${roster.subFactionName}` : ''}
                        </span>
                        <span className="text-theme-text-muted shrink-0">•</span>
                        <span className="font-mono font-semibold text-theme-text shrink-0">
                          {validation.totalPoints}/{validation.pointsLimit} pts
                        </span>
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
    </div>
  );
};
