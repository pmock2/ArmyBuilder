import React, { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';

export const isStagingBuild =
  (import.meta as any).env?.VITE_APP_ENV === 'staging' ||
  (typeof window !== 'undefined' && window.location.pathname.includes('/staging'));

export const StagingBanner: React.FC = () => {
  const [dismissed, setDismissed] = useState(false);

  if (!isStagingBuild || dismissed) return null;

  return (
    <div
      role="status"
      className="fixed bottom-0 inset-x-0 z-40 bg-amber-950/95 backdrop-blur-sm border-t border-amber-500/50 text-amber-200 px-3 py-1.5 flex items-center justify-center gap-2 text-[11px] sm:text-xs font-semibold shadow-lg"
    >
      <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
      <span className="truncate">
        STAGING / DEV BUILD — Non-production preview environment
      </span>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        className="ml-1 p-0.5 rounded hover:bg-amber-500/20 text-amber-300 shrink-0"
        aria-label="Dismiss staging banner"
        title="Dismiss"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
