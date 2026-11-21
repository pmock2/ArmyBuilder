import React, { useState } from 'react';
import {
  Check,
  Dices,
  Minus,
  Plus,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Swords,
  X
} from 'lucide-react';
import { BattleSize, SelectedDetachment, SelectedUnit, normalizeDetachmentName } from '../types/roster';
import {
  ArmyRulePlayState,
  RosterPlayState,
  isUnitConsolidatedUnderBodyguard,
  isUnitDestroyedInPlay,
  unitHasMartialKatah,
  unitHasWaaagh,
  unitIsAlwaysRiledUp,
  getAttachedChildrenForBodyguard
} from '../utils/playTracking';
import {
  AGILE_MANOEUVRES,
  ASTRA_ORDERS,
  CHIVALRIC_DEEDS,
  CHIVALRIC_QUALITIES,
  COMBAT_DOCTRINES,
  DOCTRINA_IMPERATIVES,
  DREAD_ABILITIES,
  KATAH_STANCES,
  KHORNE_BLESSINGS,
  NURGLE_PLAGUES,
  PSYCHIC_RITUALS,
  TrackableArmyRuleType,
  getActiveOrkRiledUpSources,
  getBattleFocusRoundTokens,
  getCombatDoctrineLimits,
  getGateOfInfinityLimit,
  getStartingResurgencePoints
} from '../utils/armyRuleTracking';

interface ArmyRuleTrackerProps {
  ruleType: TrackableArmyRuleType;
  battleSize: BattleSize;
  selectedDetachments: SelectedDetachment[];
  rosterUnits: SelectedUnit[];
  playState: RosterPlayState;
  armyRuleState: ArmyRulePlayState;
  onChangeArmyRuleState: (next: ArmyRulePlayState) => void;
  onResetAllKaTah?: () => void;
  onClearAllOrders?: () => void;
  onClearAllRiledUp?: () => void;
}

