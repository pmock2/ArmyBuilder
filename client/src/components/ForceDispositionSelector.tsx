import React from 'react';
import { Compass, Check, Target, Shield, Crosshair, Zap, Sparkles } from 'lucide-react';
import { SelectedDetachment } from '../types/roster';

interface ForceDispositionSelectorProps {
  selectedDetachments: SelectedDetachment[];
  currentDisposition?: string | null;
  onSelectDisposition: (disposition: string | null) => void;
}

interface DispositionMeta {
  key: string;
  tag: string;
  altTags?: string[];
  name: string;
  icon: React.ReactNode;
}

const KNOWN_DISPOSITIONS: DispositionMeta[] = [
  {
    key: 'Priority Assets',
    tag: 'PRIORITY ASSETS',
    name: 'Priority Assets',
    icon: <Target className="w-5 h-5 text-sky-400" />
  },
  {
    key: 'Purge the Foe',
    tag: 'PURGE THE FOE',
    name: 'Purge the Foe',
    icon: <Crosshair className="w-5 h-5 text-red-400" />
  },
  {
    key: 'Take and Hold',
    tag: 'TAKE AND HOLD',
    name: 'Take and Hold',
    icon: <Shield className="w-5 h-5 text-blue-400" />
  },
  {
    key: 'Reconnaissance',
    tag: 'RECONNAISSANCE',
    altTags: ['RECON'],
    name: 'Reconnaissance',
    icon: <Zap className="w-5 h-5 text-emerald-400" />
  },
  {
    key: 'Disruption',
    tag: 'DISRUPTION',
    name: 'Disruption',
    icon: <Sparkles className="w-5 h-5 text-purple-400" />
  }
];

export const ForceDispositionSelector: React.FC<ForceDispositionSelectorProps> = ({
  selectedDetachments,
  currentDisposition,
  onSelectDisposition
}) => {
  // Extract all disposition tags present across all selected detachments
  const unlockedMap = new Map<string, string[]>();

  for (const det of selectedDetachments) {
    const tags = det.tags || [];
    for (const disp of KNOWN_DISPOSITIONS) {
      if (tags.some(t => {
        const up = t.toUpperCase();
        return up === disp.tag || (disp.altTags && disp.altTags.includes(up));
      })) {
        const existing = unlockedMap.get(disp.key) || [];
        if (!existing.includes(det.name)) {
          existing.push(det.name);
        }
        unlockedMap.set(disp.key, existing);
      }
    }
  }

  const unlockedDispositions = KNOWN_DISPOSITIONS.filter(d => unlockedMap.has(d.key));

  return (
    <div className="bg-slate-850/80 border border-slate-750 rounded-2xl p-4 sm:p-5 mb-5 shadow-sm">
      
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-3.5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-sky-600/20 border border-sky-500/40 flex items-center justify-center flex-shrink-0 text-sky-400">
            <Compass className="w-4 h-4 stroke-[2.5]" />
          </div>

          <h3 className="font-warhammer text-sm sm:text-base font-bold text-slate-100">
            Force Disposition
          </h3>

          {currentDisposition ? (
            <span className="text-xs px-2.5 py-1 rounded-full bg-sky-950/90 border border-sky-600/70 text-sky-300 font-semibold font-mono">
              {currentDisposition}
            </span>
          ) : (
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-400 font-mono">
              None Selected
            </span>
          )}
        </div>

        {currentDisposition && (
          <button
            type="button"
            onClick={() => onSelectDisposition(null)}
            className="min-h-[36px] px-3 py-1 text-xs text-slate-400 hover:text-sky-300 font-semibold transition-colors underline active:scale-95"
          >
            Clear
          </button>
        )}
      </div>

      {/* Body: Touch-friendly Options */}
      {selectedDetachments.length === 0 ? (
        <div className="p-4 rounded-xl border border-dashed border-slate-750 text-center">
          <p className="text-xs sm:text-sm text-slate-400 font-medium">
            Select detachments above to unlock Force Dispositions for your army.
          </p>
        </div>
      ) : unlockedDispositions.length === 0 ? (
        <div className="p-4 rounded-xl border border-dashed border-slate-750 text-center">
          <p className="text-xs sm:text-sm text-slate-400 font-medium">
            Your selected detachments do not grant Force Disposition tags.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          {unlockedDispositions.map((disp) => {
            const isSelected = currentDisposition === disp.key;
            const sourceDetachments = unlockedMap.get(disp.key) || [];

            return (
              <div
                key={disp.key}
                onClick={() => onSelectDisposition(isSelected ? null : disp.key)}
                className={`min-h-[58px] p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 active:scale-98 ${
                  isSelected
                    ? 'bg-sky-950/70 border-sky-400 shadow-sm ring-2 ring-sky-500/40 text-sky-100'
                    : 'bg-slate-800/90 hover:bg-slate-750 border-slate-700 hover:border-slate-600 text-slate-200'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-750 flex-shrink-0">
                    {disp.icon}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-warhammer text-sm sm:text-base font-bold text-slate-100 truncate">
                      {disp.name}
                    </h4>
                    <p className="text-[11px] text-slate-400 font-medium truncate">
                      Via {sourceDetachments.join(', ')}
                    </p>
                  </div>
                </div>

                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center transition-colors border flex-shrink-0 ${
                    isSelected
                      ? 'bg-blue-600 border-blue-500 text-white shadow-sm'
                      : 'bg-slate-900 border-slate-700 text-transparent'
                  }`}
                >
                  <Check className={`w-4 h-4 stroke-[3] ${isSelected ? 'block' : 'hidden'}`} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
