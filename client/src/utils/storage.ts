import { ArmyRoster } from '../types/roster';

const STORAGE_KEY = 'wh40k_11e_rosters';

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

