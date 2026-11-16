import React, { useRef, useState } from 'react';
import { X, Upload, FileText, Loader2, AlertCircle, Sparkles } from 'lucide-react';
import { ArmyRoster } from '../types/roster';
import { FactionSummary } from '../types/faction';
import { parseRosterJSON } from '../utils/storage';
import { isProbablyGwTextList, parseGwTextRoster } from '../utils/gwListImporter';
import { useBackNavigation } from '../utils/backNavigation';
import factionsIndexData from '../data/factions_index.json';

interface ImportRosterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportRoster: (roster: ArmyRoster) => void;
}

export const ImportRosterModal: React.FC<ImportRosterModalProps> = ({
  isOpen,
  onClose,
  onImportRoster
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [textInput, setTextInput] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useBackNavigation(isOpen, onClose);

  if (!isOpen) return null;

  const factionsIndex = factionsIndexData as FactionSummary[];

  const handleImportContent = async (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) {
      setErrorMsg('Please paste a list or choose a file to import.');
      return;
    }

    setIsImporting(true);
    setErrorMsg(null);

    try {
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        const parsed = parseRosterJSON(trimmed);
        onImportRoster(parsed);
        setTextInput('');
        onClose();
        return;
      }

      if (!isProbablyGwTextList(trimmed)) {
        throw new Error('Unrecognized list format. Paste a GW App / New Recruit export or upload a .json roster file.');
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-theme-surface border border-theme-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-5 py-3.5 border-b border-theme-border-subtle bg-theme-card">
          <div className="flex items-center gap-2.5 min-w-0">
            <Upload className="w-4 h-4 text-theme-accent-soft shrink-0" />
            <div>
              <h2 className="font-warhammer text-base sm:text-lg font-bold text-theme-text tracking-wide">
                Import Army List
              </h2>
              <p className="text-[11px] text-theme-text-secondary">
                Paste a GW App / New Recruit export or upload a .json / .txt file
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="btn-theme-icon min-w-[32px] min-h-[32px] rounded-lg"
            aria-label="Close Import Dialog"
          >
            <X className="w-4 h-4 stroke-[2]" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
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
              <span>Paste GW / New Recruit List</span>
            </label>
            <textarea
              id="gw-import-textarea"
              rows={10}
              value={textInput}
              disabled={isImporting}
              onChange={(e) => {
                setTextInput(e.target.value);
                if (errorMsg) setErrorMsg(null);
              }}
              placeholder={`CHARACTERS\n\nAdrax Agatone (90 Points)\n  • 1x Drakkis\n  • 1x Malleus Noctum\n\nBATTLELINE\n\nIntercessor Squad (85 Points)\n  • 1x Intercessor Sergeant\n     ◦ 1x Bolt Rifle\n  • 4x Intercessor...`}
              className="w-full bg-theme-elevated border border-theme-border rounded-xl p-3 text-xs font-mono text-theme-text placeholder-theme-text-muted focus:outline-none focus:border-theme-accent resize-y"
            />
          </div>

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
          </div>
        </div>
      </div>
    </div>
  );
};
