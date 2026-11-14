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
  const subModelModifiersMap: Record<string, SourcedStatModifier[]> = {};
  const selectedOptionCountSum: Record<string, number> = {};
  const selectedOptionCountMax: Record<string, number> = {};

  const currentModels = (selectedUnit?.modelsCount) || unit.minModels || 1;

  // Count distinct single-model scopes (e.g. Sergeant, or optional specialist models)
  // so `perModel` exclusive groups (e.g. "Aggressors — Weapon Option") scale to the remaining models.
  const activeSingleModelPrefixes = new Set<string>();
  let nonExclusiveSpecialistCount = 0;
  for (const group of wargearGroups) {
    const selIds = getGroupSelectedIds(group.id, group.defaultOptionIds);
    if (selIds.length === 0) continue;
    if (group.isExclusive && !group.perModel) {
      const prefix = group.name.includes(' — ') ? group.name.split(' — ')[0] : group.id;
      activeSingleModelPrefixes.add(prefix);
    } else if (!group.isExclusive) {
      nonExclusiveSpecialistCount += selIds.length;
    }
  }
  const perModelCount = Math.max(1, currentModels - activeSingleModelPrefixes.size - nonExclusiveSpecialistCount);

  for (const group of wargearGroups) {
    const rawSelectedIds = getGroupSelectedIds(group.id, group.defaultOptionIds);
    const isMultiModelUnit = (unit.maxModels || 1) > 1;
    const groupPrefix = group.name.includes(' — ') ? group.name.split(' — ')[0].trim() : '';
    const isSubModelScoped =
      isMultiModelUnit &&
      !group.perModel &&
      Boolean(groupPrefix) &&
      groupPrefix.toLowerCase() !== unit.name.toLowerCase();

    for (const opt of group.options) {
      const optCount = rawSelectedIds.filter((id) => id === opt.id).length;
      const isSelected = optCount > 0;
      if (isSelected && opt.statModifiers) {
        for (const sm of opt.statModifiers) {
          const repeatCount = sm.type === 'increment' ? optCount : 1;
          for (let r = 0; r < repeatCount; r++) {
            const sourced: SourcedStatModifier = {
              mod: sm,
              source: `Wargear: ${opt.name}`,
              sourceType: 'wargear'
            };
            if (isSubModelScoped && sm.target === 'unit') {
              if (!subModelModifiersMap[groupPrefix]) {
                subModelModifiersMap[groupPrefix] = [];
              }
              subModelModifiersMap[groupPrefix].push(sourced);
            } else {
              activeStatModifiers.push(sourced);
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
            abilitySourceMap[p.name] = { label: `Wargear • ${opt.name}`, type: 'wargear' };
          }
          if (p.type === 'ranged' || p.type === 'melee') {
            const effectiveOptCount = group.perModel && optCount > 0 ? perModelCount : optCount;
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
      // Multi-model squad (e.g. 5 Intercessors, 3 Eradicators, 10 Boyz)
      if (isBaseWeapon) {
        // Base squad weapon: default count is currentModels
        // Minus any models that replaced this base weapon in a specialist or sergeant loadout
        let replacements = 0;
        for (const group of wargearGroups) {
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

  const primaryStats = buildProfileStats(unit.stats, activeStatModifiers);
  const { M: modM, T: modT, Sv: modSv, W: modW, Ld: modLd, OC: modOC, InSv: modInSv } = primaryStats;

  const subModelProfiles: ComputedStatProfile[] = [];
  const consumedExtraStatNames = new Set<string>();
  for (const [subName, subMods] of Object.entries(subModelModifiersMap)) {
    const matchingExtra = (unit.extraStats || []).find(
      (es) => (es.name || '').toLowerCase() === subName.toLowerCase()
    );
    const subBase = matchingExtra || unit.stats;
    const combinedMods = [...activeStatModifiers, ...subMods];
    const subStats = buildProfileStats(subBase, combinedMods);
    const differsFromPrimary =
      subStats.M.value !== modM.value ||
      subStats.T.value !== modT.value ||
      subStats.Sv.value !== modSv.value ||
      subStats.W.value !== modW.value ||
      subStats.Ld.value !== modLd.value ||
      subStats.OC.value !== modOC.value ||
      subStats.InSv.value !== modInSv.value;

    if (differsFromPrimary) {
      if (matchingExtra) {
        consumedExtraStatNames.add(subName.toLowerCase());
      }
      subModelProfiles.push({
        name: subName,
        count: 1,
        Base: subBase.Base,
        ...subStats
      });
    }
  }

  const statSignature = (sp: Pick<ComputedStatProfile, 'M' | 'T' | 'Sv' | 'W' | 'Ld' | 'OC' | 'InSv' | 'Base'>) =>
    [sp.M.value, sp.T.value, sp.Sv.value, sp.W.value, sp.Ld.value, sp.OC.value, sp.InSv.value, sp.Base || ''].join('|');

  const primarySignature = statSignature({ ...primaryStats, Base: unit.stats.Base });

  const extraStatProfiles: ComputedStatProfile[] = (unit.extraStats || [])
    .filter((es) => !consumedExtraStatNames.has((es.name || '').toLowerCase()))
    .map((es) => ({
      name: es.name || unit.name,
      Base: es.Base,
      ...buildProfileStats(es, activeStatModifiers)
    }))
    .filter((esProfile) => statSignature(esProfile) !== primarySignature);

  const primaryCount = currentModels - subModelProfiles.length;
  const rawStatProfiles: ComputedStatProfile[] = [
    ...(primaryCount > 0 || subModelProfiles.length === 0
      ? [{
          name: unit.stats.name || unit.name,
          count: Math.max(1, primaryCount),
          Base: unit.stats.Base,
          ...primaryStats
        }]
      : []),
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
