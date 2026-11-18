import React, { useState, useEffect, useCallback } from 'react';
import { X, GitMerge, Loader2, CheckCircle2, AlertTriangle, KeyRound } from 'lucide-react';

const PROMOTE_ENDPOINT_BASE = 'https://armybuilder-ai-webhook-vcacnrto3a-uc.a.run.app';
const PROMOTE_SECRET_STORAGE_KEY = 'wh40k_11e_promote_secret';

interface PromoteStagingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type PromotePhase =
  | 'need-secret'
  | 'checking'
  | 'merging'
  | 'merged'
  | 'cannot-merge'
  | 'error';

export const PromoteStagingModal: React.FC<PromoteStagingModalProps> = ({ isOpen, onClose }) => {
  const [secretInput, setSecretInput] = useState('');
  const [phase, setPhase] = useState<PromotePhase>('checking');
  const [message, setMessage] = useState('');
  const [details, setDetails] = useState<{ sha?: string; aheadBy?: number; commits?: { sha: string; message: string }[] }>({});

  const runCheckAndMerge = useCallback(async (secret: string) => {
    const clean = secret.trim();
    if (!clean) {
      setPhase('need-secret');
      return;
    }

    setPhase('checking');
    setMessage('Checking if staging can merge cleanly into master...');
    setDetails({});

    try {
      const checkRes = await fetch(`${PROMOTE_ENDPOINT_BASE}/promote/check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Promote-Secret': clean
        }
      });

      const checkData = await checkRes.json().catch(() => ({}));
      if (checkRes.status === 401) {
        localStorage.removeItem(PROMOTE_SECRET_STORAGE_KEY);
        setPhase('need-secret');
        setMessage('Invalid promote key. Please enter your staging promote key.');
        return;
      }

      if (!checkRes.ok) {
        setPhase('error');
        setMessage(checkData?.error || `Check failed (${checkRes.status})`);
        return;
      }

      localStorage.setItem(PROMOTE_SECRET_STORAGE_KEY, clean);

      if (!checkData.canMerge) {
        setPhase('cannot-merge');
        setMessage(checkData.reason || 'Nothing to merge from staging to master.');
        return;
      }

      setPhase('merging');
      setMessage(`Merging ${checkData.aheadBy} commit(s) from staging into master...`);
      setDetails({ aheadBy: checkData.aheadBy, commits: checkData.commits });

      const mergeRes = await fetch(`${PROMOTE_ENDPOINT_BASE}/promote/merge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Promote-Secret': clean
        }
      });
      const mergeData = await mergeRes.json().catch(() => ({}));

      if (!mergeRes.ok || !mergeData.merged) {
        setPhase('error');
        setMessage(mergeData?.error || mergeData?.reason || `Merge failed (${mergeRes.status})`);
        return;
      }

      setPhase('merged');
      setMessage(mergeData.message || 'Merged staging into master. Production build triggered.');
      setDetails((prev) => ({ ...prev, sha: mergeData.sha, aheadBy: mergeData.aheadBy }));
    } catch (err: any) {
      setPhase('error');
      setMessage(err?.message || 'Network error contacting promote endpoint.');
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const saved = localStorage.getItem(PROMOTE_SECRET_STORAGE_KEY) || '';
    if (saved) {
      setSecretInput(saved);
      runCheckAndMerge(saved);
    } else {
      setPhase('need-secret');
      setMessage('Enter your staging promote key to check and merge staging → master.');
      setDetails({});
    }
  }, [isOpen, runCheckAndMerge]);

  if (!isOpen) return null;

  const handleSaveAndRun = (e: React.FormEvent) => {
    e.preventDefault();
    runCheckAndMerge(secretInput);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="bg-theme-surface border border-theme-border w-full max-w-md rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-theme-border-subtle bg-theme-card">
          <div className="flex items-center gap-2">
            <GitMerge className="w-4 h-4 text-amber-400" />
            <h2 className="font-warhammer text-sm sm:text-base font-bold text-theme-text">
              Promote Staging → Master
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn-theme-icon min-w-[32px] min-h-[32px] rounded-lg"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4 text-xs sm:text-sm">
          {phase === 'need-secret' ? (
            <form onSubmit={handleSaveAndRun} className="space-y-3">
              {message && <p className="text-theme-text-secondary text-xs">{message}</p>}
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-400 shrink-0" />
                <input
                  type="password"
                  required
                  autoFocus
                  value={secretInput}
                  onChange={(e) => setSecretInput(e.target.value)}
                  placeholder="Enter promote key..."
                  className="flex-1 px-3 py-2 rounded-xl bg-theme-bg border border-theme-border text-theme-text focus:outline-none focus:border-theme-accent text-sm"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={onClose} className="btn-theme-secondary px-3.5 py-2 rounded-xl text-xs font-semibold">
                  Cancel
                </button>
                <button type="submit" className="btn-theme-primary px-4 py-2 rounded-xl text-xs font-bold">
                  Check &amp; Merge
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-3">
              <div className="flex items-start gap-2.5 p-3 rounded-xl bg-theme-card border border-theme-border-subtle">
                {(phase === 'checking' || phase === 'merging') && (
                  <Loader2 className="w-4 h-4 text-amber-400 animate-spin shrink-0 mt-0.5" />
                )}
                {phase === 'merged' && (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                )}
                {(phase === 'cannot-merge' || phase === 'error') && (
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                )}
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-theme-text font-medium">{message}</p>
                  {details.sha && (
                    <p className="text-[11px] font-mono text-emerald-300">
                      Merge commit: {details.sha}
                    </p>
                  )}
                </div>
              </div>

              {details.commits && details.commits.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-theme-text-muted">
                    Included Commits
                  </span>
                  <ul className="space-y-1 max-h-36 overflow-y-auto text-[11px] font-mono bg-theme-bg rounded-xl p-2.5 border border-theme-border-subtle">
                    {details.commits.map((c) => (
                      <li key={c.sha} className="truncate text-theme-text-secondary">
                        <span className="text-amber-300">{c.sha}</span> {c.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => {
                    localStorage.removeItem(PROMOTE_SECRET_STORAGE_KEY);
                    setSecretInput('');
                    setPhase('need-secret');
                    setMessage('Enter a new promote key.');
                  }}
                  className="text-[11px] text-theme-text-muted hover:text-theme-text underline"
                >
                  Change key
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="btn-theme-primary px-4 py-1.5 rounded-xl text-xs font-bold"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
