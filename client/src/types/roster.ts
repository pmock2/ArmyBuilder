export type BattleSize = 'incursion' | 'strike-force' | 'onslaught';

export interface BattleSizeConfig {
  name: string;
  points: number;
  dp: number;
  enhancements: number;
  unitLimit: number;
  battlelineLimit: number;
}

export interface UnitStatProfile {
  name: string;
  M: string;
  T: string;
  Sv: string;
  InSv: string;
  W: string;
  Ld: string;
  OC: string;
  Base: string;
}

export interface WeaponProfile {
  name: string;
  range: string;
  A: string;
  BS?: string;
  WS?: string;
  S: string;
  AP: string;
  D: string;
  keywords: string;
}

export interface Ability {
  name: string;
  description: string;
}

export interface CostTier {
  models: number;
  cost: number;
}

export interface WargearProfile {
  name: string;
  type: 'ranged' | 'melee' | 'ability';
  count?: number;
  range?: string;
  A?: string;
  BS?: string;
  WS?: string;
  S?: string;
  AP?: string;
  D?: string;
  keywords?: string;
  description?: string;
}

export interface StatModifier {
  target: 'unit' | 'ranged' | 'melee';
  stat: 'M' | 'T' | 'Sv' | 'W' | 'Ld' | 'OC' | 'InSv' | 'A' | 'BS' | 'WS' | 'S' | 'AP' | 'D' | 'keywords' | 'range';
  type: 'increment' | 'decrement' | 'set' | 'append';
  value: number | string;
  requiredWeaponKeyword?: string;
}

export interface WargearOption {
  id: string;
  name: string;
  maxCount?: number;
  pts?: number;
  profiles: WargearProfile[];
  statModifiers?: StatModifier[];
}

export interface WargearGroup {
  id: string;
  name: string;
  min: number;
  max: number;
  isExclusive: boolean;
  defaultOptionIds: string[];
  options: WargearOption[];
}

export interface Datasheet {
  id: string;
  name: string;
  primaryCategory: string;
  categories: string[];
  keywords: string[];
  factionKeywords: string[];
  isCharacter: boolean;
  isEpicHero: boolean;
  isBattleline: boolean;
  isDedicatedTransport: boolean;
  isLeader: boolean;
  isSupport: boolean;
  canLead: string[];
  canBeLed?: boolean;
  canHaveSupport?: boolean;
  baseCost: number;
  minModels: number;
  maxModels: number;
  costTiers: CostTier[];
  stats: UnitStatProfile;
  rangedWeapons: WeaponProfile[];
  meleeWeapons: WeaponProfile[];
  abilities: Ability[];
  transportCapacity?: string | null;
  wargearGroups?: WargearGroup[];
  baseProfileNames?: string[];
  baseWeaponCounts?: Record<string, number>;
  enhancementGroupIds?: string[];
  isAllied?: boolean;
  isLegends?: boolean;
}

export function isLegendsUnit(unit: Datasheet | SelectedUnit | { name: string; categories?: string[]; keywords?: string[]; isLegends?: boolean }): boolean {
  if (!unit) return false;
  const d: any = 'datasheet' in unit && (unit as any).datasheet ? (unit as any).datasheet : unit;
  if (d.isLegends !== undefined) return Boolean(d.isLegends);
  if (d.name && (d.name.includes('[Legends]') || d.name.toLowerCase().includes('legends'))) return true;
  if (Array.isArray(d.categories) && d.categories.some((c: string) => c.toLowerCase().includes('legends'))) return true;
  if (Array.isArray(d.keywords) && d.keywords.some((k: string) => k.toLowerCase().includes('legends'))) return true;
  return false;
}

