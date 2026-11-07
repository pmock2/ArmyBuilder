import React, { useRef } from 'react';
import { Plus, Upload, Download, Trash2, Copy, Edit3, Shield, CheckCircle2, AlertTriangle, Skull } from 'lucide-react';
import { ArmyRoster } from '../types/roster';
import { exportRosterJSON, parseRosterJSON } from '../utils/storage';
import { validateClientRoster } from '../utils/validator';

interface LandingPageProps {
  rosters: ArmyRoster[];
  onCreateNew: () => void;
  onSelectRoster: (roster: ArmyRoster) => void;
  onDuplicateRoster: (rosterId: string) => void;
  onDeleteRoster: (rosterId: string) => void;
  onImportRoster: (roster: ArmyRoster) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  rosters,
  onCreateNew,
  onSelectRoster,
  onDuplicateRoster,
  onDeleteRoster,
  onImportRoster
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
    <div className="min-h-screen bg-grimdark-950 flex flex-col">
      {/* Top Banner */}
      <header className="border-b border-grimdark-800 bg-grimdark-900/60 backdrop-blur-sm px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-600/20 border border-amber-500/40 flex items-center justify-center">
              <Skull className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h1 className="font-warhammer text-xl sm:text-2xl font-bold tracking-wider text-amber-300">
                WARHAMMER 40,000
              </h1>
              <p className="text-xs text-grimdark-400 tracking-wide font-medium">
                11TH EDITION ARMY ROSTER BUILDER
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".json"
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-grimdark-800 hover:bg-grimdark-700 text-grimdark-300 hover:text-white border border-grimdark-700 transition-colors text-xs font-medium"
            >
              <Upload className="w-4 h-4 text-amber-400" />
              <span>Import (.json)</span>
            </button>

            <button
              onClick={onCreateNew}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-black font-semibold text-xs tracking-wide shadow-lg shadow-amber-900/20 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>New Army</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-6 sm:p-8">
        
        {rosters.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-20 text-center max-w-md mx-auto">
            <div className="w-20 h-20 rounded-2xl bg-grimdark-900 border border-grimdark-800 flex items-center justify-center mb-6 shadow-2xl">
              <Shield className="w-10 h-10 text-amber-500/60" />
            </div>
            <h2 className="font-warhammer text-xl font-bold text-amber-200 mb-2">
              No Armies Mustered Yet
            </h2>
            <p className="text-sm text-grimdark-400 mb-8 leading-relaxed">
              Assemble your battle-forged detachment, equip your warlord with relics, and validate your army roster according to the official 11th Edition Core Rules.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <button
                onClick={onCreateNew}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-amber-600 hover:bg-amber-500 text-black font-bold text-sm tracking-wide shadow-xl transition-all active:scale-95"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Create Your First Army</span>
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-grimdark-800 hover:bg-grimdark-700 text-grimdark-200 border border-grimdark-700 text-sm font-medium transition-colors"
              >
                <Upload className="w-4 h-4" />
                <span>Import JSON</span>
              </button>
            </div>
          </div>
        ) : (
          /* Roster Grid */
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-warhammer text-lg font-bold text-grimdark-100">
                  Command Roster ({rosters.length})
                </h2>
                <p className="text-xs text-grimdark-400">
                  Select a force to edit, duplicate, or export.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {rosters.map((roster) => {
                const validation = validateClientRoster(roster);
                return (
                  <div
                    key={roster.id}
                    onClick={() => onSelectRoster(roster)}
                    className="group bg-grimdark-900/90 hover:bg-grimdark-850 border border-grimdark-800 hover:border-amber-600/50 rounded-xl p-5 cursor-pointer transition-all duration-200 shadow-lg hover:shadow-amber-950/20 flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Row: Faction Pill & Validation */}
                      <div className="flex items-center justify-between gap-2 mb-3">
                        <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-950/50 text-amber-400 border border-amber-700/40">
                          {roster.superFaction}
                        </span>

                        <div className={`flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded border ${
                          validation.isValid
                            ? 'bg-emerald-950/50 text-emerald-300 border-emerald-700/40'
                            : 'bg-red-950/50 text-red-400 border-red-700/40'
                        }`}>
                          {validation.isValid ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              <span>Legal</span>
                            </>
                          ) : (
                            <>
                              <AlertTriangle className="w-3 h-3 text-red-400" />
                              <span>{validation.errorsCount} {validation.errorsCount === 1 ? 'Error' : 'Errors'}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Army Title & Faction */}
                      <h3 className="font-warhammer text-base font-bold text-amber-200 group-hover:text-amber-300 transition-colors mb-1 truncate">
                        {roster.name}
                      </h3>
                      <p className="text-xs text-grimdark-300 mb-4 font-medium truncate">
                        {roster.factionName}
                        {roster.subFactionName ? ` • ${roster.subFactionName}` : ''}
                      </p>

                      {/* Stat Breakdown */}
                      <div className="grid grid-cols-3 gap-2 py-2.5 px-3 bg-grimdark-950/80 rounded-lg border border-grimdark-800/80 text-xs font-mono mb-4">
                        <div>
                          <div className="text-[10px] text-grimdark-500 font-sans">POINTS</div>
                          <div className="font-bold text-amber-400">
                            {validation.totalPoints} <span className="text-grimdark-600">/ {validation.pointsLimit}</span>
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-grimdark-500 font-sans">DETACH.</div>
                          <div className="font-bold text-grimdark-300">
                            {validation.totalDP} <span className="text-grimdark-600">/ {validation.dpLimit} DP</span>
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-grimdark-500 font-sans">UNITS</div>
                          <div className="font-bold text-grimdark-300">
                            {roster.units.length}
                          </div>
                        </div>
                      </div>

                      {/* Detachments preview */}
                      <div className="text-xs text-grimdark-400 line-clamp-1 mb-2">
                        <span className="text-grimdark-500">Detachment: </span>
                        <span className="text-grimdark-200 font-medium">
                          {roster.detachments.length > 0 ? roster.detachments.map(d => d.name).join(', ') : 'None selected'}
                        </span>
                      </div>
                    </div>

                    {/* Card Actions Footer */}
                    <div className="pt-3 border-t border-grimdark-800/80 flex items-center justify-between text-xs text-grimdark-400">
                      <span className="text-[10px] text-grimdark-500">
                        {roster.battleSize.toUpperCase()}
                      </span>

                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => onSelectRoster(roster)}
                          className="p-1.5 rounded hover:bg-grimdark-700 text-grimdark-300 hover:text-white transition-colors"
                          title="Edit Roster"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDuplicateRoster(roster.id)}
                          className="p-1.5 rounded hover:bg-grimdark-700 text-grimdark-300 hover:text-white transition-colors"
                          title="Duplicate Roster"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => exportRosterJSON(roster)}
                          className="p-1.5 rounded hover:bg-grimdark-700 text-grimdark-300 hover:text-white transition-colors"
                          title="Export JSON"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Delete '${roster.name}'?`)) onDeleteRoster(roster.id);
                          }}
                          className="p-1.5 rounded hover:bg-red-950/60 text-grimdark-400 hover:text-red-400 transition-colors"
                          title="Delete Roster"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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
      <footer className="border-t border-grimdark-800/60 px-6 py-4 text-center text-xs text-grimdark-500">
        Warhammer 40,000 11th Edition Army Builder • Verified with BSData wh40k-11e
      </footer>
    </div>
  );
};

