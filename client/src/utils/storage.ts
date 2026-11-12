import { ArmyRoster } from '../types/roster';

const STORAGE_KEY = 'wh40k_11e_rosters';
const ACTIVE_ROSTER_KEY = 'wh40k_11e_active_roster_id';
const PLAY_MODE_KEY = 'wh40k_11e_play_mode';

export function loadActiveRosterId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_ROSTER_KEY);
  } catch {
    return null;
  }
}

export function saveActiveRosterId(rosterId: string | null): void {
  try {
    if (rosterId) {
      localStorage.setItem(ACTIVE_ROSTER_KEY, rosterId);
    } else {
      localStorage.removeItem(ACTIVE_ROSTER_KEY);
    }
  } catch (err) {
    console.error('Failed to save active roster ID:', err);
  }
}

export function loadPlayMode(): boolean {
  try {
    return localStorage.getItem(PLAY_MODE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function savePlayMode(isPlayMode: boolean): void {
  try {
    if (isPlayMode) {
      localStorage.setItem(PLAY_MODE_KEY, 'true');
    } else {
      localStorage.removeItem(PLAY_MODE_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

export function loadAllRosters(): ArmyRoster[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to load rosters from localStorage:', err);
    return [];
  }
}

export function saveRoster(roster: ArmyRoster): ArmyRoster[] {
  const current = loadAllRosters();
  const idx = current.findIndex(r => r.id === roster.id);
  const updatedRoster: ArmyRoster = {
    ...roster,
    updatedAt: new Date().toISOString()
  };

  if (idx >= 0) {
    current[idx] = updatedRoster;
  } else {
    current.unshift(updatedRoster);
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch (err) {
    console.error('Failed to save roster to localStorage:', err);
  }
  return current;
}

export function deleteRoster(rosterId: string): ArmyRoster[] {
  const current = loadAllRosters().filter(r => r.id !== rosterId);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    if (loadActiveRosterId() === rosterId) {
      saveActiveRosterId(null);
    }
  } catch (err) {
    console.error('Failed to delete roster:', err);
  }
  return current;
}

export function duplicateRoster(rosterId: string): ArmyRoster | null {
  const current = loadAllRosters();
  const original = current.find(r => r.id === rosterId);
  if (!original) return null;

  const copy: ArmyRoster = {
    ...original,
    id: `roster-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    name: `${original.name} (Copy)`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  saveRoster(copy);
  return copy;
}

export function exportRosterJSON(roster: ArmyRoster) {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(roster, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  const cleanName = roster.name.toLowerCase().replace(/[^a-z0-9]+/g, '_');
  downloadAnchor.setAttribute('download', `${cleanName}_11e.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

export function parseRosterJSON(fileContent: string): ArmyRoster {
  const parsed = JSON.parse(fileContent);
  if (!parsed.id || !parsed.name || !parsed.factionId || !parsed.units) {
    throw new Error('Invalid Army Roster file format.');
  }
  // Assign a fresh ID to avoid collisions
  parsed.id = `roster-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  parsed.updatedAt = new Date().toISOString();
  return parsed as ArmyRoster;
}

