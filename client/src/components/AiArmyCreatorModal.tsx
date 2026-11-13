import React, { useState, useEffect } from 'react';
import { X, Sparkles, Wand2, Loader2, Key, AlertCircle, ArrowRight, Dices, Package } from 'lucide-react';
import { BattleSize, ArmyRoster } from '../types/roster';
import { FactionSummary, FactionDetail } from '../types/faction';
import { hasApiKey } from '../services/geminiService';
import { identifyTargetFaction, generateRosterPlan, buildRosterFromPlan, generateAiPromptIdea } from '../services/aiRosterBuilder';
import { hasAnyOwnedModels, getTotalOwnedModelsCount, loadAllOwnedModels } from '../utils/ownedModelsStorage';
import { startVoxTransmission } from '../utils/haptics';
import factionsIndexData from '../data/factions_index.json';

interface AiArmyCreatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
  onCreateRoster: (roster: ArmyRoster) => void;
}

export const AiArmyCreatorModal: React.FC<AiArmyCreatorModalProps> = ({
  isOpen,
  onClose,
  onOpenSettings,
  onCreateRoster
}) => {
  const [prompt, setPrompt] = useState('');
  const [preferredBattleSize, setPreferredBattleSize] = useState<BattleSize | 'auto'>('auto');
  const [onlyOwnedModels, setOnlyOwnedModels] = useState<boolean>(() => hasAnyOwnedModels());
  const [ownedSummary, setOwnedSummary] = useState<{ models: number; units: number }>({ models: 0, units: 0 });
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingIdea, setIsGeneratingIdea] = useState(false);
  const [statusStep, setStatusStep] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const all = loadAllOwnedModels();
    const models = getTotalOwnedModelsCount(all);
    const units = Object.values(all).reduce((acc, inv) => acc + inv.units.length, 0);
    setOwnedSummary({ models, units });
    setOnlyOwnedModels(models > 0);
  }, [isOpen]);

  if (!isOpen) return null;

  const keyConfigured = hasApiKey();

  const handleGenerateIdea = async () => {
    if (!keyConfigured) {
      onOpenSettings();
      return;
    }
    setIsGeneratingIdea(true);
    try {
      const idea = await generateAiPromptIdea();
      setPrompt(idea);
    } catch (err: any) {
      setPrompt('Build a 2k competitive Salamanders Army');
    } finally {
      setIsGeneratingIdea(false);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isGenerating) return;

    if (!keyConfigured) {
      onOpenSettings();
      return;
    }

    setIsGenerating(true);
    setErrorMessage(null);
    setStatusStep('Analyzing prompt and identifying faction...');
    const stopVox = startVoxTransmission();

    try {
      // 1. Identify target faction ID
      const factionId = await identifyTargetFaction(prompt.trim());
      setStatusStep(`Loading ${factionId} datasheets and detachment rules...`);

      // 2. Fetch the faction catalogue
      const res = await fetch(`${import.meta.env.BASE_URL}data/factions/${factionId}.json`);
      if (!res.ok) {
        throw new Error(`Failed to load faction catalogue for "${factionId}".`);
      }
      const factionData: FactionDetail = await res.json();

      // 3. Generate Roster Plan with Gemini
      setStatusStep(`Consulting 11th edition rules & building competitive roster...`);
      const battleSizeParam = preferredBattleSize === 'auto' ? undefined : preferredBattleSize;
      const plan = await generateRosterPlan(prompt.trim(), factionData, battleSizeParam, onlyOwnedModels);

      // 4. Hydrate into full ArmyRoster
      setStatusStep('Finalizing leader attachments, model thresholds & Warlord...');
      const factions = factionsIndexData as FactionSummary[];
      const roster = buildRosterFromPlan(plan, factionData, factions, onlyOwnedModels);

      setIsGenerating(false);
      onCreateRoster(roster);
      onClose();
    } catch (err: any) {
      console.error('AI Roster generation error:', err);
      setIsGenerating(false);
      setErrorMessage(err.message || 'An error occurred during army generation. Please try again.');
    } finally {
      stopVox();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/95">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500/20 via-sky-500/20 to-purple-500/20 border border-sky-400/40 flex items-center justify-center text-sky-400">
              <Wand2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-warhammer text-base sm:text-lg font-bold text-slate-100 tracking-wide">
                AI Army List Generator
              </h2>
              <span className="text-[11px] text-slate-400">
                Muster a complete 11th Edition roster from a single prompt
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn-theme-icon min-w-[34px] min-h-[34px] rounded-xl"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4 stroke-[2]" />
          </button>
        </div>

        {/* Missing API Key Gate */}
        {!keyConfigured ? (
          <div className="p-8 flex flex-col items-center justify-center text-center space-y-4 flex-1">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Key className="w-7 h-7" />
            </div>
            <div className="max-w-md space-y-1.5">
              <h3 className="font-warhammer text-base font-bold text-slate-100">
                Gemini API Key Required
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                To generate custom army lists and resolve tabletop rules with AI, please link your Gemini API key. Your key is stored securely in your browser.
              </p>
            </div>
            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="btn-theme-secondary px-4 py-2 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSettings();
                }}
                className="btn-theme-primary px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-2"
              >
                <Key className="w-3.5 h-3.5" />
                <span>Configure API Key</span>
              </button>
            </div>
          </div>
        ) : (
          /* Form Content */
          <form onSubmit={handleGenerate} className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
            
            {/* Prompt Area with AI Inspire button */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Army Prompt
                </label>
                <button
                  type="button"
                  onClick={handleGenerateIdea}
                  disabled={isGeneratingIdea || isGenerating}
                  className="inline-flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 font-semibold px-2.5 py-1 rounded-lg bg-sky-950/60 hover:bg-sky-950 border border-sky-700/50 transition-colors"
                  title="Generate a random army list prompt with AI"
                >
                  {isGeneratingIdea ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Dices className="w-3.5 h-3.5" />
                  )}
                  <span>{isGeneratingIdea ? 'Thinking...' : 'Inspire Me (AI)'}</span>
                </button>
              </div>

              <textarea
                rows={3}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. Build a 2k competitive Salamanders Army (or specify exact leaders, bodyguards, and detachments)..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs sm:text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 leading-relaxed"
              />
              <span className="text-[11px] text-slate-400 block">
                Tip: You can enter generic goals like <span className="text-sky-300 font-mono">"Build a 2k competitive Salamanders Army"</span> and the AI will assemble a full battle-forged list to fill the points budget.
              </span>
            </div>

            {/* Target Battle Size Selector */}
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
                Target Points & Battle Size
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'auto', label: 'Auto Detect', desc: 'From prompt (e.g. 2k)' },
                  { id: 'incursion', label: 'Incursion', desc: '1,000 pts • 2 DP' },
                  { id: 'strike-force', label: 'Strike Force', desc: '2,000 pts • 3 DP' },
                  { id: 'onslaught', label: 'Onslaught', desc: '3,000 pts • 4 DP' }
                ].map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setPreferredBattleSize(b.id as any)}
                    className={`p-2.5 rounded-xl border text-left transition-all ${
                      preferredBattleSize === b.id
                        ? 'bg-sky-950/70 border-sky-500 text-white shadow-sm shadow-sky-950/50'
                        : 'bg-slate-850/80 border-slate-750 text-slate-400 hover:border-slate-650'
                    }`}
                  >
                    <span className="font-bold text-xs block text-slate-200">{b.label}</span>
                    <span className="text-[10px] text-slate-400 block">{b.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Owned Models Restriction Toggle */}
            <div className="pt-1">
              <label
                className={`flex items-center justify-between gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  onlyOwnedModels
                    ? 'bg-sky-950/50 border-sky-500/60'
                    : 'bg-slate-850/70 border-slate-750 hover:border-slate-650'
                }`}
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <Package className={`w-4 h-4 mt-0.5 shrink-0 ${onlyOwnedModels ? 'text-sky-400' : 'text-slate-400'}`} />
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-slate-200 block">
                      Use only my Owned Models
                    </span>
                    <span className="text-[11px] text-slate-400 block">
                      {ownedSummary.models > 0
                        ? `Restricts AI to your ${ownedSummary.units} tracked unit${ownedSummary.units === 1 ? '' : 's'} (${ownedSummary.models} model${ownedSummary.models === 1 ? '' : 's'}).`
                        : 'No owned models tracked yet — add them in the Owned Models tab first.'}
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={onlyOwnedModels}
                  onChange={(e) => setOnlyOwnedModels(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-sky-500 focus:ring-sky-500 shrink-0"
                />
              </label>
            </div>

            {/* Progress / Status / Error Indicator */}
            {isGenerating && (
              <div className="p-3.5 rounded-xl bg-slate-850 border border-sky-500/40 flex items-center gap-3 animate-pulse">
                <Loader2 className="w-4 h-4 text-sky-400 animate-spin flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-bold text-sky-300 block truncate">
                    Generating Full Army Roster...
                  </span>
                  <span className="text-[11px] text-slate-400 block truncate">
                    {statusStep}
                  </span>
                </div>
              </div>
            )}

            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-600/50 flex items-start gap-2.5 text-xs text-red-300">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                <span className="leading-relaxed">{errorMessage}</span>
              </div>
            )}

            {/* Footer Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800 gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isGenerating}
                className="btn-theme-secondary min-h-[38px] px-4 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isGenerating || !prompt.trim()}
                className="btn-theme-primary min-h-[38px] px-5 rounded-xl text-xs font-bold tracking-wide flex items-center gap-2 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white shadow-md shadow-sky-950/50 disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Mustering Army...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Generate Army List</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
