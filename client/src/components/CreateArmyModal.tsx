import React, { useState, useEffect } from 'react';
import { X, Shield, Swords, Sparkles, Check } from 'lucide-react';
import { BattleSize, ArmyRoster } from '../types/roster';
import { FactionSummary } from '../types/faction';
import factionsIndexData from '../data/factions_index.json';

interface CreateArmyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (roster: ArmyRoster) => void;
  onOpenAiCreator?: () => void;
}

export const CreateArmyModal: React.FC<CreateArmyModalProps> = ({ isOpen, onClose, onCreate, onOpenAiCreator }) => {
  const [name, setName] = useState('New Strike Force');
  const [selectedSuperFaction, setSelectedSuperFaction] = useState('Imperium');
  const [selectedFactionId, setSelectedFactionId] = useState('');
  const [selectedSubFactionId, setSelectedSubFactionId] = useState('');
  const [battleSize, setBattleSize] = useState<BattleSize>('strike-force');

  const factions: FactionSummary[] = factionsIndexData as FactionSummary[];

  // Filter factions by superfaction (only main factions first)
  const availableFactions = factions.filter(
    f => f.superFaction.toLowerCase() === selectedSuperFaction.toLowerCase() && !f.isSubFaction
  );

  // Initialize selected faction when superfaction changes
  useEffect(() => {
    if (availableFactions.length > 0) {
      const defaultFac = availableFactions[0];
      setSelectedFactionId(defaultFac.id);
      if (defaultFac.subFactions && defaultFac.subFactions.length > 0) {
        setSelectedSubFactionId(defaultFac.subFactions[0].id);
      } else {
        setSelectedSubFactionId('');
      }
    }
  }, [selectedSuperFaction]);

  const currentFaction = factions.find(f => f.id === selectedFactionId);
  const subFactions = currentFaction?.subFactions || [];

  const handleFactionSelect = (facId: string) => {
    setSelectedFactionId(facId);
    const fac = factions.find(f => f.id === facId);
    if (fac && fac.subFactions && fac.subFactions.length > 0) {
      setSelectedSubFactionId(fac.subFactions[0].id);
    } else {
      setSelectedSubFactionId('');
    }
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    // If a subfaction is chosen (e.g. Salamanders), that is the effective faction catalogue!
    const effectiveFactionId = selectedSubFactionId || selectedFactionId;

    const newRoster: ArmyRoster = {
      id: `roster-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      name: name.trim(),
      factionId: effectiveFactionId,
      factionName: currentFaction?.name || 'Imperium',
      superFaction: currentFaction?.superFaction || 'Imperium',
      subFactionId: selectedSubFactionId || null,
      subFactionName: selectedSubFactionId ? factions.find(f => f.id === selectedSubFactionId)?.name || null : null,
      battleSize,
      detachments: [],
      units: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onCreate(newRoster);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-800 bg-slate-900/95">
          <div className="flex items-center gap-2.5">
            <Swords className="w-5 h-5 text-sky-400" />
            <h2 className="font-warhammer text-base sm:text-lg font-bold text-slate-100 tracking-wide">
              Muster a New Army
            </h2>
          </div>
          <button
            onClick={onClose}
            className="btn-theme-icon min-w-[38px] min-h-[38px] rounded-xl"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4 stroke-[2]" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleCreate} className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 text-xs sm:text-sm">
          
          {onOpenAiCreator && (
            <div className="p-3 rounded-xl bg-gradient-to-r from-sky-950/70 via-indigo-950/60 to-purple-950/60 border border-sky-500/40 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-sky-400 flex-shrink-0" />
                <span className="text-xs text-slate-200 font-medium">
                  Have a specific army concept in mind? Let the AI build it from your prompt.
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAiCreator();
                }}
                className="px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs flex-shrink-0 transition-colors shadow-sm"
              >
                AI Prompt
              </button>
            </div>
          )}

          {/* Step 1: Army Name */}
          <div>
            <label className="block text-slate-300 font-semibold mb-2 uppercase tracking-wider text-xs">
              1. Army Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. 1st Company Strike Force"
              className="w-full min-h-[46px] px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 text-base sm:text-sm font-medium transition-all"
            />
          </div>

          {/* Step 2: Super-Faction Filter */}
          <div>
            <label className="block text-slate-300 font-semibold mb-2 uppercase tracking-wider text-xs">
              2. Allegiance / Super-Faction
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {['Imperium', 'Chaos', 'Xenos', 'Aeldari'].map((sf) => (
                <button
                  type="button"
                  key={sf}
                  onClick={() => setSelectedSuperFaction(sf)}
                  className={`min-h-[44px] py-2 px-3 rounded-xl border text-xs sm:text-sm font-semibold transition-all text-center active:scale-95 ${
                    selectedSuperFaction.toLowerCase() === sf.toLowerCase()
                      ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                      : 'bg-slate-850 text-slate-300 border-slate-750 hover:border-slate-600 hover:text-white'
                  }`}
                >
                  {sf}
                </button>
              ))}
            </div>
          </div>

          {/* Step 3: Main Faction */}
          <div>
            <label className="block text-slate-300 font-semibold mb-2 uppercase tracking-wider text-xs">
              3. Primary Faction
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1.5 bg-slate-950 rounded-xl border border-slate-750">
              {availableFactions.map((fac) => {
                const isSelected = selectedFactionId === fac.id;
                return (
                  <button
                    type="button"
                    key={fac.id}
                    onClick={() => handleFactionSelect(fac.id)}
                    className={`min-h-[46px] p-3 rounded-lg border text-left transition-all flex items-center justify-between text-xs sm:text-sm active:scale-95 ${
                      isSelected
                        ? 'bg-sky-950/80 border-sky-600 text-sky-200 font-semibold'
                        : 'bg-slate-850 border-slate-750 text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <span className="truncate">{fac.name}</span>
                    {isSelected && <Check className="w-4 h-4 text-sky-400 flex-shrink-0 ml-1.5" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 4: Sub-Faction / Chapter (if applicable) */}
          {subFactions.length > 0 && (
            <div className="p-4 rounded-xl bg-slate-850 border border-slate-700">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Sparkles className="w-4 h-4 text-sky-400" />
                <label className="text-sky-300 font-semibold uppercase tracking-wider text-xs">
                  4. Select Chapter / Sub-Faction
                </label>
              </div>
              <p className="text-xs text-slate-400 mb-3">
                Unlocks Chapter-specific heroes, unique units, and chapter detachments (like Salamanders' Forgefather's Seekers).
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                {subFactions.map((sub) => {
                  const isSelected = selectedSubFactionId === sub.id;
                  return (
                    <button
                      type="button"
                      key={sub.id}
                      onClick={() => setSelectedSubFactionId(sub.id)}
                      className={`min-h-[44px] p-2.5 rounded-lg border text-left text-xs sm:text-sm transition-all flex items-center justify-between active:scale-95 ${
                        isSelected
                          ? 'bg-blue-600 text-white border-blue-500 font-semibold shadow-sm'
                          : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750 hover:text-white'
                      }`}
                    >
                      <span className="truncate">{sub.name}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-white flex-shrink-0 ml-1.5" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 5: Battle Size */}
          <div>
            <label className="block text-slate-300 font-semibold mb-2 uppercase tracking-wider text-xs">
              5. Battle Size
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {[
                { id: 'incursion', name: 'Incursion', points: 1000, dp: 2, desc: 'Quick patrol & skirmish' },
                { id: 'strike-force', name: 'Strike Force', points: 2000, dp: 3, desc: 'Standard tournament size' },
                { id: 'onslaught', name: 'Onslaught', points: 3000, dp: 4, desc: 'Massive battle array' }
              ].map((bs) => {
                const isSelected = battleSize === bs.id;
                return (
                  <button
                    type="button"
                    key={bs.id}
                    onClick={() => setBattleSize(bs.id as BattleSize)}
                    className={`min-h-[70px] p-3.5 rounded-xl border text-left transition-all active:scale-95 ${
                      isSelected
                        ? 'bg-sky-950/70 border-sky-600 shadow-sm ring-1 ring-sky-500/50'
                        : 'bg-slate-850 border-slate-750 hover:border-slate-650'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`font-warhammer text-xs sm:text-sm font-semibold ${isSelected ? 'text-sky-300' : 'text-slate-200'}`}>
                        {bs.name}
                      </span>
                      {isSelected && <Shield className="w-4 h-4 text-sky-400" />}
                    </div>
                    <div className="font-mono text-sky-400 font-bold text-xs sm:text-sm">
                      {bs.points} pts <span className="text-slate-400 font-normal">| {bs.dp} DP</span>
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      {bs.desc}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="btn-theme-secondary min-h-[42px] px-5 rounded-xl text-xs sm:text-sm font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-theme-primary min-h-[42px] px-6 rounded-xl text-xs sm:text-sm tracking-wide"
            >
              Begin Mustering Force
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