export function isUnitAllowedForChapter(
  unit: Datasheet | SelectedUnit,
  factionId: string,
  subFactionName?: string | null
): boolean {
  const d: any = 'datasheet' in unit && (unit as any).datasheet ? (unit as any).datasheet : unit;
  const cats: string[] = d.categories || [];

  const ALL_CHAPTER_KEYWORDS = [
    'Faction: Salamanders',
    'Faction: Blood Angels',
    'Faction: Dark Angels',
    'Faction: Space Wolves',
    'Faction: Black Templars',
    'Faction: Deathwatch',
    'Faction: Imperial Fists',
    'Faction: Iron Hands',
    'Faction: Raven Guard',
    'Faction: White Scars',
    'Faction: Ultramarines',
    'Faction: Blood Ravens',
    'Faction: Crimson Fists',
    'Faction: Flesh Tearers'
  ];

  const unitChapterCats = cats.filter(c => ALL_CHAPTER_KEYWORDS.includes(c));
  if (unitChapterCats.length > 0) {
    const active = (subFactionName || factionId || '').toLowerCase();
    for (const chapterKw of unitChapterCats) {
      const rawChapter = chapterKw.replace('Faction: ', '').toLowerCase().replace(/\s+/g, '-');
      if (!active.includes(rawChapter) && !active.includes(rawChapter.replace(/-/g, ' '))) {
        return false;
      }
    }
  }

  // Also disallow Allied Deathwatch in Space Marine armies
  const isAstartes = (factionId || '').toLowerCase().includes('space-marines') || (factionId || '').toLowerCase().includes('salamanders') || (subFactionName || '').toLowerCase().includes('salamanders');
  if (isAstartes && d.isAllied && (cats.some(c => c.toLowerCase().includes('deathwatch')) || d.name.toLowerCase().includes('artemis') || d.name.toLowerCase().includes('watch master') || d.name.toLowerCase().includes('corvus blackstar'))) {
    return false;
  }

  return true;
}

export function getUnitRole(unit: Datasheet | SelectedUnit): string {
  const d = 'datasheet' in unit ? unit.datasheet : unit;
  
  if (d.isAllied || d.primaryCategory === 'Allied Units') return 'Allied Units';
  if (d.isEpicHero) return 'Epic Hero';
  if (d.isCharacter) return 'Character';
  if (d.isBattleline) return 'Battleline';
  if (d.isDedicatedTransport) return 'Dedicated Transport';

  const cats = (d.categories || []).map(c => c.toLowerCase());
  if (cats.includes('aircraft')) return 'Aircraft';
  if (cats.includes('fortification')) return 'Fortification';
  if (cats.includes('mounted')) return 'Mounted';
  if (cats.includes('monster')) return 'Monster';
  if (cats.includes('vehicle')) return 'Vehicle';
  if (cats.includes('infantry')) return 'Infantry';

  return d.primaryCategory || 'Other';
}

export interface Enhancement {
  id: string;
  name: string;
  pts: number;
  description: string;
  isUpgrade: boolean;
  groupId?: string;
  detachment?: string;
  maxPerRoster?: number;
  requiredKeywords?: string[];
  anyOfKeywords?: string[][];
  excludedKeywords?: string[];
  profiles?: WargearProfile[];
  statModifiers?: StatModifier[];
}

export function normalizeDetachmentName(name?: string | null): string {
  return String(name || '').replace(/[’‘]/g, "'").trim().toLowerCase();
}

export function getUnitBaseCostForModelCount(
  datasheet: Datasheet,
  modelCount: number
): number {
  if (!datasheet) return 0;
  const minModels = datasheet.minModels || 1;
  const maxModels = datasheet.maxModels || minModels;
  const baseCost = Number(datasheet.baseCost) || 0;
  const count = Math.min(Math.max(modelCount, minModels), maxModels);

  if (count <= minModels) return baseCost;

  // Clean and normalize tiers
  const rawTiers = (datasheet.costTiers || [])
    .filter(t => t.models >= minModels && t.cost > 0)
    .sort((a, b) => a.models - b.models);

  const tiers: CostTier[] = [];
  for (let i = 0; i < rawTiers.length; i++) {
    const t = rawTiers[i];
    let m = t.models;
    // Normalize Battlescribe artifact where the top tier model count was stored as minModels + 1
    if (i === rawTiers.length - 1 && m < maxModels && maxModels > minModels) {
      m = maxModels;
    }
    if (!tiers.some(x => x.models === m)) {
      tiers.push({ models: m, cost: t.cost });
    }
  }

  if (tiers.length === 0) return baseCost;

  // Find the threshold tier whose models >= count (10e Munitorum Field Manual threshold cost)
  const matchingTier = tiers.find(t => count <= t.models);
  if (matchingTier) {
    return matchingTier.cost;
  }

  // If count exceeds all defined tiers, take the highest tier's cost
  return tiers[tiers.length - 1].cost;
}

