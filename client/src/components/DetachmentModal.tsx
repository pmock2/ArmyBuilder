import React from 'react';
import { X, Sparkles, Shield, AlertTriangle } from 'lucide-react';
import { SelectedDetachment, Enhancement } from '../types/roster';

interface DetachmentModalProps {
  detachment: SelectedDetachment | null;
  allEnhancements?: Enhancement[];
  isOpen: boolean;
  onClose: () => void;
  onSelect?: () => void;
  isSelected?: boolean;
}

export const DetachmentModal: React.FC<DetachmentModalProps> = ({
  detachment,
  allEnhancements = [],
  isOpen,
  onClose,
  onSelect,
  isSelected = false
}) => {
  if (!isOpen || !detachment) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-grimdark-900 border border-grimdark-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-grimdark-800 bg-grimdark-950/80">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-600/20 border border-amber-500/40 flex items-center justify-center font-warhammer font-bold text-amber-400">
              {detachment.dpCost}
            </div>
            <div>
              <h2 className="font-warhammer text-lg font-bold text-amber-300">
                {detachment.name}
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[11px] font-mono text-amber-400 font-bold">
                  {detachment.dpCost} Detachment Points (DP)
                </span>
                {detachment.tags && detachment.tags.length > 0 && (
                  <div className="flex gap-1">
                    {detachment.tags.map(t => (
                      <span key={t} className="text-[10px] px-1.5 py-0.2 rounded bg-grimdark-800 text-grimdark-300 border border-grimdark-700">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-grimdark-400 hover:text-white hover:bg-grimdark-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs flex-1">
          
          {/* Rules Section */}
          <div>
            <h3 className="font-warhammer text-xs font-bold uppercase tracking-wider text-amber-400 mb-3 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-amber-500" />
              <span>Detachment Rules</span>
            </h3>

            {detachment.rules && detachment.rules.length > 0 ? (
              <div className="space-y-4">
                {detachment.rules.map((rule, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-grimdark-950 border border-grimdark-800">
                    <h4 className="font-warhammer text-sm font-bold text-amber-200 mb-2">
                      {rule.name}
                    </h4>
                    <div className="text-grimdark-300 whitespace-pre-line leading-relaxed text-xs">
                      {rule.description}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-grimdark-500 italic">No specific detachment rules text found.</p>
            )}
          </div>

          {/* Exclusivity / Constraints Warning */}
          {detachment.constraints && (
            (detachment.constraints.exclusiveTags && detachment.constraints.exclusiveTags.length > 0) ||
            detachment.constraints.exclusiveChapters
          ) && (
            <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-600/40 text-amber-300 flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-xs mb-1">Detachment Restrictions</div>
                {detachment.constraints.exclusiveTags.length > 0 && (
                  <p className="text-[11px] text-amber-200/90 leading-relaxed">
                    This detachment has the <strong>{detachment.constraints.exclusiveTags.join(', ')}</strong> tag and cannot be taken with another {detachment.constraints.exclusiveTags.join(', ')} detachment.
                  </p>
                )}
                {detachment.constraints.exclusiveChapters && (
                  <p className="text-[11px] text-amber-200/90 leading-relaxed mt-1">
                    Your army cannot include units drawn from any other Space Marine Chapter.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Available Enhancements for this detachment */}
          {allEnhancements.length > 0 && (
            <div>
              <h3 className="font-warhammer text-xs font-bold uppercase tracking-wider text-amber-400 mb-3 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Faction Enhancements & Upgrades</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {allEnhancements.slice(0, 4).map((enh) => (
                  <div key={enh.id} className="p-3 rounded-lg bg-grimdark-950 border border-grimdark-800">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-warhammer font-bold text-amber-300 text-xs truncate">
                        {enh.name}
                      </span>
                      <span className="font-mono text-amber-400 font-bold text-[11px]">
                        +{enh.pts} pts
                      </span>
                    </div>
                    <p className="text-[11px] text-grimdark-400 line-clamp-3">
                      {enh.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-grimdark-800 bg-grimdark-950/80 flex items-center justify-between">
          <div className="text-xs text-grimdark-400">
            Cost: <span className="text-amber-400 font-bold font-mono">{detachment.dpCost} DP</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-grimdark-800 hover:bg-grimdark-700 text-grimdark-300 hover:text-white transition-colors"
            >
              Close
            </button>
            {onSelect && (
              <button
                onClick={() => {
                  onSelect();
                  onClose();
                }}
                className={`px-5 py-2 rounded-lg font-bold text-xs tracking-wide transition-all shadow-md ${
                  isSelected
                    ? 'bg-red-950/80 hover:bg-red-900 border border-red-700 text-red-200'
                    : 'bg-amber-600 hover:bg-amber-500 text-black'
                }`}
              >
                {isSelected ? 'Remove Detachment' : 'Select Detachment'}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
