import React, { useState, useEffect } from 'react';
import { X, Settings, Pencil, Coins, RotateCcw } from 'lucide-react';

interface ListSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  includeLegends: boolean;
  onToggleLegends: (enabled: boolean) => void;
  rosterName: string;
  onRenameRoster: (newName: string) => void;
  customPointsLimit?: number | null;
  defaultPointsLimit: number;
  onSetCustomPointsLimit: (limit: number | null) => void;
}

export const ListSettingsModal: React.FC<ListSettingsModalProps> = ({
  isOpen,
  onClose,
  includeLegends,
  onToggleLegends,
  rosterName,
  onRenameRoster,
  customPointsLimit,
  defaultPointsLimit,
  onSetCustomPointsLimit
}) => {
  const [nameDraft, setNameDraft] = useState(rosterName);
  const [pointsDraft, setPointsDraft] = useState<string>(
    String(customPointsLimit || defaultPointsLimit)
  );

  useEffect(() => {
    if (isOpen) {
      setNameDraft(rosterName);
      setPointsDraft(String(customPointsLimit || defaultPointsLimit));
    }
  }, [isOpen, rosterName, customPointsLimit, defaultPointsLimit]);

  if (!isOpen) return null;

  const commitChangesAndClose = () => {
    const trimmed = nameDraft.trim();
    if (trimmed && trimmed !== rosterName) {
      onRenameRoster(trimmed);
    }
    const parsedPts = parseInt(pointsDraft, 10);
    if (!isNaN(parsedPts) && parsedPts > 0) {
      if (parsedPts === defaultPointsLimit && !customPointsLimit) {
        // unchanged default
      } else if (parsedPts === defaultPointsLimit) {
        onSetCustomPointsLimit(null);
      } else {
        onSetCustomPointsLimit(parsedPts);
      }
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-800 bg-slate-900/95">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-sky-600/20 border border-sky-500/40 flex items-center justify-center text-sky-400">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-warhammer text-base sm:text-lg font-bold text-slate-100">
                List Settings
              </h2>
              <p className="text-xs text-slate-400 truncate max-w-xs sm:max-w-sm">
                Configuration for {rosterName}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="btn-theme-icon min-w-[38px] min-h-[38px] rounded-xl"
            aria-label="Close settings"
          >
            <X className="w-4 h-4 stroke-[2]" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-5">
          {/* Setting 0: Roster Name */}
          <div className="bg-slate-850 border border-slate-750 rounded-2xl p-4 sm:p-5">
            <label
              htmlFor="roster-name-input"
              className="font-warhammer text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2 mb-2"
            >
              <Pencil className="w-4 h-4 text-theme-accent-soft" />
              <span>Roster Name</span>
            </label>
            <input
              id="roster-name-input"
              type="text"
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  commitChangesAndClose();
                }
              }}
              placeholder="Enter army roster name..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-theme-accent"
            />
          </div>

          {/* Setting 1: Custom Points Limit */}
          <div className="bg-slate-850 border border-slate-750 rounded-2xl p-4 sm:p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <label
                htmlFor="custom-points-input"
                className="font-warhammer text-sm sm:text-base font-bold text-slate-100 flex items-center gap-2"
              >
                <Coins className="w-4 h-4 text-theme-accent-soft" />
                <span>Points Limit</span>
              </label>
              {customPointsLimit && (
                <button
                  type="button"
                  onClick={() => {
                    onSetCustomPointsLimit(null);
                    setPointsDraft(String(defaultPointsLimit));
                  }}
                  className="text-xs text-theme-text-secondary hover:text-theme-text flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset ({defaultPointsLimit})</span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                id="custom-points-input"
                type="number"
                min={100}
                max={20000}
                step={50}
                value={pointsDraft}
                onChange={(e) => setPointsDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    commitChangesAndClose();
                  }
                }}
                className="w-32 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm font-mono font-bold text-slate-100 focus:outline-none focus:border-theme-accent"
              />
              <span className="text-xs text-slate-400 font-medium">pts</span>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {[500, 1000, 1500, 2000, 3000].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setPointsDraft(String(preset))}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold border transition-colors ${
                    Number(pointsDraft) === preset
                      ? 'bg-theme-accent/20 text-theme-accent-soft border-theme-accent/50'
                      : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Setting 2: Warhammer Legends Toggle */}
          <div className="bg-slate-850 border border-slate-750 rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4">
            <h3 className="font-warhammer text-sm sm:text-base font-bold text-slate-100">
              Include Legends Units
            </h3>

            <button
              type="button"
              role="switch"
              aria-checked={includeLegends}
              onClick={() => onToggleLegends(!includeLegends)}
              className={`relative inline-flex h-8 w-14 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none active:scale-95 items-center p-0.5 ${
                includeLegends
                  ? 'bg-theme-accent ring-2 ring-theme-accent/50'
                  : 'bg-slate-800'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  includeLegends ? 'translate-x-6' : 'translate-x-0 bg-slate-300'
                }`}
              />
            </button>
          </div>

        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3.5 border-t border-slate-800 bg-slate-900/90 flex justify-end">
          <button
            type="button"
            onClick={commitChangesAndClose}
            className="btn-theme-primary w-full sm:w-auto min-h-[42px] px-6 rounded-xl text-sm tracking-wide"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
