import React from 'react';
import { X, AlertTriangle, AlertCircle, CheckCircle2, ShieldCheck, ArrowRight } from 'lucide-react';
import { ValidationResult } from '../types/roster';

interface ValidationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  validation: ValidationResult;
}

export const ValidationDrawer: React.FC<ValidationDrawerProps> = ({
  isOpen,
  onClose,
  validation
}) => {
  if (!isOpen) return null;

  const errors = validation.issues.filter(i => i.severity === 'error');
  const warnings = validation.issues.filter(i => i.severity === 'warning');

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-grimdark-900 border-l border-grimdark-700 h-full shadow-2xl flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-grimdark-800 bg-grimdark-950/80">
          <div className="flex items-center gap-2.5">
            {validation.isValid ? (
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-400" />
            )}
            <div>
              <h2 className="font-warhammer text-base font-bold text-amber-300">
                11th Edition Rules Audit
              </h2>
              <p className="text-xs text-grimdark-400">
                {validation.isValid ? 'Army is battle-forged & legal' : `${validation.errorsCount} validation issues detected`}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-grimdark-400 hover:text-white hover:bg-grimdark-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Issues List */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
          
          {validation.isValid && (
            <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-600/40 text-emerald-300 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-warhammer text-xs font-bold text-emerald-200 mb-1">
                  Army is Battle-Forged
                </h3>
                <p className="text-[11px] text-emerald-300/80 leading-relaxed">
                  Your roster complies with all core rules of Warhammer 40k 11th Edition, including Detachment Points, detachment exclusivity tags, Warlord designation, and dual-attachment limits.
                </p>
              </div>
            </div>
          )}

          {/* Errors Section */}
          {errors.length > 0 && (
            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-red-400 mb-2.5 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Critical Rule Violations ({errors.length})</span>
              </h3>

              <div className="space-y-2.5">
                {errors.map((issue) => (
                  <div
                    key={issue.id}
                    className="p-3.5 rounded-xl bg-red-950/30 border border-red-700/50 text-red-200"
                  >
                    <div className="font-bold text-xs text-red-300 mb-1 flex items-center justify-between">
                      <span>{issue.title}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-red-950 border border-red-800 text-red-400 uppercase">
                        Illegal
                      </span>
                    </div>
                    <p className="text-[11px] text-red-200/80 leading-relaxed">
                      {issue.message}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Warnings Section */}
          {warnings.length > 0 && (
            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-amber-400 mb-2.5 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Warnings & Recommendations ({warnings.length})</span>
              </h3>

              <div className="space-y-2.5">
                {warnings.map((issue) => (
                  <div
                    key={issue.id}
                    className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-700/40 text-amber-200"
                  >
                    <div className="font-bold text-xs text-amber-300 mb-1 flex items-center justify-between">
                      <span>{issue.title}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-950 border border-amber-800 text-amber-400 uppercase">
                        Warning
                      </span>
                    </div>
                    <p className="text-[11px] text-amber-200/80 leading-relaxed">
                      {issue.message}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Core Rules Section 25 Quick Reference */}
          <div className="p-4 rounded-xl bg-grimdark-950 border border-grimdark-800 text-grimdark-400 mt-6">
            <h4 className="font-warhammer text-xs font-bold text-amber-400 mb-2">
              11th Edition Core Rules Checklist
            </h4>
            <ul className="space-y-1.5 text-[11px] text-grimdark-300 list-disc list-inside">
              <li>Exactly 1 Character Warlord designated.</li>
              <li>Detachment Points (DP) within budget.</li>
              <li>No duplicate detachments or conflicting tags.</li>
              <li>All SUPPORT units attached to Bodyguard units.</li>
              <li>Max 1 Leader + 1 Support per Bodyguard unit.</li>
              <li>Max 1 Enhancement per attached combination.</li>
              <li>Epic Heroes strictly limited to 1 per army.</li>
            </ul>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-grimdark-800 bg-grimdark-950 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-grimdark-800 hover:bg-grimdark-700 text-grimdark-200 hover:text-white text-xs font-medium transition-colors"
          >
            Close Audit
          </button>
        </div>

      </div>
    </div>
  );
};
