import { SelectedDetachment } from '../types/roster';

export type StratagemTurn = 'your' | 'opponent' | 'either';

export type StratagemPhase =
  | 'Command'
  | 'Movement'
  | 'Shooting'
  | 'Charge'
  | 'Fight'
  | 'Shooting / Fight'
  | 'Movement / Charge'
  | 'Movement / Fight'
  | 'Any Phase';

export interface Stratagem {
  id: string;
  name: string;
  cp: number;
  turn: StratagemTurn;
  phase: StratagemPhase;
  category: string;
  detachment?: string;
  description: string;
}

/**
 * Official Warhammer 40,000 Core Stratagems
 * Color-coded by turn timing:
 * - 'your'     -> Blue (Your Turn)
 * - 'either'   -> Green / Teal (Either Player's Turn)
 * - 'opponent' -> Red (Opponent's Turn)
 */
export const CORE_STRATAGEMS: Stratagem[] = [
  {
    id: 'core-command-reroll',
    name: 'Command Re-roll',
    cp: 1,
    turn: 'either',
    phase: 'Any Phase',
    category: 'Core – Battle Tactic',
    description:
      '**WHEN:** Any phase, just after you make an Advance roll, a Charge roll, a Desperate Escape test or a [HAZARDOUS] test for a unit from your army, or a Hit roll, a Wound roll, a Damage roll or a saving throw for a model in that unit, or a roll to determine the number of attacks made with a weapon equipped by a model in that unit.\n**TARGET:** That unit or model from your army.\n**EFFECT:** You re-roll that roll, test or saving throw.'
  },
  {
    id: 'core-counter-offensive',
    name: 'Counter-Offensive',
    cp: 2,
    turn: 'either',
    phase: 'Fight',
    category: 'Core – Strategic Ploy',
    description:
      '**WHEN:** Fight phase, just after an enemy unit has fought.\n**TARGET:** One unit from your army that is within Engagement Range of one or more enemy units and that has not already been selected to fight this phase.\n**EFFECT:** Your unit fights next.'
  },
  {
    id: 'core-epic-challenge',
    name: 'Epic Challenge',
    cp: 1,
    turn: 'either',
    phase: 'Fight',
    category: 'Core – Epic Deed',
    description:
      '**WHEN:** Fight phase, when a ^^**Character**^^ unit from your army that is attached to a Bodyguard unit is selected to fight.\n**TARGET:** One ^^**Character**^^ model in your unit.\n**EFFECT:** Until the end of the phase, all melee attacks made by that model have the [PRECISION] ability.'
  },
  {
    id: 'core-insane-bravery',
    name: 'Insane Bravery',
    cp: 1,
    turn: 'your',
    phase: 'Command',
    category: 'Core – Epic Deed',
    description:
      '**WHEN:** [BATTLE-SHOCK] step of your Command phase, just before you take a [BATTLE-SHOCK] test for a unit from your army (cannot be used more than once per battle).\n**TARGET:** That unit from your army.\n**EFFECT:** Your unit automatically passes that [BATTLE-SHOCK] test.'
  },
  {
    id: 'core-grenade',
    name: 'Grenade',
    cp: 1,
    turn: 'your',
    phase: 'Shooting',
    category: 'Core – Wargear',
    description:
      '**WHEN:** Your Shooting phase.\n**TARGET:** One ^^**Grenades**^^ unit from your army (excluding units that Advanced, Fell Back or have shot this turn) that is not within Engagement Range of one or more enemy units.\n**EFFECT:** Select one visible enemy unit that is not within Engagement Range of any units from your army and is within 8" of your unit. Roll six D6: for each 4+, that enemy unit suffers 1 [MORTAL WOUNDS] mortal wound.'
  },
  {
    id: 'core-tank-shock',
    name: 'Tank Shock',
    cp: 1,
    turn: 'your',
    phase: 'Charge',
    category: 'Core – Strategic Ploy',
    description:
      '**WHEN:** Your Charge phase, just after a ^^**Vehicle**^^ unit from your army ends a Charge move.\n**TARGET:** That ^^**Vehicle**^^ unit.\n**EFFECT:** Select one enemy unit within Engagement Range of your unit. Roll a number of D6 equal to the Toughness characteristic of your ^^**Vehicle**^^ model (adding 2D6 if its Toughness is greater than the target’s Toughness, to a maximum of 6D6): for each 5+, that enemy unit suffers 1 [MORTAL WOUNDS] mortal wound (to a maximum of 6 mortal wounds).'
  },
  {
    id: 'core-rapid-ingress',
    name: 'Rapid Ingress',
    cp: 1,
    turn: 'opponent',
    phase: 'Movement',
    category: 'Core – Strategic Ploy',
    description:
      '**WHEN:** End of your opponent’s Movement phase.\n**TARGET:** One unit from your army that is in Reserves.\n**EFFECT:** Your unit can arrive on the battlefield as if it were the Reinforcements step of your Movement phase, using [DEEP STRIKE] or Strategic Reserves rules.'
  },
  {
    id: 'core-fire-overwatch',
    name: 'Fire Overwatch',
    cp: 1,
    turn: 'opponent',
    phase: 'Movement / Charge',
    category: 'Core – Strategic Ploy',
    description:
      '**WHEN:** Your opponent’s Movement or Charge phase, just after an enemy unit is set up or when an enemy unit starts or ends a Normal, Advance or Fall Back move, or declares a charge.\n**TARGET:** One unit from your army that is within 24" of that enemy unit and that would be eligible to shoot if it were your Shooting phase.\n**EFFECT:** If that enemy unit is visible to your unit, your unit can shoot that enemy unit as if it were your Shooting phase. Until the end of the phase, each time a model in your unit makes a ranged attack, an unmodified Hit roll of 6 is required to score a hit (unless firing a [TORRENT] weapon).'
  },
  {
    id: 'core-go-to-ground',
    name: 'Go to Ground',
    cp: 1,
    turn: 'opponent',
    phase: 'Shooting',
    category: 'Core – Battle Tactic',
    description:
      '**WHEN:** Your opponent’s Shooting phase, just after an enemy unit has selected its targets.\n**TARGET:** One ^^**Infantry**^^ unit from your army that was selected as the target of one or more of the attacking unit’s attacks.\n**EFFECT:** Until the end of the phase, all models in your unit have a 6+ invulnerable save and have the [BENEFIT OF COVER].'
  },
  {
    id: 'core-smokescreen',
    name: 'Smokescreen',
    cp: 1,
    turn: 'opponent',
    phase: 'Shooting',
    category: 'Core – Wargear',
    description:
      '**WHEN:** Your opponent’s Shooting phase, just after an enemy unit has selected its targets.\n**TARGET:** One ^^**Smoke**^^ unit from your army that was selected as the target of one or more of the attacking unit’s attacks.\n**EFFECT:** Until the end of the phase, all models in your unit have the [BENEFIT OF COVER] and the [STEALTH] ability.'
  },
  {
    id: 'core-heroic-intervention',
    name: 'Heroic Intervention',
    cp: 1,
    turn: 'opponent',
    phase: 'Charge',
    category: 'Core – Strategic Ploy',
    description:
      '**WHEN:** Your opponent’s Charge phase, just after an enemy unit ends a Charge move.\n**TARGET:** One unit from your army that is within 6" of that enemy unit and would be eligible to declare a charge against that enemy unit if it were your Charge phase.\n**EFFECT:** Your unit now declares a charge that targets only that enemy unit, and you resolve that charge as if it were your Charge phase (without receiving the Charge bonus / [FIGHTS FIRST]).'
  }
];

/**
 * Curated Detachment Stratagems mapped by detachment name (case-insensitive substring or exact match)
 */
