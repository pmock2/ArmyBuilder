import { FactionArmyRule } from '../types/faction';
import { BattleSize, SelectedDetachment, normalizeDetachmentName } from '../types/roster';

export type TrackableArmyRuleType =
  | 'combat-doctrines'
  | 'code-chivalric'
  | 'battle-focus'
  | 'power-from-pain'
  | 'shadow-of-chaos'
  | 'harbingers-of-dread'
  | 'nurgles-gift'
  | 'cabal-of-sorcerers'
  | 'blessings-of-khorne'
  | 'cult-ambush'
  | 'acts-of-faith'
  | 'martial-katah'
  | 'doctrina-imperatives'
  | 'voice-of-command'
  | 'gate-of-infinity'
  | 'prioritised-efficiency'
  | 'shadow-in-the-warp';

const RULE_NAME_MAP: Record<string, TrackableArmyRuleType> = {
  'combat doctrines': 'combat-doctrines',
  'code chivalric': 'code-chivalric',
  'battle focus': 'battle-focus',
  'power from pain': 'power-from-pain',
  'the shadow of chaos': 'shadow-of-chaos',
  'harbingers of dread': 'harbingers-of-dread',
  "nurgle's gift (aura)": 'nurgles-gift',
  "nurgle's gift": 'nurgles-gift',
  'cabal of sorcerers': 'cabal-of-sorcerers',
  'blessings of khorne': 'blessings-of-khorne',
  'cult ambush': 'cult-ambush',
  'acts of faith': 'acts-of-faith',
  "martial ka'tah": 'martial-katah',
  'doctrina imperatives': 'doctrina-imperatives',
  'voice of command': 'voice-of-command',
  'gate of infinity': 'gate-of-infinity',
  'prioritised efficiency': 'prioritised-efficiency',
  'shadow in the warp': 'shadow-in-the-warp'
};

/**
 * Determines whether the army has a trackable special rule for Play Mode.
 * Passive/per-activation rules (e.g. Necrons Reanimation Protocols, T'au For The Greater Good,
 * CSM Dark Pacts, Emperor's Children Thrill Seekers, Orks Waaagh!, Agents Assigned Agents,
 * Titanicus Towering Example) intentionally return null.
 */
export function detectTrackableArmyRule(
  armyRules?: FactionArmyRule[]
): TrackableArmyRuleType | null {
  if (!armyRules || armyRules.length === 0) return null;
  for (const rule of armyRules) {
    const key = String(rule.name || '').trim().toLowerCase();
    if (RULE_NAME_MAP[key]) {
      return RULE_NAME_MAP[key];
    }
  }
  return null;
}

// 1. Space Marines: Combat Doctrines
export interface CombatDoctrineDef {
  id: 'assault' | 'devastator' | 'tactical';
  name: string;
  shortName: string;
  effect: string;
}

export const COMBAT_DOCTRINES: CombatDoctrineDef[] = [
  {
    id: 'assault',
    name: 'Assault Doctrine',
    shortName: 'Assault',
    effect: 'Eligible to declare a charge in a turn in which the unit Advanced.'
  },
  {
    id: 'devastator',
    name: 'Devastator Doctrine',
    shortName: 'Devastator',
    effect: 'Ranged attacks equipped by the unit have [ASSAULT].'
  },
  {
    id: 'tactical',
    name: 'Tactical Doctrine',
    shortName: 'Tactical',
    effect: 'Eligible to shoot and declare a charge in a turn in which it Fell Back.'
  }
];

export function getCombatDoctrineLimits(selectedDetachments: SelectedDetachment[]) {
  const names = new Set(selectedDetachments.map((d) => normalizeDetachmentName(d.name)));
  return {
    assaultBaseMax: names.has('assault brethren') ? 2 : 1,
    devastatorBaseMax: 1,
    tacticalBaseMax: names.has('tactical brethren') ? 2 : 1,
    hasGladiusBonus: names.has('gladius task force')
  };
}

// 2. Imperial Knights: Code Chivalric
export interface ChivalricOption {
  id: string;
  roll: string;
  name: string;
  summary: string;
}

