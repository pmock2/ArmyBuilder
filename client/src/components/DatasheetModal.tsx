import React from 'react';
import { X, Shield, Swords, Crosshair, Sparkles, Tag, Users } from 'lucide-react';
import { Datasheet, SelectedUnit } from '../types/roster';
import { KeywordTooltip } from './KeywordTooltip';

interface DatasheetModalProps {
  unit: Datasheet | null;
  selectedUnit?: SelectedUnit | null;
  isOpen: boolean;
  onClose: () => void;
}

export const DatasheetModal: React.FC<DatasheetModalProps> = ({
  unit,
  selectedUnit,
  isOpen,
  onClose
}) => {
  if (!isOpen || !unit) return null;

  const currentModelsCount = selectedUnit?.modelsCount || unit.minModels || 1;

  // Format keyword pills inside text or lists
  const renderKeywordsWithTooltips = (keywordsStr: string) => {
    if (!keywordsStr) return null;
    const parts = keywordsStr.split(/,\s*/);
    return (
      <div className="flex flex-wrap gap-1 mt-1">
        {parts.map((kw, i) => (
          <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-grimdark-800 text-amber-300/90 border border-amber-700/30">
            <KeywordTooltip keyword={kw}>{kw}</KeywordTooltip>
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-grimdark-900 border border-grimdark-700 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header Banner */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-grimdark-800 bg-grimdark-950/90">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-600/30">
                {unit.primaryCategory}
              </span>
              {unit.stats.Base && (
                <span className="text-[10px] font-mono text-grimdark-400">
                  Base: {unit.stats.Base}
                </span>
              )}
            </div>
            <h2 className="font-warhammer text-xl font-bold text-amber-300 mt-1">
              {unit.name}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="font-mono text-amber-400 font-bold text-base">
                {selectedUnit ? selectedUnit.cost : unit.baseCost} pts
              </div>
              <div className="text-[11px] text-grimdark-400">
                {currentModelsCount} {currentModelsCount === 1 ? 'Model' : 'Models'}
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-grimdark-400 hover:text-white hover:bg-grimdark-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs flex-1">
          
          {/* Unit Makeup & Attachment Status */}
          <div className="p-3.5 rounded-xl bg-grimdark-950 border border-grimdark-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-400" />
              <span className="text-grimdark-300">Squad Makeup:</span>
              <span className="font-medium text-amber-200">
                {currentModelsCount}x {unit.stats.name || unit.name}
              </span>
            </div>

            {selectedUnit && (
              <div className="flex items-center gap-2">
                {selectedUnit.isWarlord && (
                  <span className="badge-gold text-[10px] px-2 py-0.5 rounded font-bold">
                    ★ Warlord
                  </span>
                )}
                {selectedUnit.enhancement && (
                  <span className="badge-gold text-[10px] px-2 py-0.5 rounded">
                    Enhancement: {selectedUnit.enhancement.name} (+{selectedUnit.enhancement.pts} pts)
                  </span>
                )}
              </div>
            )}
          </div>

          {/* 1. Model Stat Profile Table */}
          <div>
            <h3 className="font-warhammer text-xs font-bold uppercase tracking-wider text-amber-400 mb-2.5 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-amber-500" />
              <span>Model Profiles</span>
            </h3>

            <div className="overflow-x-auto rounded-xl border border-grimdark-800 bg-grimdark-950">
              <table className="w-full text-center text-xs font-mono">
                <thead>
                  <tr className="border-b border-grimdark-800 bg-grimdark-900/80 text-grimdark-400 font-sans text-[11px] uppercase tracking-wider">
                    <th className="py-2.5 px-4 text-left font-semibold">Model</th>
                    <th className="py-2.5 px-3">M</th>
                    <th className="py-2.5 px-3">T</th>
                    <th className="py-2.5 px-3">SV</th>
                    <th className="py-2.5 px-3">W</th>
                    <th className="py-2.5 px-3">LD</th>
                    <th className="py-2.5 px-3">OC</th>
                    <th className="py-2.5 px-3 text-amber-400">INSV</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-grimdark-800/60 font-bold">
                  <tr className="hover:bg-grimdark-900/40">
                    <td className="py-2.5 px-4 text-left font-sans text-amber-200">
                      x{currentModelsCount} {unit.stats.name || unit.name}
                    </td>
                    <td className="py-2.5 px-3 text-grimdark-200">{unit.stats.M}</td>
                    <td className="py-2.5 px-3 text-grimdark-200">{unit.stats.T}</td>
                    <td className="py-2.5 px-3 text-grimdark-200">{unit.stats.Sv}</td>
                    <td className="py-2.5 px-3 text-amber-300">{unit.stats.W}</td>
                    <td className="py-2.5 px-3 text-grimdark-200">{unit.stats.Ld}</td>
                    <td className="py-2.5 px-3 text-amber-300">{unit.stats.OC}</td>
                    <td className="py-2.5 px-3 text-amber-400">
                      {unit.stats.InSv ? unit.stats.InSv : '—'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* 2. Ranged Weapons Table */}
          <div>
            <h3 className="font-warhammer text-xs font-bold uppercase tracking-wider text-amber-400 mb-2.5 flex items-center gap-1.5">
              <Crosshair className="w-3.5 h-3.5 text-amber-500" />
              <span>Ranged Weapons</span>
            </h3>

            {unit.rangedWeapons.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-grimdark-800 bg-grimdark-950">
                <table className="w-full text-center text-xs">
                  <thead>
                    <tr className="border-b border-grimdark-800 bg-grimdark-900/80 text-grimdark-400 font-sans text-[11px] uppercase tracking-wider font-semibold">
                      <th className="py-2.5 px-4 text-left">Weapon</th>
                      <th className="py-2.5 px-3 font-mono">Range</th>
                      <th className="py-2.5 px-3 font-mono">A</th>
                      <th className="py-2.5 px-3 font-mono">BS</th>
                      <th className="py-2.5 px-3 font-mono">S</th>
                      <th className="py-2.5 px-3 font-mono">AP</th>
                      <th className="py-2.5 px-3 font-mono">D</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-grimdark-800/60 font-mono">
                    {unit.rangedWeapons.map((w, idx) => (
                      <React.Fragment key={idx}>
                        <tr className="hover:bg-grimdark-900/40">
                          <td className="py-2.5 px-4 text-left font-sans font-bold text-amber-200">
                            {w.name}
                          </td>
                          <td className="py-2.5 px-3 text-grimdark-300">{w.range}</td>
                          <td className="py-2.5 px-3 text-grimdark-300">{w.A}</td>
                          <td className="py-2.5 px-3 text-grimdark-200 font-bold">{w.BS || '3+'}</td>
                          <td className="py-2.5 px-3 text-amber-300 font-bold">{w.S}</td>
                          <td className="py-2.5 px-3 text-grimdark-300">{w.AP}</td>
                          <td className="py-2.5 px-3 text-amber-300 font-bold">{w.D}</td>
                        </tr>
                        {w.keywords && (
                          <tr className="bg-grimdark-950/60">
                            <td colSpan={7} className="px-4 pb-2 pt-0 text-left font-sans">
                              {renderKeywordsWithTooltips(w.keywords)}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-grimdark-500 italic p-2 bg-grimdark-950 rounded-lg border border-grimdark-800">
                This unit has no ranged weapons.
              </p>
            )}
          </div>

          {/* 3. Melee Weapons Table */}
          <div>
            <h3 className="font-warhammer text-xs font-bold uppercase tracking-wider text-amber-400 mb-2.5 flex items-center gap-1.5">
              <Swords className="w-3.5 h-3.5 text-amber-500" />
              <span>Melee Weapons</span>
            </h3>

            {unit.meleeWeapons.length > 0 ? (
              <div className="overflow-x-auto rounded-xl border border-grimdark-800 bg-grimdark-950">
                <table className="w-full text-center text-xs">
                  <thead>
                    <tr className="border-b border-grimdark-800 bg-grimdark-900/80 text-grimdark-400 font-sans text-[11px] uppercase tracking-wider font-semibold">
                      <th className="py-2.5 px-4 text-left">Weapon</th>
                      <th className="py-2.5 px-3 font-mono">Range</th>
                      <th className="py-2.5 px-3 font-mono">A</th>
                      <th className="py-2.5 px-3 font-mono">WS</th>
                      <th className="py-2.5 px-3 font-mono">S</th>
                      <th className="py-2.5 px-3 font-mono">AP</th>
                      <th className="py-2.5 px-3 font-mono">D</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-grimdark-800/60 font-mono">
                    {unit.meleeWeapons.map((w, idx) => (
                      <React.Fragment key={idx}>
                        <tr className="hover:bg-grimdark-900/40">
                          <td className="py-2.5 px-4 text-left font-sans font-bold text-amber-200">
                            {w.name}
                          </td>
                          <td className="py-2.5 px-3 text-grimdark-400">Melee</td>
                          <td className="py-2.5 px-3 text-grimdark-300">{w.A}</td>
                          <td className="py-2.5 px-3 text-grimdark-200 font-bold">{w.WS || '3+'}</td>
                          <td className="py-2.5 px-3 text-amber-300 font-bold">{w.S}</td>
                          <td className="py-2.5 px-3 text-grimdark-300">{w.AP}</td>
                          <td className="py-2.5 px-3 text-amber-300 font-bold">{w.D}</td>
                        </tr>
                        {w.keywords && (
                          <tr className="bg-grimdark-950/60">
                            <td colSpan={7} className="px-4 pb-2 pt-0 text-left font-sans">
                              {renderKeywordsWithTooltips(w.keywords)}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-grimdark-500 italic p-2 bg-grimdark-950 rounded-lg border border-grimdark-800">
                This unit has no melee weapons.
              </p>
            )}
          </div>

          {/* 4. Abilities */}
          <div>
            <h3 className="font-warhammer text-xs font-bold uppercase tracking-wider text-amber-400 mb-2.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Abilities</span>
            </h3>

            {unit.abilities.length > 0 ? (
              <div className="space-y-3">
                {unit.abilities.map((ab, idx) => (
                  <div key={idx} className="p-3.5 rounded-xl bg-grimdark-950 border border-grimdark-800">
                    <h4 className="font-warhammer font-bold text-amber-300 text-xs mb-1">
                      {ab.name}
                    </h4>
                    <p className="text-grimdark-300 whitespace-pre-line leading-relaxed text-xs">
                      {ab.description}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-grimdark-500 italic">No special abilities listed.</p>
            )}
          </div>

          {/* 5. Leader Attachment Eligibility */}
          {unit.isLeader && unit.canLead.length > 0 && (
            <div className="p-3.5 rounded-xl bg-grimdark-950 border border-amber-600/30">
              <h4 className="font-warhammer font-bold text-amber-400 text-xs mb-1.5">
                Eligible Bodyguard Units
              </h4>
              <p className="text-[11px] text-grimdark-400 mb-2">
                This Leader can attach to any of the following units to form an Attached Unit (1 Leader + 1 Support max):
              </p>
              <div className="flex flex-wrap gap-1.5">
                {unit.canLead.map((target, i) => (
                  <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-grimdark-900 border border-grimdark-700 text-amber-200">
                    {target}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 6. Keywords & Categories */}
          <div>
            <h3 className="font-warhammer text-xs font-bold uppercase tracking-wider text-amber-400 mb-2.5 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-amber-500" />
              <span>Keywords & Faction Tags</span>
            </h3>

            <div className="flex flex-wrap gap-1.5">
              {unit.categories.map((cat, i) => (
                <span
                  key={i}
                  className={`text-[10px] px-2 py-0.5 rounded border ${
                    cat.startsWith('Faction:')
                      ? 'bg-amber-950/60 text-amber-300 border-amber-700/50 font-bold'
                      : 'bg-grimdark-950 text-grimdark-300 border-grimdark-800'
                  }`}
                >
                  <KeywordTooltip keyword={cat}>{cat}</KeywordTooltip>
                </span>
              ))}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-grimdark-800 bg-grimdark-950/80 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-grimdark-800 hover:bg-grimdark-700 text-grimdark-200 hover:text-white text-xs font-medium transition-colors"
          >
            Close Datasheet
          </button>
        </div>

      </div>
    </div>
  );
};

