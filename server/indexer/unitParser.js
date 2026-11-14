function createUnitParser({
  allEntriesById,
  getCharacteristics,
  extractProfiles,
  extractWargearGroups,
  extractBaseProfileNames
}) {
  // Memoize parsed units by entry ID so shared library units (Space Marines, Agents, Knights, Daemons)
  // are only parsed once and shallow-cloned for per-faction mutations (isAllied, primaryCategory, canBeLed).
  const parsedUnitsCache = new Map();

  function parseUnit(entry) {
    if (entry.id && parsedUnitsCache.has(entry.id)) {
      return { ...parsedUnitsCache.get(entry.id) };
    }

    const costs = entry.costs || [];
    const ptsCost = costs.find(c => c.name === 'pts');
    let baseCost = ptsCost ? Number(ptsCost.value) || 0 : 0;

    // Categories
    const categoryLinks = entry.categoryLinks || [];
    const categories = categoryLinks.map(c => c.name);
    const primaryCatLink = categoryLinks.find(c => c.primary);
    let primaryCategory = primaryCatLink ? primaryCatLink.name : 'Infantry';

    // Specific role overrides
    const isEpicHero = categories.some(c => c.toLowerCase() === 'epic hero');
    const isCharacter = categories.some(c => c.toLowerCase() === 'character');
    const isBattleline = categories.some(c => c.toLowerCase() === 'battleline');
    const isDedicatedTransport = categories.some(c => c.toLowerCase() === 'dedicated transport');
    const isLeader = categories.some(c => c.toLowerCase() === 'leader');
    const isSupport = categories.some(c => c.toLowerCase() === 'support');

    if (isEpicHero) primaryCategory = 'Epic Hero';
    else if (isCharacter) primaryCategory = 'Character';
    else if (isBattleline) primaryCategory = 'Battleline';
    else if (isDedicatedTransport) primaryCategory = 'Dedicated Transport';

    // Gather all profiles (from entry and models)
    const allProfiles = extractProfiles(entry);

    // Unit stat profiles (primary + any additional distinct model stat profiles)
    const unitProfiles = allProfiles.filter(p => p.typeName === 'Unit');
    const mapUnitProfile = (up) => {
      const chars = getCharacteristics(up);
      return {
        name: up.name || entry.name,
        M: chars['M'] || chars['Movement'] || '-',
        T: chars['T'] || chars['Toughness'] || '-',
        Sv: chars['Sv'] || chars['Save'] || '-',
        InSv: chars['InSv'] || chars['Invulnerable Save'] || '',
        W: chars['W'] || chars['Wounds'] || '-',
        Ld: chars['LD'] || chars['Ld'] || chars['Leadership'] || '-',
        OC: chars['OC'] || chars['Objective Control'] || '-',
        Base: chars['Base'] || ''
      };
    };

    const unitProfile = unitProfiles[0];
    let stats = null;
    const extraStats = [];
    if (unitProfile) {
      stats = mapUnitProfile(unitProfile);
      const seenStatNames = new Set([(stats.name || '').toLowerCase()]);
      for (let i = 1; i < unitProfiles.length; i++) {
        const mapped = mapUnitProfile(unitProfiles[i]);
        const key = (mapped.name || '').toLowerCase();
        if (!seenStatNames.has(key)) {
          seenStatNames.add(key);
          extraStats.push(mapped);
        }
      }
    } else {
      stats = {
        name: entry.name,
        M: '6"', T: '4', Sv: '3+', InSv: '', W: '2', Ld: '6+', OC: '1', Base: '32mm'
      };
    }

    // Weapons
    const rangedWeapons = [];
    const meleeWeapons = [];
    const seenRangedWeapons = new Set();
    const seenMeleeWeapons = new Set();

    for (const p of allProfiles) {
      if (p.typeName === 'Ranged Weapons' || p.typeName === 'Ranged Weapon') {
        if (!seenRangedWeapons.has(p.name)) {
          seenRangedWeapons.add(p.name);
          const c = getCharacteristics(p);
          rangedWeapons.push({
            name: p.name,
            range: c['Range'] || '24"',
            A: c['A'] || c['Attacks'] || '1',
            BS: c['BS'] || c['Ballistic Skill'] || '3+',
            S: c['S'] || c['Strength'] || '4',
            AP: c['AP'] || c['Armour Penetration'] || '0',
            D: c['D'] || c['Damage'] || '1',
            keywords: c['Keywords'] || ''
          });
        }
      } else if (p.typeName === 'Melee Weapons' || p.typeName === 'Melee Weapon') {
        if (!seenMeleeWeapons.has(p.name)) {
          seenMeleeWeapons.add(p.name);
          const c = getCharacteristics(p);
          meleeWeapons.push({
            name: p.name,
            range: 'Melee',
            A: c['A'] || c['Attacks'] || '1',
            WS: c['WS'] || c['Weapon Skill'] || '3+',
            S: c['S'] || c['Strength'] || '4',
            AP: c['AP'] || c['Armour Penetration'] || '0',
            D: c['D'] || c['Damage'] || '1',
            keywords: c['Keywords'] || ''
          });
        }
      }
    }

    // Abilities
    const abilities = [];
    const seenAbilities = new Set();
    const canLead = [];
    let hasLeaderAbility = false;
    let hasSupportAbility = false;

    for (const p of allProfiles) {
      if (p.typeName === 'Abilities') {
        if (!seenAbilities.has(p.name)) {
          seenAbilities.add(p.name);
          const c = getCharacteristics(p);
          const desc = c['Description'] || '';
          abilities.push({
            name: p.name,
            description: desc
          });

          const lowerAbName = p.name.toLowerCase();
          if (lowerAbName === 'leader' || lowerAbName === 'support') {
            if (lowerAbName === 'leader') hasLeaderAbility = true;
            if (lowerAbName === 'support') hasSupportAbility = true;

            // Extract bodyguard units
            const match = desc.match(/attached to the following units?:\s*([^\.]+)/i);
            if (match && match[1]) {
              const parsedTargets = match[1]
                .split(/,|\n|■|▪|•/)
                .map(s => s.trim().replace(/^[\*\^■▪•\s]+|[\*\^■▪•\s]+$/g, ''))
                .filter(s => s.length > 0 && !s.toLowerCase().startsWith('this model') && !s.toLowerCase().startsWith('you can attach'));
              for (const pt of parsedTargets) {
                if (!canLead.includes(pt)) canLead.push(pt);
              }
            }
          }
        }
      }
    }

    const effectiveIsLeader = isLeader || hasLeaderAbility;
    const effectiveIsSupport = isSupport || hasSupportAbility;

    // Model counts and point tiers
    let minModels = 1;
    let maxModels = 1;
    let perModelCost = 0;

    const inspectModelCost = (mNode) => {
      if (!mNode) return;
      const res = mNode.targetId ? (allEntriesById.get(mNode.targetId) || mNode) : mNode;
      const mCosts = [...(mNode.costs || []), ...((res && res.costs) || [])];
      const mPts = mCosts.find(c => c.name === 'pts');
      if (mPts && Number(mPts.value) > 0 && perModelCost === 0) {
        perModelCost = Number(mPts.value);
      }
    };

    let totalGroupMin = 0;
    let totalGroupMax = 0;
    let hasModelGroup = false;

    if (entry.selectionEntryGroups) {
      for (const g of entry.selectionEntryGroups) {
        const gEntries = (g.selectionEntries || []).concat(g.entryLinks || []);
        const modelEntries = gEntries.filter(e => {
          const res = e.targetId ? allEntriesById.get(e.targetId) : e;
          return e.type === 'model' || (res && res.type === 'model');
        });

        if (modelEntries.length > 0) {
          hasModelGroup = true;
          const minC = g.constraints?.find(c => c.type === 'min' && c.field === 'selections');
          const maxC = g.constraints?.find(c => c.type === 'max' && c.field === 'selections');

          if (minC || maxC) {
            totalGroupMin += minC ? Number(minC.value) : 1;
            totalGroupMax += maxC ? Number(maxC.value) : (minC ? Number(minC.value) : 1);
          } else {
            let childMinSum = 0;
            let childMaxSum = 0;
            for (const me of modelEntries) {
              const res = me.targetId ? (allEntriesById.get(me.targetId) || me) : me;
              const allC = [...(me.constraints || []), ...((res && res.constraints) || [])];
              const cMin = allC.find(c => c.type === 'min' && c.field === 'selections' && (!c.scope || c.scope === 'parent'));
              const cMax = allC.find(c => c.type === 'max' && c.field === 'selections' && (!c.scope || c.scope === 'parent'));
              childMinSum += cMin ? Number(cMin.value) : 0;
              childMaxSum += cMax ? Number(cMax.value) : (cMin ? Number(cMin.value) : 1);
            }
            totalGroupMin += Math.max(1, childMinSum);
            totalGroupMax += Math.max(1, childMaxSum);
          }

          modelEntries.forEach(inspectModelCost);
        }
      }
    }

    // Direct model children (summed alongside any model groups, e.g. Breacher Team / Crisis Battlesuits)
    let directMin = 0;
    let directMax = 0;
    const directModelChildren = (entry.selectionEntries || []).concat(entry.entryLinks || []).filter(e => {
      const res = e.targetId ? allEntriesById.get(e.targetId) : e;
      return e.type === 'model' || (res && res.type === 'model');
    });

    if (directModelChildren.length > 0) {
      for (const me of directModelChildren) {
        const res = me.targetId ? (allEntriesById.get(me.targetId) || me) : me;
        const allC = [...(me.constraints || []), ...((res && res.constraints) || [])];
        const cMin = allC.find(c => c.type === 'min' && c.field === 'selections' && (!c.scope || c.scope === 'parent'));
        const cMax = allC.find(c => c.type === 'max' && c.field === 'selections' && (!c.scope || c.scope === 'parent'));
        directMin += cMin ? Number(cMin.value) : 0;
        directMax += cMax ? Number(cMax.value) : (cMin ? Number(cMin.value) : 1);
        inspectModelCost(me);
      }
    }

    if (hasModelGroup || directModelChildren.length > 0) {
      minModels = Math.max(1, totalGroupMin + directMin);
      maxModels = Math.max(minModels, totalGroupMax + directMax);
    }

    if (baseCost === 0 && perModelCost > 0) {
      baseCost = minModels * perModelCost;
    }

    const costTiers = [{ models: minModels, cost: baseCost }];

    // If unit uses per-model cost and can take multiple models, build tiers
    if (perModelCost > 0 && maxModels > minModels && (!ptsCost || Number(ptsCost.value) === 0)) {
      let incrementPerExtra = 0;
      if (entry.modifiers) {
        const incMod = entry.modifiers.find(m => m.field === '51b2-306e-1021-d207' && m.type === 'increment');
        if (incMod && Number(incMod.value) > 0) {
          incrementPerExtra = Number(incMod.value);
        }
      }
      for (let m = minModels + 1; m <= maxModels; m++) {
        const extraModels = m - minModels;
        const tierCost = m * perModelCost + extraModels * incrementPerExtra;
        if (!costTiers.some(t => t.models === m)) {
          costTiers.push({ models: m, cost: tierCost });
        }
      }
    }

    // Modifiers for point scaling
    if (entry.modifiers) {
      for (const m of entry.modifiers) {
        if (m.field === '51b2-306e-1021-d207' && m.type === 'set') {
          const val = Number(m.value) || 0;
          if (m.conditions && m.conditions[0]) {
            let condVal = Number(m.conditions[0].value) || maxModels;
            if ((m.conditions[0].type === 'atLeast' || m.conditions[0].type === 'greaterThan') && condVal < maxModels && maxModels > minModels) {
              condVal = maxModels;
            }
            if (val > 0 && !costTiers.some(t => t.cost === val)) {
              costTiers.push({ models: condVal, cost: val });
            }
          }
        }
      }
    }
    costTiers.sort((a, b) => a.models - b.models);

    // Transport Capacity
    let transportCapacity = null;
    const transportProfile = allProfiles.find(p => p.typeName && p.typeName.toLowerCase().includes('transport'));
    if (transportProfile) {
      const c = getCharacteristics(transportProfile);
      transportCapacity = c['Capacity'] || c['Description'] || 'Transport';
    }

    // Wargear configuration groups
    const wargearGroups = extractWargearGroups(entry);
    const { baseProfileNames, baseWeaponCounts } = extractBaseProfileNames(entry, wargearGroups);

    // Enhancement group links (on unit or child models)
    const enhancementGroupIds = [];
    if (!isEpicHero) {
      const collectEnhGroups = (node, visited = new Set()) => {
        if (!node || (node.id && visited.has(node.id))) return;
        if (node.id) visited.add(node.id);
        if (node.entryLinks) {
          for (const l of node.entryLinks) {
            if (l.hidden) continue;
            const target = l.targetId ? allEntriesById.get(l.targetId) : null;
            const lName = (l.name || (target && target.name) || '').toLowerCase();
            if (l.type === 'selectionEntryGroup' && lName.includes('enhancement') && (l.targetId || l.id)) {
              const gId = l.targetId || l.id;
              if (!enhancementGroupIds.includes(gId)) {
                enhancementGroupIds.push(gId);
              }
            } else if (l.type === 'selectionEntry' || l.type === 'model' || (target && target.type === 'model')) {
              collectEnhGroups(l, visited);
              if (target) collectEnhGroups(target, visited);
            }
          }
        }
        if (node.selectionEntries) {
          for (const ch of node.selectionEntries) {
            if (!ch.hidden) collectEnhGroups(ch, visited);
          }
        }
        if (node.selectionEntryGroups) {
          for (const g of node.selectionEntryGroups) {
            if (g.hidden) continue;
            if ((g.name || '').toLowerCase().includes('enhancement')) {
              if (g.id && !enhancementGroupIds.includes(g.id)) {
                enhancementGroupIds.push(g.id);
              }
            } else {
              collectEnhGroups(g, visited);
            }
          }
        }
      };
      collectEnhGroups(entry);
    }

    // Also check if unit has unit-specific detachment-gated upgrades (e.g. Pantheon of Woe C'tan or Veiled Blade Assassins)
    const hasDetachmentUpgrade = [
      ...(entry.selectionEntries || []),
      ...(entry.selectionEntryGroups || []).flatMap(g => g.selectionEntries || [])
    ].some(e => e && e.hidden && e.type === 'upgrade' && (e.modifierGroups || []).some(mg =>
      (mg.modifiers || []).some(m => m.field === 'hidden' && m.type === 'set' && (m.value === false || m.value === 'false'))
    ));
    if (hasDetachmentUpgrade && entry.id && !enhancementGroupIds.includes(entry.id)) {
      enhancementGroupIds.push(entry.id);
    }

    const parsedUnit = {
      id: entry.id,
      name: entry.name,
      primaryCategory,
      categories,
      keywords: categories.filter(c => !c.startsWith('Faction:')),
      factionKeywords: categories.filter(c => c.startsWith('Faction:')).map(c => c.replace('Faction:', '').trim()),
      isCharacter,
      isEpicHero,
      isBattleline,
      isDedicatedTransport,
      isLeader: effectiveIsLeader,
      isSupport: effectiveIsSupport,
      canLead,
      baseCost,
      minModels,
      maxModels,
      costTiers,
      stats,
      ...(extraStats.length > 0 ? { extraStats } : {}),
      rangedWeapons,
      meleeWeapons,
      abilities,
      transportCapacity,
      wargearGroups,
      baseProfileNames,
      baseWeaponCounts,
      enhancementGroupIds
    };

    if (entry.id) {
      parsedUnitsCache.set(entry.id, parsedUnit);
    }

    return { ...parsedUnit };
  }

  function computeLeaderSupportFlags(units) {
    const matchesTargetName = (unit, targetName) => {
      const uName = unit.name.toUpperCase();
      const tName = targetName.toUpperCase();
      if (uName === tName || uName.includes(tName) || tName.includes(uName)) return true;
      if (tName.includes('BATTLELINE') && unit.isBattleline) return true;
      return false;
    };

    const allFactionLeaders = units.filter(u => u.isLeader && u.canLead && u.canLead.length > 0);
    const allFactionSupports = units.filter(u => u.isSupport && u.canLead && u.canLead.length > 0);

    for (const u of units) {
      if (u.isLeader || u.isSupport) {
        u.canBeLed = false;
        u.canHaveSupport = false;
      } else {
        u.canBeLed = allFactionLeaders.some(l => l.canLead.some(t => matchesTargetName(u, t)));
        u.canHaveSupport = allFactionSupports.some(s => s.canLead.some(t => matchesTargetName(u, t)));
      }
    }
  }

  return {
    parseUnit,
    computeLeaderSupportFlags
  };
}

module.exports = {
  createUnitParser
};

