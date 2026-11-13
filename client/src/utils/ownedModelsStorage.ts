export interface OwnedUnitEntry {
  datasheetId: string;
  name: string;
  role: string;
  modelsCount: number;
  minModels: number;
  maxModels: number;
  baseCost: number;
}

export interface OwnedFactionInventory {
  factionId: string;
  factionName: string;
  units: OwnedUnitEntry[];
  updatedAt: string;
}

const OWNED_MODELS_KEY = 'wh40k_11e_owned_models';

export function loadAllOwnedModels(): Record<string, OwnedFactionInventory> {
  try {
    const raw = localStorage.getItem(OWNED_MODELS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (err) {
    console.error('Failed to load owned models from localStorage:', err);
    return {};
  }
}

export function saveOwnedFaction(
  inventory: OwnedFactionInventory
): Record<string, OwnedFactionInventory> {
  const all = loadAllOwnedModels();
  const next = {
    ...all,
    [inventory.factionId]: {
      ...inventory,
      updatedAt: new Date().toISOString()
    }
  };
  try {
    localStorage.setItem(OWNED_MODELS_KEY, JSON.stringify(next));
  } catch (err) {
    console.error('Failed to save owned models to localStorage:', err);
  }
  return next;
}

export function deleteOwnedFaction(
  factionId: string
): Record<string, OwnedFactionInventory> {
  const all = loadAllOwnedModels();
  const next = { ...all };
  delete next[factionId];
  try {
    localStorage.setItem(OWNED_MODELS_KEY, JSON.stringify(next));
  } catch (err) {
    console.error('Failed to delete owned faction from localStorage:', err);
  }
  return next;
}

export function getOwnedModelsForFaction(factionId: string): OwnedUnitEntry[] {
  const all = loadAllOwnedModels();
  return all[factionId]?.units || [];
}

export function getTotalOwnedModelsCount(
  all?: Record<string, OwnedFactionInventory>
): number {
  const data = all || loadAllOwnedModels();
  return Object.values(data).reduce(
    (sum, fac) => sum + fac.units.reduce((uSum, u) => uSum + (u.modelsCount || 0), 0),
    0
  );
}

export function hasAnyOwnedModels(): boolean {
  return getTotalOwnedModelsCount() > 0;
}