export const CHIVALRIC_DEEDS: ChivalricOption[] = [
  {
    id: 'tyrant',
    roll: '1-2',
    name: 'Lay Low the Tyrant',
    summary: 'Select 1 enemy Character at battle start; completed at end of turn if destroyed.'
  },
  {
    id: 'realm',
    roll: '3-4',
    name: 'Reclaim the Realm',
    summary: "Completed at end of opponent's turn if you control more objectives than opponent."
  },
  {
    id: 'tally',
    roll: '5-6',
    name: 'Reap a Great Tally',
    summary: 'Completed at end of battle round if enemy units destroyed this round > round number.'
  }
];

export const CHIVALRIC_QUALITIES: ChivalricOption[] = [
  {
    id: 'valour',
    roll: '1-2',
    name: 'Martial Valour',
    summary: 'Re-roll 1 Hit roll and 1 Wound roll each time model shoots or fights.'
  },
  {
    id: 'challenge',
    roll: '3-4',
    name: 'Eager for the Challenge',
    summary: '+2" Move; +1 to Advance and Charge rolls.'
  },
  {
    id: 'legacy',
    roll: '5-6',
    name: 'Legacy Unsullied',
    summary: '+2 Objective Control and improve Leadership by 1.'
  }
];

// 3. Aeldari: Battle Focus
export interface AgileManoeuvreDef {
  id: string;
  name: string;
  repeatable?: boolean;
  trigger: string;
  effect: string;
}

export const AGILE_MANOEUVRES: AgileManoeuvreDef[] = [
  {
    id: 'swift',
    name: 'Swift as the Wind',
    repeatable: true,
    trigger: 'Selected to Normal, Advance, or Fall Back move',
    effect: '+2" Move until end of phase (repeatable by different units).'
  },
  {
    id: 'flitting',
    name: 'Flitting Shadows',
    trigger: 'Move, set up, or declare a charge',
    effect: 'Enemy cannot target unit with Fire Overwatch this turn.'
  },
  {
    id: 'engines',
    name: 'Star Engines',
    trigger: 'Vehicle unit selected to Advance',
    effect: 'Ranged weapons gain [ASSAULT] until end of turn.'
  },
  {
    id: 'strike',
    name: 'Sudden Strike',
    trigger: 'Ends a Charge move',
    effect: 'Pile-in & Consolidation up to 6" instead of 3" this turn.'
  },
  {
    id: 'opportunity',
    name: 'Opportunity Seized',
    trigger: 'Enemy ends a Fall Back move',
    effect: 'Engaged unit makes Normal move up to D6+1".'
  },
  {
    id: 'fade',
    name: 'Fade Back',
    trigger: "Opponent's Shooting phase after enemy shoots",
    effect: 'Hit unit (non-Titanic) makes Normal move up to D6+1".'
  }
];

export function getBattleFocusRoundTokens(
  battleSize: BattleSize,
  selectedDetachments: SelectedDetachment[]
): number {
  const base = battleSize === 'incursion' ? 2 : battleSize === 'onslaught' ? 6 : 4;
  const hasWarhost = selectedDetachments.some(
    (d) => normalizeDetachmentName(d.name) === 'warhost'
  );
  return base + (hasWarhost ? 1 : 0);
}

// 4. Chaos Knights: Harbingers of Dread
export interface DreadAbilityDef {
  id: string;
  roll: string;
  name: string;
  effect: string;
}

export const DREAD_ABILITIES: DreadAbilityDef[] = [
  {
    id: '1',
    roll: '1',
    name: 'Despair (Aura)',
    effect: 'Enemy within 9" worsens Ld by 1 (stacks with Deathly Terror).'
  },
  {
    id: '2',
    roll: '2',
    name: 'Doom',
    effect: '+1 to Wound rolls vs Battle-shocked targets.'
  },
  {
    id: '3',
    roll: '3',
    name: 'Darkness',
    effect: 'Model has the Stealth ability.'
  },
  {
    id: '4',
    roll: '4',
    name: 'Dismay (Aura)',
    effect: "Enemy below Starting Strength within 9\" tests Battle-shock in opponent's Command phase."
  },
  {
    id: '5',
    roll: '5',
    name: 'Delirium (Aura)',
    effect: 'Enemy Below Half-strength within 9" suffers D3 MW on failed Battle-shock.'
  },
  {
    id: '6',
    roll: '6',
    name: 'Dominion',
    effect: "Add 3\" to the range of this model's Aura abilities."
  }
];

