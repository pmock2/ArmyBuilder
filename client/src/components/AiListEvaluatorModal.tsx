import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Sparkles,
  Loader2,
  AlertCircle,
  Key,
  RefreshCw,
  Copy,
  Check,
  Send
} from 'lucide-react';
import { ArmyRoster, ValidationResult } from '../types/roster';
import { FactionDetail } from '../types/faction';
import { hasApiKey } from '../services/geminiService';
import { evaluateRosterWithAi } from '../services/aiListEvaluator';
import { MarkdownRenderer } from './MarkdownRenderer';
import { startVoxTransmission } from '../utils/haptics';

interface AiListEvaluatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
  roster: ArmyRoster;
  validation: ValidationResult;
  factionData?: FactionDetail | null;
}

function buildRosterFingerprint(roster: ArmyRoster, validation: ValidationResult): string {
  return JSON.stringify({
    id: roster.id,
    battleSize: roster.battleSize,
    pts: validation.totalPoints,
    dp: validation.totalDP,
    disp: roster.forceDisposition || null,
    dets: roster.detachments.map((d) => d.name),
    units: roster.units.map((u) => ({
      id: u.instanceId,
      m: u.modelsCount,
      c: u.cost,
      w: u.isWarlord,
      e: u.enhancement?.name,
      l: u.attachedLeaderId,
      s: u.attachedSupportId,
      o: u.selectedOptions
    }))
  });
}

export const AiListEvaluatorModal: React.FC<AiListEvaluatorModalProps> = ({
  isOpen,
  onClose,
  onOpenSettings,
  roster,
  validation,
  factionData
}) => {
  const [evaluationText, setEvaluationText] = useState<string>('');
  const [lastFingerprint, setLastFingerprint] = useState<string>('');
  const [customFocus, setCustomFocus] = useState<string>('');
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const activeRunRef = useRef<number>(0);

  const keyConfigured = hasApiKey();
  const currentFingerprint = buildRosterFingerprint(roster, validation);

  const runEvaluation = async (focusOverride?: string) => {
    if (!hasApiKey()) {
      onOpenSettings();
      return;
    }

    const runId = Date.now();
    activeRunRef.current = runId;
    setIsEvaluating(true);
    setErrorMsg(null);
    const stopVox = startVoxTransmission();

    try {
      const result = await evaluateRosterWithAi(
        roster,
        validation,
        factionData,
        focusOverride ?? customFocus
      );
      if (activeRunRef.current === runId) {
        setEvaluationText(result);
        setLastFingerprint(currentFingerprint);
      }
    } catch (err: any) {
      if (activeRunRef.current === runId) {
        setErrorMsg(err?.message || 'Failed to evaluate roster. Please try again.');
      }
    } finally {
      stopVox();
      if (activeRunRef.current === runId) {
        setIsEvaluating(false);
      }
    }
  };

  useEffect(() => {
    if (!isOpen || !keyConfigured) return;
    if (roster.units.length === 0) return;
    if (currentFingerprint !== lastFingerprint && !isEvaluating) {
      void runEvaluation('');
    }
  }, [isOpen, keyConfigured, currentFingerprint]);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (!evaluationText) return;
    navigator.clipboard.writeText(evaluationText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmitFocus = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEvaluating) return;
    void runEvaluation(customFocus);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-3xl bg-theme-surface border border-theme-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-theme-border-subtle bg-theme-card">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500/20 to-indigo-500/20 border border-sky-400/40 flex items-center justify-center text-sky-400 shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="font-warhammer text-base sm:text-lg font-bold text-theme-text tracking-wide truncate">
                AI List Evaluation
              </h2>
              <p className="text-[11px] text-theme-text-secondary truncate">
                {roster.name} • {validation.totalPoints}/{validation.pointsLimit} pts • {validation.totalDP}/{validation.dpLimit} DP • {roster.units.length} units
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {evaluationText && !isEvaluating && (
              <button
                type="button"
                onClick={handleCopy}
                className="btn-theme-secondary px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                title="Copy Evaluation"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
              </button>
            )}

            {keyConfigured && roster.units.length > 0 && (
              <button
                type="button"
                disabled={isEvaluating}
                onClick={() => void runEvaluation(customFocus)}
                className="btn-theme-secondary px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 disabled:opacity-50"
                title="Re-evaluate Current List"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isEvaluating ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Re-evaluate</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="btn-theme-icon min-w-[32px] min-h-[32px] rounded-lg"
              aria-label="Close AI List Evaluation"
            >
              <X className="w-4 h-4 stroke-[2]" />
            </button>
          </div>
        </div>

        {/* Body */}
        {!keyConfigured ? (
          <div className="p-8 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-sky-500/15 border border-sky-400/35 flex items-center justify-center text-sky-400">
              <Key className="w-7 h-7" />
            </div>
            <div className="space-y-1.5 max-w-md">
              <h3 className="font-warhammer text-base font-bold text-theme-text">
                Gemini API Key Required
              </h3>
              <p className="text-xs sm:text-sm text-theme-text-secondary">
                Configure your Gemini API key in AI Settings to run AI tactical list evaluations.
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenSettings}
              className="btn-theme-primary px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2"
            >
              <Key className="w-4 h-4" />
              <span>Configure API Key</span>
            </button>
          </div>
        ) : roster.units.length === 0 ? (
          <div className="p-8 text-center text-sm text-theme-text-secondary">
            Add at least one unit to your roster before evaluating with AI.
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {isEvaluating ? (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                  <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-theme-text">
                      Evaluating {roster.name}...
                    </p>
                    <p className="text-xs text-theme-text-muted">
                      Reviewing matchups, synergies, points efficiency, and potential traps
                    </p>
                  </div>
                </div>
              ) : errorMsg ? (
                <div className="p-4 rounded-xl bg-red-950/50 border border-red-700/60 text-xs sm:text-sm text-red-200 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              ) : evaluationText ? (
                <div className="space-y-3.5">
                  {evaluationText
                    .split(/\n(?=#{2,3}\s+)/)
                    .map((section) => section.trim())
                    .filter(Boolean)
                    .map((section, idx) => (
                      <div
                        key={idx}
                        className="p-4 sm:p-5 rounded-xl bg-theme-card/90 border border-theme-border-subtle shadow-sm"
                      >
                        <MarkdownRenderer
                          content={section}
                          className="text-sm text-theme-text leading-relaxed"
                        />
                      </div>
                    ))}
                </div>
              ) : null}
            </div>

            {/* Optional Focus / Follow-up Prompt */}
            <form
              onSubmit={handleSubmitFocus}
              className="px-4 sm:px-5 py-3 border-t border-theme-border-subtle bg-theme-card flex items-center gap-2"
            >
              <input
                type="text"
                value={customFocus}
                disabled={isEvaluating}
                onChange={(e) => setCustomFocus(e.target.value)}
                placeholder="Optional focus (e.g. 'Check anti-tank matchups' or 'How should I spend spare points?')"
                className="flex-1 bg-theme-elevated border border-theme-border rounded-xl px-3 py-2 text-xs sm:text-sm text-theme-text placeholder-theme-text-muted focus:outline-none focus:border-theme-accent"
              />
              <button
                type="submit"
                disabled={isEvaluating}
                className="btn-theme-primary px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Ask AI</span>
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

