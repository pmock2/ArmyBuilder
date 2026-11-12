import { ArmyRoster, SelectedUnit, getUnitRole, getUnitTotalPts, getUnitWargearPts } from '../types/roster';
import { BATTLE_SIZE_CONFIGS } from './validator';

const ROLE_SECTIONS: { key: string; label: string }[] = [
  { key: 'Epic Hero', label: 'EPIC HEROES' },
  { key: 'Character', label: 'CHARACTERS' },
  { key: 'Battleline', label: 'BATTLELINE' },
  { key: 'Infantry', label: 'INFANTRY' },
  { key: 'Mounted', label: 'MOUNTED' },
  { key: 'Monster', label: 'MONSTERS' },
  { key: 'Vehicle', label: 'VEHICLES' },
  { key: 'Dedicated Transport', label: 'DEDICATED TRANSPORTS' },
  { key: 'Aircraft', label: 'AIRCRAFT' },
  { key: 'Fortification', label: 'FORTIFICATIONS' },
  { key: 'Allied Units', label: 'ALLIED UNITS' }
];

function getPaidWargearSelections(u: SelectedUnit): string[] {
  const paid: string[] = [];
  if (!u.datasheet.wargearGroups) return paid;
  for (const g of u.datasheet.wargearGroups) {
    const selectedIds = (u.selectedOptions && u.selectedOptions[g.id] !== undefined)
      ? u.selectedOptions[g.id]
      : (g.defaultOptionIds || []);
    for (const opt of g.options) {
      if (opt.pts && opt.pts > 0 && selectedIds.includes(opt.id)) {
        paid.push(`${opt.name} (+${opt.pts} pts)`);
      }
    }
  }
  return paid;
}

/**
 * Generates a clean, human-friendly text summary optimized for sharing on Discord,
 * messages, forums, or quick list reviews. Clearly highlights units, their leaders,
 * and equipped enhancements without noisy default wargear clutter.
 */
export function generateShareableText(roster: ArmyRoster): string {
  const battleSizeKey = (roster.battleSize || 'strike-force').toLowerCase().replace(/\s+/g, '-');
  const limits = BATTLE_SIZE_CONFIGS[battleSizeKey] || BATTLE_SIZE_CONFIGS['strike-force'];

  const totalPoints = roster.units.reduce((sum, u) => sum + getUnitTotalPts(u), 0);
  const totalDP = roster.detachments.reduce((sum, d) => sum + d.dpCost, 0);

  const factionLabel = roster.subFactionName && roster.subFactionName !== roster.factionName
    ? `${roster.factionName} — ${roster.subFactionName}`
    : roster.factionName;

  let out = `${roster.name} (${totalPoints}/${limits.points} pts • ${totalDP}/${limits.dp} DP)\n`;
  out += `Faction: ${factionLabel}\n`;
  if (roster.detachments.length > 0) {
    out += `Detachments: ${roster.detachments.map(d => `${d.name} (${d.dpCost} DP)`).join(', ')}\n`;
  } else {
    out += `Detachments: None\n`;
  }
  if (roster.forceDisposition) {
    out += `Force Disposition: ${roster.forceDisposition}\n`;
  }

  for (const { key, label } of ROLE_SECTIONS) {
    const roleUnits = roster.units.filter(u => getUnitRole(u) === key);
    if (roleUnits.length === 0) continue;

    const rolePts = roleUnits.reduce((sum, u) => sum + getUnitTotalPts(u), 0);
    out += `\n${label} (${rolePts} pts)\n`;

    for (const u of roleUnits) {
      const cost = getUnitTotalPts(u);
      const modelBadge = u.modelsCount > 1 ? ` (${u.modelsCount} models)` : '';
      const warlordBadge = u.isWarlord ? ' [WARLORD]' : '';

      out += `• ${u.name}${modelBadge}${warlordBadge} — ${cost} pts\n`;

      if (u.enhancement) {
        out += `  ↳ Enhancement: ${u.enhancement.name} (+${u.enhancement.pts} pts)\n`;
      }

      const paidWargear = getPaidWargearSelections(u);
      if (paidWargear.length > 0) {
        out += `  ↳ Upgrades: ${paidWargear.join(', ')}\n`;
      }

      if (u.attachedLeaderId) {
        const leader = roster.units.find(x => x.instanceId === u.attachedLeaderId);
        if (leader) {
          const leaderWarlord = leader.isWarlord ? ' [WARLORD]' : '';
          const leaderEnh = leader.enhancement ? ` — Enhancement: ${leader.enhancement.name}` : '';
          out += `  ↳ Leader: ${leader.name}${leaderWarlord}${leaderEnh}\n`;
        }
      }

      if (u.attachedSupportId) {
        const support = roster.units.find(x => x.instanceId === u.attachedSupportId);
        if (support) {
          const supportEnh = support.enhancement ? ` — Enhancement: ${support.enhancement.name}` : '';
          out += `  ↳ Support: ${support.name}${supportEnh}\n`;
        }
      }

      if (u.attachedToBodyguardId) {
        const bg = roster.units.find(x => x.instanceId === u.attachedToBodyguardId);
        if (bg) {
          out += `  ↳ Leading: ${bg.name}\n`;
        }
      }
    }
  }

  return out.trimEnd() + '\n';
}

