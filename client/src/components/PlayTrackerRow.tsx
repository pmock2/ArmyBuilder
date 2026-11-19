import React from 'react';
import { Minus, Plus, Heart, Users, Skull } from 'lucide-react';
import { UnitPlayStatus } from '../utils/playTracking';

interface PlayTrackerRowProps {
  label: string;
  status: UnitPlayStatus;
  roleBadge?: 'Bodyguard' | 'Leader' | 'Support' | 'Retinue';
  subLabel?: string;
  onStep: (delta: number) => void;
  compact?: boolean;
}

const ROLE_BADGE_CLASSES: Record<'Bodyguard' | 'Leader' | 'Support' | 'Retinue', string> = {
  Bodyguard: 'bg-sky-950/75 text-sky-300 border-sky-700/50',
  Leader: 'bg-indigo-950/75 text-indigo-300 border-indigo-600/50',
  Support: 'bg-emerald-950/75 text-emerald-300 border-emerald-600/50',
  Retinue: 'bg-teal-950/75 text-teal-300 border-teal-600/50'
};

export const PlayTrackerRow: React.FC<PlayTrackerRowProps> = ({
  label,
  status,
  roleBadge,
  subLabel,
  onStep,
  compact = false
}) => {
  const { isSingleModel, current, max, isDestroyed, isDamaged, isBelowHalf } = status;
  const pct = max > 0 ? Math.round((current / max) * 100) : 0;

  let barColorClass = 'bg-emerald-400';
  let valueColorClass = 'text-theme-text';
  if (isDestroyed) {
    barColorClass = 'bg-red-500';
    valueColorClass = 'text-red-300';
  } else if (isBelowHalf) {
    barColorClass = 'bg-amber-400';
    valueColorClass = 'text-amber-300';
  } else if (isDamaged) {
    barColorClass = 'bg-sky-400';
    valueColorClass = 'text-sky-300';
  }

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className={`rounded-xl border transition-colors ${
        isDestroyed
          ? 'bg-red-950/20 border-red-800/50'
          : 'bg-theme-bg/65 border-theme-border-subtle/90'
      } ${compact ? 'px-2.5 py-2' : 'px-3 py-2.5'}`}
    >
      <div className="flex items-center justify-between gap-2">
        {/* Left: Label, Role Badge & Status */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            {roleBadge && (
              <span
                className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded border shrink-0 ${ROLE_BADGE_CLASSES[roleBadge]}`}
              >
                {roleBadge}
              </span>
            )}

            {!roleBadge && (
              isDestroyed ? (
                <Skull className="w-3.5 h-3.5 text-red-400 shrink-0" />
              ) : isSingleModel ? (
                <Heart className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              ) : (
                <Users className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              )
            )}

            <span
              className={`font-semibold truncate ${
                compact ? 'text-xs' : 'text-xs sm:text-sm'
              } ${isDestroyed ? 'text-red-200 line-through decoration-red-400/70' : 'text-theme-text'}`}
            >
              {label}
            </span>

            {isDestroyed && (
              <span className="text-[10px] font-mono font-extrabold uppercase px-1.5 py-0.5 rounded bg-red-950/80 text-red-300 border border-red-700/60 shrink-0">
                Destroyed
              </span>
            )}

            {!isDestroyed && isBelowHalf && (
              <span
                title="Below Half-strength"
                className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-950/70 text-amber-300 border border-amber-600/50 shrink-0"
              >
                &lt;½
              </span>
            )}
          </div>

          {subLabel && (
            <span className="text-[11px] text-theme-text-muted block truncate mt-0.5">
              {subLabel}
            </span>
          )}
        </div>

        {/* Right: - / value / + stepper */}
        <div className="inline-flex items-center gap-1 rounded-lg bg-theme-surface border border-theme-border p-0.5 shrink-0 shadow-sm">
          <button
            type="button"
            disabled={current <= 0}
            onClick={(e) => {
              e.stopPropagation();
              onStep(-1);
            }}
            className="w-8 h-8 rounded-md flex items-center justify-center text-theme-text-secondary hover:text-theme-text hover:bg-theme-elevated disabled:opacity-25 disabled:pointer-events-none transition-colors active:scale-95"
            title={isSingleModel ? `Remove 1 wound from ${label}` : `Remove 1 model from ${label}`}
            aria-label={isSingleModel ? `Decrease ${label} wounds` : `Decrease ${label} models`}
          >
            <Minus className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>

          <span
            className={`font-mono text-xs sm:text-sm font-bold px-1.5 min-w-[54px] text-center whitespace-nowrap ${valueColorClass}`}
          >
            {current}
            <span className="text-theme-text-muted font-normal">/{max}</span>
            {isSingleModel ? (
              <span className="text-[10px] text-theme-text-secondary ml-0.5">W</span>
            ) : null}
          </span>

          <button
            type="button"
            disabled={current >= max}
            onClick={(e) => {
              e.stopPropagation();
              onStep(1);
            }}
            className="w-8 h-8 rounded-md flex items-center justify-center text-theme-text-secondary hover:text-theme-text hover:bg-theme-elevated disabled:opacity-25 disabled:pointer-events-none transition-colors active:scale-95"
            title={isSingleModel ? `Restore 1 wound to ${label}` : `Add 1 model back to ${label}`}
            aria-label={isSingleModel ? `Increase ${label} wounds` : `Increase ${label} models`}
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </div>
      </div>

      {/* Slim health / models progress bar */}
      <div className="mt-1.5 h-1.5 w-full rounded-full bg-theme-surface/90 overflow-hidden border border-theme-border-subtle/50">
        <div
          className={`h-full rounded-full transition-all duration-200 ${barColorClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};
