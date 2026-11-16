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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-theme-surface border border-theme-border w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-theme-border-subtle bg-theme-card">
          <div className="flex items-center gap-2.5">
            <Swords className="w-5 h-5 text-theme-accent-soft" />
            <h2 className="font-warhammer text-base sm:text-lg font-bold text-theme-text tracking-wide">
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
            <div className="p-3 rounded-xl bg-theme-accent/15 border border-theme-accent/40 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-theme-accent-soft flex-shrink-0" />
                <span className="text-xs text-theme-text font-medium">
                  Have a specific army concept in mind? Let the AI build it from your prompt.
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAiCreator();
                }}
                className="btn-theme-primary px-3 py-1.5 rounded-lg text-xs flex-shrink-0"
              >
                AI Prompt
              </button>
            </div>
          )}

          {/* Step 1: Army Name */}
          <div>
            <label className="block text-theme-text-secondary font-semibold mb-2 uppercase tracking-wider text-xs">
              1. Army Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. 1st Company Strike Force"
              className="w-full min-h-[46px] px-4 py-2.5 rounded-xl bg-theme-bg border border-theme-border text-theme-text placeholder-theme-text-muted focus:outline-none focus:border-theme-accent text-base sm:text-sm font-medium transition-all"
            />
          </div>

          {/* Step 2: Super-Faction Filter */}
          <div>
            <label className="block text-theme-text-secondary font-semibold mb-2 uppercase tracking-wider text-xs">
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
                      ? 'bg-theme-accent text-white border-theme-accent shadow-sm'
                      : 'bg-theme-card text-theme-text-secondary border-theme-border-subtle hover:border-theme-accent/60 hover:text-theme-text'
                  }`}
                >
                  {sf}
                </button>
              ))}
            </div>
          </div>

          {/* Step 3: Main Faction */}
          <div>
            <label className="block text-theme-text-secondary font-semibold mb-2 uppercase tracking-wider text-xs">
              3. Primary Faction
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1.5 bg-theme-bg rounded-xl border border-theme-border-subtle">
              {availableFactions.map((fac) => {
                const isSelected = selectedFactionId === fac.id;
                return (
                  <button
                    type="button"
                    key={fac.id}
                    onClick={() => handleFactionSelect(fac.id)}
                    className={`min-h-[46px] p-3 rounded-lg border text-left transition-all flex items-center justify-between text-xs sm:text-sm active:scale-95 ${
                      isSelected
                        ? 'bg-theme-accent/20 border-theme-accent text-theme-accent-soft font-semibold'
                        : 'bg-theme-card border-theme-border-subtle text-theme-text-secondary hover:bg-theme-elevated hover:text-theme-text'
                    }`}
                  >
                    <span className="truncate">{fac.name}</span>
                    {isSelected && <Check className="w-4 h-4 text-theme-accent-soft flex-shrink-0 ml-1.5" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 4: Sub-Faction / Chapter (if applicable) */}
          {subFactions.length > 0 && (
            <div className="p-4 rounded-xl bg-theme-card border border-theme-border">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Sparkles className="w-4 h-4 text-theme-accent-soft" />
                <label className="text-theme-accent-soft font-semibold uppercase tracking-wider text-xs">
                  4. Select Chapter / Sub-Faction
                </label>
              </div>
              <p className="text-xs text-theme-text-muted mb-3">
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
                          ? 'bg-theme-accent text-white border-theme-accent font-semibold shadow-sm'
                          : 'bg-theme-elevated border-theme-border text-theme-text-secondary hover:border-theme-accent/60 hover:text-theme-text'
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
            <label className="block text-theme-text-secondary font-semibold mb-2 uppercase tracking-wider text-xs">
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
                        ? 'bg-theme-accent/20 border-theme-accent shadow-sm ring-1 ring-theme-accent/50'
                        : 'bg-theme-card border-theme-border-subtle hover:border-theme-border'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`font-warhammer text-xs sm:text-sm font-semibold ${isSelected ? 'text-theme-accent-soft' : 'text-theme-text'}`}>
                        {bs.name}
                      </span>
                      {isSelected && <Shield className="w-4 h-4 text-theme-accent-soft" />}
                    </div>
                    <div className="font-mono text-theme-accent-soft font-bold text-xs sm:text-sm">
                      {bs.points} pts <span className="text-theme-text-muted font-normal">| {bs.dp} DP</span>
                    </div>
                    <div className="text-xs text-theme-text-muted mt-1">
                      {bs.desc}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="pt-4 border-t border-theme-border-subtle flex items-center justify-end gap-3">
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

export default CreateArmyModal;

