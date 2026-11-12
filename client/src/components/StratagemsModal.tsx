import React, { useState } from 'react';
import {
  X,
  Eye,
  Swords,
  Crosshair,
  Footprints,
  Zap,
  Crown,
  Sparkles,
  Play,
  ShieldAlert,
  ArrowLeftRight
} from 'lucide-react';
import { SelectedDetachment } from '../types/roster';
import {
  Stratagem,
  StratagemPhase,
  StratagemTurn,
  CORE_STRATAGEMS,
  getDetachmentStratagems
} from '../data/stratagems';
import { FormattedText } from './FormattedText';

interface StratagemsModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedDetachments: SelectedDetachment[];
}

const getTurnTheme = (turn: StratagemTurn) => {
  switch (turn) {
    case 'your':
      return {
        label: 'Your Turn',
        cardBg: 'bg-sky-950/35 hover:bg-sky-950/55 border-sky-700/60 border-l-4 border-l-sky-500',
        cpBadge: 'bg-sky-900/90 text-sky-200 border-sky-500/60',
        turnBadge: 'bg-sky-950/90 text-sky-300 border-sky-600/60',
        headerBg: 'bg-sky-950/80 border-b border-sky-700/60',
        icon: <Play className="w-3.5 h-3.5 fill-sky-400 text-sky-400" />
      };
    case 'opponent':
      return {
        label: "Opponent's Turn",
        cardBg: 'bg-rose-950/35 hover:bg-rose-950/55 border-rose-700/60 border-l-4 border-l-rose-500',
        cpBadge: 'bg-rose-900/90 text-rose-200 border-rose-500/60',
        turnBadge: 'bg-rose-950/90 text-rose-300 border-rose-600/60',
        headerBg: 'bg-rose-950/80 border-b border-rose-700/60',
        icon: <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
      };
    case 'either':
    default:
      return {
        label: 'Either Turn',
        cardBg: 'bg-emerald-950/35 hover:bg-emerald-950/55 border-emerald-700/60 border-l-4 border-l-emerald-500',
        cpBadge: 'bg-emerald-900/90 text-emerald-200 border-emerald-500/60',
        turnBadge: 'bg-emerald-950/90 text-emerald-300 border-emerald-600/60',
        headerBg: 'bg-emerald-950/80 border-b border-emerald-700/60',
        icon: <ArrowLeftRight className="w-3.5 h-3.5 text-emerald-400" />
      };
  }
};

const getPhaseIcon = (phase: StratagemPhase) => {
  if (phase === 'Command') return <Crown className="w-3.5 h-3.5 text-amber-400" />;
  if (phase.includes('Movement')) return <Footprints className="w-3.5 h-3.5 text-sky-400" />;
  if (phase === 'Shooting') return <Crosshair className="w-3.5 h-3.5 text-sky-400" />;
  if (phase === 'Charge') return <Zap className="w-3.5 h-3.5 text-amber-400" />;
  if (phase.includes('Fight')) return <Swords className="w-3.5 h-3.5 text-rose-400" />;
  return <Sparkles className="w-3.5 h-3.5 text-emerald-400" />;
};

