import { SelectedUnit, isRetinueUnit } from '../types/roster';
import { computeUnitEquippedData } from './equippedStats';

export interface UnitPlayState {
  modelsRemaining?: number;
  woundsRemaining?: number;
}

export type RosterPlayState = Record<string, UnitPlayState>;

const PLAY_STATE_PREFIX = 'wh40k_11e_play_state_';

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

export function clearRosterPlayState(rosterId: string): void {
  if (!rosterId) return;
  try {
    localStorage.removeItem(`${PLAY_STATE_PREFIX}${rosterId}`);
  } catch {
    // ignore storage errors
  }
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
  const nextState: RosterPlayState = { ...playState };

  if (clamped >= status.max) {
    delete nextState[unit.instanceId];
    return nextState;
  }

  if (status.isSingleModel) {
    nextState[unit.instanceId] = { woundsRemaining: clamped };
  } else {
    nextState[unit.instanceId] = { modelsRemaining: clamped };
  }
  return nextState;
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
