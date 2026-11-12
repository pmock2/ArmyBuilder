import React from 'react';
import { X, Sparkles, Shield, AlertTriangle } from 'lucide-react';
import { SelectedDetachment, Enhancement, normalizeDetachmentName } from '../types/roster';
import { FormattedText } from './FormattedText';

interface DetachmentModalProps {
  detachment: SelectedDetachment | null;
  allEnhancements?: Enhancement[];
  isOpen: boolean;
  onClose: () => void;
  onSelect?: () => void;
  isSelected?: boolean;
  isPlayMode?: boolean;
}

export const DetachmentModal: React.FC<DetachmentModalProps> = ({
  detachment,
  allEnhancements = [],
  isOpen,
  onClose,
  onSelect,
  isSelected = false,
  isPlayMode = false
}) => {
  if (!isOpen || !detachment) return null;

  const detachmentEnhancements = allEnhancements.filter(
    (enh) => !enh.detachment || normalizeDetachmentName(enh.detachment) === normalizeDetachmentName(detachment.name)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-800 bg-slate-900/95">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-600/20 border border-sky-500/40 flex items-center justify-center font-warhammer font-bold text-sky-400 text-sm">
              {detachment.dpCost}
            </div>
            <div>
              <h2 className="font-warhammer text-base sm:text-lg font-bold text-slate-100">
                {detachment.name}
              </h2>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="text-xs font-mono text-sky-400 font-semibold">
                  {detachment.dpCost} Detachment Points (DP)
                </span>
                {detachment.tags && detachment.tags.length > 0 && (
                  <div className="flex gap-1.5 flex-wrap">
                    {detachment.tags.map(t => (
                      <span key={t} className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
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
            className="btn-theme-icon min-w-[38px] min-h-[38px] rounded-xl"
            aria-label="Close detachment details"
          >
            <X className="w-4 h-4 stroke-[2]" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 text-xs sm:text-sm flex-1">
          
          {/* Rules Section */}
          <div>
            <h3 className="font-warhammer text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-200 mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4 text-sky-400" />
              <span>Detachment Rules</span>
            </h3>

            {detachment.rules && detachment.rules.length > 0 ? (
              <div className="space-y-4">
                {detachment.rules.map((rule, idx) => (
                  <div key={idx} className="p-4 rounded-xl bg-slate-850 border border-slate-750">
                    <h4 className="font-warhammer text-sm font-bold text-sky-300 mb-2">
                      {rule.name}
                    </h4>
                    <FormattedText
                      text={rule.description}
                      className="text-slate-300 text-xs sm:text-sm font-sans"
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400 italic">No specific detachment rules text found.</p>
            )}
          </div>

          {/* Exclusivity / Constraints Warning */}
          {detachment.constraints && (
            (detachment.constraints.exclusiveTags && detachment.constraints.exclusiveTags.length > 0) ||
            detachment.constraints.exclusiveChapters
          ) && (
            <div className="p-4 rounded-xl bg-slate-850 border border-slate-700 text-slate-300 flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-xs sm:text-sm text-slate-200 mb-1">Detachment Restrictions</div>
                {detachment.constraints.exclusiveTags.length > 0 && (
                  <p className="text-xs text-slate-300 leading-relaxed">
                    This detachment has the <strong>{detachment.constraints.exclusiveTags.join(', ')}</strong> tag and cannot be taken with another {detachment.constraints.exclusiveTags.join(', ')} detachment.
                  </p>
                )}
                {detachment.constraints.exclusiveChapters && (
                  <p className="text-xs text-slate-300 leading-relaxed mt-1">
                    Your army cannot include units drawn from any other Space Marine Chapter.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Available Enhancements for this detachment (Hidden in Play Mode) */}
          {!isPlayMode && detachmentEnhancements.length > 0 && (
            <div>
              <h3 className="font-warhammer text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-200 mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-sky-400" />
                <span>Detachment Enhancements & Upgrades</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {detachmentEnhancements.map((enh) => (
                  <div key={enh.id} className="p-3.5 rounded-xl bg-slate-850 border border-slate-750">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-warhammer font-bold text-sky-300 text-xs sm:text-sm truncate">
                        {enh.name}
                      </span>
                      <span className="font-mono text-sky-400 font-bold text-xs">
                        +{enh.pts} pts
                      </span>
                    </div>
                    <FormattedText
                      text={enh.description}
                      className="text-xs text-slate-300 line-clamp-3 leading-relaxed"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs sm:text-sm text-slate-300">
            Cost: <span className="text-sky-400 font-bold font-mono text-base">{detachment.dpCost} DP</span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="btn-theme-secondary min-h-[42px] px-4 rounded-xl text-xs sm:text-sm font-semibold"
            >
              Close
            </button>
            {onSelect && (
              <button
                onClick={() => {
                  onSelect();
                  onClose();
                }}
                className={`min-h-[42px] px-5 rounded-xl font-bold text-xs sm:text-sm tracking-wide transition-all ${
                  isSelected
                    ? 'bg-red-950/70 hover:bg-red-900/80 border border-red-700/60 text-red-200'
                    : 'btn-theme-primary'
                }`}
              >
                {isSelected ? 'Remove Detachment' : 'Add Detachment'}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
