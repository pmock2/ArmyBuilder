import { SelectedUnit, isRetinueUnit } from '../types/roster';
import { computeUnitEquippedData } from './equippedStats';

export interface UnitPlayState {
  modelsRemaining?: number;
  woundsRemaining?: number;
  kaTahUsed?: boolean;
  activeOrder?: string | null;
}

export type RosterPlayState = Record<string, UnitPlayState>;

export interface ArmyRulePlayState {
  // Space Marines: Combat Doctrines
  activeDoctrine?: 'assault' | 'devastator' | 'tactical' | null;
  doctrineUses?: {
    assault: number;
    devastator: number;
    tactical: number;
  };

  // Imperial Knights: Code Chivalric
  chivalricDeed?: string | null;
  chivalricDeedRandom?: boolean;
  chivalricQuality?: string | null;
  chivalricQualityRandom?: boolean;
  chivalricHonoured?: boolean;

  // Aeldari: Battle Focus
  battleFocusTokens?: number;
  agileManoeuvresUsed?: string[];

  // Drukhari: Power from Pain
  painTokens?: number;

  // Chaos Daemons: The Shadow of Chaos
  shadowNoMansLand?: boolean;
  shadowEnemyDz?: boolean;

  // Chaos Knights: Harbingers of Dread
  activeDreads?: string[];
  lastDreadRoll?: [number, number] | null;

  // Death Guard: Nurgle's Gift
  contagionRound?: 1 | 2 | 3;
  chosenPlague?: string | null;

  // Thousand Sons: Cabal of Sorcerers
  ritualsUsed?: string[];

  // World Eaters: Blessings of Khorne
  activeBlessings?: string[];
  blessingsDice?: number[] | null;

  // Genestealer Cults: Cult Ambush
  resurgencePoints?: number;
  cultAmbushMarkers?: number;

  // Adepta Sororitas: Acts of Faith
  miracleDice?: number[];

  // Adeptus Mechanicus: Doctrina Imperatives
  activeImperative?: 'protector' | 'conqueror' | null;

  // Grey Knights: Gate of Infinity
  gateOfInfinityUsed?: number;

  // Leagues of Votann: Prioritised Efficiency
  yieldPoints?: number;
  efficiencyMode?: 'hostile' | 'fortify' | null;

  // Tyranids: Shadow in the Warp
  shadowInTheWarpUsed?: boolean;
}

const PLAY_STATE_PREFIX = 'wh40k_11e_play_state_';
const ARMY_RULE_STATE_PREFIX = 'wh40k_11e_army_rule_state_';

