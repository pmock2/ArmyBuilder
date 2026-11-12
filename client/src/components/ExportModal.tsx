import React, { useState } from 'react';
import { X, Copy, Check, Printer, Download, Share2, FileText } from 'lucide-react';
import { ArmyRoster } from '../types/roster';
import { generateShareableText, generateTournamentText } from '../utils/exportText';
import { exportRosterJSON } from '../utils/storage';

interface ExportModalProps {
  roster: ArmyRoster;
  isOpen: boolean;
  onClose: () => void;
}

type ExportFormat = 'share' | 'tournament';

export const ExportModal: React.FC<ExportModalProps> = ({ roster, isOpen, onClose }) => {
  const [format, setFormat] = useState<ExportFormat>('share');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const textOutput = format === 'share'
    ? generateShareableText(roster)
    : generateTournamentText(roster);

  const handleCopy = () => {
    navigator.clipboard.writeText(textOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-theme-surface border border-theme-border w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 sm:py-4 border-b border-theme-border-subtle bg-theme-surface">
          <div>
            <h2 className="font-warhammer text-base sm:text-lg font-bold text-theme-text">
              Export Roster: {roster.name}
            </h2>
            <p className="text-xs text-theme-text-muted mt-0.5">
              Shareable summary, full tournament sheet, or JSON backup.
            </p>
          </div>

          <button
            onClick={onClose}
            className="btn-theme-icon min-w-[38px] min-h-[38px] rounded-xl"
            aria-label="Close export dialog"
          >
            <X className="w-4 h-4 stroke-[2]" />
          </button>
        </div>

        {/* Format Selector & Preview Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-3">
          {/* Format Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
            <div className="inline-flex bg-theme-bg p-1 rounded-xl border border-theme-border-subtle">
              <button
                type="button"
                onClick={() => {
                  setFormat('share');
                  setCopied(false);
                }}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
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
                  setCopied(false);
                }}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  format === 'tournament'
                    ? 'bg-theme-accent text-white shadow-sm'
                    : 'text-theme-text-secondary hover:text-theme-text'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Full Tournament Sheet</span>
              </button>
            </div>

            <span className="text-[11px] text-theme-text-muted font-mono">
              {format === 'share'
                ? 'Clean overview: units, leaders & enhancements'
                : 'Complete wargear breakdown & tournament metadata'}
            </span>
          </div>

          {/* Text Preview */}
          <div className="relative">
            <pre className="w-full h-80 p-4 rounded-xl bg-theme-bg border border-theme-border-subtle text-theme-text font-mono text-xs sm:text-sm overflow-y-auto whitespace-pre-wrap select-all leading-relaxed">
              {textOutput}
            </pre>
          </div>
        </div>

        {/* Actions Footer */}
        <div className="px-4 sm:px-6 py-3.5 border-t border-theme-border-subtle bg-theme-surface flex flex-wrap items-center justify-between gap-3">
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
              onClick={handleCopy}
              className="btn-theme-primary min-h-[40px] flex items-center gap-2 px-5 py-2 rounded-xl text-xs sm:text-sm tracking-wide"
            >
              {copied ? (
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
        </div>

      </div>
    </div>
  );
};
