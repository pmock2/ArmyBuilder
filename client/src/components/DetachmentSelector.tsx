import React, { useState } from 'react';
import { Plus, Eye, Trash2 } from 'lucide-react';
import { SelectedDetachment, Enhancement, SelectedUnit } from '../types/roster';
import { DetachmentBrowserModal } from './DetachmentBrowserModal';
import { DetachmentModal } from './DetachmentModal';
import { StratagemsModal } from './StratagemsModal';
import { useBackNavigation } from '../utils/backNavigation';

interface DetachmentSelectorProps {
  availableDetachments: SelectedDetachment[];
  selectedDetachments: SelectedDetachment[];
  allEnhancements?: Enhancement[];
  totalDP: number;
  dpLimit: number;
  subFactionName?: string | null;
  subFactionId?: string | null;
  rosterUnits?: SelectedUnit[];
  currentDisposition?: string | null;
  isPlayMode?: boolean;
  onToggleDetachment: (detachment: SelectedDetachment) => void;
  onSelectDisposition?: (disposition: string | null) => void;
}

export const DetachmentSelector: React.FC<DetachmentSelectorProps> = ({
  availableDetachments,
  selectedDetachments,
  allEnhancements = [],
  totalDP,
  dpLimit,
  subFactionName,
  subFactionId,
  rosterUnits = [],
  isPlayMode = false,
  onToggleDetachment
}) => {
  const [isBrowserOpen, setIsBrowserOpen] = useState(false);
  const [inspectDetachment, setInspectDetachment] = useState<SelectedDetachment | null>(null);
  const [isStratagemsOpen, setIsStratagemsOpen] = useState(false);

  useBackNavigation(isBrowserOpen, () => setIsBrowserOpen(false));
  useBackNavigation(Boolean(inspectDetachment), () => setInspectDetachment(null));
  useBackNavigation(isStratagemsOpen, () => setIsStratagemsOpen(false));

  const hasDetachments = selectedDetachments.length > 0;

  return (
    <div className="space-y-3 mb-3">
      {/* 1. Detachments Section */}
      <section
        className={
          hasDetachments
            ? 'panel-theme-section'
            : 'bg-theme-surface/40 border border-theme-border-subtle/60 rounded-xl px-3.5 py-2.5 transition-colors hover:bg-theme-surface/70'
        }
      >
        <div className="section-theme-header">
          <div className="flex items-center gap-2 min-w-0">
            <h3 className="section-theme-title truncate">
              Detachments
            </h3>
            <span className="text-xs font-mono font-semibold text-theme-accent-soft/80">
              ({selectedDetachments.length})
            </span>
            <span className="text-xs sm:text-sm font-mono text-theme-text font-bold">
              • {totalDP}/{dpLimit} DP
            </span>
          </div>

          {!isPlayMode && (
            <button
              type="button"
              onClick={() => setIsBrowserOpen(true)}
              className="btn-theme-secondary min-h-[30px] px-2.5 py-1 rounded-lg flex items-center gap-1 text-xs font-semibold tracking-wide shrink-0"
              title="Add Detachment"
              aria-label="Add Detachment"
            >
              <Plus className="w-3.5 h-3.5 text-theme-accent-soft stroke-[2.5]" />
              <span>Add</span>
            </button>
          )}
        </div>

        {/* Chosen Detachment Cards (Stacked in line breaks) */}
        {hasDetachments && (
          <div className="space-y-2 mt-3">
            {selectedDetachments.map((det) => (
              <div
                key={det.id || det.name}
                onClick={() => setInspectDetachment(det)}
                className="card-theme-item px-3.5 sm:px-4 py-3 cursor-pointer flex flex-col gap-2.5 active:scale-[0.995] group"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h4 className="font-warhammer text-sm sm:text-base font-bold text-theme-text group-hover:text-theme-accent-soft transition-colors tracking-wide truncate">
                      {det.name}
                    </h4>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-2.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <span className="font-mono text-sm sm:text-base font-bold text-theme-text whitespace-nowrap mr-0.5">
                      {det.dpCost} <span className="text-xs font-normal text-theme-text-secondary">DP</span>
                    </span>

                    <button
                      type="button"
                      onClick={() => setInspectDetachment(det)}
                      className="btn-theme-icon min-h-[34px] min-w-[34px] rounded-lg"
                      title="Inspect Detachment Rules"
                      aria-label={`Inspect ${det.name} rules`}
                    >
                      <Eye className="w-3.5 h-3.5 stroke-[2]" />
                    </button>

                    {!isPlayMode && (
                      <button
                        type="button"
                        onClick={() => onToggleDetachment(det)}
                        className="btn-theme-danger-icon min-h-[34px] min-w-[34px] rounded-lg"
                        title="Remove Detachment"
                        aria-label={`Remove ${det.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5 stroke-[2]" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 2. Stratagems Section (Simple Card with Eye Icon underneath Detachments) */}
      <section className="panel-theme-section">
        <div className="section-theme-header mb-3">
          <h3 className="section-theme-title">
            Stratagems
          </h3>
        </div>

        <div
          onClick={() => setIsStratagemsOpen(true)}
          className="card-theme-item px-3.5 sm:px-4 py-3 cursor-pointer flex items-center justify-between gap-3 active:scale-[0.995] group"
        >
          <div className="min-w-0 flex-1">
            <h4 className="font-warhammer text-sm sm:text-base font-bold text-theme-text group-hover:text-theme-accent-soft transition-colors tracking-wide truncate">
              Stratagems
            </h4>
            <p className="text-xs text-theme-text-secondary font-medium mt-0.5 truncate">
              Detachment &amp; Core Stratagems
            </p>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsStratagemsOpen(true);
            }}
            className="btn-theme-icon min-h-[34px] min-w-[34px] rounded-lg flex-shrink-0"
            title="View Stratagems"
            aria-label="View Stratagems"
          >
            <Eye className="w-3.5 h-3.5 stroke-[2]" />
          </button>
        </div>
      </section>

      {/* Detachment Browser Modal */}
      <DetachmentBrowserModal
        isOpen={isBrowserOpen}
        onClose={() => setIsBrowserOpen(false)}
        availableDetachments={availableDetachments}
        selectedDetachments={selectedDetachments}
        allEnhancements={allEnhancements}
        totalDP={totalDP}
        dpLimit={dpLimit}
        subFactionName={subFactionName}
        subFactionId={subFactionId}
        rosterUnits={rosterUnits}
        onToggleDetachment={onToggleDetachment}
      />

      {/* Detachment Rules Modal */}
      <DetachmentModal
        detachment={inspectDetachment}
        allEnhancements={allEnhancements}
        isOpen={!!inspectDetachment}
        onClose={() => setInspectDetachment(null)}
        isSelected={inspectDetachment ? selectedDetachments.some((d) => d.name === inspectDetachment.name) : false}
        isPlayMode={isPlayMode}
        onSelect={!isPlayMode && inspectDetachment ? () => onToggleDetachment(inspectDetachment) : undefined}
      />

      {/* Stratagems Reference Modal */}
      <StratagemsModal
        isOpen={isStratagemsOpen}
        onClose={() => setIsStratagemsOpen(false)}
        selectedDetachments={selectedDetachments}
      />
    </div>
  );
};
