import React, { useState, useEffect } from 'react';
import { X, Copy, Check, Printer, Download, Share2, FileText, QrCode, Link2, Loader2, AlertCircle } from 'lucide-react';
import { ArmyRoster } from '../types/roster';
import { generateShareableText, generateTournamentText } from '../utils/exportText';
import { exportRosterJSON } from '../utils/storage';
import { encodeRosterToShareCode, buildShareUrl } from '../utils/rosterShareCodec';
import { generateQRCode, qrToSvgDataUrl, QRCodeResult } from '../utils/qrCode';

export type ExportFormat = 'share' | 'tournament' | 'qr';

interface ExportModalProps {
  roster: ArmyRoster;
  isOpen: boolean;
  onClose: () => void;
  initialFormat?: ExportFormat;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  roster,
  isOpen,
  onClose,
  initialFormat = 'share'
}) => {
  const [format, setFormat] = useState<ExportFormat>(initialFormat);
  const [copied, setCopied] = useState<'text' | 'link' | 'code' | null>(null);

  // QR state
  const [qrLoading, setQrLoading] = useState(false);
  const [qrError, setQrError] = useState<string | null>(null);
  const [qrResult, setQrResult] = useState<QRCodeResult | null>(null);
  const [qrSvgUrl, setQrSvgUrl] = useState<string | null>(null);
  const [shareCode, setShareCode] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setFormat(initialFormat);
      setCopied(null);
    }
  }, [isOpen, initialFormat]);

  useEffect(() => {
    if (!isOpen || format !== 'qr') {
      setQrLoading(false);
      return;
    }
    let cancelled = false;

    const buildQr = async () => {
      setQrLoading(true);
      setQrError(null);
      try {
        const code = await encodeRosterToShareCode(roster);
        if (cancelled) return;
        const url = buildShareUrl(code);
        setShareCode(code);
        setShareUrl(url);

        let qr: QRCodeResult;
        try {
          qr = generateQRCode(url, 'M');
        } catch {
          // If URL + code exceeds QR capacity, fall back to compact code only
          qr = generateQRCode(code, 'L');
        }
        if (cancelled) return;
        setQrResult(qr);
        setQrSvgUrl(qrToSvgDataUrl(qr, 4));
      } catch (err: any) {
        if (cancelled) return;
        setQrError(err?.message || 'Unable to generate QR code for this roster.');
        setQrResult(null);
        setQrSvgUrl(null);
      } finally {
        if (!cancelled) setQrLoading(false);
      }
    };

    void buildQr();
    return () => {
      cancelled = true;
    };
  }, [isOpen, format, roster]);

  if (!isOpen) return null;

  const textOutput = format === 'share'
    ? generateShareableText(roster)
    : generateTournamentText(roster);

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(textOutput);
      setCopied('text');
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // ignore clipboard errors
    }
  };

  const handleCopyShare = async (kind: 'link' | 'code') => {
    const val = kind === 'link' ? shareUrl : shareCode;
    if (!val) return;
    try {
      await navigator.clipboard.writeText(val);
      setCopied(kind);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // ignore clipboard errors
    }
  };

  const handleDownloadTxt = () => {
    const suffix = format === 'share' ? 'list' : 'tournament';
    const safeName = (roster.name || 'army-roster').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const blob = new Blob([textOutput], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${safeName}-${suffix}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadQrPng = () => {
    if (!qrResult) return;
    const quietZone = 4;
    const dim = qrResult.size + quietZone * 2;
    const scale = Math.max(4, Math.floor(720 / dim));
    const px = dim * scale;

    const canvas = document.createElement('canvas');
    canvas.width = px;
    canvas.height = px;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, px, px);
    ctx.fillStyle = '#000000';

    for (let r = 0; r < qrResult.size; r++) {
      for (let c = 0; c < qrResult.size; c++) {
        if (qrResult.modules[r][c]) {
          ctx.fillRect((c + quietZone) * scale, (r + quietZone) * scale, scale, scale);
        }
      }
    }

    const safeName = (roster.name || 'army-roster').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${safeName}-qr.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 'image/png');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-theme-surface border border-theme-border w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-theme-border-subtle bg-theme-surface">
          <div className="min-w-0 pr-2">
            <h2 className="font-warhammer text-base sm:text-lg font-bold text-theme-text truncate">
              Export & Share: {roster.name}
            </h2>
            <p className="text-xs text-theme-text-muted mt-0.5">
              Share via QR code, text summary, tournament sheet, or JSON backup.
            </p>
          </div>

          <button
            onClick={onClose}
            className="btn-theme-icon min-w-[38px] min-h-[38px] rounded-xl shrink-0"
            aria-label="Close export dialog"
          >
            <X className="w-4 h-4 stroke-[2]" />
          </button>
        </div>

        {/* Format Selector & Preview Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-3">
          {/* Format Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
            <div className="inline-flex bg-theme-bg p-1 rounded-xl border border-theme-border-subtle overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => {
                  setFormat('share');
                  setCopied(null);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  format === 'share'
                    ? 'bg-theme-accent text-white shadow-sm'
                    : 'text-theme-text-secondary hover:text-theme-text'
                }`}
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Shareable List</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setFormat('tournament');
                  setCopied(null);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  format === 'tournament'
                    ? 'bg-theme-accent text-white shadow-sm'
                    : 'text-theme-text-secondary hover:text-theme-text'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Tournament</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setFormat('qr');
                  setCopied(null);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                  format === 'qr'
                    ? 'bg-theme-accent text-white shadow-sm'
                    : 'text-theme-text-secondary hover:text-theme-text'
                }`}
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>QR Code</span>
              </button>
            </div>

            <span className="text-[11px] text-theme-text-muted font-mono">
              {format === 'share'
                ? 'Clean overview: units, leaders & enhancements'
                : format === 'tournament'
                ? 'Complete wargear breakdown & tournament metadata'
                : 'Full roster, detachments, wargear & attachments'}
            </span>
          </div>

          {format === 'qr' ? (
            <div className="flex flex-col items-center justify-center py-2 sm:py-4 space-y-3">
              {qrLoading ? (
                <div className="w-64 h-64 sm:w-72 sm:h-72 rounded-2xl bg-theme-bg border border-theme-border-subtle flex flex-col items-center justify-center gap-2 text-theme-text-secondary">
                  <Loader2 className="w-6 h-6 animate-spin text-theme-accent-soft" />
                  <span className="text-xs font-medium">Encoding roster QR code...</span>
                </div>
              ) : qrError ? (
                <div className="w-full p-4 rounded-xl bg-red-950/50 border border-red-700/60 text-xs text-red-200 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Failed to generate QR code</p>
                    <p className="mt-0.5 text-red-200/80">{qrError}</p>
                  </div>
                </div>
              ) : qrSvgUrl ? (
                <>
                  <div className="bg-white p-3 sm:p-4 rounded-2xl border border-theme-border shadow-lg">
                    <img
                      src={qrSvgUrl}
                      alt={`QR code for ${roster.name}`}
                      className="w-60 h-60 sm:w-72 sm:h-72 block select-none"
                      style={{ imageRendering: 'pixelated' }}
                    />
                  </div>

                  <div className="text-center max-w-md space-y-1">
                    <p className="text-xs sm:text-sm font-semibold text-theme-text">
                      {roster.name} • {roster.subFactionName || roster.factionName} ({roster.units.length} units)
                    </p>
                    <p className="text-[11px] text-theme-text-secondary leading-relaxed">
                      Scan this QR code in the Army Builder&apos;s <span className="font-semibold text-theme-text">Import → Scan QR Code</span> tool or with a phone camera to import the full list with all options.
                    </p>
                    {qrResult && shareUrl && (
                      <p className="text-[10px] font-mono text-theme-text-muted">
                        QR v{qrResult.version} ({qrResult.size}×{qrResult.size}) • ECC {qrResult.eccLevel} • {shareUrl.length} chars
                      </p>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          ) : (
            /* Text Preview */
            <div className="relative">
              <pre className="w-full h-80 p-4 rounded-xl bg-theme-bg border border-theme-border-subtle text-theme-text font-mono text-xs sm:text-sm overflow-y-auto whitespace-pre-wrap select-all leading-relaxed">
                {textOutput}
              </pre>
            </div>
          )}
        </div>

        {/* Actions Footer */}
        <div className="px-4 sm:px-6 py-3.5 border-t border-theme-border-subtle bg-theme-surface flex flex-wrap items-center justify-between gap-2.5">
          {format === 'qr' ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={!qrResult}
                  onClick={handleDownloadQrPng}
                  className="btn-theme-secondary min-h-[40px] flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold disabled:opacity-50"
                  title="Download QR code image (.png)"
                >
                  <Download className="w-4 h-4 text-theme-accent-soft" />
                  <span>Save QR (.png)</span>
                </button>

                <button
                  type="button"
                  disabled={!shareCode}
                  onClick={() => void handleCopyShare('code')}
                  className="btn-theme-secondary min-h-[40px] flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold disabled:opacity-50"
                  title="Copy compact share code"
                >
                  {copied === 'code' ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>Code Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-theme-text-secondary" />
                      <span>Copy Code</span>
                    </>
                  )}
                </button>
              </div>

              <button
                type="button"
                disabled={!shareUrl}
                onClick={() => void handleCopyShare('link')}
                className="btn-theme-primary min-h-[40px] flex items-center gap-2 px-4 sm:px-5 py-2 rounded-xl text-xs sm:text-sm tracking-wide disabled:opacity-50"
              >
                {copied === 'link' ? (
                  <>
                    <Check className="w-4 h-4 stroke-[2.5]" />
                    <span>Link Copied!</span>
                  </>
                ) : (
                  <>
                    <Link2 className="w-4 h-4 stroke-[2]" />
                    <span>Copy Share Link</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadTxt}
                  className="btn-theme-secondary min-h-[40px] flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold"
                  title="Download as plain text (.txt)"
                >
                  <Download className="w-4 h-4 text-theme-accent-soft" />
                  <span>Download .txt</span>
                </button>

                <button
                  onClick={() => exportRosterJSON(roster)}
                  className="btn-theme-secondary min-h-[40px] flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold"
                  title="Download backup (.json)"
                >
                  <Download className="w-4 h-4 text-theme-text-secondary" />
                  <span>Download .json</span>
                </button>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={handlePrint}
                  className="btn-theme-secondary min-h-[40px] flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold"
                >
                  <Printer className="w-4 h-4 stroke-[2]" />
                  <span>Print</span>
                </button>

                <button
                  onClick={() => void handleCopyText()}
                  className="btn-theme-primary min-h-[40px] flex items-center gap-2 px-5 py-2 rounded-xl text-xs sm:text-sm tracking-wide"
                >
                  {copied === 'text' ? (
                    <>
                      <Check className="w-4 h-4 stroke-[2.5]" />
                      <span>Copied to Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 stroke-[2]" />
                      <span>{format === 'share' ? 'Copy Shareable Text' : 'Copy Tournament Text'}</span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
