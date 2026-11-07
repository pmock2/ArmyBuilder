import React from 'react';
import { Shield, Sparkles, AlertTriangle, CheckCircle2, Save, Printer, ArrowLeft, Star } from 'lucide-react';
import { ArmyRoster, BattleSize, ValidationResult } from '../types/roster';
import { BATTLE_SIZE_CONFIGS } from '../utils/validator';

interface NavbarProps {
  roster: ArmyRoster;
  validation: ValidationResult;
  onUpdateBattleSize: (size: BattleSize) => void;
  onSave: () => void;
  onExport: () => void;
  onBackToDashboard: () => void;
  onToggleValidationDrawer: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  roster,
  validation,
  onUpdateBattleSize,
  onSave,
  onExport,
  onBackToDashboard,
  onToggleValidationDrawer
}) => {
  const currentLimits = BATTLE_SIZE_CONFIGS[roster.battleSize] || BATTLE_SIZE_CONFIGS['strike-force'];
  const hasWarlord = roster.units.some(u => u.isWarlord);

  // Points color
  let pointsColor = 'text-amber-400';
  if (validation.totalPoints > validation.pointsLimit) pointsColor = 'text-red-500 font-bold';
  else if (validation.totalPoints === validation.pointsLimit) pointsColor = 'text-emerald-400 font-bold';

  // DP color
  let dpColor = 'text-amber-400';
  if (validation.totalDP > validation.dpLimit) dpColor = 'text-red-500 font-bold';
  else if (validation.totalDP === validation.dpLimit) dpColor = 'text-emerald-400';

  return (
    <header className="sticky top-0 z-40 bg-grimdark-900/95 border-b border-grimdark-700 backdrop-blur-md px-4 py-2.5">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
        
        {/* Left: Back + Army & Faction Identity */}
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToDashboard}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-grimdark-800 hover:bg-grimdark-700 text-grimdark-300 hover:text-white border border-grimdark-700 transition-colors text-xs"
            title="Return to Armies Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Armies</span>
          </button>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-warhammer text-base sm:text-lg font-bold text-amber-300 tracking-wide">
                {roster.name}
              </h1>
              <span className="text-xs px-2 py-0.5 rounded bg-grimdark-800 text-amber-400/90 border border-amber-600/30 font-medium">
                {roster.factionName}
                {roster.subFactionName ? ` • ${roster.subFactionName}` : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Center: Live Counters & Battle Size */}
        <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
          
          {/* Battle Size Selector */}
          <div className="flex items-center bg-grimdark-950 rounded-lg p-0.5 border border-grimdark-800 text-xs">
            {(['incursion', 'strike-force', 'onslaught'] as BattleSize[]).map((size) => {
              const active = roster.battleSize === size;
              const config = BATTLE_SIZE_CONFIGS[size];
              return (
                <button
                  key={size}
                  onClick={() => onUpdateBattleSize(size)}
                  className={`px-2.5 py-1 rounded-md transition-all font-medium ${
                    active
                      ? 'bg-amber-600 text-black font-bold shadow'
                      : 'text-grimdark-400 hover:text-grimdark-200'
                  }`}
                  title={`${config.name} (${config.points} pts)`}
                >
                  {config.name.split(' ')[0]}
                </button>
              );
            })}
          </div>

          {/* Points Meter */}
          <div className="flex items-center gap-1.5 bg-grimdark-950 px-3 py-1 rounded-lg border border-grimdark-800 font-mono text-xs">
            <Shield className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-grimdark-400">PTS:</span>
            <span className={pointsColor}>{validation.totalPoints}</span>
            <span className="text-grimdark-600">/</span>
            <span className="text-grimdark-400">{validation.pointsLimit}</span>
          </div>

          {/* DP Meter */}
          <div className="flex items-center gap-1.5 bg-grimdark-950 px-3 py-1 rounded-lg border border-grimdark-800 font-mono text-xs">
            <span className="text-amber-500 font-bold">DP:</span>
            <span className={dpColor}>{validation.totalDP}</span>
            <span className="text-grimdark-600">/</span>
            <span className="text-grimdark-400">{validation.dpLimit}</span>
          </div>

          {/* Enhancements Meter */}
          <div className="hidden md:flex items-center gap-1.5 bg-grimdark-950 px-3 py-1 rounded-lg border border-grimdark-800 font-mono text-xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-grimdark-400">ENH:</span>
            <span className="text-amber-300">{validation.enhancementCount}</span>
            <span className="text-grimdark-600">/</span>
            <span className="text-grimdark-400">{validation.enhancementLimit}</span>
          </div>

          {/* Warlord Indicator */}
          <div className={`hidden lg:flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border ${
            hasWarlord
              ? 'bg-amber-950/40 text-amber-300 border-amber-600/40'
              : 'bg-red-950/40 text-red-400 border-red-700/40 animate-pulse'
          }`}>
            <Star className={`w-3.5 h-3.5 ${hasWarlord ? 'text-amber-400 fill-amber-400' : 'text-red-400'}`} />
            <span>{hasWarlord ? 'Warlord' : 'No Warlord'}</span>
          </div>

          {/* Validation Pill */}
          <button
            onClick={onToggleValidationDrawer}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium border transition-colors shadow-sm ${
              validation.isValid
                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-600/50 hover:bg-emerald-900/60'
                : 'bg-red-950/70 text-red-300 border-red-600/60 hover:bg-red-900/70 animate-pulse'
            }`}
          >
            {validation.isValid ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Army Legal</span>
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 text-red-400" />
                <span>{validation.errorsCount} {validation.errorsCount === 1 ? 'Error' : 'Errors'}</span>
              </>
            )}
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onSave}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-black font-semibold text-xs shadow-md transition-all active:scale-95"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save</span>
          </button>

          <button
            onClick={onExport}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-grimdark-800 hover:bg-grimdark-700 text-grimdark-300 hover:text-white border border-grimdark-700 transition-colors text-xs"
            title="Export tournament sheet or print roster"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>

      </div>
    </header>
  );
};
