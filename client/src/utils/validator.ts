import { ArmyRoster, BattleSizeConfig, ValidationIssue, ValidationResult } from '../types/roster';

export const BATTLE_SIZE_CONFIGS: Record<string, BattleSizeConfig> = {
  incursion: {
    name: 'Incursion',
    points: 1000,
    dp: 2,
    enhancements: 2,
    unitLimit: 2,
    battlelineLimit: 4
  },
  'strike-force': {
    name: 'Strike Force',
    points: 2000,
    dp: 3,
    enhancements: 4,
    unitLimit: 3,
    battlelineLimit: 6
  },
  onslaught: {
    name: 'Onslaught',
    points: 3000,
    dp: 4,
    enhancements: 6,
    unitLimit: 4,
    battlelineLimit: 8
  }
};

export function validateClientRoster(roster: ArmyRoster): ValidationResult {
  const issues: ValidationIssue[] = [];
  const battleSizeKey = (roster.battleSize || 'strike-force').toLowerCase().replace(/\s+/g, '-');
  const limits = BATTLE_SIZE_CONFIGS[battleSizeKey] || BATTLE_SIZE_CONFIGS['strike-force'];

  const units = roster.units || [];
  const detachments = roster.detachments || [];

  // 1. Calculate Total Points
  let totalPoints = 0;
  for (const u of units) {
    let unitCost = Number(u.cost || 0);
    if (u.enhancement) {
      unitCost += Number(u.enhancement.pts || 0);
    }
    totalPoints += unitCost;
  }

  if (totalPoints > limits.points) {
    issues.push({
      id: 'points-limit',
      severity: 'error',
      title: 'Points Budget Exceeded',
      message: `Total army points (${totalPoints} pts) exceeds the ${limits.name} limit of ${limits.points} pts.`
    });
  }

  // 2. Detachment Points (DP) Budget
  let totalDP = 0;
  for (const d of detachments) {
    totalDP += Number(d.dpCost || 0);
  }

  // Incursion 3DP exception (Section 25.04)
  const isIncursion3DPException = limits.dp === 2 && detachments.length === 1 && totalDP === 3;

  if (totalDP > limits.dp && !isIncursion3DPException) {
    issues.push({
      id: 'dp-limit',
      severity: 'error',
      title: 'Detachment Points Exceeded',
      message: `Total Detachment Points (${totalDP} DP) exceeds the ${limits.name} budget (${limits.dp} DP).`
    });
  }

  // 3. Detachment Tag & Mutual Exclusion Check
  const seenTags = new Map<string, string>();
  for (const d of detachments) {
    const exclusiveTags = (d.constraints && d.constraints.exclusiveTags) || [];
    const tags = d.tags || [];

    for (const tag of tags) {
      const upperTag = tag.toUpperCase();
      if (exclusiveTags.includes(upperTag)) {
        if (seenTags.has(upperTag)) {
          const prevDet = seenTags.get(upperTag);
          issues.push({
            id: `tag-conflict-${upperTag}`,
            severity: 'error',
            title: `Detachment Conflict: [${upperTag}]`,
            message: `'${d.name}' has the ${upperTag} tag and cannot be taken with '${prevDet}'.`
          });
        } else {
          seenTags.set(upperTag, d.name);
        }
      }
    }
  }

  // 4. Detachment Duplication Check
  const detachmentCounts: Record<string, number> = {};
  for (const d of detachments) {
    detachmentCounts[d.name] = (detachmentCounts[d.name] || 0) + 1;
    if (detachmentCounts[d.name] > 1) {
      issues.push({
        id: `duplicate-detachment-${d.name}`,
        severity: 'error',
        title: 'Duplicate Detachment',
        message: `Detachment '${d.name}' cannot be selected more than once.`
      });
    }
  }

  // 5. Warlord Check
  const warlords = units.filter(u => u.isWarlord);
  if (warlords.length === 0) {
    issues.push({
      id: 'no-warlord',
      severity: 'error',
      title: 'No Warlord Designated',
      message: 'You must designate exactly one CHARACTER model in your army as your Warlord.'
    });
  } else if (warlords.length > 1) {
    issues.push({
      id: 'multiple-warlords',
      severity: 'error',
      title: 'Multiple Warlords',
      message: `You have appointed ${warlords.length} Warlords (${warlords.map(w => w.name).join(', ')}). Exactly one is allowed.`
    });
  }

  // 6. Datasheet Duplication Limits
  const datasheetCounts: Record<string, number> = {};
  const epicHeroSeen = new Set<string>();

  for (const u of units) {
    const name = u.name;
    datasheetCounts[name] = (datasheetCounts[name] || 0) + 1;

    if (u.isEpicHero) {
      if (epicHeroSeen.has(name)) {
        issues.push({
          id: `duplicate-epic-hero-${name}`,
          severity: 'error',
          title: `Duplicate Epic Hero: ${name}`,
          message: `Your army cannot include more than one instance of the Epic Hero '${name}'.`,
          unitInstanceId: u.instanceId
        });
      }
      epicHeroSeen.add(name);
    } else {
      const maxAllowed = (u.isBattleline || u.isDedicatedTransport) ? limits.battlelineLimit : limits.unitLimit;
      if (datasheetCounts[name] > maxAllowed) {
        issues.push({
          id: `unit-limit-${name}`,
          severity: 'error',
          title: `Datasheet Limit Exceeded: ${name}`,
          message: `Included ${datasheetCounts[name]} copies of '${name}', exceeding the ${limits.name} limit of ${maxAllowed}.`,
          unitInstanceId: u.instanceId
        });
      }
    }
  }

  // 7. Support Units Attachment Check (11e rule)
  for (const u of units) {
    if (u.isSupport && !u.attachedToBodyguardId) {
      issues.push({
        id: `unattached-support-${u.instanceId}`,
        severity: 'error',
        title: `Unattached Support Unit: ${u.name}`,
        message: `In 11th Edition, every SUPPORT unit must be attached to an eligible Bodyguard unit.`,
        unitInstanceId: u.instanceId
      });
    }
  }

  // 8. Bodyguard Slot Limits (1 Leader + 1 Support max)
  const bodyguardSlots: Record<string, { leaders: number; supports: number }> = {};
  for (const u of units) {
    if (u.attachedToBodyguardId) {
      const bgId = u.attachedToBodyguardId;
      bodyguardSlots[bgId] = bodyguardSlots[bgId] || { leaders: 0, supports: 0 };
      if (u.isLeader) bodyguardSlots[bgId].leaders += 1;
      if (u.isSupport) bodyguardSlots[bgId].supports += 1;
    }
  }

  for (const [bgId, att] of Object.entries(bodyguardSlots)) {
    const bgUnit = units.find(u => u.instanceId === bgId);
    const bgName = bgUnit ? bgUnit.name : 'Bodyguard unit';
    if (att.leaders > 1) {
      issues.push({
        id: `excess-leaders-${bgId}`,
        severity: 'error',
        title: `Excess Leaders on ${bgName}`,
        message: `'${bgName}' has ${att.leaders} Leader units attached (maximum 1 permitted).`,
        unitInstanceId: bgId
      });
    }
    if (att.supports > 1) {
      issues.push({
        id: `excess-supports-${bgId}`,
        severity: 'error',
        title: `Excess Support Units on ${bgName}`,
        message: `'${bgName}' has ${att.supports} Support units attached (maximum 1 permitted).`,
        unitInstanceId: bgId
      });
    }
  }

  // 9. Enhancements Quota & Uniqueness
  const enhancementCounts: Record<string, number> = {};
  let standardEnhancementCount = 0;

  for (const u of units) {
    if (u.enhancement) {
      const enh = u.enhancement;
      const isUpgrade = !!enh.isUpgrade;

      enhancementCounts[enh.name] = (enhancementCounts[enh.name] || 0) + 1;

      if (!isUpgrade) {
        standardEnhancementCount += 1;
        if (enhancementCounts[enh.name] > 1) {
          issues.push({
            id: `duplicate-enhancement-${enh.name}`,
            severity: 'error',
            title: `Duplicate Enhancement: ${enh.name}`,
            message: `Your army cannot include more than one copy of '${enh.name}'.`,
            unitInstanceId: u.instanceId
          });
        }
        if (u.isEpicHero) {
          issues.push({
            id: `epic-hero-enhancement-${u.name}`,
            severity: 'error',
            title: `Invalid Enhancement on ${u.name}`,
            message: `Epic Heroes cannot be given enhancements.`,
            unitInstanceId: u.instanceId
          });
        }
        if (!u.isCharacter) {
          issues.push({
            id: `non-character-enhancement-${u.name}`,
            severity: 'error',
            title: `Invalid Enhancement on ${u.name}`,
            message: `Only CHARACTER units can take standard enhancements.`,
            unitInstanceId: u.instanceId
          });
        }
      } else {
        if (enhancementCounts[enh.name] === 1) {
          standardEnhancementCount += 1;
        }
        if (enhancementCounts[enh.name] > 3) {
          issues.push({
            id: `excess-upgrades-${enh.name}`,
            severity: 'error',
            title: `Upgrade Limit Exceeded: ${enh.name}`,
            message: `You can include at most 3 copies of '${enh.name}' in your army.`,
            unitInstanceId: u.instanceId
          });
        }
      }
    }
  }

  if (standardEnhancementCount > limits.enhancements) {
    issues.push({
      id: 'enhancement-quota',
      severity: 'error',
      title: 'Enhancement Limit Exceeded',
      message: `Selected ${standardEnhancementCount} enhancements, exceeding the ${limits.name} limit of ${limits.enhancements}.`
    });
  }

  // 10. Attached Unit Enhancement Cap
  for (const u of units) {
    if (u.attachedToBodyguardId && u.enhancement) {
      const bgUnit = units.find(x => x.instanceId === u.attachedToBodyguardId);
      if (bgUnit && bgUnit.enhancement) {
        issues.push({
          id: `attached-unit-multiple-enhancements-${u.instanceId}`,
          severity: 'error',
          title: 'Multiple Enhancements in Attached Unit',
          message: `Both '${u.name}' and '${bgUnit.name}' have an enhancement. An attached unit cannot have more than one enhancement in total.`,
          unitInstanceId: u.instanceId
        });
      }
    }
  }

  // 11. Dedicated Transport Embarkation Check (Warning)
  for (const u of units) {
    if (u.isDedicatedTransport && (!u.embarkedUnitIds || u.embarkedUnitIds.length === 0)) {
      issues.push({
        id: `empty-dedicated-transport-${u.instanceId}`,
        severity: 'warning',
        title: `Empty Dedicated Transport: ${u.name}`,
        message: `'${u.name}' must start the battle with a friendly unit embarked within it, or it will be destroyed.`,
        unitInstanceId: u.instanceId
      });
    }
  }

  return {
    isValid: issues.filter(i => i.severity === 'error').length === 0,
    errorsCount: issues.filter(i => i.severity === 'error').length,
    warningsCount: issues.filter(i => i.severity === 'warning').length,
    totalPoints,
    pointsLimit: limits.points,
    totalDP,
    dpLimit: limits.dp,
    enhancementCount: standardEnhancementCount,
    enhancementLimit: limits.enhancements,
    issues
  };
}
