import React, { useState, useEffect } from 'react';
import { X, Settings, Pencil } from 'lucide-react';

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
