import {
  Datasheet,
  SelectedUnit,
  Enhancement,
  StatModifier,
  WargearOption,
  WeaponProfile,
  Ability
} from '../types/roster';

export interface SourcedStatModifier {
  mod: StatModifier;
  source: string;
  sourceType: 'wargear' | 'enhancement';
}

export interface ComputedStatValue {
  value: string;
  baseValue: string;
  isModified: boolean;
  sources: string[];
}

export interface ComputedStatProfile {
  name: string;
  count?: number;
  Base?: string;
  M: ComputedStatValue;
  T: ComputedStatValue;
  Sv: ComputedStatValue;
  W: ComputedStatValue;
  Ld: ComputedStatValue;
  OC: ComputedStatValue;
  InSv: ComputedStatValue;
}

export interface ComputedWeaponProfile {
  name: string;
  displayName: string;
  range: ComputedStatValue;
  A: ComputedStatValue;
  skill: ComputedStatValue;
  S: ComputedStatValue;
  AP: ComputedStatValue;
  D: ComputedStatValue;
  baseKeywords: string;
  addedKeywords: { kw: string; source: string }[];
  weaponSource?: { label: string; type: 'wargear' | 'enhancement' };
}

export interface ComputedAbility extends Ability {
  sourceInfo?: { label: string; type: 'wargear' | 'enhancement' };
}

/**
 * Checks whether an enhancement equipped by a Leader/Support unit grants
 * rules or stat bonuses to the unit it is leading.
 */
export function doesEnhancementAffectLedUnit(enh?: Enhancement | null): boolean {
  if (!enh) return false;
  const rawDesc = [
    enh.description || '',
    ...(enh.profiles || []).map((p) => p.description || '')
  ].join(' ');
  const desc = rawDesc.replace(/[\*\^]/g, '');
  return /bearer['’]?s\s+unit|leading\s+a|while\s+(?:the\s+bearer|this\s+model)\s+is\s+leading|models\s+in\s+(?:that|this|the\s+bearer['’]?s)\s+unit|\bthis\s+unit\b|bodyguard/i.test(
    desc
  );
}

/**
 * Determines whether a specific StatModifier on a Leader's enhancement applies
 * to the led bodyguard unit (rather than only to the bearer model itself).
 */