export const StratagemsModal: React.FC<StratagemsModalProps> = ({
  isOpen,
  onClose,
  selectedDetachments
}) => {
  const [inspectStratagem, setInspectStratagem] = useState<Stratagem | null>(null);

  if (!isOpen) return null;

  const detachmentGroups = getDetachmentStratagems(selectedDetachments);

  const renderStratagemCard = (strat: Stratagem) => {
    const theme = getTurnTheme(strat.turn);

    return (
      <div
        key={strat.id}
        onClick={() => setInspectStratagem(strat)}
        className={`rounded-xl p-3 sm:p-3.5 border transition-all flex items-center justify-between gap-3 shadow-md shadow-slate-950/40 cursor-pointer active:scale-[0.99] ${theme.cardBg}`}
      >
        {/* Left: Name, CP, Turn & Phase Icons */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            <span className={`text-xs font-mono font-black px-2 py-0.5 rounded-md border shadow-sm ${theme.cpBadge}`}>
              {strat.cp}CP
            </span>
            <h4 className="font-warhammer text-sm sm:text-base font-extrabold text-slate-100 truncate">
              {strat.name}
            </h4>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Turn Icon Badge */}
            <span
              className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-0.5 rounded-md border ${theme.turnBadge}`}
              title={`Turn: ${theme.label}`}
            >
              {theme.icon}
              <span>{theme.label}</span>
            </span>

            {/* Phase Icon Badge */}
            <span
              className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-900/90 text-slate-200 border border-slate-700/80"
              title={`Phase: ${strat.phase}`}
            >
              {getPhaseIcon(strat.phase)}
              <span>{strat.phase}</span>
            </span>
          </div>
        </div>

        {/* Right: Eyeball Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setInspectStratagem(strat);
          }}
          className="btn-theme-icon min-h-[38px] min-w-[38px] rounded-xl flex-shrink-0"
          title="Inspect Stratagem rules"
          aria-label={`Inspect ${strat.name}`}
        >
          <Eye className="w-4 h-4 stroke-[2]" />
        </button>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-slate-800 bg-slate-900/95">
          <div>
            <h2 className="font-warhammer text-base sm:text-lg font-extrabold text-slate-100">
              Stratagems Reference
            </h2>
            {/* 40k Color Legend */}
            <div className="flex items-center gap-3 mt-1 text-[11px] font-bold text-slate-300 flex-wrap">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-sky-500 inline-block" />
                <span>Your Turn</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
                <span>Either Turn</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block" />
                <span>Opponent&apos;s Turn</span>
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="btn-theme-icon min-w-[38px] min-h-[38px] rounded-xl"
            aria-label="Close stratagems reference"
          >
            <X className="w-4 h-4 stroke-[2]" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-3 sm:p-5 overflow-y-auto flex-1 space-y-6">
          
          {/* 1. Detachment Stratagems */}
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-3">
              <h3 className="font-warhammer text-sm sm:text-base font-extrabold text-slate-100 tracking-wider uppercase">
                Detachment Stratagems
              </h3>
            </div>

            {detachmentGroups.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-850 border border-slate-750 text-slate-400 text-xs sm:text-sm text-center">
                Select a detachment to view its detachment-specific Stratagems.
              </div>
            ) : (
              <div className="space-y-4">
                {detachmentGroups.map((group) => (
                  <div key={group.detachmentName}>
                    <div className="text-xs font-warhammer font-bold text-sky-400 uppercase tracking-wider mb-2">
                      {group.detachmentName} ({group.dpCost} DP)
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {group.stratagems.map(renderStratagemCard)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 2. Core Stratagems */}
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-3">
              <h3 className="font-warhammer text-sm sm:text-base font-extrabold text-slate-100 tracking-wider uppercase">
                Core Stratagems ({CORE_STRATAGEMS.length})
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {CORE_STRATAGEMS.map(renderStratagemCard)}
            </div>
          </div>

        </div>
      </div>

      {/* Individual Stratagem Description Pop-up Modal */}
      {inspectStratagem && (() => {
        const theme = getTurnTheme(inspectStratagem.turn);
        return (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150"
            onClick={() => setInspectStratagem(null)}
          >
            <div
              className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Color-Coded Header */}
              <div className={`px-4 sm:px-5 py-3.5 flex items-center justify-between gap-3 ${theme.headerBg}`}>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-mono font-black px-2 py-0.5 rounded-md border ${theme.cpBadge}`}>
                      {inspectStratagem.cp}CP
                    </span>
                    <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                      {inspectStratagem.category}
                    </span>
                  </div>
                  <h3 className="font-warhammer text-base sm:text-lg font-extrabold text-white tracking-wide">
                    {inspectStratagem.name}
                  </h3>
                </div>

                <button
                  type="button"
                  onClick={() => setInspectStratagem(null)}
                  className="min-w-[40px] min-h-[40px] rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 flex items-center justify-center transition-all active:translate-y-[1px]"
                  aria-label="Close stratagem description"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Turn & Phase Info Bar */}
              <div className="px-4 sm:px-5 py-2.5 bg-slate-850 border-b border-slate-800 flex items-center gap-2 flex-wrap">
                <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-md border ${theme.turnBadge}`}>
                  {theme.icon}
                  <span>{theme.label}</span>
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-md bg-slate-900 text-slate-200 border border-slate-700">
                  {getPhaseIcon(inspectStratagem.phase)}
                  <span>{inspectStratagem.phase} Phase</span>
                </span>
              </div>

              {/* Formatted Description with Clickable [Keywords] */}
              <div className="p-4 sm:p-5 text-xs sm:text-sm text-slate-200 leading-relaxed">
                <FormattedText
                  text={inspectStratagem.description}
                  className="text-slate-200 text-xs sm:text-sm font-sans"
                />
              </div>

              {/* Footer */}
              <div className="px-4 sm:px-5 py-3 border-t border-slate-800 bg-slate-900/90 flex justify-end">
                <button
                  type="button"
                  onClick={() => setInspectStratagem(null)}
                  className="btn-theme-secondary min-h-[38px] px-5 rounded-xl text-xs sm:text-sm font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

