import React, { useState } from 'react';
import { Eye, Star, Trash2, Copy, Sparkles, UserPlus, Shield, ChevronDown } from 'lucide-react';
import { SelectedUnit, Enhancement } from '../types/roster';
import { DatasheetModal } from './DatasheetModal';

interface UnitCardProps {
  unit: SelectedUnit;
  allUnitsInRoster: SelectedUnit[];
  availableEnhancements: Enhancement[];
  onUpdateUnit: (updated: SelectedUnit) => void;
  onDuplicateUnit: (unit: SelectedUnit) => void;
  onRemoveUnit: (instanceId: string) => void;
  onSetWarlord: (instanceId: string) => void;
}

export const UnitCard: React.FC<UnitCardProps> = ({
  unit,
  allUnitsInRoster,
  availableEnhancements,
  onUpdateUnit,
  onDuplicateUnit,
  onRemoveUnit,
  onSetWarlord
}) => {
  const [isDatasheetOpen, setIsDatasheetOpen] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);

  const totalCost = unit.cost + (unit.enhancement ? unit.enhancement.pts : 0);

  // Eligible leaders in roster that can attach to this bodyguard
  const eligibleLeaders = allUnitsInRoster.filter(u => {
    if (!u.isLeader || u.instanceId === unit.instanceId) return false;
    // Check if leader's canLead matches this unit name
    if (u.datasheet.canLead && u.datasheet.canLead.length > 0) {
      return u.datasheet.canLead.some(target => 
        unit.name.toUpperCase().includes(target.toUpperCase()) || 
        target.toUpperCase().includes(unit.name.toUpperCase())
      );
    }
    return true; // fallback if canLead not specified
  });

  // Eligible supports in roster
  const eligibleSupports = allUnitsInRoster.filter(u => u.isSupport && u.instanceId !== unit.instanceId);

  // Handle squad model size change (e.g. 5 vs 10 models)
  const handleModelCountChange = (count: number) => {
    // Find matching cost tier
    const tier = unit.datasheet.costTiers.find(t => t.models === count);
    const newCost = tier ? tier.cost : unit.datasheet.baseCost;
    onUpdateUnit({
      ...unit,
      modelsCount: count,
      cost: newCost
    });
  };

  // Handle Enhancement selection
  const handleEnhancementChange = (enhId: string) => {
    if (!enhId) {
      const { enhancement, ...rest } = unit;
      onUpdateUnit({ ...rest, enhancement: undefined });
    } else {
      const enh = availableEnhancements.find(e => e.id === enhId);
      if (enh) {
        onUpdateUnit({
          ...unit,
          enhancement: enh
        });
      }
    }
  };

  // Handle Leader attachment
  const handleAttachLeader = (leaderId: string) => {
    onUpdateUnit({
      ...unit,
      attachedLeaderId: leaderId || undefined
    });
    // Also update leader unit's attachedToBodyguardId
    const leader = allUnitsInRoster.find(u => u.instanceId === leaderId);
    if (leader) {
      leader.attachedToBodyguardId = unit.instanceId;
    }
  };

  // Handle Support attachment
  const handleAttachSupport = (supportId: string) => {
    onUpdateUnit({
      ...unit,
      attachedSupportId: supportId || undefined
    });
    const support = allUnitsInRoster.find(u => u.instanceId === supportId);
    if (support) {
      support.attachedToBodyguardId = unit.instanceId;
    }
  };

  // Attached child cards
  const attachedLeader = allUnitsInRoster.find(u => u.instanceId === unit.attachedLeaderId);
  const attachedSupport = allUnitsInRoster.find(u => u.instanceId === unit.attachedSupportId);

  return (
    <div className="bg-grimdark-900 border border-grimdark-800 hover:border-grimdark-700 rounded-xl p-4 transition-all shadow-md flex flex-col justify-between">
      <div>
        {/* Top Header: Role, Model Count, Points & Actions */}
        <div className="flex items-start justify-between gap-3 mb-2.5">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-grimdark-950 text-grimdark-300 border border-grimdark-800">
                {unit.datasheet.primaryCategory}
              </span>

              {unit.isCharacter && (
                <button
                  type="button"
                  onClick={() => onSetWarlord(unit.instanceId)}
                  className={`text-[10px] px-2 py-0.5 rounded flex items-center gap-1 transition-all ${
                    unit.isWarlord
                      ? 'bg-amber-500 text-black font-bold shadow'
                      : 'bg-grimdark-950 text-grimdark-400 hover:text-amber-300 border border-grimdark-800'
                  }`}
                  title={unit.isWarlord ? 'Supreme Commander (Warlord)' : 'Appoint as Warlord'}
                >
                  <Star className={`w-3 h-3 ${unit.isWarlord ? 'fill-black' : ''}`} />
                  <span>{unit.isWarlord ? 'WARLORD' : 'Make Warlord'}</span>
                </button>
              )}
            </div>

            <h3 className="font-warhammer text-sm sm:text-base font-bold text-amber-200">
              {unit.name}
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-right">
              <span className="font-mono text-sm sm:text-base font-bold text-amber-400">
                {totalCost} pts
              </span>
            </div>

            {/* Eyeball Inspector Button */}
            <button
              type="button"
              onClick={() => setIsDatasheetOpen(true)}
              className="p-1.5 rounded-lg bg-grimdark-800 hover:bg-grimdark-700 text-grimdark-300 hover:text-amber-300 border border-grimdark-700 transition-colors"
              title="Inspect full datasheet"
            >
              <Eye className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Squad Size Selector (if multiple tiers exist) */}
        {unit.datasheet.costTiers && unit.datasheet.costTiers.length > 1 && (
          <div className="flex items-center gap-2 mb-3 bg-grimdark-950 p-1.5 rounded-lg border border-grimdark-800 text-xs">
            <span className="text-grimdark-400 text-[11px] font-medium">Squad Size:</span>
            <div className="flex gap-1.5">
              {unit.datasheet.costTiers.map(tier => (
                <button
                  key={tier.models}
                  type="button"
                  onClick={() => handleModelCountChange(tier.models)}
                  className={`px-2 py-0.5 rounded text-[11px] font-mono transition-all ${
                    unit.modelsCount === tier.models
                      ? 'bg-amber-600 text-black font-bold'
                      : 'bg-grimdark-900 text-grimdark-400 hover:text-white'
                  }`}
                >
                  {tier.models} models ({tier.cost} pts)
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Enhancement Selector (for Characters & Upgrades) */}
        {(unit.isCharacter || availableEnhancements.some(e => e.isUpgrade)) && !unit.isEpicHero && (
          <div className="mb-3">
            <label className="text-[10px] uppercase font-bold text-grimdark-400 mb-1 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>Enhancement / Upgrade</span>
            </label>
            <select
              value={unit.enhancement?.id || ''}
              onChange={(e) => handleEnhancementChange(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-grimdark-950 border border-grimdark-800 text-grimdark-200 text-xs focus:outline-none focus:border-amber-500 truncate"
            >
              <option value="">None</option>
              {availableEnhancements.map((enh) => (
                <option key={enh.id} value={enh.id}>
                  {enh.name} (+{enh.pts} pts){enh.isUpgrade ? ' [Upgrade]' : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Attachment Status Widget for Bodyguards */}
        {!unit.isLeader && !unit.isSupport && (
          <div className="mb-3">
            <button
              type="button"
              onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-grimdark-950 border border-grimdark-800 hover:border-grimdark-700 text-xs text-grimdark-300 transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <UserPlus className="w-3.5 h-3.5 text-amber-400" />
                <span>Attach Leaders & Support Units</span>
              </span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showAttachmentMenu ? 'rotate-180' : ''}`} />
            </button>

            {showAttachmentMenu && (
              <div className="p-3 bg-grimdark-950 border border-grimdark-800 rounded-lg mt-1.5 space-y-2 text-xs">
                {/* Leader Slot */}
                <div>
                  <label className="text-[10px] text-grimdark-400 block mb-1">
                    Leader Slot (Max 1):
                  </label>
                  <select
                    value={unit.attachedLeaderId || ''}
                    onChange={(e) => handleAttachLeader(e.target.value)}
                    className="w-full px-2 py-1 rounded bg-grimdark-900 border border-grimdark-700 text-grimdark-200 text-xs"
                  >
                    <option value="">No Leader Attached</option>
                    {eligibleLeaders.map(l => (
                      <option key={l.instanceId} value={l.instanceId}>
                        {l.name} ({l.cost} pts)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Support Slot */}
                <div>
                  <label className="text-[10px] text-grimdark-400 block mb-1">
                    Support Unit Slot (Max 1):
                  </label>
                  <select
                    value={unit.attachedSupportId || ''}
                    onChange={(e) => handleAttachSupport(e.target.value)}
                    className="w-full px-2 py-1 rounded bg-grimdark-900 border border-grimdark-700 text-grimdark-200 text-xs"
                  >
                    <option value="">No Support Unit Attached</option>
                    {eligibleSupports.map(s => (
                      <option key={s.instanceId} value={s.instanceId}>
                        {s.name} ({s.cost} pts)
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Visual Linked Cards for Attached Units */}
        {(attachedLeader || attachedSupport) && (
          <div className="pl-3 border-l-2 border-amber-600/40 my-2 space-y-1.5">
            {attachedLeader && (
              <div className="text-[11px] p-2 rounded bg-amber-950/30 border border-amber-700/40 text-amber-200 flex items-center justify-between">
                <span className="font-semibold">★ Attached Leader: {attachedLeader.name}</span>
                <span className="font-mono text-amber-400">{attachedLeader.cost} pts</span>
              </div>
            )}
            {attachedSupport && (
              <div className="text-[11px] p-2 rounded bg-blue-950/30 border border-blue-700/40 text-blue-200 flex items-center justify-between">
                <span className="font-semibold">🛡 Attached Support: {attachedSupport.name}</span>
                <span className="font-mono text-blue-400">{attachedSupport.cost} pts</span>
              </div>
            )}
          </div>
        )}

        {/* Quick Stat Pill Preview */}
        <div className="grid grid-cols-6 gap-1 text-center font-mono text-[10px] py-1.5 px-2 bg-grimdark-950 rounded border border-grimdark-800 text-grimdark-300">
          <div><span className="text-grimdark-500 font-sans block">M</span>{unit.datasheet.stats.M}</div>
          <div><span className="text-grimdark-500 font-sans block">T</span>{unit.datasheet.stats.T}</div>
          <div><span className="text-grimdark-500 font-sans block">SV</span>{unit.datasheet.stats.Sv}</div>
          <div><span className="text-grimdark-500 font-sans block">W</span><span className="text-amber-300 font-bold">{unit.datasheet.stats.W}</span></div>
          <div><span className="text-grimdark-500 font-sans block">LD</span>{unit.datasheet.stats.Ld}</div>
          <div><span className="text-grimdark-500 font-sans block">OC</span><span className="text-amber-300 font-bold">{unit.datasheet.stats.OC}</span></div>
        </div>
      </div>

      {/* Footer Controls: Duplicate & Remove */}
      <div className="pt-3 border-t border-grimdark-800 flex items-center justify-between mt-3">
        <span className="text-[10px] text-grimdark-500">
          {unit.modelsCount} {unit.modelsCount === 1 ? 'Model' : 'Models'}
        </span>

        <div className="flex items-center gap-1.5">
          {!unit.isEpicHero && (
            <button
              type="button"
              onClick={() => onDuplicateUnit(unit)}
              className="p-1.5 rounded hover:bg-grimdark-850 text-grimdark-400 hover:text-white transition-colors"
              title="Duplicate unit in roster"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={() => onRemoveUnit(unit.instanceId)}
            className="p-1.5 rounded hover:bg-red-950/60 text-grimdark-400 hover:text-red-400 transition-colors"
            title="Remove from roster"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Full Datasheet Modal */}
      <DatasheetModal
        unit={unit.datasheet}
        selectedUnit={unit}
        isOpen={isDatasheetOpen}
        onClose={() => setIsDatasheetOpen(false)}
      />
    </div>
  );
};

