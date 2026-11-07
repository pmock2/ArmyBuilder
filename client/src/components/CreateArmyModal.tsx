import React, { useState, useEffect } from 'react';
import { X, Shield, Swords, Sparkles, Check } from 'lucide-react';
import { BattleSize, ArmyRoster } from '../types/roster';
import { FactionSummary } from '../types/faction';
import factionsIndexData from '../data/factions_index.json';

interface CreateArmyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (roster: ArmyRoster) => void;
}

export const CreateArmyModal: React.FC<CreateArmyModalProps> = ({ isOpen, onClose, onCreate }) => {
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
    const effectiveFaction = factions.find(f => f.id === effectiveFactionId) || currentFaction;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-grimdark-900 border border-grimdark-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-grimdark-800 bg-grimdark-950/60">
          <div className="flex items-center gap-2.5">
            <Swords className="w-5 h-5 text-amber-500" />
            <h2 className="font-warhammer text-lg font-bold text-amber-300 tracking-wide">
              Muster a New Army
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-grimdark-400 hover:text-white hover:bg-grimdark-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleCreate} className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          
          {/* Step 1: Army Name */}
          <div>
            <label className="block text-grimdark-300 font-semibold mb-2 uppercase tracking-wider text-[11px]">
              1. Army Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. 1st Company Strike Force"
              className="w-full px-4 py-2.5 rounded-lg bg-grimdark-950 border border-grimdark-700 text-grimdark-100 placeholder-grimdark-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-sm font-medium transition-all"
            />
          </div>

          {/* Step 2: Super-Faction Filter */}
          <div>
            <label className="block text-grimdark-300 font-semibold mb-2 uppercase tracking-wider text-[11px]">
              2. Allegiance / Super-Faction
            </label>
            <div className="grid grid-cols-4 gap-2">
              {['Imperium', 'Chaos', 'Xenos', 'Aeldari'].map((sf) => (
                <button
                  type="button"
                  key={sf}
                  onClick={() => setSelectedSuperFaction(sf)}
                  className={`py-2 px-3 rounded-lg border text-xs font-bold transition-all text-center ${
                    selectedSuperFaction.toLowerCase() === sf.toLowerCase()
                      ? 'bg-amber-600 text-black border-amber-500 shadow-md font-bold'
                      : 'bg-grimdark-950 text-grimdark-400 border-grimdark-800 hover:border-grimdark-600 hover:text-grimdark-200'
                  }`}
                >
                  {sf}
                </button>
              ))}
            </div>
          </div>

          {/* Step 3: Main Faction */}
          <div>
            <label className="block text-grimdark-300 font-semibold mb-2 uppercase tracking-wider text-[11px]">
              3. Primary Faction
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto p-1 bg-grimdark-950 rounded-lg border border-grimdark-800">
              {availableFactions.map((fac) => {
                const isSelected = selectedFactionId === fac.id;
                return (
                  <button
                    type="button"
                    key={fac.id}
                    onClick={() => handleFactionSelect(fac.id)}
                    className={`p-2.5 rounded-md border text-left transition-all flex items-center justify-between text-xs ${
                      isSelected
                        ? 'bg-amber-950/60 border-amber-500 text-amber-200 font-bold'
                        : 'bg-grimdark-900 border-grimdark-800 text-grimdark-300 hover:bg-grimdark-850 hover:text-white'
                    }`}
                  >
                    <span className="truncate">{fac.name}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 4: Sub-Faction / Chapter (if applicable) */}
          {subFactions.length > 0 && (
            <div className="p-4 rounded-xl bg-grimdark-950 border border-amber-600/30">
              <div className="flex items-center gap-1.5 mb-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <label className="text-amber-300 font-bold uppercase tracking-wider text-[11px]">
                  4. Select Chapter / Sub-Faction
                </label>
              </div>
              <p className="text-[11px] text-grimdark-400 mb-3">
                Unlocks Chapter-specific epic heroes, unique units, and chapter detachments (like Salamanders' Forgefather's Seekers).
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto">
                {subFactions.map((sub) => {
                  const isSelected = selectedSubFactionId === sub.id;
                  return (
                    <button
                      type="button"
                      key={sub.id}
                      onClick={() => setSelectedSubFactionId(sub.id)}
                      className={`p-2 rounded-md border text-left text-xs transition-all flex items-center justify-between ${
                        isSelected
                          ? 'bg-amber-600 text-black border-amber-500 font-bold shadow'
                          : 'bg-grimdark-900 border-grimdark-800 text-grimdark-300 hover:bg-grimdark-800 hover:text-white'
                      }`}
                    >
                      <span className="truncate">{sub.name}</span>
                      {isSelected && <Check className="w-3 h-3 text-black flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 5: Battle Size */}
          <div>
            <label className="block text-grimdark-300 font-semibold mb-2 uppercase tracking-wider text-[11px]">
              5. Battle Size
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                    className={`p-3 rounded-xl border text-left transition-all ${
                      isSelected
                        ? 'bg-amber-950/60 border-amber-500 shadow-md'
                        : 'bg-grimdark-950 border-grimdark-800 hover:border-grimdark-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`font-warhammer text-xs font-bold ${isSelected ? 'text-amber-300' : 'text-grimdark-200'}`}>
                        {bs.name}
                      </span>
                      {isSelected && <Shield className="w-3.5 h-3.5 text-amber-400" />}
                    </div>
                    <div className="font-mono text-amber-400 font-bold text-xs">
                      {bs.points} pts <span className="text-grimdark-500 font-normal">| {bs.dp} DP</span>
                    </div>
                    <div className="text-[10px] text-grimdark-400 mt-1">
                      {bs.desc}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-4 border-t border-grimdark-800 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-grimdark-800 hover:bg-grimdark-700 text-grimdark-300 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-black font-bold tracking-wide shadow-lg shadow-amber-900/20 transition-all active:scale-95"
            >
              Begin Mustering Force
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};