export function getEffectiveOptionMaxCount(
  option: WargearOption,
  datasheet: Datasheet,
  currentModelsCount: number
): number {
  const maxSquadAllowed = option.maxCount || 1;
  const minModels = datasheet.minModels || 1;
  const maxModels = datasheet.maxModels || minModels;

  // Max special weapon models cannot exceed non-sergeant models in the squad
  const availableRoomInSquad = Math.max(1, currentModelsCount - 1);

  if (maxModels <= minModels || maxSquadAllowed <= 1) {
    return Math.min(maxSquadAllowed, availableRoomInSquad);
  }

  // Scale allowed count based on squad size thresholds up to maxSquadAllowed:
  // e.g. Intercessors (5-10 models, maxCount 2): 1 per 5 models -> 1 at 5-9 models, 2 at 10 models.
  // e.g. Eradicators (3-6 models, maxCount 2): 1 per 3 models -> 1 at 3-5 models, 2 at 6 models.
  const scaled = Math.floor((currentModelsCount / maxModels) * maxSquadAllowed);
  const effective = Math.min(maxSquadAllowed, scaled);

  return Math.min(effective, availableRoomInSquad);
}

export function getUnitWargearPts(
  unit?: SelectedUnit | null,
  previewSelectedOptions?: Record<string, string[]>,
  datasheetOverride?: Datasheet | null
): number {
  const ds = datasheetOverride || unit?.datasheet;
  if (!ds || !ds.wargearGroups) return 0;
  let wargearPts = 0;
  for (const g of ds.wargearGroups) {
    let selectedIds: string[] = g.defaultOptionIds || [];
    if (unit?.selectedOptions && unit.selectedOptions[g.id] !== undefined) {
      selectedIds = unit.selectedOptions[g.id];
    } else if (!unit && previewSelectedOptions && previewSelectedOptions[g.id] !== undefined) {
      selectedIds = previewSelectedOptions[g.id];
    }
    for (const opt of g.options) {
      const count = selectedIds.filter(id => id === opt.id).length;
      if (count > 0 && opt.pts && opt.pts > 0) {
        wargearPts += Number(opt.pts) * count;
      }
    }
  }
  return wargearPts;
}

export function getUnitTotalPts(unit: SelectedUnit): number {
  return Number(unit.cost || 0) + getUnitWargearPts(unit) + Number(unit.enhancement?.pts || 0);
}

export function unitMatchesEnhancementKeyword(d: Datasheet, keyword: string): boolean {
  const kwNorm = keyword.trim().toLowerCase();
  if (!kwNorm) return true;
  if (kwNorm === 'character' && d.isCharacter) return true;
  if (kwNorm === 'epic hero' && d.isEpicHero) return true;
  if (kwNorm === 'battleline' && d.isBattleline) return true;
  if (kwNorm === 'dedicated transport' && d.isDedicatedTransport) return true;
  if (kwNorm === 'leader' && d.isLeader) return true;
  if (kwNorm === 'support' && d.isSupport) return true;

  const cats = d.categories || [];
  for (const c of cats) {
    const cLower = c.toLowerCase();
    if (cLower === kwNorm || cLower === `faction: ${kwNorm}`) return true;
    const stripped = cLower.replace(/^faction:\s*/, '').trim();
    if (stripped === kwNorm) return true;
  }

  const kws = d.keywords || [];
  for (const k of kws) {
    if (k.toLowerCase() === kwNorm) return true;
  }

  const uName = (d.name || '').toLowerCase();
  if (uName === kwNorm || uName.includes(kwNorm)) return true;

  return false;
}

