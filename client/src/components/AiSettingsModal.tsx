import React, { useState, useEffect } from 'react';
import { X, Sparkles, Key, Check, AlertCircle, Loader2, ExternalLink, ShieldCheck } from 'lucide-react';
import { getStoredApiKey, setStoredApiKey, validateApiKey } from '../services/geminiService';

interface AiSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeySaved?: (hasKey: boolean) => void;
}

export const AiSettingsModal: React.FC<AiSettingsModalProps> = ({
  isOpen,
  onClose,
  onKeySaved
}) => {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setApiKey(getStoredApiKey());
      setStatusMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSaveAndTest = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKey = apiKey.trim();
    if (!cleanKey) {
      setStoredApiKey('');
      setStatusMessage({ type: 'success', text: 'API key cleared.' });
      if (onKeySaved) onKeySaved(false);
      return;
    }

    setIsTesting(true);
    setStatusMessage(null);

    const result = await validateApiKey(cleanKey);
    setIsTesting(false);

    if (result.valid) {
      setStoredApiKey(cleanKey);
      setStatusMessage({ type: 'success', text: 'Gemini API key verified and saved successfully!' });
      if (onKeySaved) onKeySaved(true);
    } else {
      setStatusMessage({ type: 'error', text: result.error || 'Failed to validate API key.' });
    }
  };

  const handleClear = () => {
    setApiKey('');
    setStoredApiKey('');
    setStatusMessage({ type: 'success', text: 'API key removed.' });
    if (onKeySaved) onKeySaved(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-900/95">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500/20 to-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-warhammer text-base font-bold text-slate-100 tracking-wide">
                Gemini AI Configuration
              </h2>
              <span className="text-[11px] text-slate-400">Power Army Generation & Rules AI</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn-theme-icon min-w-[34px] min-h-[34px] rounded-xl"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4 stroke-[2]" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSaveAndTest} className="p-5 space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-200 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-sky-400" />
                Gemini API Key
              </span>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1 hover:underline"
              >
                <span>Get a free key</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </label>

            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setStatusMessage(null);
                }}
                placeholder="AIzaSy..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 pr-20 text-xs sm:text-sm font-mono text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-[11px] font-semibold text-slate-400 hover:text-slate-200 rounded"
              >
                {showKey ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {/* Privacy Note */}
          <div className="p-3 rounded-xl bg-slate-850/80 border border-slate-750 flex items-start gap-2.5 text-xs text-slate-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
            <p className="leading-relaxed text-[11px]">
              Your key is saved locally in your browser (<span className="font-mono text-sky-300">localStorage</span>). It is sent directly to Google's official Gemini API and never routed through any third-party servers.
            </p>
          </div>

          {/* Status Feedback */}
          {statusMessage && (
            <div
              className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-950/60 border-emerald-600/50 text-emerald-300'
                  : 'bg-red-950/60 border-red-600/50 text-red-300'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              )}
              <span className="leading-relaxed">{statusMessage.text}</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-2 gap-3">
            <button
              type="button"
              onClick={handleClear}
              disabled={!apiKey && !getStoredApiKey()}
              className="text-xs text-slate-400 hover:text-red-400 disabled:opacity-30 disabled:pointer-events-none transition-colors px-2 py-1"
            >
              Clear Key
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="btn-theme-secondary min-h-[38px] px-4 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isTesting}
                className="btn-theme-primary min-h-[38px] px-5 rounded-xl text-xs font-bold tracking-wide flex items-center gap-2"
              >
                {isTesting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Save & Verify</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