export const ArmyRuleTracker: React.FC<ArmyRuleTrackerProps> = ({
  ruleType,
  battleSize,
  selectedDetachments,
  rosterUnits,
  playState,
  armyRuleState,
  onChangeArmyRuleState,
  onResetAllKaTah,
  onClearAllOrders,
  onClearAllRiledUp
}) => {
  const [showKatahRef, setShowKatahRef] = useState(false);

  // 1. Space Marines: Combat Doctrines
  if (ruleType === 'combat-doctrines') {
    const limits = getCombatDoctrineLimits(selectedDetachments);
    const uses = armyRuleState.doctrineUses || { assault: 0, devastator: 0, tactical: 0 };
    const active = armyRuleState.activeDoctrine || null;

    const baseMaxMap = {
      assault: limits.assaultBaseMax,
      devastator: limits.devastatorBaseMax,
      tactical: limits.tacticalBaseMax
    };

    const gladiusExtraUsed =
      Math.max(0, uses.assault - baseMaxMap.assault) +
      Math.max(0, uses.devastator - baseMaxMap.devastator) +
      Math.max(0, uses.tactical - baseMaxMap.tactical);
    const gladiusRemaining = limits.hasGladiusBonus ? Math.max(0, 1 - gladiusExtraUsed) : 0;

    const handleActivate = (id: 'assault' | 'devastator' | 'tactical') => {
      if (active === id) {
        onChangeArmyRuleState({
          ...armyRuleState,
          activeDoctrine: null
        });
        return;
      }
      const maxForDoc = baseMaxMap[id] + gladiusRemaining;
      if (uses[id] >= maxForDoc) return;
      onChangeArmyRuleState({
        ...armyRuleState,
        activeDoctrine: id,
        doctrineUses: {
          ...uses,
          [id]: uses[id] + 1
        }
      });
    };

    const handleAdjustUse = (id: 'assault' | 'devastator' | 'tactical', delta: number) => {
      const current = uses[id];
      const maxForDoc = baseMaxMap[id] + gladiusRemaining;
      const nextCount = Math.min(Math.max(0, current + delta), delta > 0 ? maxForDoc : current);
      if (nextCount === current) return;
      const nextActive = nextCount === 0 && active === id ? null : active;
      onChangeArmyRuleState({
        ...armyRuleState,
        activeDoctrine: nextActive,
        doctrineUses: {
          ...uses,
          [id]: nextCount
        }
      });
    };

    return (
      <div className="space-y-2.5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-semibold text-theme-text-secondary">
              {active
                ? `Active: ${COMBAT_DOCTRINES.find((d) => d.id === active)?.name}`
                : 'Select Doctrine in Command Phase'}
            </span>
            {limits.hasGladiusBonus && (
              <span
                className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                  gladiusRemaining > 0
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                    : 'bg-theme-surface border-theme-border-subtle text-theme-text-muted'
                }`}
              >
                Codex Discipline: {gladiusRemaining}/1 bonus
              </span>
            )}
          </div>
          {active && (
            <button
              type="button"
              onClick={() => onChangeArmyRuleState({ ...armyRuleState, activeDoctrine: null })}
              className="text-[11px] font-semibold px-2 py-1 rounded-lg bg-theme-surface border border-theme-border-subtle text-theme-text-secondary hover:text-theme-text transition-colors"
            >
              End Turn
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {COMBAT_DOCTRINES.map((doc) => {
            const usedCount = uses[doc.id];
            const baseMax = baseMaxMap[doc.id];
            const effectiveMax = baseMax + (usedCount > baseMax ? 1 : gladiusRemaining);
            const isActive = active === doc.id;
            const isExhausted = usedCount >= effectiveMax && !isActive;

            return (
              <div
                key={doc.id}
                className={`rounded-xl border p-2.5 transition-all flex flex-col justify-between gap-2 ${
                  isActive
                    ? 'bg-amber-500/15 border-amber-400/70 shadow-sm'
                    : isExhausted
                    ? 'bg-theme-surface/50 border-theme-border-subtle/60 opacity-65'
                    : 'bg-theme-card/85 border-theme-border-subtle hover:border-amber-500/50'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="font-warhammer text-xs sm:text-sm font-bold text-theme-text">
                      {doc.shortName}
                    </span>
                    <div className="flex items-center gap-1">
                      {isActive && (
                        <span className="text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/50 text-emerald-300">
                          Active
                        </span>
                      )}
                      <span className="text-[10px] font-mono font-semibold text-theme-text-muted">
                        {Math.max(0, baseMax - usedCount)}/{baseMax}
                        {usedCount > baseMax ? ' (+1)' : ''}
                      </span>
                    </div>
                  </div>
                  <p className="text-[11px] text-theme-text-secondary leading-snug">
                    {doc.effect}
                  </p>
                </div>

                <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-theme-border-subtle/50">
                  <button
                    type="button"
                    disabled={isExhausted}
                    onClick={() => handleActivate(doc.id)}
                    className={`flex-1 min-h-[30px] px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
                      isActive
                        ? 'bg-amber-500/25 text-amber-200 border border-amber-400/60'
                        : isExhausted
                        ? 'bg-theme-surface text-theme-text-muted cursor-not-allowed'
                        : 'bg-theme-surface hover:bg-amber-500/15 text-theme-text border border-theme-border-subtle hover:border-amber-500/40'
                    }`}
                  >
                    {isActive ? 'Deactivate' : isExhausted ? 'Used' : 'Activate'}
                  </button>
                  {usedCount > 0 && (
                    <button
                      type="button"
                      onClick={() => handleAdjustUse(doc.id, -1)}
                      className="min-h-[30px] px-2 rounded-lg bg-theme-surface border border-theme-border-subtle text-theme-text-muted hover:text-theme-text text-[11px] font-mono"
                      title={`Restore 1 ${doc.shortName} use`}
                      aria-label={`Restore 1 ${doc.shortName} use`}
                    >
                      Undo
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // 2. Imperial Knights: Code Chivalric
  if (ruleType === 'code-chivalric') {
    const deedId = armyRuleState.chivalricDeed || null;
    const qualityId = armyRuleState.chivalricQuality || null;
    const isHonoured = Boolean(armyRuleState.chivalricHonoured);
    const anyRandom = Boolean(armyRuleState.chivalricDeedRandom || armyRuleState.chivalricQualityRandom);
    const cpReward = anyRandom ? 3 : 2;

    const rollRandomDeed = () => {
      const roll = Math.floor(Math.random() * 6) + 1;
      const idx = roll <= 2 ? 0 : roll <= 4 ? 1 : 2;
      onChangeArmyRuleState({
        ...armyRuleState,
        chivalricDeed: CHIVALRIC_DEEDS[idx].id,
        chivalricDeedRandom: true
      });
    };

    const rollRandomQuality = () => {
      const roll = Math.floor(Math.random() * 6) + 1;
      const idx = roll <= 2 ? 0 : roll <= 4 ? 1 : 2;
      onChangeArmyRuleState({
        ...armyRuleState,
        chivalricQuality: CHIVALRIC_QUALITIES[idx].id,
        chivalricQualityRandom: true
      });
    };

    return (
      <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
        {/* Oath Status Banner */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <button
            type="button"
            onClick={() =>
              onChangeArmyRuleState({
                ...armyRuleState,
                chivalricHonoured: !isHonoured
              })
            }
            className={`min-h-[34px] px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-2 transition-all ${
              isHonoured
                ? 'bg-emerald-500/20 border-emerald-400/70 text-emerald-200 shadow-sm'
                : 'bg-theme-card/85 border-amber-500/40 text-amber-200 hover:bg-amber-500/15'
            }`}
          >
            <ShieldCheck className={`w-4 h-4 ${isHonoured ? 'text-emerald-400' : 'text-amber-400'}`} />
            <span>{isHonoured ? `Oath Fulfilled — Honoured (+${cpReward} CP)` : `Mark Oath Fulfilled (+${cpReward} CP)`}</span>
          </button>

          {anyRandom && (
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/40 text-amber-300">
              Random Oath (+3 CP)
            </span>
          )}
        </div>

        {/* Deed & Quality Pickers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {/* Deed */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300/90">
                1. Deed
              </span>
              <button
                type="button"
                onClick={rollRandomDeed}
                className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-theme-surface border border-amber-500/35 text-amber-300 hover:bg-amber-500/15 flex items-center gap-1"
              >
                <Dices className="w-3 h-3" />
                <span>Random D6</span>
              </button>
            </div>
            <div className="space-y-1">
              {CHIVALRIC_DEEDS.map((d) => {
                const selected = deedId === d.id;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() =>
                      onChangeArmyRuleState({
                        ...armyRuleState,
                        chivalricDeed: selected ? null : d.id,
                        chivalricDeedRandom: false
                      })
                    }
                    className={`w-full text-left p-2 rounded-lg border transition-all ${
                      selected
                        ? 'bg-amber-500/15 border-amber-400/70 text-theme-text'
                        : 'bg-theme-card/70 border-theme-border-subtle/80 text-theme-text-secondary hover:border-amber-500/40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="text-xs font-bold text-theme-text">{d.name}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-theme-surface text-amber-300 border border-theme-border-subtle">
                        {d.roll}
                      </span>
                    </div>
                    <p className="text-[11px] text-theme-text-muted leading-snug mt-0.5">{d.summary}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quality */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300/90">
                2. Quality
              </span>
              <button
                type="button"
                onClick={rollRandomQuality}
                className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-theme-surface border border-amber-500/35 text-amber-300 hover:bg-amber-500/15 flex items-center gap-1"
              >
                <Dices className="w-3 h-3" />
                <span>Random D6</span>
              </button>
            </div>
            <div className="space-y-1">
              {CHIVALRIC_QUALITIES.map((q) => {
                const selected = qualityId === q.id;
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() =>
                      onChangeArmyRuleState({
                        ...armyRuleState,
                        chivalricQuality: selected ? null : q.id,
                        chivalricQualityRandom: false
                      })
                    }
                    className={`w-full text-left p-2 rounded-lg border transition-all ${
                      selected
                        ? 'bg-amber-500/15 border-amber-400/70 text-theme-text'
                        : 'bg-theme-card/70 border-theme-border-subtle/80 text-theme-text-secondary hover:border-amber-500/40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="text-xs font-bold text-theme-text">{q.name}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-theme-surface text-amber-300 border border-theme-border-subtle">
                        {q.roll}
                      </span>
                    </div>
                    <p className="text-[11px] text-theme-text-muted leading-snug mt-0.5">{q.summary}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 3. Aeldari: Battle Focus
  if (ruleType === 'battle-focus') {
    const roundMax = getBattleFocusRoundTokens(battleSize, selectedDetachments);
    const tokens =
      typeof armyRuleState.battleFocusTokens === 'number'
        ? armyRuleState.battleFocusTokens
        : roundMax;
    const used = armyRuleState.agileManoeuvresUsed || [];

    const setTokens = (next: number) =>
      onChangeArmyRuleState({
        ...armyRuleState,
        battleFocusTokens: Math.max(0, next)
      });

    const toggleManoeuvre = (id: string, repeatable?: boolean) => {
      if (repeatable) {
        if (tokens > 0) {
          onChangeArmyRuleState({
            ...armyRuleState,
            battleFocusTokens: tokens - 1
          });
        }
        return;
      }
      const alreadyUsed = used.includes(id);
      if (alreadyUsed) {
        onChangeArmyRuleState({
          ...armyRuleState,
          agileManoeuvresUsed: used.filter((x) => x !== id)
        });
      } else {
        onChangeArmyRuleState({
          ...armyRuleState,
          battleFocusTokens: Math.max(0, tokens - 1),
          agileManoeuvresUsed: [...used, id]
        });
      }
    };

    return (
      <div className="space-y-2.5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-theme-text-secondary">
              Battle Focus Tokens:
            </span>
            <div className="inline-flex items-center gap-1 rounded-lg bg-theme-surface border border-theme-border p-0.5">
              <button
                type="button"
                disabled={tokens <= 0}
                onClick={() => setTokens(tokens - 1)}
                className="w-7 h-7 rounded-md flex items-center justify-center text-theme-text-secondary hover:bg-theme-elevated disabled:opacity-30"
                aria-label="Spend Battle Focus token"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="font-mono text-sm font-bold px-2 text-amber-300">
                {tokens}
                <span className="text-[11px] text-theme-text-muted font-normal">/{roundMax}</span>
              </span>
              <button
                type="button"
                onClick={() => setTokens(tokens + 1)}
                className="w-7 h-7 rounded-md flex items-center justify-center text-theme-text-secondary hover:bg-theme-elevated"
                aria-label="Add Battle Focus token"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {used.length > 0 && (
              <button
                type="button"
                onClick={() =>
                  onChangeArmyRuleState({ ...armyRuleState, agileManoeuvresUsed: [] })
                }
                className="min-h-[28px] px-2.5 py-1 rounded-lg bg-theme-surface border border-theme-border-subtle text-[11px] font-semibold text-theme-text-secondary hover:text-theme-text"
              >
                New Phase
              </button>
            )}
            <button
              type="button"
              onClick={() =>
                onChangeArmyRuleState({
                  ...armyRuleState,
                  battleFocusTokens: roundMax,
                  agileManoeuvresUsed: []
                })
              }
              className="min-h-[28px] px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/40 text-[11px] font-bold text-amber-200 hover:bg-amber-500/25 flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Refill ({roundMax})</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {AGILE_MANOEUVRES.map((m) => {
            const isUsed = !m.repeatable && used.includes(m.id);
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => toggleManoeuvre(m.id, m.repeatable)}
                className={`text-left p-2 rounded-lg border transition-all ${
                  isUsed
                    ? 'bg-theme-surface/50 border-theme-border-subtle/60 opacity-60'
                    : 'bg-theme-card/80 border-theme-border-subtle hover:border-amber-500/45'
                }`}
              >
                <div className="flex items-center justify-between gap-1.5">
                  <span
                    className={`text-xs font-bold ${
                      isUsed ? 'line-through text-theme-text-muted' : 'text-theme-text'
                    }`}
                  >
                    {m.name}
                  </span>
                  {m.repeatable ? (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-500/15 border border-sky-500/35 text-sky-300">
                      -1 Token
                    </span>
                  ) : isUsed ? (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-theme-surface border border-theme-border-subtle text-theme-text-muted">
                      Used Phase
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/35 text-amber-300">
                      Ready
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-theme-text-muted leading-snug mt-0.5">{m.effect}</p>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // 4. Drukhari: Power from Pain
  if (ruleType === 'power-from-pain') {
    const tokens = armyRuleState.painTokens ?? 0;
    const hasRealspace = selectedDetachments.some(
      (d) => normalizeDetachmentName(d.name) === 'realspace raiders'
    );

    const setTokens = (next: number) =>
      onChangeArmyRuleState({
        ...armyRuleState,
        painTokens: Math.max(0, next)
      });

    return (
      <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2.5">
            <span className="text-xs font-semibold text-theme-text-secondary">
              Pain Token Pool:
            </span>
            <div className="inline-flex items-center gap-1 rounded-lg bg-theme-surface border border-theme-border p-0.5">
              <button
                type="button"
                disabled={tokens <= 0}
                onClick={() => setTokens(tokens - 1)}
                className="w-8 h-8 rounded-md flex items-center justify-center text-theme-text-secondary hover:bg-theme-elevated disabled:opacity-30"
                aria-label="Spend Pain token"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="font-mono text-base font-bold px-2.5 text-amber-300 min-w-[36px] text-center">
                {tokens}
              </span>
              <button
                type="button"
                onClick={() => setTokens(tokens + 1)}
                className="w-8 h-8 rounded-md flex items-center justify-center text-theme-text-secondary hover:bg-theme-elevated"
                aria-label="Gain Pain token"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={tokens <= 0}
              onClick={() => setTokens(tokens - 1)}
              className="min-h-[30px] px-2.5 py-1 rounded-lg bg-rose-500/15 border border-rose-500/35 text-[11px] font-bold text-rose-200 hover:bg-rose-500/25 disabled:opacity-35"
            >
              Empower (-1)
            </button>
            <button
              type="button"
              onClick={() => setTokens(tokens + 1)}
              className="min-h-[30px] px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/35 text-[11px] font-bold text-emerald-200 hover:bg-emerald-500/25"
            >
              +1 Gain
            </button>
          </div>
        </div>
        <p className="text-[11px] text-theme-text-muted">
          Gain 1 token: Start of Command phase • Enemy unit destroyed • Enemy fails Battle-shock.
          {hasRealspace ? ' (Realspace Raiders: +2 starting tokens per combo.)' : ''}
        </p>
      </div>
    );
  }

  // 5. Chaos Daemons: The Shadow of Chaos
  if (ruleType === 'shadow-of-chaos') {
    const nml = Boolean(armyRuleState.shadowNoMansLand);
    const edz = Boolean(armyRuleState.shadowEnemyDz);

    return (
      <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
        <div className="grid grid-cols-3 gap-1.5">
          <div className="p-2 rounded-lg bg-emerald-500/15 border border-emerald-500/45 text-center">
            <span className="text-[11px] font-bold text-emerald-200 block">Your DZ</span>
            <span className="text-[10px] font-mono text-emerald-300/90">Always Active</span>
          </div>
          <button
            type="button"
            onClick={() =>
              onChangeArmyRuleState({ ...armyRuleState, shadowNoMansLand: !nml })
            }
            className={`p-2 rounded-lg border text-center transition-all ${
              nml
                ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-200'
                : 'bg-theme-card/75 border-theme-border-subtle text-theme-text-muted hover:border-amber-500/40'
            }`}
          >
            <span className="text-[11px] font-bold block">No Man&apos;s Land</span>
            <span className="text-[10px] font-mono">{nml ? 'In Shadow' : 'Inactive'}</span>
          </button>
          <button
            type="button"
            onClick={() =>
              onChangeArmyRuleState({ ...armyRuleState, shadowEnemyDz: !edz })
            }
            className={`p-2 rounded-lg border text-center transition-all ${
              edz
                ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-200'
                : 'bg-theme-card/75 border-theme-border-subtle text-theme-text-muted hover:border-amber-500/40'
            }`}
          >
            <span className="text-[11px] font-bold block">Enemy DZ</span>
            <span className="text-[10px] font-mono">{edz ? 'In Shadow' : 'Inactive'}</span>
          </button>
        </div>
        <p className="text-[11px] text-theme-text-muted">
          Friendly in Shadow: +1 Battle-shock (pass heals D3 W or returns D3 Battleline models). Enemy: -1 Battle-shock (fail deals D3 MW).
        </p>
      </div>
    );
  }

  // 6. Chaos Knights: Harbingers of Dread
  if (ruleType === 'harbingers-of-dread') {
    const activeDreads = armyRuleState.activeDreads || [];
    const lastRoll = armyRuleState.lastDreadRoll || null;
    const hasTraitoris = selectedDetachments.some(
      (d) => normalizeDetachmentName(d.name) === 'traitoris lance'
    );

    const toggleDread = (id: string) => {
      const exists = activeDreads.includes(id);
      onChangeArmyRuleState({
        ...armyRuleState,
        activeDreads: exists ? activeDreads.filter((x) => x !== id) : [...activeDreads, id]
      });
    };

    const rollTwoDreads = () => {
      const d1 = Math.floor(Math.random() * 6) + 1;
      const d2 = Math.floor(Math.random() * 6) + 1;
      const merged = Array.from(new Set([...activeDreads, String(d1), String(d2)]));
      onChangeArmyRuleState({
        ...armyRuleState,
        activeDreads: merged,
        lastDreadRoll: [d1, d2]
      });
    };

    return (
      <div className="space-y-2.5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="text-[11px] text-theme-text-secondary">
            <span className="font-bold text-amber-300">Deathly Terror</span> always active (-1 Ld within 9&quot;). Unlock in Rounds 1, 3, 5
            {hasTraitoris ? ' (+1 extra in BR 1).' : '.'}
          </div>
          <div className="flex items-center gap-1.5">
            {lastRoll && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/40 text-amber-300">
                2D6: {lastRoll[0]} &amp; {lastRoll[1]}
              </span>
            )}
            <button
              type="button"
              onClick={rollTwoDreads}
              className="min-h-[28px] px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/40 text-[11px] font-bold text-amber-200 hover:bg-amber-500/25 flex items-center gap-1"
            >
              <Dices className="w-3.5 h-3.5" />
              <span>Roll 2D6</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {DREAD_ABILITIES.map((d) => {
            const active = activeDreads.includes(d.id);
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => toggleDread(d.id)}
                className={`text-left p-2 rounded-lg border transition-all ${
                  active
                    ? 'bg-amber-500/15 border-amber-400/70'
                    : 'bg-theme-card/75 border-theme-border-subtle hover:border-amber-500/40'
                }`}
              >
                <div className="flex items-center justify-between gap-1.5">
                  <span className="text-xs font-bold text-theme-text">
                    <span className="font-mono text-amber-300 mr-1.5">[{d.roll}]</span>
                    {d.name}
                  </span>
                  {active && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                </div>
                <p className="text-[11px] text-theme-text-muted leading-snug mt-0.5">{d.effect}</p>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // 7. Death Guard: Nurgle's Gift (Aura)
  if (ruleType === 'nurgles-gift') {
    const round = armyRuleState.contagionRound || 1;
    const plagueId = armyRuleState.chosenPlague || null;
    const rangeMap: Record<1 | 2 | 3, string> = { 1: '3"', 2: '6"', 3: '9"' };

    return (
      <div className="space-y-2.5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-xs font-semibold text-theme-text-secondary">
            Contagion Range: <span className="font-mono font-bold text-emerald-300">{rangeMap[round]}</span>
          </span>
          <div className="inline-flex items-center gap-1 bg-theme-surface border border-theme-border rounded-lg p-0.5">
            {([1, 2, 3] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => onChangeArmyRuleState({ ...armyRuleState, contagionRound: r })}
                className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-bold transition-colors ${
                  round === r
                    ? 'bg-emerald-500/20 border border-emerald-500/50 text-emerald-200'
                    : 'text-theme-text-muted hover:text-theme-text'
                }`}
              >
                BR {r === 3 ? '3+' : r} ({rangeMap[r]})
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
          {NURGLE_PLAGUES.map((p) => {
            const active = plagueId === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() =>
                  onChangeArmyRuleState({
                    ...armyRuleState,
                    chosenPlague: active ? null : p.id
                  })
                }
                className={`text-left p-2 rounded-lg border transition-all ${
                  active
                    ? 'bg-emerald-500/15 border-emerald-400/70'
                    : 'bg-theme-card/75 border-theme-border-subtle hover:border-emerald-500/40'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-bold text-theme-text">{p.name}</span>
                  {active && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                </div>
                <p className="text-[11px] text-theme-text-muted leading-snug mt-0.5">{p.effect}</p>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // 8. Thousand Sons: Cabal of Sorcerers
  if (ruleType === 'cabal-of-sorcerers') {
    const used = armyRuleState.ritualsUsed || [];

    const toggleRitual = (id: string) => {
      const exists = used.includes(id);
      onChangeArmyRuleState({
        ...armyRuleState,
        ritualsUsed: exists ? used.filter((x) => x !== id) : [...used, id]
      });
    };

    return (
      <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-theme-text-secondary font-medium">
            Rituals Attempted This Turn ({used.length}/4)
          </span>
          {used.length > 0 && (
            <button
              type="button"
              onClick={() => onChangeArmyRuleState({ ...armyRuleState, ritualsUsed: [] })}
              className="min-h-[28px] px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/40 text-[11px] font-bold text-amber-200 hover:bg-amber-500/25 flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>New Turn</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {PSYCHIC_RITUALS.map((r) => {
            const isUsed = used.includes(r.id);
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => toggleRitual(r.id)}
                className={`text-left p-2 rounded-lg border transition-all ${
                  isUsed
                    ? 'bg-theme-surface/50 border-theme-border-subtle/60 opacity-60'
                    : 'bg-theme-card/80 border-theme-border-subtle hover:border-sky-400/50'
                }`}
              >
                <div className="flex items-center justify-between gap-1.5">
                  <span
                    className={`text-xs font-bold ${
                      isUsed ? 'line-through text-theme-text-muted' : 'text-theme-text'
                    }`}
                  >
                    {r.name}
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-500/15 border border-sky-500/35 text-sky-300 shrink-0">
                    WC {r.wc} ({r.boostedWc}+)
                  </span>
                </div>
                <p className="text-[11px] text-theme-text-muted leading-snug mt-0.5">{r.effect}</p>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // 9. World Eaters: Blessings of Khorne
  if (ruleType === 'blessings-of-khorne') {
    const active = armyRuleState.activeBlessings || [];
    const dice = armyRuleState.blessingsDice || null;

    const toggleBlessing = (id: string) => {
      const exists = active.includes(id);
      if (exists) {
        onChangeArmyRuleState({
          ...armyRuleState,
          activeBlessings: active.filter((x) => x !== id)
        });
      } else {
        onChangeArmyRuleState({
          ...armyRuleState,
          activeBlessings: [...active, id]
        });
      }
    };

    const rollEightD6 = () => {
      const rolled = Array.from({ length: 8 }, () => Math.floor(Math.random() * 6) + 1).sort(
        (a, b) => a - b
      );
      onChangeArmyRuleState({
        ...armyRuleState,
        blessingsDice: rolled
      });
    };

    return (
      <div className="space-y-2.5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-xs font-semibold text-theme-text-secondary">
            Active Blessings:{' '}
            <span className={`font-mono font-bold ${active.length > 2 ? 'text-amber-300' : 'text-red-300'}`}>
              {active.length}/2
            </span>
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={rollEightD6}
              className="min-h-[28px] px-2.5 py-1 rounded-lg bg-red-500/15 border border-red-500/40 text-[11px] font-bold text-red-200 hover:bg-red-500/25 flex items-center gap-1"
            >
              <Dices className="w-3.5 h-3.5" />
              <span>Roll 8D6</span>
            </button>
            {(active.length > 0 || dice) && (
              <button
                type="button"
                onClick={() =>
                  onChangeArmyRuleState({
                    ...armyRuleState,
                    activeBlessings: [],
                    blessingsDice: null
                  })
                }
                className="min-h-[28px] px-2.5 py-1 rounded-lg bg-theme-surface border border-theme-border-subtle text-[11px] font-semibold text-theme-text-secondary hover:text-theme-text flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>New Round</span>
              </button>
            )}
          </div>
        </div>

        {dice && dice.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap px-2.5 py-1.5 rounded-lg bg-theme-surface/80 border border-red-500/30">
            <span className="text-[10px] font-bold uppercase tracking-wider text-red-300 mr-1">
              8D6:
            </span>
            {dice.map((val, idx) => (
              <span
                key={idx}
                className="w-6 h-6 rounded-md bg-red-950/80 border border-red-500/50 text-red-200 font-mono text-xs font-bold flex items-center justify-center"
              >
                {val}
              </span>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {KHORNE_BLESSINGS.map((b) => {
            const isActive = active.includes(b.id);
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => toggleBlessing(b.id)}
                className={`text-left p-2 rounded-lg border transition-all ${
                  isActive
                    ? 'bg-red-500/15 border-red-400/70'
                    : 'bg-theme-card/80 border-theme-border-subtle hover:border-red-500/40'
                }`}
              >
                <div className="flex items-center justify-between gap-1.5">
                  <span className="text-xs font-bold text-theme-text">{b.name}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-theme-surface border border-theme-border-subtle text-amber-300 shrink-0">
                    {b.requirement}
                  </span>
                </div>
                <p className="text-[11px] text-theme-text-muted leading-snug mt-0.5">{b.effect}</p>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // 10. Genestealer Cults: Cult Ambush
  if (ruleType === 'cult-ambush') {
    const startMax = getStartingResurgencePoints(battleSize);
    const points =
      typeof armyRuleState.resurgencePoints === 'number'
        ? armyRuleState.resurgencePoints
        : startMax;
    const markers = armyRuleState.cultAmbushMarkers ?? 0;

    const setPoints = (next: number) =>
      onChangeArmyRuleState({
        ...armyRuleState,
        resurgencePoints: Math.max(0, next)
      });

    const setMarkers = (next: number) =>
      onChangeArmyRuleState({
        ...armyRuleState,
        cultAmbushMarkers: Math.max(0, next)
      });

    return (
      <div className="space-y-2.5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-theme-text-secondary">
              Resurgence Points:
            </span>
            <div className="inline-flex items-center gap-1 rounded-lg bg-theme-surface border border-theme-border p-0.5">
              <button
                type="button"
                disabled={points <= 0}
                onClick={() => setPoints(points - 1)}
                className="w-7 h-7 rounded-md flex items-center justify-center text-theme-text-secondary hover:bg-theme-elevated disabled:opacity-30"
                aria-label="Decrease Resurgence points"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="font-mono text-sm font-bold px-2 text-amber-300">
                {points}
                <span className="text-[11px] text-theme-text-muted font-normal">/{startMax}</span>
              </span>
              <button
                type="button"
                onClick={() => setPoints(points + 1)}
                className="w-7 h-7 rounded-md flex items-center justify-center text-theme-text-secondary hover:bg-theme-elevated"
                aria-label="Increase Resurgence points"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-theme-text-secondary">
              Ambush Markers:
            </span>
            <div className="inline-flex items-center gap-1 rounded-lg bg-theme-surface border border-theme-border p-0.5">
              <button
                type="button"
                disabled={markers <= 0}
                onClick={() => setMarkers(markers - 1)}
                className="w-7 h-7 rounded-md flex items-center justify-center text-theme-text-secondary hover:bg-theme-elevated disabled:opacity-30"
                aria-label="Remove Ambush marker"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="font-mono text-sm font-bold px-2 text-sky-300">{markers}</span>
              <button
                type="button"
                onClick={() => setMarkers(markers + 1)}
                className="w-7 h-7 rounded-md flex items-center justify-center text-theme-text-secondary hover:bg-theme-elevated"
                aria-label="Add Ambush marker"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] text-theme-text-muted mr-1">Quick Spend:</span>
          {[2, 3, 4, 6, 8].map((cost) => (
            <button
              key={cost}
              type="button"
              disabled={points < cost}
              onClick={() =>
                onChangeArmyRuleState({
                  ...armyRuleState,
                  resurgencePoints: points - cost,
                  cultAmbushMarkers: markers + 1
                })
              }
              className="px-2 py-1 rounded-lg bg-theme-surface border border-theme-border-subtle text-[11px] font-mono font-bold text-amber-300 hover:bg-amber-500/15 disabled:opacity-30"
              title={`Spend ${cost} Resurgence points & place 1 marker`}
            >
              -{cost} pts (+1 Marker)
            </button>
          ))}
        </div>
      </div>
    );
  }

  // 11. Adepta Sororitas: Acts of Faith (Miracle Dice Pool)
  if (ruleType === 'acts-of-faith') {
    const dice = armyRuleState.miracleDice || [];

    const addDie = (value: number) => {
      onChangeArmyRuleState({
        ...armyRuleState,
        miracleDice: [...dice, value].sort((a, b) => b - a)
      });
    };

    const rollDie = () => {
      addDie(Math.floor(Math.random() * 6) + 1);
    };

    const spendDieAt = (idx: number) => {
      onChangeArmyRuleState({
        ...armyRuleState,
        miracleDice: dice.filter((_, i) => i !== idx)
      });
    };

    return (
      <div className="space-y-2.5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-xs font-semibold text-theme-text-secondary">
            Miracle Dice Pool ({dice.length})
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={rollDie}
              className="min-h-[28px] px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/40 text-[11px] font-bold text-amber-200 hover:bg-amber-500/25 flex items-center gap-1"
            >
              <Dices className="w-3.5 h-3.5" />
              <span>Roll D6</span>
            </button>
            {dice.length > 0 && (
              <button
                type="button"
                onClick={() => onChangeArmyRuleState({ ...armyRuleState, miracleDice: [] })}
                className="min-h-[28px] px-2 py-1 rounded-lg bg-theme-surface border border-theme-border-subtle text-[11px] font-semibold text-theme-text-muted hover:text-theme-text"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Add physical die face 1-6 */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] text-theme-text-muted mr-0.5">Add Die:</span>
          {[1, 2, 3, 4, 5, 6].map((face) => (
            <button
              key={face}
              type="button"
              onClick={() => addDie(face)}
              className="w-8 h-8 rounded-lg bg-theme-surface hover:bg-amber-500/15 border border-theme-border-subtle hover:border-amber-400/60 font-mono text-xs font-bold text-theme-text flex items-center justify-center transition-colors"
              title={`Add Miracle Die (${face})`}
            >
              +{face}
            </button>
          ))}
        </div>

        {/* Active Pool */}
        {dice.length === 0 ? (
          <p className="text-[11px] text-theme-text-muted italic">
            Pool is empty. Gain 1 Miracle die at start of each turn &amp; when a unit is destroyed.
          </p>
        ) : (
          <div className="flex items-center gap-1.5 flex-wrap pt-1">
            {dice.map((val, idx) => (
              <button
                key={`${val}-${idx}`}
                type="button"
                onClick={() => spendDieAt(idx)}
                className="group relative w-9 h-9 rounded-lg bg-amber-500/20 border border-amber-400/70 hover:bg-red-500/20 hover:border-red-400/70 font-mono text-sm font-extrabold text-amber-200 hover:text-red-200 flex items-center justify-center transition-all"
                title={`Tap to spend Miracle Die (${val})`}
              >
                <span>{val}</span>
              </button>
            ))}
            <span className="text-[10px] text-theme-text-muted ml-1">(Tap die to spend)</span>
          </div>
        )}
      </div>
    );
  }

  // 12. Adeptus Custodes: Martial Ka'tah
  if (ruleType === 'martial-katah') {
    const eligibleUnits = rosterUnits.filter((u) => {
      if (isUnitDestroyedInPlay(u, playState, rosterUnits)) return false;
      if (u.attachedToBodyguardId) return false;
      const children = getAttachedChildrenForBodyguard(u, rosterUnits).filter(
        (c) => !isUnitDestroyedInPlay(c.unit, playState, rosterUnits)
      );
      return unitHasMartialKatah(u, children);
    });
    const readiedCount = eligibleUnits.filter((u) => !playState[u.instanceId]?.kaTahUsed).length;

    return (
      <div className="space-y-2.5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-xs font-semibold text-theme-text-secondary">
            Readied Units:{' '}
            <span className="font-mono font-bold text-amber-300">
              {readiedCount}/{eligibleUnits.length}
            </span>
          </span>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowKatahRef((v) => !v)}
              className="min-h-[28px] px-2.5 py-1 rounded-lg bg-theme-surface border border-theme-border-subtle text-[11px] font-semibold text-theme-text-secondary hover:text-theme-text"
            >
              {showKatahRef ? 'Hide Ka’tahs' : 'Ka’tah List'}
            </button>
            {onResetAllKaTah && (
              <button
                type="button"
                onClick={onResetAllKaTah}
                className="min-h-[28px] px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/40 text-[11px] font-bold text-amber-200 hover:bg-amber-500/25 flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Ready All (Command)</span>
              </button>
            )}
          </div>
        </div>

        <p className="text-[11px] text-theme-text-muted">
          Toggle each unit&apos;s <span className="text-amber-300 font-semibold">Readied / Ka&apos;tah Used</span> pill on its card below when it uses a Ka&apos;tah ability.
        </p>

        {showKatahRef && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
            {KATAH_STANCES.map((k) => (
              <div
                key={k.id}
                className="p-2 rounded-lg bg-theme-card/75 border border-theme-border-subtle"
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs font-bold text-amber-200">{k.name}</span>
                  <span className="text-[10px] text-theme-text-muted truncate">{k.when}</span>
                </div>
                <p className="text-[11px] text-theme-text-secondary leading-snug mt-0.5">{k.effect}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // 13. Adeptus Mechanicus: Doctrina Imperatives
  if (ruleType === 'doctrina-imperatives') {
    const active = armyRuleState.activeImperative || null;

    return (
      <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-theme-text-secondary">
            Active Imperative:{' '}
            <span className="text-amber-300 font-bold">
              {active
                ? DOCTRINA_IMPERATIVES.find((i) => i.id === active)?.name
                : 'None selected'}
            </span>
          </span>
          {active && (
            <button
              type="button"
              onClick={() => onChangeArmyRuleState({ ...armyRuleState, activeImperative: null })}
              className="text-[11px] font-semibold px-2 py-0.5 rounded bg-theme-surface border border-theme-border-subtle text-theme-text-muted hover:text-theme-text"
            >
              Clear
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {DOCTRINA_IMPERATIVES.map((imp) => {
            const isSelected = active === imp.id;
            return (
              <button
                key={imp.id}
                type="button"
                onClick={() =>
                  onChangeArmyRuleState({
                    ...armyRuleState,
                    activeImperative: isSelected ? null : imp.id
                  })
                }
                className={`text-left p-2.5 rounded-xl border transition-all ${
                  isSelected
                    ? 'bg-amber-500/15 border-amber-400/70'
                    : 'bg-theme-card/75 border-theme-border-subtle hover:border-amber-500/40'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-warhammer text-xs sm:text-sm font-bold text-theme-text">
                    {imp.name}
                  </span>
                  {isSelected && (
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/50 text-emerald-300">
                      Active
                    </span>
                  )}
                </div>
                <ul className="mt-1 space-y-0.5 text-[11px] text-theme-text-secondary list-disc list-inside">
                  {imp.bullets.map((b, i) => (
                    <li key={i}>{b}</li>
                  ))}
                </ul>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // 14. Astra Militarum: Voice Of Command
  if (ruleType === 'voice-of-command') {
    const orderedUnits = rosterUnits.filter(
      (u) => !isUnitDestroyedInPlay(u, playState, rosterUnits) && Boolean(playState[u.instanceId]?.activeOrder)
    );

    return (
      <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-xs font-semibold text-theme-text-secondary">
            Active Orders:{' '}
            <span className="font-mono font-bold text-amber-300">{orderedUnits.length}</span>
          </span>
          {orderedUnits.length > 0 && onClearAllOrders && (
            <button
              type="button"
              onClick={onClearAllOrders}
              className="min-h-[28px] px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/40 text-[11px] font-bold text-amber-200 hover:bg-amber-500/25 flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Command Phase: Clear Orders</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {ASTRA_ORDERS.map((ord) => (
            <span
              key={ord.id}
              title={`${ord.name}: ${ord.effect}`}
              className="text-[10px] px-2 py-0.5 rounded-md bg-theme-card/80 border border-theme-border-subtle text-theme-text-secondary"
            >
              <strong className="text-theme-text">{ord.name}</strong> ({ord.shortName})
            </span>
          ))}
        </div>
        <p className="text-[11px] text-theme-text-muted">
          Assign active Orders directly on each unit card below.
        </p>
      </div>
    );
  }

  // 15. Grey Knights: Gate of Infinity
  if (ruleType === 'gate-of-infinity') {
    const limit = getGateOfInfinityLimit(battleSize);
    const used = Math.min(armyRuleState.gateOfInfinityUsed ?? 0, limit);

    return (
      <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-xs font-semibold text-theme-text-secondary">
            Picked Up This Turn:{' '}
            <span className="font-mono font-bold text-sky-300">
              {used}/{limit}
            </span>
          </span>

          <div className="flex items-center gap-1.5">
            {Array.from({ length: limit }, (_, i) => i + 1).map((n) => {
              const active = n <= used;
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() =>
                    onChangeArmyRuleState({
                      ...armyRuleState,
                      gateOfInfinityUsed: active && n === used ? n - 1 : n
                    })
                  }
                  className={`w-8 h-8 rounded-lg border font-mono text-xs font-bold transition-all ${
                    active
                      ? 'bg-sky-500/20 border-sky-400/70 text-sky-200'
                      : 'bg-theme-surface border-theme-border-subtle text-theme-text-muted hover:border-sky-500/40'
                  }`}
                >
                  {n}
                </button>
              );
            })}
            {used > 0 && (
              <button
                type="button"
                onClick={() => onChangeArmyRuleState({ ...armyRuleState, gateOfInfinityUsed: 0 })}
                className="min-h-[32px] px-2.5 py-1 rounded-lg bg-theme-surface border border-theme-border-subtle text-[11px] font-semibold text-theme-text-secondary hover:text-theme-text"
              >
                Reset
              </button>
            )}
          </div>
        </div>
        <p className="text-[11px] text-theme-text-muted">
          End of opponent&apos;s Fight phase: pick up to {limit} unengaged units into Strategic Reserves for next Movement phase ingress.
        </p>
      </div>
    );
  }

  // 16. Leagues of Votann: Prioritised Efficiency
  if (ruleType === 'prioritised-efficiency') {
    const yp = armyRuleState.yieldPoints ?? 0;
    const mode = armyRuleState.efficiencyMode || 'hostile';
    const suggested: 'hostile' | 'fortify' = yp >= 7 ? 'fortify' : 'hostile';

    const setYp = (next: number) =>
      onChangeArmyRuleState({
        ...armyRuleState,
        yieldPoints: Math.max(0, next)
      });

    return (
      <div className="space-y-2.5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-theme-text-secondary">
              Yield Points (YP):
            </span>
            <div className="inline-flex items-center gap-1 rounded-lg bg-theme-surface border border-theme-border p-0.5">
              <button
                type="button"
                disabled={yp <= 0}
                onClick={() => setYp(yp - 1)}
                className="w-7 h-7 rounded-md flex items-center justify-center text-theme-text-secondary hover:bg-theme-elevated disabled:opacity-30"
                aria-label="Spend Yield point"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="font-mono text-sm font-bold px-2.5 text-amber-300">{yp}</span>
              <button
                type="button"
                onClick={() => setYp(yp + 1)}
                className="w-7 h-7 rounded-md flex items-center justify-center text-theme-text-secondary hover:bg-theme-elevated"
                aria-label="Gain Yield point"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {suggested !== mode && (
            <button
              type="button"
              onClick={() =>
                onChangeArmyRuleState({ ...armyRuleState, efficiencyMode: suggested })
              }
              className="min-h-[28px] px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/45 text-[11px] font-bold text-amber-200 hover:bg-amber-500/25"
            >
              End Command Phase → {suggested === 'fortify' ? 'Fortify (7+ YP)' : 'Hostile (<7 YP)'}
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => onChangeArmyRuleState({ ...armyRuleState, efficiencyMode: 'hostile' })}
            className={`text-left p-2 rounded-lg border transition-all ${
              mode === 'hostile'
                ? 'bg-amber-500/15 border-amber-400/70'
                : 'bg-theme-card/75 border-theme-border-subtle hover:border-amber-500/40'
            }`}
          >
            <div className="flex items-center justify-between gap-1.5">
              <span className="text-xs font-bold text-theme-text">Hostile Acquisition</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-theme-surface border border-theme-border-subtle text-amber-300">
                &lt; 7 YP
              </span>
            </div>
            <p className="text-[11px] text-theme-text-muted leading-snug mt-0.5">
              +1 Hit vs enemies on objectives; re-roll Advance &amp; Charge rolls.
            </p>
          </button>

          <button
            type="button"
            onClick={() => onChangeArmyRuleState({ ...armyRuleState, efficiencyMode: 'fortify' })}
            className={`text-left p-2 rounded-lg border transition-all ${
              mode === 'fortify'
                ? 'bg-emerald-500/15 border-emerald-400/70'
                : 'bg-theme-card/75 border-theme-border-subtle hover:border-emerald-500/40'
            }`}
          >
            <div className="flex items-center justify-between gap-1.5">
              <span className="text-xs font-bold text-theme-text">Fortify Takeover</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-theme-surface border border-theme-border-subtle text-emerald-300">
                7+ YP
              </span>
            </div>
            <p className="text-[11px] text-theme-text-muted leading-snug mt-0.5">
              +1 Hit while on controlled objectives; non-Vehicles suffer -1 to Wound if S &gt; T.
            </p>
          </button>
        </div>
      </div>
    );
  }

  // 17. Tyranids: Shadow in the Warp
  if (ruleType === 'shadow-in-the-warp') {
    const used = Boolean(armyRuleState.shadowInTheWarpUsed);

    return (
      <div className="space-y-1.5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Swords className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="text-xs font-semibold text-theme-text">
              Shadow in the Warp <span className="text-theme-text-muted font-normal">(Once per battle)</span>
            </span>
          </div>

          <button
            type="button"
            onClick={() =>
              onChangeArmyRuleState({
                ...armyRuleState,
                shadowInTheWarpUsed: !used
              })
            }
            className={`min-h-[30px] px-3 py-1 rounded-lg border text-xs font-bold transition-all flex items-center gap-1.5 ${
              used
                ? 'bg-theme-surface border-theme-border-subtle text-theme-text-muted line-through'
                : 'bg-amber-500/20 border-amber-400/70 text-amber-200 hover:bg-amber-500/30'
            }`}
          >
            {used ? (
              <>
                <X className="w-3.5 h-3.5" />
                <span>Unleashed (Used)</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Unleash Shadow</span>
              </>
            )}
          </button>
        </div>
        <p className="text-[11px] text-theme-text-muted">
          Either player&apos;s Command phase: every enemy unit takes a Battle-shock test (-1 if within 6&quot; of Synapse).
        </p>
      </div>
    );
  }

  // 18. Orks: Waaagh! / Riled Up
  if (ruleType === 'waaagh') {
    const livingAll = rosterUnits.filter((u) => !isUnitDestroyedInPlay(u, playState, rosterUnits));
    const eligibleCards = livingAll.filter((u) => {
      if (isUnitConsolidatedUnderBodyguard(u, playState, rosterUnits)) return false;
      const children = getAttachedChildrenForBodyguard(u, rosterUnits).filter(
        (c) => !isUnitDestroyedInPlay(c.unit, playState, rosterUnits)
      );
      return unitHasWaaagh(u, children);
    });

    const riledUpCount = eligibleCards.filter((u) => {
      const children = getAttachedChildrenForBodyguard(u, rosterUnits).filter(
        (c) => !isUnitDestroyedInPlay(c.unit, playState, rosterUnits)
      );
      return unitIsAlwaysRiledUp(u, children) || Boolean(playState[u.instanceId]?.riledUp);
    }).length;

    const hasTempRiledUp = eligibleCards.some((u) => {
      const children = getAttachedChildrenForBodyguard(u, rosterUnits).filter(
        (c) => !isUnitDestroyedInPlay(c.unit, playState, rosterUnits)
      );
      return !unitIsAlwaysRiledUp(u, children) && Boolean(playState[u.instanceId]?.riledUp);
    });

    const onceUsed = armyRuleState.waaaghOncePerBattleUsed || [];
    const roundUsed = armyRuleState.waaaghRoundAbilitiesUsed || [];
    const livingSources = getActiveOrkRiledUpSources(livingAll);
    const allRosterSources = getActiveOrkRiledUpSources(rosterUnits);
    const presentIds = new Set(livingSources.map((s) => s.id));
    for (const id of onceUsed) presentIds.add(id);
    for (const id of roundUsed) presentIds.add(id);
    const presentSources = allRosterSources.filter((s) => presentIds.has(s.id));

    const toggleSource = (id: string, cadence: 'battle' | 'round') => {
      if (cadence === 'battle') {
        const next = onceUsed.includes(id)
          ? onceUsed.filter((x) => x !== id)
          : [...onceUsed, id];
        onChangeArmyRuleState({ ...armyRuleState, waaaghOncePerBattleUsed: next });
      } else {
        const next = roundUsed.includes(id)
          ? roundUsed.filter((x) => x !== id)
          : [...roundUsed, id];
        onChangeArmyRuleState({ ...armyRuleState, waaaghRoundAbilitiesUsed: next });
      }
    };

    const handleNewTurnOrRound = () => {
      if (onClearAllRiledUp) {
        onClearAllRiledUp();
      }
      if (roundUsed.length > 0) {
        onChangeArmyRuleState({ ...armyRuleState, waaaghRoundAbilitiesUsed: [] });
      }
    };

    const canAdvanceTurn = hasTempRiledUp || roundUsed.length > 0;

    return (
      <div className="space-y-2.5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-theme-text-secondary">
              Riled Up:{' '}
              <span className="font-mono font-bold text-amber-300">
                {riledUpCount}/{eligibleCards.length}
              </span>
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-theme-card/80 border border-theme-border-subtle text-theme-text-secondary">
              Always: Re-roll Advance rolls
            </span>
          </div>

          {canAdvanceTurn && (
            <button
              type="button"
              onClick={handleNewTurnOrRound}
              className="min-h-[28px] px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/40 text-[11px] font-bold text-amber-200 hover:bg-amber-500/25 flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Start of Turn: Clear Riled Up</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-1.5 flex-wrap text-[10px]">
          <span className="font-semibold text-emerald-300/90 uppercase tracking-wider">
            While Riled Up:
          </span>
          <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/35 text-emerald-200 font-semibold">
            5+ InSv
          </span>
          <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/35 text-emerald-200 font-semibold">
            Ranged [ASSAULT]
          </span>
          <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/35 text-emerald-200 font-semibold">
            Advance &amp; Charge
          </span>
        </div>

        {presentSources.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {presentSources.map((src) => {
              const isUsed =
                src.cadence === 'battle'
                  ? onceUsed.includes(src.id)
                  : roundUsed.includes(src.id);
              return (
                <button
                  key={src.id}
                  type="button"
                  onClick={() => toggleSource(src.id, src.cadence)}
                  className={`text-left p-2 rounded-lg border transition-all ${
                    isUsed
                      ? 'bg-theme-surface/50 border-theme-border-subtle/60 opacity-65'
                      : 'bg-theme-card/80 border-theme-border-subtle hover:border-amber-500/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <span
                      className={`text-xs font-bold ${
                        isUsed ? 'line-through text-theme-text-muted' : 'text-theme-text'
                      }`}
                    >
                      {src.name}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-theme-surface border border-theme-border-subtle text-theme-text-muted">
                        {src.cadence === 'battle' ? '1/Battle' : '1/Round'}
                      </span>
                      <span
                        className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                          isUsed
                            ? 'bg-theme-surface border-theme-border-subtle text-theme-text-muted'
                            : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                        }`}
                      >
                        {isUsed ? 'Used' : 'Ready'}
                      </span>
                    </div>
                  </div>
                  <p className="text-[11px] text-theme-text-muted leading-snug mt-0.5">
                    <span className="text-amber-300/90 font-semibold">{src.sourceLabel}:</span>{' '}
                    {src.summary}
                  </p>
                </button>
              );
            })}
          </div>
        )}

        <p className="text-[11px] text-theme-text-muted">
          Toggle <span className="text-emerald-300 font-semibold">Riled Up</span> directly on each Orks unit card below (lasts until start of your next turn).
        </p>
      </div>
    );
  }

  return null;
};