const DETACHMENT_STRATAGEMS_MAP: Record<string, Stratagem[]> = {
  'gladius task force': [
    {
      id: 'gladius-honour-the-chapter',
      name: 'Honour the Chapter',
      cp: 1,
      turn: 'either',
      phase: 'Fight',
      category: 'Battle Tactic',
      description:
        '**WHEN:** Fight phase.\n**TARGET:** One ^^**Adeptus Astartes**^^ unit from your army.\n**EFFECT:** Until the end of the phase, melee weapons equipped by models in your unit have the [LANCE] ability. If the Assault Doctrine is active for your unit, improve the Armour Penetration characteristic of such weapons by 1 as well.'
    },
    {
      id: 'gladius-armour-of-contempt',
      name: 'Armour of Contempt',
      cp: 1,
      turn: 'either',
      phase: 'Shooting / Fight',
      category: 'Battle Tactic',
      description:
        '**WHEN:** Your opponent’s Shooting phase or the Fight phase, just after an enemy unit has selected its targets.\n**TARGET:** One ^^**Adeptus Astartes**^^ unit from your army that was selected as the target of one or more of the attacking unit’s attacks.\n**EFFECT:** Until the end of the phase, each time an attack targets your unit, worsen the Armour Penetration characteristic of that attack by 1.'
    },
    {
      id: 'gladius-only-in-death',
      name: 'Only in Death Does Duty End',
      cp: 2,
      turn: 'either',
      phase: 'Fight',
      category: 'Epic Deed',
      description:
        '**WHEN:** Fight phase, just after an enemy unit has selected its targets.\n**TARGET:** One ^^**Adeptus Astartes**^^ unit from your army that was selected as the target of one or more of the attacking unit’s attacks.\n**EFFECT:** Until the end of the phase, each time a model in your unit is destroyed, if that model has not fought this phase, do not remove it from play. The destroyed model can fight after the attacking model’s unit has finished making its attacks, and is then removed from play.'
    },
    {
      id: 'gladius-storm-of-fire',
      name: 'Storm of Fire',
      cp: 1,
      turn: 'your',
      phase: 'Shooting',
      category: 'Battle Tactic',
      description:
        '**WHEN:** Your Shooting phase.\n**TARGET:** One ^^**Adeptus Astartes**^^ unit from your army that has not been selected to shoot this phase.\n**EFFECT:** Until the end of the phase, ranged weapons equipped by models in your unit have the [IGNORES COVER] ability. If the Devastator Doctrine is active for your unit, improve the Armour Penetration characteristic of such weapons by 1 as well.'
    },
    {
      id: 'gladius-adaptive-strategy',
      name: 'Adaptive Strategy',
      cp: 1,
      turn: 'your',
      phase: 'Command',
      category: 'Strategic Ploy',
      description:
        '**WHEN:** Your Command phase.\n**TARGET:** One ^^**Adeptus Astartes**^^ unit from your army.\n**EFFECT:** Select the Devastator Doctrine, Tactical Doctrine or Assault Doctrine. Until the start of your next Command phase, that Combat Doctrine is active for that unit instead of any other Combat Doctrine.'
    },
    {
      id: 'gladius-squad-tactics',
      name: 'Squad Tactics',
      cp: 1,
      turn: 'opponent',
      phase: 'Movement',
      category: 'Strategic Ploy',
      description:
        '**WHEN:** Your opponent’s Movement phase, just after an enemy unit ends a Normal, Advance or Fall Back move.\n**TARGET:** One ^^**Adeptus Astartes**^^ ^^**Infantry**^^ or ^^**Mounted**^^ unit from your army that is within 9" of that enemy unit and not within Engagement Range of one or more enemy units.\n**EFFECT:** Your unit can make a Normal move of up to D6" (or up to 6" instead if the Tactical Doctrine is active for your unit).'
    }
  ],
  "forgefather's seekers": [
    {
      id: 'ff-immolation-protocols',
      name: 'Immolation Protocols',
      cp: 2,
      turn: 'your',
      phase: 'Shooting',
      category: 'Battle Tactic',
      description:
        '**WHEN:** Your Shooting phase.\n**TARGET:** One ^^**Adeptus Astartes**^^ unit from your army that has not been selected to shoot this phase.\n**EFFECT:** Until the end of the phase, [TORRENT] weapons equipped by models in your unit have the [DEVASTATING WOUNDS] ability.'
    },
    {
      id: 'ff-crucible-of-battle',
      name: 'Crucible of Battle',
      cp: 1,
      turn: 'either',
      phase: 'Shooting / Fight',
      category: 'Battle Tactic',
      description:
        '**WHEN:** Your Shooting phase or the Fight phase.\n**TARGET:** One ^^**Adeptus Astartes**^^ unit from your army that has not been selected to shoot or fight this phase.\n**EFFECT:** Until the end of the phase, each time a model in your unit makes an attack that targets the closest eligible target within 6", add 1 to the Wound roll.'
    },
    {
      id: 'ff-onslaught-of-fire',
      name: 'Onslaught of Fire',
      cp: 1,
      turn: 'your',
      phase: 'Shooting',
      category: 'Battle Tactic',
      description:
        '**WHEN:** Your Shooting phase.\n**TARGET:** One ^^**Adeptus Astartes**^^ unit from your army that disembarked from a ^^**Transport**^^ this turn and has not been selected to shoot this phase.\n**EFFECT:** Until the end of the phase, each time a model in your unit makes a ranged attack that targets a unit within 12", add 1 to the Hit roll.'
    },
    {
      id: 'ff-rapid-embarkation',
      name: 'Rapid Embarkation',
      cp: 1,
      turn: 'your',
      phase: 'Fight',
      category: 'Strategic Ploy',
      description:
        '**WHEN:** End of the Fight phase.\n**TARGET:** One ^^**Adeptus Astartes**^^ unit from your army that is wholly within 3" of a friendly ^^**Transport**^^ and not within Engagement Range of one or more enemy units.\n**EFFECT:** Your unit can embark within that ^^**Transport**^^.'
    },
    {
      id: 'ff-burning-vengeance',
      name: 'Burning Vengeance',
      cp: 1,
      turn: 'opponent',
      phase: 'Shooting',
      category: 'Strategic Ploy',
      description:
        '**WHEN:** Your opponent’s Shooting phase, just after an enemy unit has resolved its attacks.\n**TARGET:** One ^^**Adeptus Astartes**^^ ^^**Transport**^^ from your army that was selected as the target of one or more of the attacking unit’s attacks.\n**EFFECT:** One unit embarked within that ^^**Transport**^^ can disembark and shoot as if it were your Shooting phase, but must target only that attacking enemy unit.'
    },
    {
      id: 'ff-armour-of-contempt',
      name: 'Armour of Contempt',
      cp: 1,
      turn: 'either',
      phase: 'Shooting / Fight',
      category: 'Battle Tactic',
      description:
        '**WHEN:** Your opponent’s Shooting phase or the Fight phase, just after an enemy unit has selected its targets.\n**TARGET:** One ^^**Adeptus Astartes**^^ unit from your army that was selected as the target of one or more of the attacking unit’s attacks.\n**EFFECT:** Until the end of the phase, each time an attack targets your unit, worsen the Armour Penetration characteristic of that attack by 1.'
    }
  ],
  'ironstorm spearhead': [
    {
      id: 'iron-mercy-is-weakness',
      name: 'Mercy is Weakness',
      cp: 2,
      turn: 'either',
      phase: 'Shooting / Fight',
      category: 'Battle Tactic',
      description:
        '**WHEN:** Your Shooting phase or the Fight phase.\n**TARGET:** One ^^**Adeptus Astartes**^^ unit from your army that has not been selected to shoot or fight this phase.\n**EFFECT:** Select one enemy unit that is below Starting Strength. Until the end of the phase, attacks made by models in your unit that target that enemy unit have the [SUSTAINED HITS 1] ability, and if your unit is a ^^**Vehicle**^^, score Critical Hits on unmodified Hit rolls of 5+.'
    },
    {
      id: 'iron-vengeful-animus',
      name: 'Vengeful Animus',
      cp: 1,
      turn: 'either',
      phase: 'Any Phase',
      category: 'Epic Deed',
      description:
        '**WHEN:** Any phase, just after an ^^**Adeptus Astartes**^^ ^^**Vehicle**^^ model from your army with the [DEADLY DEMISE] ability is destroyed.\n**TARGET:** That destroyed ^^**Vehicle**^^ model.\n**EFFECT:** Do not roll to determine whether [DEADLY DEMISE] triggers; it automatically triggers on a 4+ (or automatically if it is a ^^**Character**^^ or ^^**Titanic**^^ model).'
    },
    {
      id: 'iron-ancient-fury',
      name: 'Ancient Fury',
      cp: 1,
      turn: 'your',
      phase: 'Command',
      category: 'Epic Deed',
      description:
        '**WHEN:** Your Command phase.\n**TARGET:** One ^^**Adeptus Astartes**^^ ^^**Walker**^^ unit from your army.\n**EFFECT:** Until the start of your next Command phase, improve the Move and Objective Control characteristics of models in your unit by 1, and add 1 to Hit rolls made by that unit.'
    },
    {
      id: 'iron-unbowed-conviction',
      name: 'Unbowed Conviction',
      cp: 1,
      turn: 'your',
      phase: 'Command',
      category: 'Battle Tactic',
      description:
        '**WHEN:** Your Command phase.\n**TARGET:** One ^^**Adeptus Astartes**^^ unit from your army that is below Half-strength.\n**EFFECT:** Until the start of your next Command phase, models in your unit can ignore any or all modifiers to their characteristics and to any roll or test made for them (excluding modifiers to saving throws).'
    },
    {
      id: 'iron-power-of-machine-spirit',
      name: 'Power of the Machine Spirit',
      cp: 1,
      turn: 'opponent',
      phase: 'Shooting',
      category: 'Strategic Ploy',
      description:
        '**WHEN:** Your opponent’s Shooting phase, just after an enemy unit has resolved its attacks.\n**TARGET:** One ^^**Adeptus Astartes**^^ ^^**Vehicle**^^ from your army that was reduced below Half-strength as a result of the attacking unit’s attacks.\n**EFFECT:** Your ^^**Vehicle**^^ can shoot as if it were your Shooting phase, but must target only that attacking enemy unit.'
    },
    {
      id: 'iron-armour-of-contempt',
      name: 'Armour of Contempt',
      cp: 1,
      turn: 'either',
      phase: 'Shooting / Fight',
      category: 'Battle Tactic',
      description:
        '**WHEN:** Your opponent’s Shooting phase or the Fight phase, just after an enemy unit has selected its targets.\n**TARGET:** One ^^**Adeptus Astartes**^^ unit from your army that was selected as the target of one or more of the attacking unit’s attacks.\n**EFFECT:** Until the end of the phase, each time an attack targets your unit, worsen the Armour Penetration characteristic of that attack by 1.'
    }
  ],
  'stormlance task force': [
    {
      id: 'storm-blitzing-fusillade',
      name: 'Blitzing Fusillade',
      cp: 1,
      turn: 'your',
      phase: 'Shooting',
      category: 'Battle Tactic',
      description:
        '**WHEN:** Your Shooting phase.\n**TARGET:** One ^^**Adeptus Astartes**^^ unit from your army that has not been selected to shoot this phase.\n**EFFECT:** Until the end of the phase, ranged weapons equipped by models in your unit have the [ASSAULT] ability, and ranged weapons that already have the [ASSAULT] ability gain the [SUSTAINED HITS 1] ability.'
    },
    {
      id: 'storm-full-throttle',
      name: 'Full Throttle',
      cp: 1,
      turn: 'your',
      phase: 'Movement',
      category: 'Strategic Ploy',
      description:
        '**WHEN:** Your Movement phase, when an ^^**Adeptus Astartes**^^ ^^**Mounted**^^ or ^^**Fly**^^ ^^**Vehicle**^^ unit from your army is selected to Advance.\n**TARGET:** That unit.\n**EFFECT:** Until the end of the phase, do not make an Advance roll for your unit; instead, add 6" to the Move characteristic of models in your unit.'
    },
    {
      id: 'storm-shock-assault',
      name: 'Shock Assault',
      cp: 1,
      turn: 'your',
      phase: 'Charge',
      category: 'Battle Tactic',
      description:
        '**WHEN:** Your Charge phase.\n**TARGET:** One ^^**Adeptus Astartes**^^ ^^**Mounted**^^ unit from your army.\n**EFFECT:** Until the end of the turn, you can re-roll Charge rolls made for your unit, and melee weapons equipped by models in your unit have the [LANCE] ability.'
    },
    {
      id: 'storm-wind-swift-evasion',
      name: 'Wind-Swift Evasion',
      cp: 1,
      turn: 'opponent',
      phase: 'Movement',
      category: 'Strategic Ploy',
      description:
        '**WHEN:** Your opponent’s Movement phase, just after an enemy unit ends a Normal, Advance or Fall Back move.\n**TARGET:** One ^^**Adeptus Astartes**^^ ^^**Mounted**^^ or ^^**Infantry**^^ unit from your army within 9" of that enemy unit.\n**EFFECT:** Your unit can make a Normal move of up to 6".'
    },
    {
      id: 'storm-ride-hard',
      name: 'Ride Hard, Ride Fast',
      cp: 1,
      turn: 'opponent',
      phase: 'Shooting',
      category: 'Battle Tactic',
      description:
        '**WHEN:** Your opponent’s Shooting phase, just after an enemy unit has selected its targets.\n**TARGET:** One ^^**Adeptus Astartes**^^ ^^**Mounted**^^ or ^^**Fly**^^ ^^**Vehicle**^^ unit from your army.\n**EFFECT:** Until the end of the phase, each time a ranged attack targets your unit, subtract 1 from the Hit roll and subtract 1 from the Wound roll.'
    },
    {
      id: 'storm-armour-of-contempt',
      name: 'Armour of Contempt',
      cp: 1,
      turn: 'either',
      phase: 'Shooting / Fight',
      category: 'Battle Tactic',
      description:
        '**WHEN:** Your opponent’s Shooting phase or the Fight phase, just after an enemy unit has selected its targets.\n**TARGET:** One ^^**Adeptus Astartes**^^ unit from your army that was selected as the target of one or more of the attacking unit’s attacks.\n**EFFECT:** Until the end of the phase, each time an attack targets your unit, worsen the Armour Penetration characteristic of that attack by 1.'
    }
  ],
  'starshatter arsenal': [
    {
      id: 'starshatter-merciless-reclamation',
      name: 'Merciless Reclamation',
      cp: 2,
      turn: 'either',
      phase: 'Shooting / Fight',
      category: 'Battle Tactic',
      description:
        '**WHEN:** Your Shooting phase or the Fight phase.\n**TARGET:** One ^^**Necrons**^^ unit (excluding ^^**Monster**^^ and ^^**Titanic**^^ units) from your army that has not been selected to shoot or fight this phase.\n**EFFECT:** Until the end of the phase, each time a model in your unit makes an attack, if the target of that attack is within range of one or more objective markers, add 1 to the Wound roll.'
    },
    {
      id: 'starshatter-unyielding-forms',
      name: 'Unyielding Forms',
      cp: 2,
      turn: 'either',
      phase: 'Shooting / Fight',
      category: 'Battle Tactic',
      description:
        '**WHEN:** Your opponent’s Shooting phase or the Fight phase, just after an enemy unit has selected its targets.\n**TARGET:** One ^^**Necrons Vehicle**^^ or ^^**Necrons Mounted**^^ unit (excluding ^^**Titanic**^^ units) from your army that was selected as the target of one or more of the attacking unit’s attacks.\n**EFFECT:** Until the end of the phase, each time an attack targets a model in your unit, if the Strength characteristic of that attack is greater than the Toughness characteristic of that unit, subtract 1 from the Wound roll.'
    },
    {
      id: 'starshatter-chronoshift',
      name: 'Chronoshift',
      cp: 1,
      turn: 'your',
      phase: 'Movement',
      category: 'Strategic Ploy',
      description:
        '**WHEN:** Your Movement phase.\n**TARGET:** One ^^**Necrons Vehicle**^^ or ^^**Necrons Mounted**^^ unit (excluding ^^**Titanic**^^ units) from your army that has not been selected to move this phase.\n**EFFECT:** Until the end of the phase, if your unit Advances, do not make an Advance roll for it. Instead, add 6" to the Move characteristic of models in your unit.'
    },
    {
      id: 'starshatter-dimensional-tunnel',
      name: 'Dimensional Tunnel',
      cp: 1,
      turn: 'your',
      phase: 'Movement',
      category: 'Strategic Ploy',
      description:
        '**WHEN:** Your Movement phase.\n**TARGET:** One ^^**Necrons Vehicle**^^ or ^^**Necrons Mounted**^^ unit (excluding ^^**Titanic**^^ units) from your army.\n**EFFECT:** Until the end of the phase, models in your unit can move horizontally through models and terrain features.'
    },
    {
      id: 'starshatter-reactive-reposition',
      name: 'Reactive Reposition',
      cp: 2,
      turn: 'opponent',
      phase: 'Shooting',
      category: 'Strategic Ploy',
      description:
        '**WHEN:** Your opponent’s Shooting phase, just after an enemy unit has shot.\n**TARGET:** One ^^**Necrons**^^ unit from your army (excluding ^^**Titanic**^^ units) that was the target of one or more of the attacking unit’s attacks.\n**EFFECT:** Your unit can make a Normal move of up to D6" (or up to 6" if it is a ^^**Vehicle**^^ or ^^**Mounted**^^ unit).'
    },
    {
      id: 'starshatter-endless-servitude',
      name: 'Endless Servitude',
      cp: 1,
      turn: 'your',
      phase: 'Fight',
      category: 'Strategic Ploy',
      description:
        '**WHEN:** End of your Fight phase.\n**TARGET:** One ^^**Necrons**^^ unit (excluding ^^**Monster**^^ and ^^**Titanic**^^ units) from your army that is within range of one or more objective markers you control.\n**EFFECT:** Your unit’s Reanimation Protocols activate.'
    }
  ],
  'awakened dynasty': [
    {
      id: 'awakened-eternal-revenant',
      name: 'Protocol of the Eternal Revenant',
      cp: 1,
      turn: 'either',
      phase: 'Any Phase',
      category: 'Epic Deed',
      description:
        '**WHEN:** Any phase.\n**TARGET:** One ^^**Necrons Infantry Character**^^ model from your army that was just destroyed (you can target that model even though it was just destroyed).\n**EFFECT:** At the end of the phase, set up the destroyed model on the battlefield, unengaged and as close as possible to where it was destroyed, with half of its starting wounds remaining (each model can only be targeted with this Stratagem once per battle).'
    },
    {
      id: 'awakened-sudden-storm',
      name: 'Protocol of the Sudden Storm',
      cp: 1,
      turn: 'your',
      phase: 'Movement',
      category: 'Strategic Ploy',
      description:
        '**WHEN:** Your Movement phase.\n**TARGET:** One ^^**Necrons**^^ unit from your army.\n**EFFECT:** Until the end of the turn, ranged weapons equipped by models in your unit have the [ASSAULT] ability. In addition, if a ^^**Necrons Character**^^ is leading your unit, until the end of the phase, you can re-roll Advance rolls made for your unit.'
    },
    {
      id: 'awakened-undying-legions',
      name: 'Protocol of the Undying Legions',
      cp: 1,
      turn: 'opponent',
      phase: 'Shooting / Fight',
      category: 'Strategic Ploy',
      description:
        '**WHEN:** Your opponent’s Shooting phase or the Fight phase, just after an enemy unit has resolved its attacks.\n**TARGET:** One ^^**Necrons**^^ unit from your army that had one or more of its models destroyed as a result of the attacking unit’s attacks.\n**EFFECT:** Your unit activates its Reanimation Protocols and reanimates D3 wounds (or D3+1 wounds if a ^^**Necrons Character**^^ is leading your unit).'
    },
    {
      id: 'awakened-conquering-tyrant',
      name: 'Protocol of the Conquering Tyrant',
      cp: 1,
      turn: 'your',
      phase: 'Shooting',
      category: 'Battle Tactic',
      description:
        '**WHEN:** Your Shooting phase.\n**TARGET:** One ^^**Necrons**^^ unit from your army that has not been selected to shoot this phase.\n**EFFECT:** Until the end of the phase, each time a model in your unit makes an attack that targets a unit within half range, re-roll a Hit roll of 1. If a ^^**Necrons Character**^^ is leading your unit, you can re-roll the Hit roll instead.'
    },
    {
      id: 'awakened-vengeful-stars',
      name: 'Protocol of the Vengeful Stars',
      cp: 2,
      turn: 'opponent',
      phase: 'Shooting',
      category: 'Strategic Ploy',
      description:
        '**WHEN:** Your opponent’s Shooting phase, just after an enemy unit destroys a ^^**Necrons**^^ unit from your army.\n**TARGET:** One ^^**Necrons Character**^^ unit from your army that was within 6" of that destroyed unit.\n**EFFECT:** That unit can shoot as if it were your Shooting phase, but can only target that attacking enemy unit.'
    },
    {
      id: 'awakened-hungry-void',
      name: 'Protocol of the Hungry Void',
      cp: 1,
      turn: 'either',
      phase: 'Fight',
      category: 'Battle Tactic',
      description:
        '**WHEN:** Fight phase.\n**TARGET:** One ^^**Necrons**^^ unit from your army that has not been selected to fight this phase.\n**EFFECT:** Until the end of the phase, add 1 to the Strength characteristic of melee weapons equipped by models in your unit. In addition, if a ^^**Necrons Character**^^ is leading your unit, improve the Armour Penetration characteristic of such weapons by 1 as well.'
    }
  ],
  'canoptek court': [
    {
      id: 'canoptek-curse-of-cryptek',
      name: 'Curse of the Cryptek',
      cp: 1,
      turn: 'either',
      phase: 'Shooting / Fight',
      category: 'Battle Tactic',
      description:
        '**WHEN:** Your opponent’s Shooting phase or the Fight phase, just after an enemy unit has shot or fought.\n**TARGET:** One ^^**Cryptek**^^ model from your army that was destroyed by one of the attacking unit’s attacks.\n**EFFECT:** Until the end of the battle, each time a friendly ^^**Canoptek**^^ model makes an attack that targets that enemy unit, add 1 to the Hit roll and add 1 to the Wound roll.'
    },
    {
      id: 'canoptek-cynosure-of-eradication',
      name: 'Cynosure of Eradication',
      cp: 2,
      turn: 'your',
      phase: 'Shooting / Fight',
      category: 'Battle Tactic',
      description:
        '**WHEN:** The start of your Shooting phase or the start of the Fight phase.\n**TARGET:** One ^^**Cryptek**^^ or ^^**Canoptek**^^ unit from your army that is wholly within your army’s Power Matrix.\n**EFFECT:** Until the end of the phase, weapons equipped by models in your unit have the [DEVASTATING WOUNDS] ability.'
    },
    {
      id: 'canoptek-solar-pulse',
      name: 'Solar Pulse',
      cp: 1,
      turn: 'your',
      phase: 'Shooting',
      category: 'Strategic Ploy',
      description:
        '**WHEN:** Start of your Shooting phase.\n**TARGET:** One ^^**Cryptek**^^ model from your army.\n**EFFECT:** Select one objective marker within 18" of your model. Until the end of the phase, weapons equipped by friendly ^^**Necrons**^^ models have the [IGNORES COVER] ability while targeting units within range of that objective marker.'
    },
    {
      id: 'canoptek-reactive-subroutines',
      name: 'Reactive Subroutines',
      cp: 1,
      turn: 'opponent',
      phase: 'Movement / Fight',
      category: 'Strategic Ploy',
      description:
        '**WHEN:** Your opponent’s Movement phase or the Fight phase, just after an enemy unit ends a Normal, Advance or Fall Back move, or is set up on the battlefield.\n**TARGET:** One ^^**Canoptek**^^ unit from your army within 8" of that enemy unit.\n**EFFECT:** Your unit can make a Normal move of up to 6".'
    },
    {
      id: 'canoptek-countertemporal-shift',
      name: 'Countertemporal Shift',
      cp: 1,
      turn: 'opponent',
      phase: 'Shooting',
      category: 'Strategic Ploy',
      description:
        '**WHEN:** Your opponent’s Shooting phase, just after an enemy unit has selected its targets.\n**TARGET:** One ^^**Canoptek**^^ unit from your army that was selected as the target of one or more of the attacking unit’s attacks.\n**EFFECT:** Until the end of the phase, your unit can only be selected as the target of a ranged attack if the attacking model is within 18".'
    },
    {
      id: 'canoptek-suboptimal-facade',
      name: 'Suboptimal Façade',
      cp: 1,
      turn: 'opponent',
      phase: 'Charge',
      category: 'Strategic Ploy',
      description:
        '**WHEN:** Your opponent’s Charge phase, just after an enemy unit declares a charge.\n**TARGET:** One ^^**Canoptek**^^ unit from your army that was selected as the target of that charge.\n**EFFECT:** Roll one D6: on a 2-5, that enemy unit suffers D3 mortal wounds; on a 6, that enemy unit suffers 3 mortal wounds. Your unit can then make a Normal move, ending that move as close as possible to that enemy unit.'
    }
  ],
  'hypercrypt legion': [
    {
      id: 'hypercrypt-cosmic-precision',
      name: 'Cosmic Precision',
      cp: 1,
      turn: 'your',
      phase: 'Movement',
      category: 'Strategic Ploy',
      description:
        '**WHEN:** Your Movement phase.\n**TARGET:** One ^^**Necrons**^^ unit from your army (excluding ^^**Monster**^^ units) arriving from Deep Strike, Hyperphasing or Strategic Reserves this phase.\n**EFFECT:** Your unit can be set up anywhere on the battlefield that is more than 6" horizontally away from all enemy models (cannot declare a charge in the same turn).'
    },
    {
      id: 'hypercrypt-quantum-deflection',
      name: 'Quantum Deflection',
      cp: 1,
      turn: 'either',
      phase: 'Shooting / Fight',
      category: 'Wargear',
      description:
        '**WHEN:** Your opponent’s Shooting phase or the Fight phase, just after an enemy unit has selected its targets.\n**TARGET:** One ^^**Necrons Vehicle**^^ unit from your army that was selected as the target of one or more attacks.\n**EFFECT:** Until the end of the phase, models in your unit have a 4+ invulnerable save.'
    },
    {
      id: 'hypercrypt-hyperphasic-recall',
      name: 'Hyperphasic Recall',
      cp: 2,
      turn: 'opponent',
      phase: 'Shooting / Fight',
      category: 'Strategic Ploy',
      description:
        '**WHEN:** Your opponent’s Shooting phase or the Fight phase, just after an enemy unit has shot or fought.\n**TARGET:** One ^^**Necrons Infantry**^^ unit that had models destroyed by that attack and one friendly ^^**Monolith**^^ model.\n**EFFECT:** Remove your unit from the battlefield and set it up anywhere wholly within 6" of your ^^**Monolith**^^ and not within Engagement Range of enemy units.'
    },
    {
      id: 'hypercrypt-dimensional-corridor',
      name: 'Dimensional Corridor',
      cp: 2,
      turn: 'your',
      phase: 'Charge',
      category: 'Strategic Ploy',
      description:
        '**WHEN:** Your Charge phase.\n**TARGET:** One ^^**Necrons**^^ unit from your army set up on the battlefield this turn using the Eternity Gate ability of a ^^**Monolith**^^.\n**EFFECT:** Your unit is eligible to declare a charge this turn.'
    },
    {
      id: 'hypercrypt-reanimation-crypts',
      name: 'Reanimation Crypts',
      cp: 1,
      turn: 'your',
      phase: 'Command',
      category: 'Strategic Ploy',
      description:
        '**WHEN:** Your Command phase.\n**TARGET:** Your ^^**Necrons Warlord**^^.\n**EFFECT:** For each of your ^^**Necrons**^^ units in Reserves, that unit’s Reanimation Protocols activate.'
    },
    {
      id: 'hypercrypt-entropic-damping',
      name: 'Entropic Damping',
      cp: 1,
      turn: 'opponent',
      phase: 'Shooting',
      category: 'Wargear',
      description:
        '**WHEN:** Your opponent’s Shooting phase, just after an enemy unit has selected its targets.\n**TARGET:** One ^^**Titanic**^^ model from your army selected as the target of one or more attacks and within 18" of the attacking unit.\n**EFFECT:** Until the end of the battle, each time a friendly ^^**Necrons**^^ model makes an attack targeting that enemy unit, you can re-roll the Hit roll.'
    }
  ],
  'annihilation legion': [
    {
      id: 'annihilation-masks-of-death',
      name: 'Masks of Death',
      cp: 1,
      turn: 'either',
      phase: 'Shooting / Fight',
      category: 'Strategic Ploy',
      description:
        '**WHEN:** Your opponent’s Shooting phase or the Fight phase, just after an enemy unit has selected its targets.\n**TARGET:** One ^^**Destroyer Cult**^^ or ^^**Flayed Ones**^^ unit from your army selected as the target of attacks.\n**EFFECT:** Until the end of the phase, each time an attack targets your unit, subtract 1 from the Hit roll.'
    },
    {
      id: 'annihilation-spoor-of-frailty',
      name: 'The Spoor of Frailty',
      cp: 1,
      turn: 'either',
      phase: 'Shooting / Fight',
      category: 'Battle Tactic',
      description:
        '**WHEN:** Your Shooting phase or the Fight phase.\n**TARGET:** One ^^**Destroyer Cult**^^ or ^^**Flayed Ones**^^ unit from your army.\n**EFFECT:** Until the end of the phase, each time a model makes an attack against a unit Below Starting Strength, add 1 to the Hit roll (and add 1 to the Wound roll if Below Half-strength).'
    },
    {
      id: 'annihilation-murderous-reanimation',
      name: 'Murderous Reanimation',
      cp: 1,
      turn: 'either',
      phase: 'Fight',
      category: 'Battle Tactic',
      description:
        '**WHEN:** Fight phase.\n**TARGET:** One ^^**Destroyer Cult**^^ or ^^**Flayed Ones**^^ unit from your army that has just destroyed an enemy unit or reduced an enemy unit Below Half-strength.\n**EFFECT:** Your unit’s Reanimation Protocols activate.'
    },
    {
      id: 'annihilation-pitiless-hunters',
      name: 'Pitiless Hunters',
      cp: 1,
      turn: 'either',
      phase: 'Fight',
      category: 'Battle Tactic',
      description:
        '**WHEN:** Fight phase.\n**TARGET:** One ^^**Destroyer Cult**^^ or ^^**Flayed Ones**^^ unit from your army.\n**EFFECT:** Until the end of the phase, each time a model in your unit makes a Pile-in or Consolidation move, it can move up to 6" instead of up to 3".'
    },
    {
      id: 'annihilation-blood-fuelled-cruelty',
      name: 'Blood-Fuelled Cruelty',
      cp: 1,
      turn: 'opponent',
      phase: 'Movement',
      category: 'Battle Tactic',
      description:
        '**WHEN:** Your opponent’s Movement phase, just after an enemy unit ends a Fall Back move.\n**TARGET:** One ^^**Destroyer Cult**^^ or ^^**Flayed Ones**^^ unit starting within Engagement Range of that enemy unit.\n**EFFECT:** Roll one D6: on a 2-5, that enemy unit suffers D3 mortal wounds; on a 6, it suffers 3 mortal wounds. Your unit can then make a Normal move, ending as close as possible to that enemy unit.'
    },
    {
      id: 'annihilation-insanitys-ire',
      name: 'Insanity’s Ire',
      cp: 1,
      turn: 'opponent',
      phase: 'Shooting',
      category: 'Strategic Ploy',
      description:
        '**WHEN:** Your opponent’s Shooting phase, just after an enemy unit has shot.\n**TARGET:** One ^^**Destroyer Cult**^^ or ^^**Flayed Ones**^^ unit that had models destroyed by that attack.\n**EFFECT:** Your unit can make a Normal move, ending as close as possible to that attacking enemy unit.'
    }
  ],
  'obeisance phalanx': [
    {
      id: 'obeisance-your-time-is-nigh',
      name: 'Your Time is Nigh',
      cp: 1,
      turn: 'either',
      phase: 'Any Phase',
      category: 'Epic Deed',
      description:
        '**WHEN:** Any phase, just after your opponent’s ^^**Warlord**^^ is destroyed.\n**TARGET:** Your ^^**Necrons Warlord**^^.\n**EFFECT:** Until the end of the battle, each time an enemy unit takes a Battle-shock or Leadership test, subtract 1 from the result.'
    },
    {
      id: 'obeisance-enslaved-artifice',
      name: 'Enslaved Artifice',
      cp: 1,
      turn: 'either',
      phase: 'Shooting / Fight',
      category: 'Battle Tactic',
      description:
        '**WHEN:** Your Shooting phase or the Fight phase.\n**TARGET:** One ^^**Necrons**^^ unit (excluding ^^**Titanic**^^ units) that has not been selected to shoot or fight this phase.\n**EFFECT:** Until the end of the phase, each time a model in your unit makes an attack, an unmodified Hit roll of 5+ scores a Critical Hit.'
    },
    {
      id: 'obeisance-nanoassembly-protocols',
      name: 'Nanoassembly Protocols',
      cp: 1,
      turn: 'either',
      phase: 'Shooting / Fight',
      category: 'Battle Tactic',
      description:
        '**WHEN:** Your opponent’s Shooting phase or the Fight phase, just after an enemy unit has selected its targets.\n**TARGET:** One ^^**Necrons Vehicle**^^ unit selected as the target of attacks.\n**EFFECT:** Until the end of the phase, each time an attack is allocated to a model in your unit, subtract 1 from the Damage characteristic of that attack.'
    },
    {
      id: 'obeisance-territorial-obsession',
      name: 'Territorial Obsession',
      cp: 1,
      turn: 'your',
      phase: 'Command',
      category: 'Strategic Ploy',
      description:
        '**WHEN:** Your Command phase.\n**TARGET:** One ^^**Lychguard**^^ or ^^**Triarch**^^ unit from your army.\n**EFFECT:** Until the start of your next Command phase, add 1 to the Objective Control characteristic of models in your unit (or add 3 if your unit has the ^^**Vehicle**^^ keyword).'
    },
    {
      id: 'obeisance-sentinels-of-eternity',
      name: 'Sentinels of Eternity',
      cp: 1,
      turn: 'either',
      phase: 'Fight',
      category: 'Epic Deed',
      description:
        '**WHEN:** Fight phase, just after an enemy unit has selected its targets.\n**TARGET:** One ^^**Lychguard**^^ or ^^**Triarch Praetorians**^^ unit selected as the target.\n**EFFECT:** Each time a model in your unit is destroyed before fighting, roll one D6: on a 4+, it can fight after the attacking unit has finished its attacks, then is removed from play.'
    },
    {
      id: 'obeisance-suffer-no-rival',
      name: 'Suffer No Rival',
      cp: 1,
      turn: 'either',
      phase: 'Fight',
      category: 'Battle Tactic',
      description:
        '**WHEN:** Fight phase.\n**TARGET:** One ^^**Lychguard**^^ or ^^**Triarch**^^ unit from your army.\n**EFFECT:** Until the end of the phase, melee weapons equipped by models in your unit have the [PRECISION] ability.'
    }
  ],
  'pantheon of woe': [
    {
      id: 'pantheon-disharmonisation-cascade',
      name: 'Disharmonisation Cascade',
      cp: 1,
      turn: 'either',
      phase: 'Any Phase',
      category: 'Epic Deed',
      description:
        '**WHEN:** Any phase, just after a ^^**Necrons Monster**^^ model is destroyed, before rolling Deadly Demise.\n**TARGET:** That ^^**Necrons Monster**^^ model.\n**EFFECT:** Until the end of the phase, your model’s Deadly Demise ability inflicts mortal wounds on a D6 roll of 3+ instead of on a 6.'
    },
    {
      id: 'pantheon-molecular-erosion',
      name: 'Molecular Erosion',
      cp: 1,
      turn: 'either',
      phase: 'Command',
      category: 'Strategic Ploy',
      description:
        '**WHEN:** Command phase.\n**TARGET:** One ^^**Necrons Monster**^^ unit from your army.\n**EFFECT:** Select one unravelling enemy unit visible to your unit. That enemy unit must take a Battle-shock test with a -1 penalty; if failed, it suffers D3+1 mortal wounds.'
    },
    {
      id: 'pantheon-mass-transmogrification',
      name: 'Mass Transmogrification',
      cp: 1,
      turn: 'either',
      phase: 'Shooting / Fight',
      category: 'Epic Deed',
      description:
        '**WHEN:** Your Shooting phase or the Fight phase, just after a ^^**Necrons Monster**^^ destroys an enemy unit.\n**TARGET:** One friendly ^^**Necrons**^^ unit (excluding ^^**Monsters**^^) within 6" of that Monster unit.\n**EFFECT:** If that destroyed enemy unit was unravelling, your friendly unit’s Reanimation Protocols activate.'
    },
    {
      id: 'pantheon-entrophasic-aura',
      name: 'Entrophasic Aura Targeting',
      cp: 1,
      turn: 'either',
      phase: 'Shooting / Fight',
      category: 'Battle Tactic',
      description:
        '**WHEN:** Your Shooting phase or the Fight phase.\n**TARGET:** One ^^**Necrons**^^ unit (excluding ^^**Monsters**^^) that has not been selected to shoot or fight this phase.\n**EFFECT:** Until the end of the phase, each time a model makes an attack, re-roll a Hit roll of 1 (and re-roll a Wound roll of 1 if the target is unravelling).'
    },
    {
      id: 'pantheon-chronodistortion',
      name: 'Chronodistortion',
      cp: 1,
      turn: 'either',
      phase: 'Fight',
      category: 'Battle Tactic',
      description:
        '**WHEN:** Fight phase, just after an enemy unit has selected its targets.\n**TARGET:** One ^^**Necrons**^^ unit selected as the target of attacks.\n**EFFECT:** Until the end of the phase, each time a model is destroyed before fighting, roll one D6 (+1 if attacker is unravelling): on a 4+, it can fight before being removed from play.'
    },
    {
      id: 'pantheon-phase-melding',
      name: 'Phase Melding',
      cp: 1,
      turn: 'opponent',
      phase: 'Movement',
      category: 'Strategic Ploy',
      description:
        '**WHEN:** Your opponent’s Movement phase, when an unravelling enemy unit is selected to Fall Back.\n**TARGET:** One ^^**Necrons**^^ unit within Engagement Range of that enemy unit.\n**EFFECT:** The enemy unit cannot Fall Back and must instead Remain Stationary.'
    }
  ],
  'cryptek conclave': [
    {
      id: 'conclave-microscarab-swarm',
      name: 'Microscarab Swarm',
      cp: 1,
      turn: 'either',
      phase: 'Shooting / Fight',
      category: 'Wargear',
      description:
        '**WHEN:** Your opponent’s Shooting phase or the Fight phase, just after an enemy unit has selected its targets.\n**TARGET:** One ^^**Cryptek Infantry**^^ unit selected as the target of attacks.\n**EFFECT:** Models in your unit have a 5+ invulnerable save (or a 4+ invulnerable save if your unit has the ^^**Immortals**^^ keyword).'
    },
    {
      id: 'conclave-animus-curse',
      name: 'Animus Curse',
      cp: 1,
      turn: 'either',
      phase: 'Shooting / Fight',
      category: 'Wargear',
      description:
        '**WHEN:** Your opponent’s Shooting phase or the Fight phase, just after an enemy unit has shot or fought.\n**TARGET:** One ^^**Cryptek**^^ model destroyed by one of the attacking unit’s attacks.\n**EFFECT:** Until the end of the battle, each time a friendly ^^**Necrons**^^ model makes an attack targeting that enemy unit, you can re-roll the Hit roll.'
    },
    {
      id: 'conclave-synergistic-empowerment',
      name: 'Synergistic Empowerment',
      cp: 1,
      turn: 'your',
      phase: 'Shooting',
      category: 'Strategic Ploy',
      description:
        '**WHEN:** Start of your Shooting phase.\n**TARGET:** One ^^**Cryptek**^^ unit from your army.\n**EFFECT:** Select one friendly ^^**Necrons**^^ model (excluding ^^**Monsters**^^ and ^^**Vehicles**^^) within 12" of a Cryptek model in your unit. Until the end of the phase, that model gains the [CRYPTEK] keyword.'
    },
    {
      id: 'conclave-untapped-power',
      name: 'Untapped Power',
      cp: 1,
      turn: 'your',
      phase: 'Shooting',
      category: 'Battle Tactic',
      description:
        '**WHEN:** Your Shooting phase.\n**TARGET:** One ^^**Cryptek**^^ unit from your army.\n**EFFECT:** Until the end of the phase, each time your unit is selected to shoot, when selecting an ability for the Techno-sorcerous Augmentations Detachment Rule, you can select one additional ability.'
    },
    {
      id: 'conclave-potentiality-syphon',
      name: 'Potentiality Syphon',
      cp: 1,
      turn: 'opponent',
      phase: 'Command',
      category: 'Strategic Ploy',
      description:
        '**WHEN:** Your opponent’s Command phase.\n**TARGET:** One ^^**Necrons**^^ unit within range of one or more objective markers.\n**EFFECT:** Your unit’s Reanimation Protocols activate (reanimates an additional 1 wound if it is a ^^**Cryptek**^^ unit).'
    },
    {
      id: 'conclave-molecular-targeting',
      name: 'Molecular Targeting',
      cp: 1,
      turn: 'either',
      phase: 'Shooting / Fight',
      category: 'Battle Tactic',
      description:
        '**WHEN:** Your Shooting phase or the Fight phase.\n**TARGET:** One ^^**Necrons**^^ unit that has not been selected to shoot or fight this phase.\n**EFFECT:** Until the end of the phase, models in your unit ignore all modifiers to BS/WS and Hit rolls (and ignore all modifiers to Wound rolls if the unit has the [CRYPTEK] keyword).'
    }
  ],
  'cursed legion': [
    {
      id: 'cursed-methodical-murder',
      name: 'Methodical Murder',
      cp: 1,
      turn: 'either',
      phase: 'Shooting / Fight',
      category: 'Battle Tactic',
      description:
        '**WHEN:** Your Shooting phase or the Fight phase.\n**TARGET:** One ^^**Necrons**^^ unit (excluding ^^**Monsters**^^ and ^^**Vehicles**^^) that has not been selected to shoot or fight this phase.\n**EFFECT:** Until the end of the phase, weapons equipped by models in your unit have the [SUSTAINED HITS 1] ability.'
    },
    {
      id: 'cursed-image-of-death',
      name: 'Image of Death',
      cp: 1,
      turn: 'either',
      phase: 'Shooting / Fight',
      category: 'Battle Tactic',
      description:
        '**WHEN:** Your opponent’s Shooting phase or the Fight phase, just after an enemy unit has selected its targets.\n**TARGET:** One ^^**Destroyer Cult**^^ unit selected as the target of attacks.\n**EFFECT:** Until the end of the phase, each time an attack targets your unit, subtract 1 from the Hit roll.'
    },
    {
      id: 'cursed-mortis-protocols',
      name: 'Mortis Protocols',
      cp: 1,
      turn: 'either',
      phase: 'Shooting / Fight',
      category: 'Strategic Ploy',
      description:
        '**WHEN:** Your Shooting phase or the Fight phase, just after a ^^**Destroyer Cult**^^ unit destroys an enemy unit.\n**TARGET:** One friendly ^^**Necrons**^^ unit (excluding ^^**Monsters**^^ and ^^**Vehicles**^^) within 9" of that Destroyer Cult unit.\n**EFFECT:** That friendly unit’s Reanimation Protocols activate.'
    },
    {
      id: 'cursed-driven-to-butchery',
      name: 'Driven to Butchery',
      cp: 1,
      turn: 'your',
      phase: 'Movement / Charge',
      category: 'Strategic Ploy',
      description:
        '**WHEN:** Your Shooting phase or your Charge phase.\n**TARGET:** One ^^**Destroyer Cult**^^ unit from your army.\n**EFFECT:** Until the end of the turn, your unit is eligible to shoot and declare a charge in a turn in which it Advanced.'
    },
    {
      id: 'cursed-spreading-madness',
      name: 'Spreading Madness',
      cp: 1,
      turn: 'your',
      phase: 'Charge',
      category: 'Battle Tactic',
      description:
        '**WHEN:** Your Charge phase.\n**TARGET:** One ^^**Necrons**^^ unit (excluding ^^**Monsters**^^ and ^^**Vehicles**^^) that has not declared a charge this phase.\n**EFFECT:** Until the end of the phase, each time your unit declares a charge, if one or more targets are within Engagement Range of friendly units, add 2 to the Charge roll.'
    },
    {
      id: 'cursed-unnatural-aggression',
      name: 'Unnatural Aggression',
      cp: 2,
      turn: 'opponent',
      phase: 'Charge',
      category: 'Strategic Ploy',
      description:
        '**WHEN:** End of your opponent’s Charge phase.\n**TARGET:** One ^^**Necrons**^^ unit (excluding ^^**Monsters**^^ and ^^**Vehicles**^^) within 6" of one or more enemy units that did not declare a charge this phase.\n**EFFECT:** Your unit can declare a charge targeting only those eligible enemy units.'
    }
  ],
  'hand of the dynasty': [
    {
      id: 'hand-dominance-protocols',
      name: 'Dominance Protocols',
      cp: 1,
      turn: 'your',
      phase: 'Command',
      category: 'Strategic Ploy',
      description:
        '**WHEN:** Your Command phase.\n**TARGET:** One friendly ^^**Immortals**^^ unit from your army.\n**EFFECT:** Until the end of the turn, models in your unit have +1 Objective Control.'
    },
    {
      id: 'hand-will-of-the-conqueror',
      name: 'Will of the Conqueror',
      cp: 1,
      turn: 'your',
      phase: 'Movement',
      category: 'Strategic Ploy',
      description:
        '**WHEN:** End of your Movement phase.\n**TARGET:** One friendly ^^**Immortals**^^ or ^^**Necron Warriors**^^ unit from your army.\n**EFFECT:** Select one objective marker your unit is currently controlling. That objective marker remains under your control even if you have no models within range of it, until your opponent controls it.'
    },
    {
      id: 'hand-nanosaturation',
      name: 'Nanosaturation',
      cp: 1,
      turn: 'opponent',
      phase: 'Shooting',
      category: 'Strategic Ploy',
      description:
        '**WHEN:** Your opponent’s Shooting phase, just after an enemy unit has resolved its attacks targeting a friendly ^^**Immortals**^^ or ^^**Necron Warriors**^^ unit.\n**TARGET:** That ^^**Immortals**^^ or ^^**Necron Warriors**^^ unit.\n**EFFECT:** Your unit can shoot as if it were your Shooting phase, but can only target that attacking enemy unit.'
    }
  ],
  'skyshroud spearhead': [
    {
      id: 'skyshroud-omnilocked-strafing',
      name: 'Omnilocked Strafing',
      cp: 1,
      turn: 'your',
      phase: 'Movement',
      category: 'Strategic Ploy',
      description:
        '**WHEN:** Your Movement phase, when a friendly ^^**Necrons Mounted**^^ unit is selected to Fall Back.\n**TARGET:** That ^^**Necrons Mounted**^^ unit.\n**EFFECT:** Until the end of the turn, that Fall Back move does not prevent your unit from being eligible to shoot.'
    },
    {
      id: 'skyshroud-swift-as-death',
      name: 'Swift as Death',
      cp: 1,
      turn: 'opponent',
      phase: 'Movement',
      category: 'Strategic Ploy',
      description:
        '**WHEN:** Your opponent’s Movement phase, when an enemy unit ends a move within 8" of a friendly unengaged ^^**Necrons Mounted**^^ unit.\n**TARGET:** That ^^**Necrons Mounted**^^ unit.\n**EFFECT:** Your unit can make a Normal move of up to D3+3".'
    },
    {
      id: 'skyshroud-evasive-protocols',
      name: 'Evasive Protocols',
      cp: 1,
      turn: 'opponent',
      phase: 'Shooting',
      category: 'Battle Tactic',
      description:
        '**WHEN:** Your opponent’s Shooting phase, when an enemy unit targets a friendly ^^**Necrons Mounted**^^ unit.\n**TARGET:** That ^^**Necrons Mounted**^^ unit.\n**EFFECT:** Until the end of the phase, each time an attack with a Strength characteristic greater than your unit’s Toughness targets your unit, subtract 1 from the Wound roll.'
    }
  ],
  "the phaeron's armoury": [
    {
      id: 'phaeron-subsurface-quantumweave',
      name: 'Subsurface Quantumweave',
      cp: 1,
      turn: 'opponent',
      phase: 'Shooting / Fight',
      category: 'Wargear',
      description:
        '**WHEN:** Your opponent’s Shooting phase or the Fight phase, when an enemy unit targets a friendly ^^**Necrons Titanic Fly**^^ unit.\n**TARGET:** That friendly ^^**Necrons Titanic Fly**^^ unit.\n**EFFECT:** Until that enemy unit has finished making its attacks, worsen the Armour Penetration characteristic of attacks targeting your unit by 1.'
    },
    {
      id: 'phaeron-particle-pulse',
      name: 'Particle Pulse',
      cp: 1,
      turn: 'your',
      phase: 'Shooting',
      category: 'Strategic Ploy',
      description:
        '**WHEN:** Start of your Shooting phase.\n**TARGET:** One friendly ^^**Necrons Titanic Fly**^^ unit from your army.\n**EFFECT:** Select one visible enemy unit within 12" of your unit. Until the end of the phase, that enemy unit has its detection range increased by +3".'
    },
    {
      id: 'phaeron-cosmic-storm',
      name: 'Cosmic Storm',
      cp: 1,
      turn: 'your',
      phase: 'Shooting',
      category: 'Battle Tactic',
      description:
        '**WHEN:** Your Shooting phase, when a friendly ^^**Obelisk**^^ or ^^**Tesseract Vault**^^ unit is selected to shoot.\n**TARGET:** That unit.\n**EFFECT:** Until the end of the phase, improve the Armour Penetration characteristic of attacks made with your unit’s Tesla Sphere weapons by 1.'
    }
  ]
};