export function isEnhancementEligibleForUnit(
  unitOrDatasheet: Datasheet | SelectedUnit,
  enh: Enhancement,
  activeDetachments?: SelectedDetachment[]
): boolean {
  const d: Datasheet = 'datasheet' in unitOrDatasheet ? unitOrDatasheet.datasheet : unitOrDatasheet;
  const isUnitSpecificUpgrade = Boolean(enh.isUpgrade && enh.groupId && enh.groupId === d.id);
  if (!d || d.isAllied || (d.isEpicHero && !isUnitSpecificUpgrade)) return false;

  // Check enhancement group link if indexed
  if (Array.isArray(d.enhancementGroupIds)) {
    if (d.enhancementGroupIds.length === 0) return false;
    if (enh.groupId && !d.enhancementGroupIds.includes(enh.groupId)) return false;
  } else {
    // Fallback for legacy stored units before hydration
    if (!d.isCharacter && !enh.isUpgrade) return false;
  }

  // Every enhancement must belong to an active detachment
  if (!enh.detachment) return false;
  if (!activeDetachments || activeDetachments.length === 0) return false;
  const targetDet = normalizeDetachmentName(enh.detachment);
  const hasDetachment = activeDetachments.some(det => normalizeDetachmentName(det.name) === targetDet);
  if (!hasDetachment) return false;

  // Check required keywords
  if (enh.requiredKeywords && enh.requiredKeywords.length > 0) {
    for (const rk of enh.requiredKeywords) {
      if (!unitMatchesEnhancementKeyword(d, rk)) return false;
    }
  } else if (!enh.anyOfKeywords && !enh.isUpgrade) {
    if (!d.isCharacter) return false;
  }

  // Check any-of keyword groups (at least one keyword in each group must match)
  if (enh.anyOfKeywords && enh.anyOfKeywords.length > 0) {
    for (const group of enh.anyOfKeywords) {
      if (!group.some(k => unitMatchesEnhancementKeyword(d, k))) return false;
    }
  }

  // Check excluded keywords
  if (enh.excludedKeywords && enh.excludedKeywords.length > 0) {
    if (enh.excludedKeywords.some(ek => unitMatchesEnhancementKeyword(d, ek))) return false;
  }

  return true;
}

export function getEligibleEnhancementsForUnit(
  unitOrDatasheet: Datasheet | SelectedUnit,
  allEnhancements: Enhancement[],
  activeDetachments?: SelectedDetachment[]
): Enhancement[] {
  if (!allEnhancements || allEnhancements.length === 0) return [];
  return allEnhancements.filter(enh => isEnhancementEligibleForUnit(unitOrDatasheet, enh, activeDetachments));
}

export interface SelectedUnit {
  instanceId: string;
  datasheetId: string;
  name: string;
  cost: number;
  modelsCount: number;
  isCharacter: boolean;
  isEpicHero: boolean;
  isBattleline: boolean;
  isDedicatedTransport: boolean;
  isLeader: boolean;
  isSupport: boolean;
  isWarlord: boolean;
  enhancement?: Enhancement;
  selectedOptions?: Record<string, string[]>;
  attachedToBodyguardId?: string; // If this unit is a Leader/Support attached to a Bodyguard
  attachedLeaderId?: string;     // If this is a Bodyguard with a Leader attached
  attachedSupportId?: string;    // If this is a Bodyguard with a Support attached
  embarkedUnitIds?: string[];    // If this is a Transport
  datasheet: Datasheet;
}

export interface SelectedDetachment {
  id: string;
  name: string;
  dpCost: number;
  tags: string[];
  rules: { name: string; description: string }[];
  constraints: {
    exclusiveTags: string[];
    exclusiveChapters: boolean;
    requiredPrimaryCatalogue: string | null;
    synergies: any[];
  };
}

export interface ValidationIssue {
  id: string;
  severity: 'error' | 'warning' | 'info';
  title: string;
  message: string;
  unitInstanceId?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errorsCount: number;
  warningsCount: number;
  totalPoints: number;
  pointsLimit: number;
  totalDP: number;
  dpLimit: number;
  enhancementCount: number;
  enhancementLimit: number;
  issues: ValidationIssue[];
}

export interface ArmyRoster {
  id: string;
  name: string;
  factionId: string;
  factionName: string;
  superFaction: string;
  subFactionId?: string | null;
  subFactionName?: string | null;
  battleSize: BattleSize;
  detachments: SelectedDetachment[];
  forceDisposition?: string | null;
  forceDispositions?: string[];
  includeLegends?: boolean;
  units: SelectedUnit[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

