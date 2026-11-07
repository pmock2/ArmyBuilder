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
  baseCost: number;
  minModels: number;
  maxModels: number;
  costTiers: CostTier[];
  stats: UnitStatProfile;
  rangedWeapons: WeaponProfile[];
  meleeWeapons: WeaponProfile[];
  abilities: Ability[];
  transportCapacity?: string | null;
}

export interface Enhancement {
  id: string;
  name: string;
  pts: number;
  description: string;
  isUpgrade: boolean;
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
  forceDispositions?: string[];
  units: SelectedUnit[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

