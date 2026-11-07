import React, { useState } from 'react';
import { X, Copy, Check, Printer, Download } from 'lucide-react';
import { ArmyRoster } from '../types/roster';
import { generateTournamentText } from '../utils/exportText';
import { exportRosterJSON } from '../utils/storage';

interface ExportModalProps {
  roster: ArmyRoster;
  isOpen: boolean;
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ roster, isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  const textOutput = generateTournamentText(roster);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(textOutput);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-grimdark-900 border border-grimdark-700 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-grimdark-800 bg-grimdark-950/80">
          <div>
            <h2 className="font-warhammer text-lg font-bold text-amber-300">
              Export Roster: {roster.name}
            </h2>
            <p className="text-xs text-grimdark-400">
              Tournament plain text, printable sheet, or JSON backup.
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-grimdark-400 hover:text-white hover:bg-grimdark-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Text Area Content */}
        <div className="p-6 overflow-y-auto flex-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-grimdark-300 uppercase tracking-wider">
              Tournament Text Format
            </span>
            <span className="text-[11px] text-grimdark-500 font-mono">
              Ready for BattleScribe / Discord / Tabletop Sim
            </span>
          </div>

          <div className="relative">
            <pre className="w-full h-80 p-4 rounded-xl bg-grimdark-950 border border-grimdark-800 text-grimdark-200 font-mono text-xs overflow-y-auto whitespace-pre-wrap select-all">
              {textOutput}
            </pre>
          </div>
        </div>

        {/* Actions Footer */}
        <div className="px-6 py-3 border-t border-grimdark-800 bg-grimdark-950/80 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={() => exportRosterJSON(roster)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-grimdark-850 hover:bg-grimdark-800 text-grimdark-300 hover:text-white border border-grimdark-700 text-xs font-medium transition-colors"
          >
            <Download className="w-4 h-4 text-amber-400" />
            <span>Download .json</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-grimdark-800 hover:bg-grimdark-700 text-grimdark-200 hover:text-white text-xs font-medium transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>Print Page</span>
            </button>

            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-black font-bold text-xs tracking-wide shadow transition-all active:scale-95"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy Text</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
