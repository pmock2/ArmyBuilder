import React, { useState, useEffect } from 'react';
import { X, Settings, BookOpen, Pencil } from 'lucide-react';

interface ListSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  includeLegends: boolean;
  onToggleLegends: (enabled: boolean) => void;
  rosterName: string;
  onRenameRoster: (newName: string) => void;
}

export const ListSettingsModal: React.FC<ListSettingsModalProps> = ({
  isOpen,
  onClose,
  includeLegends,
  onToggleLegends,
  rosterName,
  onRenameRoster
}) => {
  const [nameDraft, setNameDraft] = useState(rosterName);

  useEffect(() => {
    if (isOpen) {
      setNameDraft(rosterName);
    }
  }, [isOpen, rosterName]);

  if (!isOpen) return null;

  const commitRenameAndClose = () => {
    const trimmed = nameDraft.trim();
    if (trimmed && trimmed !== rosterName) {
      onRenameRoster(trimmed);
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
                  commitRenameAndClose();
                }
              }}
              placeholder="Enter army roster name..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-theme-accent"
            />
          </div>

          {/* Setting 1: Warhammer Legends Toggle */}
          <div className="bg-slate-850 border border-slate-750 rounded-2xl p-4 sm:p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <h3 className="font-warhammer text-sm sm:text-base font-bold text-slate-100">
                    Enable Legends Units
                  </h3>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-purple-950/80 text-purple-300 border border-purple-600/50 font-mono">
                    LEGENDS
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Allow classic and out-of-production Warhammer Legends units to appear when selecting and adding units to your army list.
                </p>
              </div>

              {/* iOS-style Toggle Switch with Large Touch Area */}
              <button
                type="button"
                role="switch"
                aria-checked={includeLegends}
                onClick={() => onToggleLegends(!includeLegends)}
                className={`relative inline-flex h-8 w-14 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none active:scale-95 items-center p-0.5 ${
                  includeLegends
                    ? 'bg-blue-600 ring-2 ring-blue-500/50'
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

            {/* Status Footer */}
            <div className="mt-4 pt-3 border-t border-slate-750 flex items-center justify-between text-xs sm:text-sm">
              <span className="text-slate-400 font-medium">Unit Browser Status:</span>
              <span
                className={`font-semibold font-mono text-xs px-2.5 py-1 rounded-md ${
                  includeLegends
                    ? 'bg-purple-950/80 text-purple-200 border border-purple-600/60'
                    : 'bg-slate-800 text-slate-400 border border-slate-700'
                }`}
              >
                {includeLegends ? 'Legends Included' : 'Standard Play (Hidden)'}
              </span>
            </div>
          </div>

          {/* Tournament / Rules Advisory Note */}
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-850 border border-slate-750 text-xs sm:text-sm text-slate-300">
            <BookOpen className="w-5 h-5 text-sky-400 flex-shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-semibold text-sky-300">Rules Note: </span>
              In official 11th Edition tournament play, Legends units are generally excluded unless the event organizer explicitly permits them.
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3.5 border-t border-slate-800 bg-slate-900/90 flex justify-end">
          <button
            type="button"
            onClick={commitRenameAndClose}
            className="btn-theme-primary w-full sm:w-auto min-h-[42px] px-6 rounded-xl text-sm tracking-wide"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};
