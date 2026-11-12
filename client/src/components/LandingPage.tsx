import React, { useRef } from 'react';
import { Plus, Upload, Trash2, Copy, Shield, CheckCircle2, AlertTriangle, Skull, Sparkles, BookOpen, Key } from 'lucide-react';
import { ArmyRoster } from '../types/roster';
import { parseRosterJSON } from '../utils/storage';
import { validateClientRoster } from '../utils/validator';

interface LandingPageProps {
  rosters: ArmyRoster[];
  onCreateNew: () => void;
  onSelectRoster: (roster: ArmyRoster) => void;
  onDuplicateRoster: (rosterId: string) => void;
  onDeleteRoster: (rosterId: string) => void;
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
  onImportRoster,
  onOpenAiArmyCreator,
  onOpenAiRules,
  onOpenAiSettings
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = parseRosterJSON(content);
        onImportRoster(parsed);
      } catch (err: any) {
        alert(`Error importing roster: ${err.message}`);
      }
    };
    reader.readAsText(file);
    if (e.target) e.target.value = '';
  };

  return (
    <div className="min-h-screen bg-theme-bg flex flex-col text-theme-text">
      {/* Top Banner */}
      <header className="border-b border-theme-border-subtle bg-theme-surface/95 backdrop-blur-sm px-4 sm:px-6 py-3.5 sm:py-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-theme-accent/15 border border-theme-accent/30 flex items-center justify-center flex-shrink-0">
              <Skull className="w-5 h-5 text-theme-accent-soft" />
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

          <div className="flex items-center gap-2 flex-wrap">
            {onOpenAiRules && (
              <button
                type="button"
                onClick={onOpenAiRules}
                className="btn-theme-secondary min-h-[40px] flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-semibold text-amber-300 hover:text-amber-200 border-amber-500/40"
                title="Search 11th Edition Rules with AI"
              >
                <BookOpen className="w-4 h-4 text-amber-400" />
                <span>Rules AI</span>
              </button>
            )}

            {onOpenAiSettings && (
              <button
                type="button"
                onClick={onOpenAiSettings}
                className="btn-theme-icon min-h-[40px] min-w-[40px] rounded-xl"
                title="Gemini AI Key & Settings"
                aria-label="AI Settings"
              >
                <Key className="w-4 h-4 text-sky-400" />
              </button>
            )}

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".json"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="btn-theme-secondary min-h-[40px] flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold"
            >
              <Upload className="w-4 h-4 text-theme-text-secondary" />
              <span>Import</span>
            </button>

            {onOpenAiArmyCreator && (
              <button
                type="button"
                onClick={onOpenAiArmyCreator}
                className="min-h-[40px] flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold tracking-wide bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white shadow-md shadow-sky-950/50 transition-all active:scale-[0.98]"
              >
                <Sparkles className="w-4 h-4" />
                <span>Create with AI</span>
              </button>
            )}

            <button
              onClick={onCreateNew}
              className="btn-theme-primary min-h-[40px] flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm tracking-wide"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>New Army</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-3 sm:p-6">
        
        {rosters.length === 0 ? (
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
                onClick={() => fileInputRef.current?.click()}
                className="btn-theme-secondary flex-1 min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold"
              >
                <Upload className="w-4 h-4 text-theme-text-secondary" />
                <span>Import JSON</span>
              </button>
            </div>
          </div>
        ) : (
          /* Roster Grid */
          <div className="panel-theme-section">
            <div className="flex items-center justify-between mb-3.5">
              <div>
                <h2 className="font-warhammer text-base sm:text-lg font-bold text-theme-text">
                  Command Roster ({rosters.length})
                </h2>
                <p className="text-xs text-theme-text-secondary">
                  Select a force to edit, duplicate, or export.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {rosters.map((roster) => {
                const validation = validateClientRoster(roster);
                return (
                  <div
                    key={roster.id}
                    onClick={() => onSelectRoster(roster)}
                    className="card-theme-item p-4 sm:p-5 cursor-pointer flex flex-col justify-between active:scale-[0.995] group"
                  >
                    <div>
                      {/* Top Row: Points & Legality */}
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <div className="flex items-center gap-1.5 font-mono">
                          <span className="text-base sm:text-lg font-bold text-theme-text">
                            {validation.totalPoints}
                          </span>
                          <span className="text-xs sm:text-sm text-theme-text-secondary font-medium">
                            / {validation.pointsLimit} pts
                          </span>
                          {roster.includeLegends && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-theme-elevated text-theme-text-secondary border border-theme-border font-mono ml-1">
                              LEGENDS
                            </span>
                          )}
                        </div>

                        <div className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg border ${
                          validation.isValid
                            ? 'bg-emerald-950/50 text-emerald-300 border-emerald-700/40'
                            : 'bg-red-950/60 text-red-300 border-red-700/50'
                        }`}>
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
                        </div>
                      </div>

                      {/* Army Title & Faction */}
                      <h3 className="font-warhammer text-base sm:text-lg font-bold text-theme-text group-hover:text-theme-accent-soft transition-colors mb-0.5 tracking-wide truncate">
                        {roster.name}
                      </h3>
                      <p className="text-xs sm:text-sm text-theme-text-secondary font-medium truncate">
                        {roster.factionName}
                        {roster.subFactionName ? ` • ${roster.subFactionName}` : ''}
                      </p>
                    </div>

                    {/* Footer: Units Count & Actions */}
                    <div className="pt-3 border-t border-theme-border-subtle flex items-center justify-between text-xs text-theme-text-secondary mt-3.5">
                      <span className="text-xs font-semibold text-theme-text-muted font-mono">
                        {roster.units.length} {roster.units.length === 1 ? 'Unit' : 'Units'}
                      </span>

                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => onDuplicateRoster(roster.id)}
                          className="btn-theme-icon min-w-[34px] min-h-[34px] rounded-lg"
                          title="Duplicate Roster"
                          aria-label="Duplicate Roster"
                        >
                          <Copy className="w-3.5 h-3.5 stroke-[2]" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete '${roster.name}'?`)) onDeleteRoster(roster.id);
                          }}
                          className="btn-theme-danger-icon min-w-[34px] min-h-[34px] rounded-lg"
                          title="Delete Roster"
                          aria-label="Delete Roster"
                        >
                          <Trash2 className="w-3.5 h-3.5 stroke-[2]" />
                        </button>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-theme-border-subtle px-6 py-4 text-center text-xs text-theme-text-muted">
        Warhammer 40,000 11th Edition Army Builder • Verified with BSData wh40k-11e
      </footer>
    </div>
  );
};