export function generateTournamentText(roster: ArmyRoster): string {
  const battleSizeKey = (roster.battleSize || 'strike-force').toLowerCase().replace(/\s+/g, '-');
  const limits = BATTLE_SIZE_CONFIGS[battleSizeKey] || BATTLE_SIZE_CONFIGS['strike-force'];

  let totalPoints = 0;
  for (const u of roster.units) {
    totalPoints += getUnitTotalPts(u);
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
  out += `Detachment Points: ${totalDP} / ${limits.dp} DP\n`;
  if (roster.forceDisposition) {
    out += `Force Disposition: ${roster.forceDisposition}\n`;
  }
  out += `\n`;

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

  for (const { key: role } of ROLE_SECTIONS) {
    const roleUnits = roster.units.filter(u => getUnitRole(u) === role);

    if (roleUnits.length > 0) {
      out += `------------------------------------------------------------\n`;
      out += `${role.toUpperCase()} (${roleUnits.length}):\n`;
      out += `------------------------------------------------------------\n`;

      for (const u of roleUnits) {
        const cost = getUnitTotalPts(u);
        const wargearPts = getUnitWargearPts(u);

        out += `* ${u.name} [${cost} pts]`;
        if (u.isWarlord) out += ` **WARLORD**`;
        if (u.modelsCount > 1) out += ` (Models: ${u.modelsCount})`;
        if (wargearPts > 0) out += ` (Wargear: +${wargearPts} pts)`;
        out += `\n`;

        if (u.enhancement) {
          out += `    - Enhancement: ${u.enhancement.name} (+${u.enhancement.pts} pts)\n`;
        }

        if (u.datasheet.wargearGroups && u.datasheet.wargearGroups.length > 0) {
          for (const g of u.datasheet.wargearGroups) {
            const selectedIds = (u.selectedOptions && u.selectedOptions[g.id] !== undefined)
              ? u.selectedOptions[g.id]
              : (g.defaultOptionIds || []);
            const selectedNames = g.options
              .filter(o => selectedIds.includes(o.id))
              .map(o => o.name);
            if (selectedNames.length > 0) {
              out += `    - ${g.name}: ${selectedNames.join(', ')}\n`;
            }
          }
        }

        if (u.attachedToBodyguardId) {
          const bg = roster.units.find(x => x.instanceId === u.attachedToBodyguardId);
          out += `    - Attached to: ${bg ? bg.name : 'Bodyguard unit'}\n`;
        }

        if (u.attachedLeaderId) {
          const leader = roster.units.find(x => x.instanceId === u.attachedLeaderId);
          if (leader) {
            out += `    - Attached Leader: ${leader.name}${leader.enhancement ? ` (${leader.enhancement.name})` : ''}\n`;
          }
        }

        if (u.attachedSupportId) {
          const support = roster.units.find(x => x.instanceId === u.attachedSupportId);
          if (support) {
            out += `    - Attached Support: ${support.name}${support.enhancement ? ` (${support.enhancement.name})` : ''}\n`;
          }
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
