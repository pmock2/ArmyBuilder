import React from 'react';
import { X, AlertTriangle, AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-slate-900 border-l border-slate-700 h-full shadow-2xl flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800 bg-slate-900/95">
          <div className="flex items-center gap-2.5">
            {validation.isValid ? (
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-400" />
            )}
            <div>
              <h2 className="font-warhammer text-base font-bold text-slate-100">
                11th Edition Rules Audit
              </h2>
              <p className="text-xs text-slate-400">
                {validation.isValid ? 'Army is battle-forged & legal' : `${validation.errorsCount} validation issues detected`}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="btn-theme-icon min-w-[38px] min-h-[38px] rounded-xl"
            aria-label="Close rules audit"
          >
            <X className="w-4 h-4 stroke-[2]" />
          </button>
        </div>

        {/* Issues List */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 text-xs sm:text-sm">
          
          {validation.isValid && (
            <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-600/50 text-emerald-300 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-warhammer text-xs sm:text-sm font-bold text-emerald-200 mb-1">
                  Army is Battle-Forged
                </h3>
                <p className="text-xs text-emerald-300/90 leading-relaxed">
                  Your roster complies with all core rules of Warhammer 40k 11th Edition, including Detachment Points, detachment exclusivity tags, Warlord designation, and dual-attachment limits.
                </p>
              </div>
            </div>
          )}

          {/* Errors Section */}
          {errors.length > 0 && (
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-red-400 mb-2.5 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                <span>Critical Rule Violations ({errors.length})</span>
              </h3>

              <div className="space-y-2.5">
                {errors.map((issue) => (
                  <div
                    key={issue.id}
                    className="p-3.5 rounded-xl bg-red-950/40 border border-red-700/60 text-red-200"
                  >
                    <div className="font-semibold text-xs sm:text-sm text-red-300 mb-1 flex items-center justify-between">
                      <span>{issue.title}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-red-950 border border-red-800 text-red-400 uppercase">
                        Illegal
                      </span>
                    </div>
                    <p className="text-xs text-red-200/90 leading-relaxed">
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
              <h3 className="text-xs font-bold uppercase tracking-wider text-sky-400 mb-2.5 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" />
                <span>Warnings & Recommendations ({warnings.length})</span>
              </h3>

              <div className="space-y-2.5">
                {warnings.map((issue) => (
                  <div
                    key={issue.id}
                    className="p-3.5 rounded-xl bg-sky-950/30 border border-sky-700/50 text-sky-200"
                  >
                    <div className="font-semibold text-xs sm:text-sm text-sky-300 mb-1 flex items-center justify-between">
                      <span>{issue.title}</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-sky-950 border border-sky-800 text-sky-400 uppercase">
                        Warning
                      </span>
                    </div>
                    <p className="text-xs text-sky-200/90 leading-relaxed">
                      {issue.message}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Core Rules Quick Reference */}
          <div className="p-4 rounded-xl bg-slate-850 border border-slate-750 text-slate-300 mt-6">
            <h4 className="font-warhammer text-xs sm:text-sm font-bold text-slate-200 mb-2">
              11th Edition Core Rules Checklist
            </h4>
            <ul className="space-y-2 text-xs text-slate-300 list-disc list-inside">
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
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex justify-end">
          <button
            onClick={onClose}
            className="w-full sm:w-auto min-h-[46px] px-6 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white text-sm font-semibold transition-colors active:scale-95"
          >
            Close Audit
          </button>
        </div>

      </div>
    </div>
  );
};
