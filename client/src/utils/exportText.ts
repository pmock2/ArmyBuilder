import { ArmyRoster } from '../types/roster';
import { BATTLE_SIZE_CONFIGS } from './validator';

export function generateTournamentText(roster: ArmyRoster): string {
  const battleSizeKey = (roster.battleSize || 'strike-force').toLowerCase().replace(/\s+/g, '-');
  const limits = BATTLE_SIZE_CONFIGS[battleSizeKey] || BATTLE_SIZE_CONFIGS['strike-force'];

  let totalPoints = 0;
  for (const u of roster.units) {
    let cost = u.cost;
    if (u.enhancement) cost += u.enhancement.pts;
    totalPoints += cost;
  }

  let totalDP = 0;
  for (const d of roster.detachments) {
    totalDP += d.dpCost;
  }

  let out = `============================================================\n`;
  out += `WARHAMMER 40,000 11TH EDITION ARMY ROSTER\n`;
  out += `============================================================\n`;
  out += `Army Name: ${roster.name}\n`;
  out += `Faction: ${roster.factionName}${roster.subFactionName ? ` (${roster.subFactionName})` : ''}\n`;
  out += `Battle Size: ${limits.name} (${limits.points} pts limit)\n`;
  out += `Total Points: ${totalPoints} / ${limits.points} pts\n`;
  out += `Detachment Points: ${totalDP} / ${limits.dp} DP\n\n`;

  // Detachments
  out += `------------------------------------------------------------\n`;
  out += `DETACHMENTS:\n`;
  out += `------------------------------------------------------------\n`;
  if (roster.detachments.length === 0) {
    out += `  None selected\n`;
  } else {
    for (const d of roster.detachments) {
      out += `* ${d.name} (${d.dpCost} DP)${d.tags && d.tags.length > 0 ? ` [Tags: ${d.tags.join(', ')}]` : ''}\n`;
    }
  }
  out += `\n`;

  // Group Units by Role
  const roles = [
    'Epic Hero',
    'Character',
    'Battleline',
    'Infantry',
    'Mounted',
    'Monster',
    'Vehicle',
    'Dedicated Transport',
    'Aircraft',
    'Fortification',
    'Allied Units'
  ];

  for (const role of roles) {
    const roleUnits = roster.units.filter(u => {
      if (role === 'Epic Hero') return u.isEpicHero;
      if (role === 'Character') return u.isCharacter && !u.isEpicHero;
      if (role === 'Battleline') return u.isBattleline && !u.isCharacter && !u.isEpicHero;
      if (role === 'Dedicated Transport') return u.isDedicatedTransport;
      return u.datasheet.primaryCategory.toLowerCase() === role.toLowerCase();
    });

    if (roleUnits.length > 0) {
      out += `------------------------------------------------------------\n`;
      out += `${role.toUpperCase()} (${roleUnits.length}):\n`;
      out += `------------------------------------------------------------\n`;

      for (const u of roleUnits) {
        let cost = u.cost;
        if (u.enhancement) cost += u.enhancement.pts;

        out += `* ${u.name} [${cost} pts]`;
        if (u.isWarlord) out += ` **WARLORD**`;
        if (u.modelsCount > 1) out += ` (Models: ${u.modelsCount})`;
        out += `\n`;

        if (u.enhancement) {
          out += `    - Enhancement: ${u.enhancement.name} (+${u.enhancement.pts} pts)\n`;
        }

        if (u.attachedToBodyguardId) {
          const bg = roster.units.find(x => x.instanceId === u.attachedToBodyguardId);
          out += `    - Attached to: ${bg ? bg.name : 'Bodyguard unit'}\n`;
        }

        if (u.attachedLeaderId) {
          const leader = roster.units.find(x => x.instanceId === u.attachedLeaderId);
          if (leader) out += `    - Attached Leader: ${leader.name}\n`;
        }

        if (u.attachedSupportId) {
          const support = roster.units.find(x => x.instanceId === u.attachedSupportId);
          if (support) out += `    - Attached Support: ${support.name}\n`;
        }
      }
      out += `\n`;
    }
  }

  out += `============================================================\n`;
  out += `MUSTERED WITH 40K 11TH EDITION ARMY BUILDER\n`;
  out += `============================================================\n`;

  return out;
}