export function loadRosterPlayState(rosterId: string): RosterPlayState {
  if (!rosterId) return {};
  try {
    const raw = localStorage.getItem(`${PLAY_STATE_PREFIX}${rosterId}`);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function saveRosterPlayState(rosterId: string, state: RosterPlayState): void {
  if (!rosterId) return;
  try {
    if (!state || Object.keys(state).length === 0) {
      localStorage.removeItem(`${PLAY_STATE_PREFIX}${rosterId}`);
    } else {
      localStorage.setItem(`${PLAY_STATE_PREFIX}${rosterId}`, JSON.stringify(state));
    }
  } catch {
    // ignore storage errors
  }
}

export function loadArmyRulePlayState(rosterId: string): ArmyRulePlayState {
  if (!rosterId) return {};
  try {
    const raw = localStorage.getItem(`${ARMY_RULE_STATE_PREFIX}${rosterId}`);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function saveArmyRulePlayState(rosterId: string, state: ArmyRulePlayState): void {
  if (!rosterId) return;
  try {
    if (!state || Object.keys(state).length === 0) {
      localStorage.removeItem(`${ARMY_RULE_STATE_PREFIX}${rosterId}`);
    } else {
      localStorage.setItem(`${ARMY_RULE_STATE_PREFIX}${rosterId}`, JSON.stringify(state));
    }
  } catch {
    // ignore storage errors
  }
}

export function clearArmyRulePlayState(rosterId: string): void {
  if (!rosterId) return;
  try {
    localStorage.removeItem(`${ARMY_RULE_STATE_PREFIX}${rosterId}`);
  } catch {
    // ignore storage errors
  }
}

export function hasArmyRulePlayStateChanges(state: ArmyRulePlayState): boolean {
  if (!state) return false;
  return Object.values(state).some((val) => {
    if (val === undefined || val === null || val === false) return false;
    if (Array.isArray(val)) return val.length > 0;
    if (typeof val === 'object') {
      return Object.values(val).some((inner) => Boolean(inner));
    }
    return true;
  });
}

export function clearRosterPlayState(rosterId: string): void {
  if (!rosterId) return;
  try {
    localStorage.removeItem(`${PLAY_STATE_PREFIX}${rosterId}`);
    localStorage.removeItem(`${ARMY_RULE_STATE_PREFIX}${rosterId}`);
  } catch {
    // ignore storage errors
  }
}

function cleanUnitPlayEntry(entry: UnitPlayState): UnitPlayState | null {
  const cleaned: UnitPlayState = {};
  if (typeof entry.modelsRemaining === 'number') cleaned.modelsRemaining = entry.modelsRemaining;
  if (typeof entry.woundsRemaining === 'number') cleaned.woundsRemaining = entry.woundsRemaining;
  if (entry.kaTahUsed) cleaned.kaTahUsed = true;
  if (entry.activeOrder) cleaned.activeOrder = entry.activeOrder;
  return Object.keys(cleaned).length > 0 ? cleaned : null;
}

export function patchUnitPlayState(
  unitId: string,
  patch: Partial<UnitPlayState>,
  playState: RosterPlayState
): RosterPlayState {
  const existing = playState[unitId] || {};
  const merged = cleanUnitPlayEntry({ ...existing, ...patch });
  const nextState: RosterPlayState = { ...playState };
  if (!merged) {
    delete nextState[unitId];
  } else {
    nextState[unitId] = merged;
  }
  return nextState;
}

export function resetAllKaTahInPlayState(playState: RosterPlayState): RosterPlayState {
  const nextState: RosterPlayState = {};
  for (const [id, entry] of Object.entries(playState)) {
    const cleaned = cleanUnitPlayEntry({ ...entry, kaTahUsed: undefined });
    if (cleaned) nextState[id] = cleaned;
  }
  return nextState;
}

export function clearAllOrdersInPlayState(playState: RosterPlayState): RosterPlayState {
  const nextState: RosterPlayState = {};
  for (const [id, entry] of Object.entries(playState)) {
    const cleaned = cleanUnitPlayEntry({ ...entry, activeOrder: undefined });
    if (cleaned) nextState[id] = cleaned;
  }
  return nextState;
}

export function getUnitMaxModels(unit: SelectedUnit): number {
  return Math.max(unit.datasheet?.minModels || 1, unit.modelsCount || 1);
}

export function isSingleModelUnit(unit: SelectedUnit): boolean {
  return getUnitMaxModels(unit) === 1;
}

export function getUnitMaxWounds(
  unit: SelectedUnit,
  allUnitsInRoster: SelectedUnit[] = []
): number {
  const baseRaw = unit.datasheet?.stats?.W || '1';
  let woundsStr = baseRaw;
  if (unit.datasheet) {
    try {
      const equipped = computeUnitEquippedData(
        unit.datasheet,
        unit,
        undefined,
        allUnitsInRoster
      );
      if (equipped?.modW?.value) {
        woundsStr = equipped.modW.value;
      }
    } catch {
      // fallback to base W
    }
  }
  const parsed = parseInt(String(woundsStr), 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    const fallback = parseInt(String(baseRaw), 10);
    return Number.isFinite(fallback) && fallback >= 1 ? fallback : 1;
  }
  return parsed;
}

export interface UnitPlayStatus {
  isSingleModel: boolean;
  current: number;
  max: number;
  isDestroyed: boolean;
  isDamaged: boolean;
  isBelowHalf: boolean;
}

export function getUnitPlayStatus(
  unit: SelectedUnit,
  playState: RosterPlayState,
  allUnitsInRoster: SelectedUnit[] = []
): UnitPlayStatus {
  const single = isSingleModelUnit(unit);
  const entry = playState[unit.instanceId];

  if (single) {
    const max = getUnitMaxWounds(unit, allUnitsInRoster);
    const raw = entry?.woundsRemaining;
    const current =
      typeof raw === 'number' && Number.isFinite(raw)
        ? Math.min(Math.max(0, Math.round(raw)), max)
        : max;
    return {
      isSingleModel: true,
      current,
      max,
      isDestroyed: current <= 0,
      isDamaged: current < max,
      isBelowHalf: current > 0 && current < max / 2
    };
  }

  const max = getUnitMaxModels(unit);
  const raw = entry?.modelsRemaining;
  const current =
    typeof raw === 'number' && Number.isFinite(raw)
      ? Math.min(Math.max(0, Math.round(raw)), max)
      : max;
  return {
    isSingleModel: false,
    current,
    max,
    isDestroyed: current <= 0,
    isDamaged: current < max,
    isBelowHalf: current > 0 && current < max / 2
  };
}

export function setUnitPlayRemaining(
  unit: SelectedUnit,
  nextValue: number,
  playState: RosterPlayState,
  allUnitsInRoster: SelectedUnit[] = []
): RosterPlayState {
  const status = getUnitPlayStatus(unit, playState, allUnitsInRoster);
  const clamped = Math.min(Math.max(0, Math.round(nextValue)), status.max);
  const existing = playState[unit.instanceId] || {};

  if (clamped >= status.max) {
    const { modelsRemaining: _m, woundsRemaining: _w, ...rest } = existing;
    const cleaned = cleanUnitPlayEntry(rest);
    const nextState: RosterPlayState = { ...playState };
    if (!cleaned) {
      delete nextState[unit.instanceId];
    } else {
      nextState[unit.instanceId] = cleaned;
    }
    return nextState;
  }

  const nextEntry: UnitPlayState = { ...existing };
  if (status.isSingleModel) {
    delete nextEntry.modelsRemaining;
    nextEntry.woundsRemaining = clamped;
  } else {
    delete nextEntry.woundsRemaining;
    nextEntry.modelsRemaining = clamped;
  }
  return {
    ...playState,
    [unit.instanceId]: nextEntry
  };
}

export function stepUnitPlayRemaining(
  unit: SelectedUnit,
  delta: number,
  playState: RosterPlayState,
  allUnitsInRoster: SelectedUnit[] = []
): RosterPlayState {
  const status = getUnitPlayStatus(unit, playState, allUnitsInRoster);
  return setUnitPlayRemaining(unit, status.current + delta, playState, allUnitsInRoster);
}

export function isUnitDestroyedInPlay(
  unit: SelectedUnit,
  playState: RosterPlayState,
  allUnitsInRoster: SelectedUnit[] = []
): boolean {
  return getUnitPlayStatus(unit, playState, allUnitsInRoster).isDestroyed;
}

export interface AttachedChildMember {
  unit: SelectedUnit;
  role: 'Leader' | 'Support' | 'Retinue';
}

export function getAttachedChildrenForBodyguard(
  bodyguard: SelectedUnit,
  allUnitsInRoster: SelectedUnit[]
): AttachedChildMember[] {
  const result: AttachedChildMember[] = [];
  const seen = new Set<string>([bodyguard.instanceId]);

  const classifyRole = (u: SelectedUnit): 'Leader' | 'Support' | 'Retinue' => {
    if (isRetinueUnit(u)) return 'Retinue';
    if (u.isSupport && !u.isLeader) return 'Support';
    return 'Leader';
  };

  const pushMember = (u?: SelectedUnit, explicitRole?: 'Leader' | 'Support' | 'Retinue') => {
    if (!u || seen.has(u.instanceId)) return;
    seen.add(u.instanceId);
    result.push({ unit: u, role: explicitRole || classifyRole(u) });
  };

  if (bodyguard.attachedLeaderId) {
    pushMember(
      allUnitsInRoster.find((u) => u.instanceId === bodyguard.attachedLeaderId),
      'Leader'
    );
  }
  if (bodyguard.attachedSupportId) {
    pushMember(
      allUnitsInRoster.find((u) => u.instanceId === bodyguard.attachedSupportId),
      'Support'
    );
  }
  if (bodyguard.attachedRetinueId) {
    pushMember(
      allUnitsInRoster.find((u) => u.instanceId === bodyguard.attachedRetinueId),
      'Retinue'
    );
  }
  for (const u of allUnitsInRoster) {
    if (u.attachedToBodyguardId === bodyguard.instanceId) {
      pushMember(u);
    }
  }

  return result;
}

export function unitHasMartialKatah(
  unit: SelectedUnit,
  livingChildren: AttachedChildMember[] = []
): boolean {
  const hasOwn = (unit.datasheet?.abilities || []).some(
    (a) => a.name.toLowerCase() === "martial ka'tah"
  );
  if (hasOwn) return true;
  return livingChildren.some((c) =>
    (c.unit.datasheet?.abilities || []).some(
      (a) => a.name.toLowerCase() === "martial ka'tah"
    )
  );
}

/**
 * In Play Mode, living attached Leaders/Supports/Retinues are consolidated onto
 * their living Bodyguard's card instead of rendering duplicate cards in separate sections.
 * If either the attached unit OR its Bodyguard is destroyed, it is NOT hidden.
 */
export function isUnitConsolidatedUnderBodyguard(
  unit: SelectedUnit,
  playState: RosterPlayState,
  allUnitsInRoster: SelectedUnit[]
): boolean {
  if (!unit.attachedToBodyguardId) return false;
  if (isUnitDestroyedInPlay(unit, playState, allUnitsInRoster)) return false;

  const bodyguard = allUnitsInRoster.find(
    (u) => u.instanceId === unit.attachedToBodyguardId
  );
  if (!bodyguard) return false;
  if (isUnitDestroyedInPlay(bodyguard, playState, allUnitsInRoster)) return false;

  return true;
}