/**
 * Generates or retrieves detachment stratagems for any selected detachment
 */
export function getDetachmentStratagems(
  detachments: SelectedDetachment[]
): { detachmentName: string; dpCost: number; stratagems: Stratagem[] }[] {
  return detachments.map((det) => {
    const key = det.name.trim().toLowerCase();
    if (DETACHMENT_STRATAGEMS_MAP[key]) {
      return {
        detachmentName: det.name,
        dpCost: det.dpCost,
        stratagems: DETACHMENT_STRATAGEMS_MAP[key]
      };
    }

    // Dynamic fallback stratagems tailored to the detachment's DP cost, rules, and tags
    const ruleName = det.rules?.[0]?.name || det.name;
    const isAssault =
      key.includes('assault') ||
      key.includes('blade') ||
      key.includes('blood') ||
      key.includes('crusade') ||
      det.tags?.some((t) => t.includes('TAKE AND HOLD'));
    const isRecon =
      key.includes('vanguard') ||
      key.includes('recon') ||
      key.includes('scout') ||
      key.includes('phobos') ||
      det.tags?.some((t) => t.includes('RECONNAISSANCE'));

    const stratagems: Stratagem[] = [
      {
        id: `${det.id}-tactical-mastery`,
        name: `${ruleName} Surge`,
        cp: 1,
        turn: 'your',
        phase: isAssault ? 'Charge' : 'Shooting',
        category: 'Battle Tactic',
        description: isAssault
          ? `**WHEN:** Your Charge phase.\n**TARGET:** One friendly unit in your ${det.name} detachment.\n**EFFECT:** Until the end of the turn, you can re-roll Charge rolls made for your unit, and its melee weapons gain the [LANCE] ability.`
          : `**WHEN:** Your Shooting phase.\n**TARGET:** One friendly unit in your ${det.name} detachment.\n**EFFECT:** Until the end of the phase, ranged weapons equipped by models in your unit gain the [SUSTAINED HITS 1] and [IGNORES COVER] abilities.`
      },
      {
        id: `${det.id}-counter-strike`,
        name: 'Relentless Fury',
        cp: 1,
        turn: 'either',
        phase: 'Fight',
        category: 'Battle Tactic',
        description:
          `**WHEN:** Fight phase.\n**TARGET:** One friendly unit from your army that has not been selected to fight this phase.\n**EFFECT:** Until the end of the phase, melee weapons equipped by models in your unit gain the [LETHAL HITS] ability and improve their Armour Penetration characteristic by 1.`
      },
      {
        id: `${det.id}-reactive-manoeuvre`,
        name: isRecon ? 'Shadowstep Reposition' : 'Tactical Counter-Move',
        cp: 1,
        turn: 'opponent',
        phase: 'Movement',
        category: 'Strategic Ploy',
        description:
          `**WHEN:** Your opponent’s Movement phase, just after an enemy unit ends a Normal, Advance or Fall Back move within 9" of your unit.\n**TARGET:** One friendly ^^**Infantry**^^ or ^^**Mounted**^^ unit not within Engagement Range of enemy units.\n**EFFECT:** Your unit can make a Normal move of up to 6" (or gain [STEALTH] and [BENEFIT OF COVER] until the end of the turn).`
      },
      {
        id: `${det.id}-unyielding-bastion`,
        name: 'Unyielding Defence',
        cp: 1,
        turn: 'either',
        phase: 'Shooting / Fight',
        category: 'Battle Tactic',
        description:
          `**WHEN:** Your opponent’s Shooting phase or the Fight phase, just after an enemy unit has selected its targets.\n**TARGET:** One friendly unit from your army that was selected as the target of one or more attacks.\n**EFFECT:** Until the end of the phase, worsen the Armour Penetration characteristic of attacks targeting your unit by 1.`
      }
    ];

    return {
      detachmentName: det.name,
      dpCost: det.dpCost,
      stratagems
    };
  });
}

