import React, { useEffect, useState } from 'react';
import { Download, Share, X, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const DISMISS_STORAGE_KEY = 'wh40k_pwa_install_dismissed';

function isRunningStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
}

function isIosSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  const isIos = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  return isIos && isSafari;
}

export const InstallPromptBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(DISMISS_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (isRunningStandalone() || dismissed) return;

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setShowIosGuide(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    if (isIosSafari()) {
      setShowIosGuide(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [dismissed]);

  const handleDismiss = () => {
    setDismissed(true);
    setDeferredPrompt(null);
    setShowIosGuide(false);
    try {
      localStorage.setItem(DISMISS_STORAGE_KEY, 'true');
    } catch {
      // ignore storage errors
    }
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  if (dismissed || isRunningStandalone() || (!deferredPrompt && !showIosGuide)) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-3 right-3 sm:left-auto sm:right-5 sm:max-w-sm z-50 animate-in fade-in slide-in-from-bottom-3 duration-200">
      <div className="bg-theme-surface/95 backdrop-blur-md border border-theme-border rounded-2xl p-3.5 shadow-2xl shadow-black/60 flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-theme-accent/20 border border-theme-accent/40 flex items-center justify-center shrink-0">
          <Smartphone className="w-5 h-5 text-theme-accent-soft" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-xs sm:text-sm font-bold text-theme-text">
              Install App on Device
            </h3>
            <button
              type="button"
              onClick={handleDismiss}
              className="text-theme-text-muted hover:text-theme-text p-0.5 rounded-md"
              aria-label="Dismiss install prompt"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {deferredPrompt ? (
            <>
              <p className="text-[11px] sm:text-xs text-theme-text-secondary mt-0.5 leading-relaxed">
                Add 40k Builder to your home screen for full-screen launch and quick tabletop access.
              </p>
              <div className="mt-2.5 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleInstallClick}
                  className="btn-theme-primary px-3.5 py-1.5 rounded-xl text-xs flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Install</span>
                </button>
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="btn-theme-secondary px-3 py-1.5 rounded-xl text-xs"
                >
                  Not now
                </button>
              </div>
            </>
          ) : (
            <p className="text-[11px] sm:text-xs text-theme-text-secondary mt-1 leading-relaxed flex items-center flex-wrap gap-1">
              <span>Tap</span>
              <Share className="w-3.5 h-3.5 text-theme-accent-soft inline" />
              <span className="font-semibold text-theme-text">Share</span>
              <span>then</span>
              <span className="font-semibold text-theme-text">&ldquo;Add to Home Screen&rdquo;</span>
              <span>to launch straight from your home screen.</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