// 5. Death Guard: Nurgle's Gift
export interface PlagueDef {
  id: string;
  name: string;
  effect: string;
}

export const NURGLE_PLAGUES: PlagueDef[] = [
  {
    id: 'skullsquirm',
    name: 'Skullsquirm Blight',
    effect: '-1T; enemy gets -1 to Melee Hit & your units have Benefit of Cover vs their shooting.'
  },
  {
    id: 'rattlejoint',
    name: 'Rattlejoint Ague',
    effect: '-1T; worsen Save characteristic of Afflicted units by 1.'
  },
  {
    id: 'scabrous',
    name: 'Scabrous Soulrot',
    effect: '-1T; worsen Move, Ld, and OC of Afflicted units by 1 (OC min 1).'
  }
];

// 6. Thousand Sons: Cabal of Sorcerers
export interface PsychicRitualDef {
  id: string;
  name: string;
  wc: number;
  boostedWc: number;
  effect: string;
}

export const PSYCHIC_RITUALS: PsychicRitualDef[] = [
  {
    id: 'destinys-ruin',
    name: "Destiny's Ruin",
    wc: 5,
    boostedWc: 10,
    effect: 'Re-roll Hit 1s vs visible enemy within 24" (full Hit re-rolls on 10+).'
  },
  {
    id: 'temporal-surge',
    name: 'Temporal Surge',
    wc: 6,
    boostedWc: 10,
    effect: 'Friendly unit within 24" makes Normal move up to D6" (6" on 10+), no charge.'
  },
  {
    id: 'doombolt',
    name: 'Doombolt',
    wc: 7,
    boostedWc: 11,
    effect: 'Visible enemy within 24" suffers D3 MW (D3+3 MW on 11+).'
  },
  {
    id: 'twist-of-fate',
    name: 'Twist of Fate',
    wc: 9,
    boostedWc: 12,
    effect: 'Improve AP by 1 vs visible enemy within 24" (+2 AP on 12+).'
  }
];

// 7. World Eaters: Blessings of Khorne
export interface KhorneBlessingDef {
  id: string;
  name: string;
  requirement: string;
  effect: string;
}

export const KHORNE_BLESSINGS: KhorneBlessingDef[] = [
  {
    id: 'unbridled-bloodlust',
    name: 'Unbridled Bloodlust',
    requirement: 'Double 1+',
    effect: '+1 to Charge rolls.'
  },
  {
    id: 'rage-fuelled',
    name: 'Rage-fuelled Invigoration',
    requirement: 'Double 2+',
    effect: 'Pile-In and Consolidation moves up to 6" instead of 3".'
  },
  {
    id: 'total-carnage',
    name: 'Total Carnage',
    requirement: 'Double 3+',
    effect: 'Destroyed models fight on 4+ before removal if not yet fought.'
  },
  {
    id: 'martial-excellence',
    name: 'Martial Excellence',
    requirement: 'Double 4+ / Triple 1+',
    effect: 'Melee weapons have [SUSTAINED HITS 1].'
  },
  {
    id: 'warp-blades',
    name: 'Warp Blades',
    requirement: 'Double 5+ / Triple 2+',
    effect: 'Melee weapons have [LETHAL HITS].'
  },
  {
    id: 'decapitating-strikes',
    name: 'Decapitating Strikes',
    requirement: 'Double 6+ / Triple 3+',
    effect: 'Melee attacks vs Infantry have [DEVASTATING WOUNDS].'
  }
];