export function doesStatModifierApplyToLedUnit(enh: Enhancement, sm: StatModifier): boolean {
  if (!doesEnhancementAffectLedUnit(enh)) return false;
  const rawDesc = [
    enh.description || '',
    ...(enh.profiles || []).map((p) => p.description || '')
  ].join(' ');
  const desc = rawDesc.replace(/[\*\^]/g, '');

  if (sm.target === 'unit') {
    if (sm.stat === 'W') {
      return /wounds\s+characteristic\s+of\s+(?:models\s+in\s+)?(?:that|this|the\s+bearer['’]?s)\s+unit/i.test(
        desc
      );
    }
    if (sm.stat === 'T') {
      if (
        /bearer['’]?s\s+toughness\s+characteristic/i.test(desc) &&
        !/toughness\s+characteristic\s+of\s+models\s+in/i.test(desc)
      ) {
        return false;
      }
    }
    if (sm.stat === 'OC') {
      if (
        /bearer['’]?s\s+objective\s+control\s+characteristic/i.test(desc) &&
        !/objective\s+control\s+characteristic\s+of\s+models\s+in/i.test(desc)
      ) {
        return false;
      }
    }
    if (sm.stat === 'Sv' || sm.stat === 'InSv') {
      if (
        /the\s+bearer\s+has\s+a\s+\d\+\s+(?:invulnerable\s+)?save/i.test(desc) &&
        !/(?:models\s+in\s+(?:that|this|the\s+bearer['’]?s)\s+unit|this\s+unit)\s+(?:has|have)\s+a\s+\d\+/i.test(
          desc
        )
      ) {
        return false;
      }
    }
    return true;
  }

  if (sm.target === 'ranged' || sm.target === 'melee') {
    const mentionsUnitWeapons =
      /weapons\s+equipped\s+by\s+(?:the\s+)?models\s+in\s+(?:that|this|the\s+bearer['’]?s)\s+unit|this\s+unit['’]?s\s+(?:ranged\s+|melee\s+)?(?:weapons|attacks)|models\s+in\s+(?:that|this|the\s+bearer['’]?s)\s+unit\s+have\s+the\s+\[/i.test(
        desc
      );
    const mentionsBearerWeaponsOnly =
      /bearer['’]?s\s+(?:melee\s+|ranged\s+)?weapons|weapons\s+equipped\s+by\s+the\s+bearer|this\s+model['’]?s\s+(?:melee\s+|ranged\s+)?(?:weapons|attacks)/i.test(
        desc
      );
    if (mentionsBearerWeaponsOnly && !mentionsUnitWeapons) {
      return false;
    }
    return mentionsUnitWeapons;
  }

  return false;
}

export function applyStatDelta(rawVal: string, delta: number): string {
  const trimmed = (rawVal || '').trim();
  if (!trimmed || trimmed === '-' || trimmed === '—') return rawVal;

  // Dice notation like D6, 2D6, D3+1
  const diceMatch = trimmed.match(/^(\d*D\d+)(?:([+-])(\d+))?$/i);
  if (diceMatch) {
    const dicePart = diceMatch[1].toUpperCase();
    const existingBonus = diceMatch[2]
      ? (diceMatch[2] === '-' ? -Number(diceMatch[3]) : Number(diceMatch[3]))
      : 0;
    const nextBonus = existingBonus + delta;
    if (nextBonus > 0) return `${dicePart}+${nextBonus}`;
    if (nextBonus < 0) return `${dicePart}${nextBonus}`;
    return dicePart;
  }

  // Number with optional suffix like 6", 3+, -1, 4
  const numMatch = trimmed.match(/^(-?\d+)("|\\+|\+)?$/);
  if (numMatch) {
    const nextNum = Number(numMatch[1]) + delta;
    const suffix = numMatch[2] || '';
    return `${nextNum}${suffix}`;
  }

  return rawVal;
}

export function computeModifiedStat(
  baseVal: string,
  statName: StatModifier['stat'],
  activeMods: SourcedStatModifier[],
  target: StatModifier['target'],
  weaponKeywords?: string
): ComputedStatValue {
  let current = baseVal || '';
  const sources: string[] = [];

  for (const item of activeMods) {
    const { mod, source } = item;
    if (mod.target !== target || mod.stat !== statName) continue;
    if (mod.requiredWeaponKeyword) {
      const kwLower = (weaponKeywords || '').toLowerCase();
      if (!kwLower.includes(mod.requiredWeaponKeyword.toLowerCase())) continue;
    }

    if (mod.type === 'set') {
      current = String(mod.value);
      if (!sources.includes(source)) sources.push(source);
    } else if (mod.type === 'increment' || mod.type === 'decrement') {
      const numVal = Number(mod.value || 0);
      if (!isNaN(numVal) && numVal !== 0) {
        const delta = mod.type === 'increment' ? numVal : -numVal;
        current = applyStatDelta(current, delta);
        if (!sources.includes(source)) sources.push(source);
      }
    }
  }

  const isModified =
    sources.length > 0 &&
    (current !== (baseVal || '') ||
      activeMods.some(
        (m) => m.mod.target === target && m.mod.stat === statName && m.mod.type === 'set'
      ));
  return {
    value: current,
    baseValue: baseVal || '',
    isModified,
    sources
  };
}

export function computeUnitEquippedData(
  unit: Datasheet,
  selectedUnit?: SelectedUnit | null,
  previewSelectedOptions?: Record<string, string[]>,
  allUnitsInRoster: SelectedUnit[] = []
) {
  const wargearGroups = unit.wargearGroups || [];

  const getGroupSelectedIds = (groupId: string, defaultIds: string[]): string[] => {
    if (selectedUnit?.selectedOptions && selectedUnit.selectedOptions[groupId] !== undefined) {
      return selectedUnit.selectedOptions[groupId];
    }
    if (!selectedUnit && previewSelectedOptions && previewSelectedOptions[groupId] !== undefined) {
      return previewSelectedOptions[groupId];
    }
    return defaultIds || [];
  };

  const baseProfileSet = new Set(unit.baseProfileNames || []);
  const selectedProfileSet = new Set<string>();
  const unselectedProfileSet = new Set<string>();
  const selectedOptionProfiles: {
    profile: NonNullable<WargearOption['profiles']>[number];
    source: string;
    sourceType: 'wargear' | 'enhancement';
  }[] = [];
  const abilitySourceMap: Record<string, { label: string; type: 'wargear' | 'enhancement' }> = {};
  const weaponSourceMap: Record<string, { label: string; type: 'wargear' | 'enhancement' }> = {};
  const activeStatModifiers: SourcedStatModifier[] = [];
  const modelGroupPrefixes = new Map<string, { displayName: string; perModel: boolean }>();
  const modelPrefixModifiersMap: Record<string, SourcedStatModifier[]> = {};
  const squadOptionStatBatches: { name: string; count: number; mods: SourcedStatModifier[] }[] = [];
  const selectedOptionCountSum: Record<string, number> = {};
  const selectedOptionCountMax: Record<string, number> = {};

  const currentModels = Math.max(unit.minModels || 1, selectedUnit?.modelsCount || unit.minModels || 1);

  const getGroupRequiredCount = (group: typeof wargearGroups[number]): number => {
    if (!group.requiresOption) return 1;
    const reqGroup = wargearGroups.find((wg) => wg.id === group.requiresOption!.groupId);
    if (!reqGroup) return 0;
    const reqSelIds = getGroupSelectedIds(reqGroup.id, reqGroup.defaultOptionIds);
    return reqSelIds.filter((id) => id === group.requiresOption!.optionId).length;
  };

  // Count distinct single-model scopes (e.g. Sergeant, or optional specialist models)
  // so `perModel` exclusive groups (e.g. "Aggressors — Weapon Option") scale to the remaining models.
  const activeSingleModelPrefixes = new Set<string>();
  let nonExclusiveSpecialistCount = 0;
  for (const group of wargearGroups) {
    if (getGroupRequiredCount(group) === 0) continue;
    const selIds = getGroupSelectedIds(group.id, group.defaultOptionIds);
    if (selIds.length === 0) continue;
    if (!group.perModel && group.name.includes(' — ') && !group.id.endsWith('-squad-options') && !group.requiresOption) {
      const prefix = group.name.split(' — ')[0].trim();
      if (prefix.toLowerCase() !== unit.name.toLowerCase()) {
        activeSingleModelPrefixes.add(prefix);
      }
    } else if (!group.isExclusive && group.id.endsWith('-squad-options')) {
      nonExclusiveSpecialistCount += selIds.length;
    }
  }
  const perModelCount = Math.max(1, currentModels - activeSingleModelPrefixes.size - nonExclusiveSpecialistCount);
  const squadLoadoutWeaponKeys = new Set<string>();

  for (const group of wargearGroups) {
    const requiredCount = getGroupRequiredCount(group);
    if (requiredCount === 0) {
      for (const opt of group.options) {
        for (const p of opt.profiles || []) {
          unselectedProfileSet.add(p.name);
        }
      }
      continue;
    }

    const rawSelectedIds = getGroupSelectedIds(group.id, group.defaultOptionIds);
    const isMultiModelUnit = (unit.maxModels || 1) > 1;
    const groupPrefix = group.name.includes(' — ') ? group.name.split(' — ')[0].trim() : '';
    const groupPrefixKey = groupPrefix.toLowerCase();
    const isSquadOptionsGroup = group.id.endsWith('-squad-options');
    const isModelScoped =
      isMultiModelUnit &&
      Boolean(groupPrefix) &&
      groupPrefixKey !== unit.name.toLowerCase();
    const isSubModelScoped = isModelScoped && !group.perModel;

    if (isSquadOptionsGroup && group.min >= 1) {
      for (const opt of group.options) {
        for (const p of opt.profiles || []) {
          if (p.type === 'ranged' || p.type === 'melee') {
            squadLoadoutWeaponKeys.add(`${p.type}:${p.name}`);
            squadLoadoutWeaponKeys.add(p.name);
          }
        }
      }
    }

    if (isModelScoped && !isSquadOptionsGroup && !group.requiresOption) {
      const existingPrefix = modelGroupPrefixes.get(groupPrefixKey);
      modelGroupPrefixes.set(groupPrefixKey, {
        displayName: existingPrefix?.displayName || groupPrefix,
        perModel: Boolean(existingPrefix?.perModel || group.perModel)
      });
    }

    for (const opt of group.options) {
      const optCount = rawSelectedIds.filter((id) => id === opt.id).length;
      const isSelected = optCount > 0;
      if (isSelected && opt.statModifiers) {
        if (isModelScoped && isSquadOptionsGroup) {
          const unitModsForOpt: SourcedStatModifier[] = [];
          for (const sm of opt.statModifiers) {
            const sourced: SourcedStatModifier = {
              mod: sm,
              source: `Wargear: ${opt.name}`,
              sourceType: 'wargear'
            };
            if (sm.target === 'unit') {
              unitModsForOpt.push(sourced);
            } else {
              activeStatModifiers.push(sourced);
            }
          }
          if (unitModsForOpt.length > 0) {
            squadOptionStatBatches.push({
              name: opt.name,
              count: optCount,
              mods: unitModsForOpt
            });
          }
        } else {
          for (const sm of opt.statModifiers) {
            const repeatCount = sm.type === 'increment' ? optCount : 1;
            for (let r = 0; r < repeatCount; r++) {
              const sourced: SourcedStatModifier = {
                mod: sm,
                source: `Wargear: ${opt.name}`,
                sourceType: 'wargear'
              };
              if (isModelScoped && sm.target === 'unit') {
                if (!modelPrefixModifiersMap[groupPrefixKey]) {
                  modelPrefixModifiersMap[groupPrefixKey] = [];
                }
                modelPrefixModifiersMap[groupPrefixKey].push(sourced);
              } else {
                activeStatModifiers.push(sourced);
              }
            }
          }
        }
      }
      for (const p of opt.profiles || []) {
        if (isSelected) {
          selectedProfileSet.add(p.name);
          selectedOptionProfiles.push({
            profile: p,
            source: `Wargear: ${opt.name}`,
            sourceType: 'wargear'
          });
          if (p.type === 'ability' && !baseProfileSet.has(p.name)) {
            const existing = abilitySourceMap[p.name];
            if (isSubModelScoped) {
              const prevModels = existing?.label.includes('(') && existing.label.endsWith(')')
                ? existing.label.slice(existing.label.lastIndexOf('(') + 1, -1).split(', ')
                : [];
              const models = prevModels.includes(groupPrefix) ? prevModels : [...prevModels, groupPrefix];
              abilitySourceMap[p.name] = {
                label: `Wargear • ${opt.name} (${models.join(', ')})`,
                type: 'wargear'
              };
            } else if (!existing) {
              abilitySourceMap[p.name] = { label: `Wargear • ${opt.name}`, type: 'wargear' };
            }
          }
          if (p.type === 'ranged' || p.type === 'melee') {
            const effectiveOptCount = group.requiresOption
              ? optCount * requiredCount
              : (group.perModel ? optCount * perModelCount : optCount);
            const c = (p.count || 1) * effectiveOptCount;
            const typedKey = `${p.type}:${p.name}`;
            selectedOptionCountSum[typedKey] = (selectedOptionCountSum[typedKey] || 0) + c;
            selectedOptionCountMax[typedKey] = Math.max(selectedOptionCountMax[typedKey] || 0, c);
            selectedOptionCountSum[p.name] = (selectedOptionCountSum[p.name] || 0) + c;
            selectedOptionCountMax[p.name] = Math.max(selectedOptionCountMax[p.name] || 0, c);
          }
        } else {
          unselectedProfileSet.add(p.name);
        }
      }
    }
  }

  // 1. Include direct equipped enhancement profiles and stat modifiers on this unit
  const activeEnhancement = selectedUnit?.enhancement;
  if (activeEnhancement) {
    if (activeEnhancement.statModifiers) {
      for (const sm of activeEnhancement.statModifiers) {
        activeStatModifiers.push({
          mod: sm,
          source: `Enhancement: ${activeEnhancement.name}`,
          sourceType: 'enhancement'
        });
      }
    }
    if (activeEnhancement.profiles && activeEnhancement.profiles.length > 0) {
      for (const p of activeEnhancement.profiles) {
        selectedProfileSet.add(p.name);
        selectedOptionProfiles.push({
          profile: p,
          source: `Enhancement: ${activeEnhancement.name}`,
          sourceType: 'enhancement'
        });
        if (p.type === 'ability') {
          abilitySourceMap[p.name] = {
            label: `Enhancement • ${activeEnhancement.name}`,
            type: 'enhancement'
          };
        } else {
          weaponSourceMap[p.name] = {
            label: `Enhancement • ${activeEnhancement.name}`,
            type: 'enhancement'
          };
        }
      }
    } else if (activeEnhancement.description) {
      selectedProfileSet.add(activeEnhancement.name);
      selectedOptionProfiles.push({
        profile: {
          name: activeEnhancement.name,
          type: 'ability',
          description: activeEnhancement.description
        },
        source: `Enhancement: ${activeEnhancement.name}`,
        sourceType: 'enhancement'
      });
      abilitySourceMap[activeEnhancement.name] = {
        label: `Enhancement • ${activeEnhancement.name}`,
        type: 'enhancement'
      };
    }
  }

  // 2. Include unit-affecting enhancements from attached Leader / Support units
  const inheritedLeaderEnhancements: { enhancement: Enhancement; leaderName: string }[] = [];
  if (selectedUnit && allUnitsInRoster.length > 0) {
    const attachedCharacters = [
      selectedUnit.attachedLeaderId
        ? allUnitsInRoster.find((u) => u.instanceId === selectedUnit.attachedLeaderId)
        : undefined,
      selectedUnit.attachedSupportId
        ? allUnitsInRoster.find((u) => u.instanceId === selectedUnit.attachedSupportId)
        : undefined
    ].filter((u): u is SelectedUnit => Boolean(u && u.enhancement));

    for (const charUnit of attachedCharacters) {
      const leaderEnh = charUnit.enhancement!;
      if (!doesEnhancementAffectLedUnit(leaderEnh)) continue;

      inheritedLeaderEnhancements.push({
        enhancement: leaderEnh,
        leaderName: charUnit.name
      });

      const sourceLabel = `Leader (${charUnit.name}) • ${leaderEnh.name}`;

      if (leaderEnh.statModifiers) {
        for (const sm of leaderEnh.statModifiers) {
          if (doesStatModifierApplyToLedUnit(leaderEnh, sm)) {
            activeStatModifiers.push({
              mod: sm,
              source: sourceLabel,
              sourceType: 'enhancement'
            });
          }
        }
      }

      const abilityProfiles = (leaderEnh.profiles || []).filter((p) => p.type === 'ability');
      if (abilityProfiles.length > 0) {
        for (const p of abilityProfiles) {
          selectedProfileSet.add(p.name);
          selectedOptionProfiles.push({
            profile: p,
            source: sourceLabel,
            sourceType: 'enhancement'
          });
          abilitySourceMap[p.name] = {
            label: sourceLabel,
            type: 'enhancement'
          };
        }
      } else if (leaderEnh.description) {
        selectedProfileSet.add(leaderEnh.name);
        selectedOptionProfiles.push({
          profile: {
            name: leaderEnh.name,
            type: 'ability',
            description: leaderEnh.description
          },
          source: sourceLabel,
          sourceType: 'enhancement'
        });
        abilitySourceMap[leaderEnh.name] = {
          label: sourceLabel,
          type: 'enhancement'
        };
      }
    }
  }

  const getEquippedWeaponDisplayName = (weaponName: string, weaponType?: 'ranged' | 'melee'): string => {
    if (/^\d+x\s/i.test(weaponName)) return weaponName;
    const typedKey = weaponType ? `${weaponType}:${weaponName}` : null;

    const optSum = (typedKey && selectedOptionCountSum[typedKey] !== undefined)
      ? selectedOptionCountSum[typedKey]
      : (selectedOptionCountSum[weaponName] || 0);

    const isBaseWeapon = baseProfileSet.has(weaponName) ||
      Boolean(unit.baseProfileNames && unit.baseProfileNames.some(p => p.toLowerCase() === weaponName.toLowerCase()));

    let totalCount = 1;

    if (currentModels <= 1) {
      // Single model unit (e.g. Character, Vehicle)
      const baseCount = (typedKey && unit.baseWeaponCounts?.[typedKey] !== undefined)
        ? unit.baseWeaponCounts[typedKey]
        : (unit.baseWeaponCounts?.[weaponName] || 1);
      totalCount = optSum > 0 ? optSum : baseCount;
    } else {
      // Multi-model squad (e.g. 5 Intercessors, 3 Eradicators, 10 Boyz, 5 Terminators)
      if (isBaseWeapon && ((typedKey && squadLoadoutWeaponKeys.has(typedKey)) || squadLoadoutWeaponKeys.has(weaponName))) {
        // Explicit squad loadout group defines each non-leader model's carried weapons
        // (e.g. Terminator w/ Power Fist carries Storm bolter, Terminator w/ Heavy Weapon does not).
        const mandatoryBaseCount = (typedKey && unit.baseWeaponCounts?.[typedKey] !== undefined)
          ? unit.baseWeaponCounts[typedKey]
          : (unit.baseWeaponCounts?.[weaponName] || 0);
        let exclusiveReplacements = 0;
        for (const group of wargearGroups) {
          if (getGroupRequiredCount(group) === 0 || !group.isExclusive) continue;
          const selIds = getGroupSelectedIds(group.id, group.defaultOptionIds);
          const defaultOpts = group.options.filter(o => (group.defaultOptionIds || []).includes(o.id));
          const defaultHadThisWeapon = defaultOpts.some(o =>
            o.profiles?.some(p => p.name.toLowerCase() === weaponName.toLowerCase())
          );
          const currentlyHasThisWeapon = selIds.some(id => {
            const opt = group.options.find(o => o.id === id);
            return opt?.profiles?.some(p => p.name.toLowerCase() === weaponName.toLowerCase());
          });
          if (defaultHadThisWeapon && !currentlyHasThisWeapon) {
            exclusiveReplacements += 1;
          }
        }
        totalCount = Math.max(0, mandatoryBaseCount - exclusiveReplacements + optSum);
      } else if (isBaseWeapon) {
        // Base squad weapon: default count is currentModels
        // Minus any models that replaced this base weapon in a specialist or sergeant loadout
        let replacements = 0;
        for (const group of wargearGroups) {
          if (getGroupRequiredCount(group) === 0) continue;
          const selIds = getGroupSelectedIds(group.id, group.defaultOptionIds);

          if (group.isExclusive) {
            // Check if this exclusive group's default option originally provided this weapon
            const defaultOpts = group.options.filter(o => (group.defaultOptionIds || []).includes(o.id));
            const defaultHadThisWeapon = defaultOpts.some(o =>
              o.profiles?.some(p => p.name.toLowerCase() === weaponName.toLowerCase())
            );
            const currentlyHasThisWeapon = selIds.some(id => {
              const opt = group.options.find(o => o.id === id);
              return opt?.profiles?.some(p => p.name.toLowerCase() === weaponName.toLowerCase());
            });
            if (defaultHadThisWeapon && !currentlyHasThisWeapon) {
              replacements += 1;
            }
          } else {
            // Squad specialist options (e.g. Eradicator with Multi-melta)
            for (const opt of group.options) {
              const c = selIds.filter(id => id === opt.id).length;
              if (c > 0) {
                // If option adds a weapon of the same type and is NOT an auxiliary weapon (like grenade launcher)
                const isAuxiliary = opt.profiles?.some(p => p.name.toLowerCase().includes('grenade'));
                const replacesThisType = opt.profiles?.some(p => p.type === weaponType);
                if (replacesThisType && !isAuxiliary) {
                  // Only replace if this base weapon is the squad's primary weapon of that type
                  // (i.e. not sidearm pistol unless squad has only pistols)
                  const isSidearmPistol = weaponName.toLowerCase().includes('pistol') && !opt.name.toLowerCase().includes('pistol');
                  if (!isSidearmPistol) {
                    replacements += c;
                  }
                }
              }
            }
          }
        }
        totalCount = Math.max(1, currentModels - replacements);
      } else {
        totalCount = Math.max(1, optSum);
      }
    }

    return totalCount > 1 ? `${totalCount}x ${weaponName}` : weaponName;
  };

  const isProfileEquipped = (name: string): boolean => {
    if (wargearGroups.length === 0) return true;
    return selectedProfileSet.has(name) || baseProfileSet.has(name) || !unselectedProfileSet.has(name);
  };

  const equippedRangedRaw: WeaponProfile[] = [
    ...unit.rangedWeapons.filter((w) => isProfileEquipped(w.name))
  ];
  const equippedMeleeRaw: WeaponProfile[] = [
    ...unit.meleeWeapons.filter((w) => isProfileEquipped(w.name))
  ];
  const equippedAbilitiesRaw: Ability[] = [
    ...unit.abilities.filter((a) => isProfileEquipped(a.name))
  ];

  for (const { profile: p } of selectedOptionProfiles) {
    if (p.type === 'ranged' && !equippedRangedRaw.some((w) => w.name === p.name)) {
      equippedRangedRaw.push({
        name: p.name,
        range: p.range || '24"',
        A: p.A || '1',
        BS: p.BS || '3+',
        S: p.S || '4',
        AP: p.AP || '0',
        D: p.D || '1',
        keywords: p.keywords || ''
      });
    } else if (p.type === 'melee' && !equippedMeleeRaw.some((w) => w.name === p.name)) {
      equippedMeleeRaw.push({
        name: p.name,
        range: 'Melee',
        A: p.A || '1',
        WS: p.WS || '3+',
        S: p.S || '4',
        AP: p.AP || '0',
        D: p.D || '1',
        keywords: p.keywords || ''
      });
    } else if (p.type === 'ability' && p.description && !equippedAbilitiesRaw.some((a) => a.name === p.name)) {
      equippedAbilitiesRaw.push({
        name: p.name,
        description: p.description
      });
    }
  }

  const buildProfileStats = (base: typeof unit.stats, mods: SourcedStatModifier[]) => ({
    M: computeModifiedStat(base.M, 'M', mods, 'unit'),
    T: computeModifiedStat(base.T, 'T', mods, 'unit'),
    Sv: computeModifiedStat(base.Sv, 'Sv', mods, 'unit'),
    W: computeModifiedStat(base.W, 'W', mods, 'unit'),
    Ld: computeModifiedStat(base.Ld, 'Ld', mods, 'unit'),
    OC: computeModifiedStat(base.OC, 'OC', mods, 'unit'),
    InSv: computeModifiedStat(base.InSv, 'InSv', mods, 'unit')
  });

  const statSignature = (sp: Pick<ComputedStatProfile, 'M' | 'T' | 'Sv' | 'W' | 'Ld' | 'OC' | 'InSv' | 'Base'>) =>
    [sp.M.value, sp.T.value, sp.Sv.value, sp.W.value, sp.Ld.value, sp.OC.value, sp.InSv.value, sp.Base || ''].join('|');

  const primaryKey = (unit.stats.name || unit.name).toLowerCase();
  const primaryMods = [
    ...activeStatModifiers,
    ...(modelPrefixModifiersMap[primaryKey] || [])
  ];
  const primaryStats = buildProfileStats(unit.stats, primaryMods);
  const { M: modM, T: modT, Sv: modSv, W: modW, Ld: modLd, OC: modOC, InSv: modInSv } = primaryStats;
  const primarySignature = statSignature({ ...primaryStats, Base: unit.stats.Base });

  const extraStatsList = unit.extraStats || [];
  const isPrimarySingleLeader =
    currentModels > 1 &&
    extraStatsList.length > 0 &&
    !modelGroupPrefixes.get(primaryKey)?.perModel &&
    modelGroupPrefixes.has(primaryKey) &&
    extraStatsList.some((es) => {
      const esKey = (es.name || '').toLowerCase();
      return esKey === unit.name.toLowerCase() || Boolean(modelGroupPrefixes.get(esKey)?.perModel);
    });

  const handledKeys = new Set<string>([primaryKey]);
  const squadOptionProfiles: ComputedStatProfile[] = [];
  for (const batch of squadOptionStatBatches) {
    const batchStats = buildProfileStats(unit.stats, [...activeStatModifiers, ...batch.mods]);
    if (statSignature({ ...batchStats, Base: unit.stats.Base }) !== primarySignature) {
      squadOptionProfiles.push({
        name: batch.name,
        count: batch.count,
        Base: unit.stats.Base,
        ...batchStats
      });
    }
  }

  const extraStatProfiles: ComputedStatProfile[] = extraStatsList.map((es) => {
    const esKey = (es.name || unit.name).toLowerCase();
    handledKeys.add(esKey);
    const esMods = [
      ...activeStatModifiers,
      ...(modelPrefixModifiersMap[esKey] || [])
    ];
    return {
      name: es.name || unit.name,
      count: 1,
      Base: es.Base,
      ...buildProfileStats(es, esMods)
    };
  });

  const subModelProfiles: ComputedStatProfile[] = [];
  for (const [prefixKey, info] of modelGroupPrefixes.entries()) {
    if (handledKeys.has(prefixKey)) continue;
    handledKeys.add(prefixKey);
    const subMods = [
      ...activeStatModifiers,
      ...(modelPrefixModifiersMap[prefixKey] || [])
    ];
    const subStats = buildProfileStats(unit.stats, subMods);
    if (statSignature({ ...subStats, Base: unit.stats.Base }) !== primarySignature) {
      subModelProfiles.push({
        name: info.displayName,
        count: 1,
        Base: unit.stats.Base,
        ...subStats
      });
    }
  }

  const squadOptionAssignedCount = squadOptionProfiles.reduce((acc, p) => acc + (p.count || 1), 0);
  const nonExtraOtherCount = subModelProfiles.length + squadOptionAssignedCount;

  if (isPrimarySingleLeader && extraStatProfiles.length > 0) {
    const bulkIdx = extraStatProfiles.findIndex((ep) => {
      const k = ep.name.toLowerCase();
      return k === unit.name.toLowerCase() || Boolean(modelGroupPrefixes.get(k)?.perModel);
    });
    const targetIdx = bulkIdx >= 0 ? bulkIdx : 0;
    const bulkCount = Math.max(1, currentModels - 1 - nonExtraOtherCount - (extraStatProfiles.length - 1));
    extraStatProfiles[targetIdx] = { ...extraStatProfiles[targetIdx], count: bulkCount };
  }

  const primaryCount = isPrimarySingleLeader
    ? 1
    : currentModels - nonExtraOtherCount - extraStatProfiles.length;

  const hasOtherProfiles = subModelProfiles.length > 0 || squadOptionProfiles.length > 0 || extraStatProfiles.length > 0;
  const rawStatProfiles: ComputedStatProfile[] = [
    ...(primaryCount > 0 || !hasOtherProfiles
      ? [{
          name: unit.stats.name || unit.name,
          count: Math.max(1, primaryCount),
          Base: unit.stats.Base,
          ...primaryStats
        }]
      : []),
    ...squadOptionProfiles,
    ...subModelProfiles,
    ...extraStatProfiles
  ];

  // Group any profiles with identical modified stats into a single combined profile row
  const statProfiles: ComputedStatProfile[] = [];
  const profileBySig = new Map<string, ComputedStatProfile>();
  for (const sp of rawStatProfiles) {
    const sig = statSignature(sp);
    const existing = profileBySig.get(sig);
    if (existing) {
      if (existing.count !== undefined && sp.count !== undefined) {
        existing.count += sp.count;
      }
      const existingNames = existing.name.split(' / ');
      if (!existingNames.includes(sp.name)) {
        existing.name = `${existing.name} / ${sp.name}`;
      }
    } else {
      const copy = { ...sp };
      profileBySig.set(sig, copy);
      statProfiles.push(copy);
    }
  }

  const computedRangedWeapons: ComputedWeaponProfile[] = equippedRangedRaw.map((w) => ({
    name: w.name,
    displayName: getEquippedWeaponDisplayName(w.name, 'ranged'),
    range: computeModifiedStat(w.range, 'range', activeStatModifiers, 'ranged', w.keywords),
    A: computeModifiedStat(w.A, 'A', activeStatModifiers, 'ranged', w.keywords),
    skill: computeModifiedStat(w.BS || '3+', 'BS', activeStatModifiers, 'ranged', w.keywords),
    S: computeModifiedStat(w.S, 'S', activeStatModifiers, 'ranged', w.keywords),
    AP: computeModifiedStat(w.AP, 'AP', activeStatModifiers, 'ranged', w.keywords),
    D: computeModifiedStat(w.D, 'D', activeStatModifiers, 'ranged', w.keywords),
    baseKeywords: w.keywords,
    addedKeywords: activeStatModifiers
      .filter((m) => m.mod.target === 'ranged' && m.mod.stat === 'keywords' && m.mod.type === 'append')
      .map((m) => ({ kw: String(m.mod.value), source: m.source })),
    weaponSource: weaponSourceMap[w.name]
  }));

  const computedMeleeWeapons: ComputedWeaponProfile[] = equippedMeleeRaw.map((w) => ({
    name: w.name,
    displayName: getEquippedWeaponDisplayName(w.name, 'melee'),
    range: { value: 'Melee', baseValue: 'Melee', isModified: false, sources: [] },
    A: computeModifiedStat(w.A, 'A', activeStatModifiers, 'melee', w.keywords),
    skill: computeModifiedStat(w.WS || '3+', 'WS', activeStatModifiers, 'melee', w.keywords),
    S: computeModifiedStat(w.S, 'S', activeStatModifiers, 'melee', w.keywords),
    AP: computeModifiedStat(w.AP, 'AP', activeStatModifiers, 'melee', w.keywords),
    D: computeModifiedStat(w.D, 'D', activeStatModifiers, 'melee', w.keywords),
    baseKeywords: w.keywords,
    addedKeywords: activeStatModifiers
      .filter((m) => m.mod.target === 'melee' && m.mod.stat === 'keywords' && m.mod.type === 'append')
      .map((m) => ({ kw: String(m.mod.value), source: m.source })),
    weaponSource: weaponSourceMap[w.name]
  }));

  const ARMY_RULE_NAMES = new Set([
    'for the greater good',
    'combat doctrines',
    'oath of moment',
    'reanimation protocols',
    'waaagh!',
    'synapse',
    'shadow in the warp',
    'dark pacts',
    'acts of faith',
    'blessings of khorne',
    "nurgle's gift",
    'cult ambush',
    'power from pain',
    'strands of fate',
    'battle focus',
    "martial ka'tah",
    'cabal of sorcerers',
    'voice of command',
    'prioritised efficiency',
    'harbingers of dread',
    'super-heavy walker',
    'code chivalric',
    'thrill seekers',
    'gate of infinity',
    'teleport assault',
    'doctrina imperatives',
    'assigned agents'
  ]);

  equippedAbilitiesRaw.sort((a, b) => {
    const aIsArmy = ARMY_RULE_NAMES.has(a.name.toLowerCase()) && !abilitySourceMap[a.name];
    const bIsArmy = ARMY_RULE_NAMES.has(b.name.toLowerCase()) && !abilitySourceMap[b.name];
    if (aIsArmy === bIsArmy) return 0;
    return aIsArmy ? 1 : -1;
  });

  const computedAbilities: ComputedAbility[] = equippedAbilitiesRaw.map((ab) => ({
    ...ab,
    sourceInfo: abilitySourceMap[ab.name]
  }));

  return {
    getGroupSelectedIds,
    getEquippedWeaponDisplayName,
    activeStatModifiers,
    inheritedLeaderEnhancements,
    abilitySourceMap,
    weaponSourceMap,
    equippedRangedWeapons: equippedRangedRaw,
    equippedMeleeWeapons: equippedMeleeRaw,
    equippedAbilities: equippedAbilitiesRaw,
    computedRangedWeapons,
    computedMeleeWeapons,
    computedAbilities,
    statProfiles,
    modM,
    modT,
    modSv,
    modW,
    modLd,
    modOC,
    modInSv
  };
}
