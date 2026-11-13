import { SelectedDetachment } from '../types/roster';
import stratagemsData from './stratagems_data.json';

export type StratagemTurn = 'your' | 'opponent' | 'either';

export type StratagemPhase =
  | 'Command'
  | 'Movement'
  | 'Shooting'
  | 'Charge'
  | 'Fight'
  | 'Shooting / Charge'
  | 'Shooting / Fight'
  | 'Movement / Charge'
  | 'Movement / Fight'
  | 'Charge / Fight'
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

interface StratagemsDataFile {
  edition: string;
  source: string;
  generatedAt: string;
  coreStratagems: Stratagem[];
  detachmentStratagems: Record<string, Stratagem[]>;
}

const parsedData = stratagemsData as StratagemsDataFile;

/**
 * Official Warhammer 40,000 11th Edition Core Stratagems (sourced from Wahapedia wh40k11ed)
 * Color-coded by turn timing:
 * - 'your'     -> Blue (Your Turn)
 * - 'either'   -> Green / Teal (Either Player's Turn)
 * - 'opponent' -> Red (Opponent's Turn)
 */
export const CORE_STRATAGEMS: Stratagem[] = parsedData.coreStratagems;

const DETACHMENT_STRATAGEMS_MAP: Record<string, Stratagem[]> = parsedData.detachmentStratagems;

function normalizeDetachmentKey(name: string): string {
  return name
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Generates or retrieves 11th Edition detachment stratagems for any selected detachment
 */
export function getDetachmentStratagems(
  detachments: SelectedDetachment[]
): { detachmentName: string; dpCost: number; stratagems: Stratagem[] }[] {
  return detachments.map((det) => {
    const key = normalizeDetachmentKey(det.name);
    if (DETACHMENT_STRATAGEMS_MAP[key]) {
      return {
        detachmentName: det.name,
        dpCost: det.dpCost,
        stratagems: DETACHMENT_STRATAGEMS_MAP[key]
      };
    }

    // Dynamic fallback stratagems if a detachment is not in the Wahapedia export
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