// 8. Genestealer Cults: Cult Ambush
export function getStartingResurgencePoints(battleSize: BattleSize): number {
  if (battleSize === 'incursion') return 6;
  if (battleSize === 'onslaught') return 14;
  return 10;
}

// 9. Adeptus Custodes: Martial Ka'tah
export interface KatahStanceDef {
  id: string;
  name: string;
  when: string;
  effect: string;
}

export const KATAH_STANCES: KatahStanceDef[] = [
  {
    id: 'calistus',
    name: 'Calistus',
    when: 'Movement phase (when selected to move)',
    effect: 'Move through all types of models during Normal/Advance/Fall Back.'
  },
  {
    id: 'conservai',
    name: 'Conservai',
    when: 'Your Command phase',
    effect: 'Start Action while engaged/Battle-shocked & shoot after starting Action.'
  },
  {
    id: 'dacatarai',
    name: 'Dacatarai',
    when: 'Start of Fight phase',
    effect: 'Re-roll melee Hit rolls of 1 vs non-Monster/Vehicle units.'
  },
  {
    id: 'kaptaris',
    name: 'Kaptaris',
    when: 'Start of Fight phase',
    effect: 'Melee attacks targeting this unit suffer -1 to Hit rolls.'
  },
  {
    id: 'rendax',
    name: 'Rendax',
    when: 'Fight phase (when selected to fight)',
    effect: 'Melee attacks gain [LETHAL HITS: MONSTER/VEHICLE].'
  },
  {
    id: 'salvus',
    name: 'Salvus',
    when: 'Shooting phase (when selected to shoot)',
    effect: 'Ignore modifiers to BS, Hit rolls, and Wound rolls.'
  }
];

// 10. Adeptus Mechanicus: Doctrina Imperatives
export interface DoctrinaImperativeDef {
  id: 'protector' | 'conqueror';
  name: string;
  bullets: string[];
}

export const DOCTRINA_IMPERATIVES: DoctrinaImperativeDef[] = [
  {
    id: 'protector',
    name: 'Protector Imperative',
    bullets: [
      'Ranged weapons gain [HEAVY] & +1 Ballistic Skill.',
      'Enemy melee attacks suffer -1 to Hit if Battleline or within 6" of Battleline.'
    ]
  },
  {
    id: 'conqueror',
    name: 'Conqueror Imperative',
    bullets: [
      'Ranged weapons gain [ASSAULT] & melee weapons gain +1 Weapon Skill.',
      '+1 AP on attacks if Battleline or within 6" of Battleline.'
    ]
  }
];

// 11. Astra Militarum: Voice Of Command
export interface AstraOrderDef {
  id: string;
  name: string;
  shortName: string;
  effect: string;
}

export const ASTRA_ORDERS: AstraOrderDef[] = [
  {
    id: 'move',
    name: 'Move! Move! Move!',
    shortName: 'Move +3"',
    effect: '+3" Move characteristic.'
  },
  {
    id: 'fix-bayonets',
    name: 'Fix Bayonets!',
    shortName: '+1 WS',
    effect: 'Improve melee Weapon Skill by 1.'
  },
  {
    id: 'take-aim',
    name: 'Take Aim!',
    shortName: '+1 BS',
    effect: 'Improve ranged Ballistic Skill by 1.'
  },
  {
    id: 'frfsrf',
    name: 'First Rank, Fire! Second Rank, Fire!',
    shortName: '+1 RF Attacks',
    effect: '+1 Attacks to Rapid Fire weapons.'
  },
  {
    id: 'take-cover',
    name: 'Take Cover!',
    shortName: '+1 Sv (3+)',
    effect: 'Improve Save by 1 (max 3+).'
  },
  {
    id: 'duty-honour',
    name: 'Duty and Honour!',
    shortName: '+1 Ld / OC',
    effect: 'Improve Leadership and Objective Control by 1.'
  }
];

// 12. Grey Knights: Gate of Infinity
export function getGateOfInfinityLimit(battleSize: BattleSize): number {
  if (battleSize === 'incursion') return 2;
  if (battleSize === 'onslaught') return 4;
  return 3;
}
