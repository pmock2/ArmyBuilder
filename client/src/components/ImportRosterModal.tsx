import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  Upload,
  FileText,
  Loader2,
  AlertCircle,
  Sparkles,
  QrCode,
  Camera,
  CameraOff,
  Image as ImageIcon,
  RefreshCw
} from 'lucide-react';
import { ArmyRoster } from '../types/roster';
import { FactionSummary } from '../types/faction';
import { parseRosterJSON } from '../utils/storage';
import { isProbablySupportedTextList, parseGwTextRoster } from '../utils/gwListImporter';
import { decodeShareCodeToRoster, extractShareCodeFromInput } from '../utils/rosterShareCodec';
import { detectQRFromImageFile, detectQRFromVideoFrame } from '../utils/qrScanner';
import { useBackNavigation } from '../utils/backNavigation';
import factionsIndexData from '../data/factions_index.json';

export type ImportModalTab = 'paste' | 'qr';

interface ImportRosterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportRoster: (roster: ArmyRoster) => void;
  initialTab?: ImportModalTab;
}

export const ImportRosterModal: React.FC<ImportRosterModalProps> = ({
  isOpen,
  onClose,
  onImportRoster,
  initialTab = 'paste'
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const qrImageInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [activeTab, setActiveTab] = useState<ImportModalTab>(initialTab);
  const [textInput, setTextInput] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Camera scanner state
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanPaused, setScanPaused] = useState(false);
  const [scanSession, setScanSession] = useState(0);

  useBackNavigation(isOpen, onClose);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setCameraStarting(false);
  };

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setErrorMsg(null);
      setCameraError(null);
      setScanPaused(false);
    } else {
      stopCamera();
    }
  }, [isOpen, initialTab]);

  useEffect(() => {
    if (!isOpen || activeTab !== 'qr') {
      stopCamera();
      return;
    }

    let cancelled = false;
    let scanTimeout: number | null = null;
    let scanningFrame = false;

    const startCameraAndScan = async () => {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        setCameraError(
          'Camera access is unavailable in this browser or context. You can still upload a QR code image below.'
        );
        return;
      }

      setCameraStarting(true);
      setCameraError(null);
      setScanPaused(false);

      try {
        let stream: MediaStream;
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: 'environment' },
              width: { ideal: 1280 },
              height: { ideal: 720 }
            },
            audio: false
          });
        } catch {
          // Fallback for devices rejecting facingMode/resolution constraints
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false
          });
        }

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        const videoEl = videoRef.current;
        if (videoEl) {
          videoEl.srcObject = stream;
          await videoEl.play().catch(() => {});
        }
        setCameraActive(true);
        setCameraStarting(false);

        if (!canvasRef.current) {
          canvasRef.current = document.createElement('canvas');
        }

        const tick = async () => {
          if (cancelled || !streamRef.current) return;
          const v = videoRef.current;
          const c = canvasRef.current;

          if (v && c && !scanningFrame && v.readyState >= 2 && v.videoWidth > 0) {
            scanningFrame = true;
            try {
              const raw = await detectQRFromVideoFrame(v, c);
              if (!cancelled && raw) {
                const shareCode = extractShareCodeFromInput(raw);
                if (!shareCode) {
                  setErrorMsg(
                    'QR code detected, but it does not contain a valid Army Builder list.'
                  );
                  setScanPaused(true);
                  stopCamera();
                  return;
                }
                stopCamera();
                await importFromShareInput(raw);
                return;
              }
            } catch {
              // Ignore single-frame scan errors and keep scanning
            } finally {
              scanningFrame = false;
            }
          }

          if (!cancelled && streamRef.current) {
            scanTimeout = window.setTimeout(tick, 180);
          }
        };

        scanTimeout = window.setTimeout(tick, 220);
      } catch (err: any) {
        if (cancelled) return;
        setCameraStarting(false);
        setCameraActive(false);
        const name = err?.name || '';
        if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
          setCameraError(
            'Camera permission was denied. Allow camera access in your browser settings or upload a QR code image below.'
          );
        } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
          setCameraError('No camera was found on this device. Upload a QR code image below instead.');
        } else {
          setCameraError(
            err?.message || 'Unable to access camera. You can upload a QR code image below instead.'
          );
        }
      }
    };

    void startCameraAndScan();

    return () => {
      cancelled = true;
      if (scanTimeout !== null) window.clearTimeout(scanTimeout);
      stopCamera();
    };
  }, [isOpen, activeTab, scanSession]);

  if (!isOpen) return null;

  const factionsIndex = factionsIndexData as FactionSummary[];

  const importFromShareInput = async (raw: string) => {
    setIsImporting(true);
    setErrorMsg(null);
    try {
      const { roster, warnings } = await decodeShareCodeToRoster(raw, factionsIndex);
      if (warnings.length > 0) {
        alert(`Imported "${roster.name}" with notes:\n• ${warnings.join('\n• ')}`);
      }
      onImportRoster(roster);
      setTextInput('');
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to decode shared army list.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleImportContent = async (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) {
      setErrorMsg('Please paste a list, share code, or choose a file to import.');
      return;
    }

    setIsImporting(true);
    setErrorMsg(null);

    try {
      const shareCode = extractShareCodeFromInput(trimmed);
      if (shareCode) {
        const { roster, warnings } = await decodeShareCodeToRoster(shareCode, factionsIndex);
        if (warnings.length > 0) {
          alert(`Imported "${roster.name}" with notes:\n• ${warnings.join('\n• ')}`);
        }
        onImportRoster(roster);
        setTextInput('');
        onClose();
        return;
      }

      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        const parsed = parseRosterJSON(trimmed);
        onImportRoster(parsed);
        setTextInput('');
        onClose();
        return;
      }

      if (!isProbablySupportedTextList(trimmed)) {
        throw new Error(
          'Unrecognized list format. Paste a GW App / New Recruit export, a share link/code, or upload a .json roster file.'
        );
      }

      const { roster, warnings } = await parseGwTextRoster(trimmed, factionsIndex);
      if (warnings.length > 0) {
        alert(`Imported "${roster.name}" with notes:\n• ${warnings.join('\n• ')}`);
      }
      onImportRoster(roster);
      setTextInput('');
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to import army list.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = String(event.target?.result || '');
      void handleImportContent(content);
    };
    reader.readAsText(file);
    if (e.target) e.target.value = '';
  };

  const handleQrImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = '';
    if (!file) return;

    setIsImporting(true);
    setErrorMsg(null);

    try {
      const decoded = await detectQRFromImageFile(file);
      if (!decoded) {
        throw new Error('No QR code could be detected in that image. Try a clearer or tighter image.');
      }
      const shareCode = extractShareCodeFromInput(decoded);
      if (!shareCode) {
        throw new Error('QR code detected, but it does not contain a valid Army Builder list.');
      }
      stopCamera();
      const { roster, warnings } = await decodeShareCodeToRoster(shareCode, factionsIndex);
      if (warnings.length > 0) {
        alert(`Imported "${roster.name}" with notes:\n• ${warnings.join('\n• ')}`);
      }
      onImportRoster(roster);
      setTextInput('');
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to read QR code from image.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleRetryScan = () => {
    setErrorMsg(null);
    setCameraError(null);
    setScanPaused(false);
    setScanSession((s) => s + 1);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-theme-surface border border-theme-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-theme-border-subtle bg-theme-card">
          <div className="flex items-center gap-2.5 min-w-0">
            {activeTab === 'qr' ? (
              <QrCode className="w-4 h-4 text-theme-accent-soft shrink-0" />
            ) : (
              <Upload className="w-4 h-4 text-theme-accent-soft shrink-0" />
            )}
            <div className="min-w-0">
              <h2 className="font-warhammer text-base sm:text-lg font-bold text-theme-text tracking-wide truncate">
                Import Army List
              </h2>
              <p className="text-[11px] text-theme-text-secondary truncate">
                {activeTab === 'qr'
                  ? 'Scan a shared Army Builder QR code with your camera or from an image'
                  : 'Paste a GW / New Recruit list, share code/link, or upload a .json / .txt file'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="btn-theme-icon min-w-[32px] min-h-[32px] rounded-lg shrink-0"
            aria-label="Close Import Dialog"
          >
            <X className="w-4 h-4 stroke-[2]" />
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="px-4 sm:px-5 pt-3 bg-theme-surface">
          <div className="inline-flex bg-theme-bg p-1 rounded-xl border border-theme-border-subtle w-full sm:w-auto">
            <button
              type="button"
              onClick={() => {
                setActiveTab('qr');
                setErrorMsg(null);
              }}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'qr'
                  ? 'bg-theme-accent text-white shadow-sm'
                  : 'text-theme-text-secondary hover:text-theme-text'
              }`}
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>Scan QR Code</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('paste');
                setErrorMsg(null);
              }}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'paste'
                  ? 'bg-theme-accent text-white shadow-sm'
                  : 'text-theme-text-secondary hover:text-theme-text'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Paste / File</span>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {activeTab === 'qr' ? (
            <>
              {/* Camera Scanner Viewport */}
              <div className="relative rounded-2xl overflow-hidden bg-slate-950 border border-theme-border aspect-[4/3] sm:aspect-video flex items-center justify-center">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  autoPlay
                  className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
                />

                {cameraActive && (
                  <>
                    {/* Viewfinder Overlay */}
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                      <div className="w-48 h-48 sm:w-56 sm:h-56 relative">
                        <span className="absolute top-0 left-0 w-7 h-7 border-t-4 border-l-4 border-theme-accent rounded-tl-lg" />
                        <span className="absolute top-0 right-0 w-7 h-7 border-t-4 border-r-4 border-theme-accent rounded-tr-lg" />
                        <span className="absolute bottom-0 left-0 w-7 h-7 border-b-4 border-l-4 border-theme-accent rounded-bl-lg" />
                        <span className="absolute bottom-0 right-0 w-7 h-7 border-b-4 border-r-4 border-theme-accent rounded-br-lg" />
                      </div>
                    </div>
                    <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/70 border border-white/15 text-[11px] font-medium text-white flex items-center gap-1.5 whitespace-nowrap">
                      <Camera className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                      <span>Point camera at a list QR code</span>
                    </div>
                  </>
                )}

                {!cameraActive && (
                  <div className="p-5 text-center space-y-3 max-w-sm">
                    {isImporting ? (
                      <>
                        <Loader2 className="w-8 h-8 animate-spin text-theme-accent-soft mx-auto" />
                        <p className="text-xs sm:text-sm font-semibold text-white">
                          Importing army list...
                        </p>
                      </>
                    ) : cameraStarting ? (
                      <>
                        <Loader2 className="w-7 h-7 animate-spin text-theme-accent-soft mx-auto" />
                        <p className="text-xs text-slate-300">Starting camera...</p>
                      </>
                    ) : (
                      <>
                        <CameraOff className="w-8 h-8 text-slate-400 mx-auto" />
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {cameraError || (scanPaused ? 'Scanning paused.' : 'Camera is inactive.')}
                        </p>
                        <button
                          type="button"
                          onClick={handleRetryScan}
                          className="btn-theme-primary px-3.5 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>{scanPaused ? 'Scan Again' : 'Retry Camera'}</span>
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Upload QR Image Alternative */}
              <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-theme-card border border-theme-border-subtle">
                <div className="flex items-center gap-2.5 min-w-0">
                  <ImageIcon className="w-4 h-4 text-theme-accent-soft shrink-0" />
                  <div className="min-w-0">
                    <span className="text-xs sm:text-sm font-bold text-theme-text block">
                      Import from QR Image
                    </span>
                    <span className="text-[11px] text-theme-text-muted block truncate">
                      Select a saved QR screenshot or PNG image from your device
                    </span>
                  </div>
                </div>

                <input
                  ref={qrImageInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => void handleQrImageChange(e)}
                  className="hidden"
                />
                <button
                  type="button"
                  disabled={isImporting}
                  onClick={() => qrImageInputRef.current?.click()}
                  className="btn-theme-secondary px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0 disabled:opacity-50"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Choose Image</span>
                </button>
              </div>
            </>
          ) : (
            <>
              {/* File Upload */}
              <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-theme-card border border-theme-border-subtle">
                <div className="flex items-center gap-2.5 min-w-0">
                  <FileText className="w-4 h-4 text-theme-accent-soft shrink-0" />
                  <div className="min-w-0">
                    <span className="text-xs sm:text-sm font-bold text-theme-text block">
                      Import from File
                    </span>
                    <span className="text-[11px] text-theme-text-muted block truncate">
                      Supports exported .json rosters and .txt GW / New Recruit lists
                    </span>
                  </div>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,.txt,text/plain,application/json"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  disabled={isImporting}
                  onClick={() => fileInputRef.current?.click()}
                  className="btn-theme-secondary px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 shrink-0 disabled:opacity-50"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Choose File</span>
                </button>
              </div>

              {/* Paste Text Area */}
              <div className="space-y-2">
                <label
                  htmlFor="gw-import-textarea"
                  className="text-xs font-bold uppercase tracking-wider text-theme-text-secondary flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-theme-accent-soft" />
                  <span>Paste List, Share Link, or Share Code</span>
                </label>
                <textarea
                  id="gw-import-textarea"
                  rows={9}
                  value={textInput}
                  disabled={isImporting}
                  onChange={(e) => {
                    setTextInput(e.target.value);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  placeholder={`Paste a 40K1Z:... share link/code OR a GW / New Recruit list:\n\nCHARACTERS\n\nAdrax Agatone (90 Points)\n  • 1x Drakkis\n  • 1x Malleus Noctum\n\nBATTLELINE\n\nIntercessor Squad (85 Points)...`}
                  className="w-full bg-theme-elevated border border-theme-border rounded-xl p-3 text-xs font-mono text-theme-text placeholder-theme-text-muted focus:outline-none focus:border-theme-accent resize-y"
                />
              </div>
            </>
          )}

          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-950/50 border border-red-700/60 text-xs text-red-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              disabled={isImporting}
              onClick={onClose}
              className="btn-theme-secondary px-3.5 py-2 rounded-xl text-xs font-semibold"
            >
              Cancel
            </button>
            {activeTab === 'paste' && (
              <button
                type="button"
                disabled={isImporting || !textInput.trim()}
                onClick={() => void handleImportContent(textInput)}
                className="btn-theme-primary px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Importing List...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>Import List</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
