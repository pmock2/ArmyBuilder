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
    const sizeChildIds = new Set();
    const upgradeSizeMap = new Map();

    if (entry.selectionEntryGroups) {
      for (const g of entry.selectionEntryGroups) {
        if (g.id) sizeChildIds.add(g.id);
        const gEntries = (g.selectionEntries || []).concat(g.entryLinks || []);
        const modelEntries = gEntries.filter(e => {
          const res = e.targetId ? allEntriesById.get(e.targetId) : e;
          return e.type === 'model' || (res && res.type === 'model');
        });

        if (modelEntries.length > 0) {
          hasModelGroup = true;
          const minC = g.constraints?.find(c => c.type === 'min' && c.field === 'selections');
          const maxC = g.constraints?.find(c => c.type === 'max' && c.field === 'selections');

          let childMinSum = 0;
          let childMaxSum = 0;
          for (const me of modelEntries) {
            if (me.id) sizeChildIds.add(me.id);
            if (me.targetId) sizeChildIds.add(me.targetId);
            const res = me.targetId ? (allEntriesById.get(me.targetId) || me) : me;
            const allC = [...(me.constraints || []), ...((res && res.constraints) || [])];
            const cMin = allC.find(c => c.type === 'min' && c.field === 'selections' && (!c.scope || c.scope === 'parent'));
            const cMax = allC.find(c => c.type === 'max' && c.field === 'selections' && (!c.scope || c.scope === 'parent'));
            childMinSum += cMin ? Number(cMin.value) : 0;
            childMaxSum += cMax ? Number(cMax.value) : (cMin ? Number(cMin.value) : 1);
          }

          const gMin = minC ? Number(minC.value) : childMinSum;
          const gMax = maxC ? Number(maxC.value) : Math.max(gMin, childMaxSum);
          totalGroupMin += gMin;
          totalGroupMax += gMax;

          modelEntries.forEach(inspectModelCost);
        } else {
          // Upgrade-based unit size selection (e.g. Aquila/Decimus Kill Team: "5 models", "10 models")
          const matchedUpgrades = [];
          for (const ue of gEntries) {
            const res = ue.targetId ? (allEntriesById.get(ue.targetId) || ue) : ue;
            const type = ue.type || (res && res.type);
            const name = ue.name || (res && res.name) || '';
            const m = typeof name === 'string' && name.match(/^\s*(\d+)\s+models?\s*$/i);
            if (type === 'upgrade' && m) {
              matchedUpgrades.push({ ue, res, count: Number(m[1]) });
            }
          }
          if (matchedUpgrades.length >= 2) {
            for (const item of matchedUpgrades) {
              if (item.ue.id) upgradeSizeMap.set(item.ue.id, item.count);
              if (item.ue.targetId) upgradeSizeMap.set(item.ue.targetId, item.count);
              if (item.res && item.res.id) upgradeSizeMap.set(item.res.id, item.count);
            }
          }
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
        if (me.id) sizeChildIds.add(me.id);
        if (me.targetId) sizeChildIds.add(me.targetId);
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
    } else if (upgradeSizeMap.size >= 2) {
      const counts = [...upgradeSizeMap.values()];
      minModels = Math.max(1, Math.min(...counts));
      maxModels = Math.max(minModels, ...counts);
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

    // Extract threshold bounds from a flat list of AND conditions for a pts set/multiply modifier.
    function extractBoundsFromConditions(conds) {
      if (!conds || conds.length === 0) return null;
      let lower = 0;
      let explicitUpper = Infinity;
      let hasExplicitUpper = false;
      let hasPositiveModelCond = false;
      let positiveTerms = 0;

      for (const c of conds) {
        // Ignore crusade / ally / chapter / force-wide overrides (not squad size brackets)
        if (
          c.type === 'instanceOf' ||
          c.type === 'notInstanceOf' ||
          c.field !== 'selections' ||
          c.scope === 'force' ||
          c.scope === 'primary-catalogue' ||
          c.scope === 'roster'
        ) {
          return null;
        }

        const cVal = Number(c.value);
        // Upper-zero check (e.g. "Warlock Skyrunners < 1" or "Hunting Wolves == 0")
        if ((c.type === 'equalTo' && cVal === 0) || (c.type === 'lessThan' && cVal <= 1) || (c.type === 'atMost' && cVal === 0)) {
          continue;
        }

        if (upgradeSizeMap.has(c.childId) && (c.type === 'atLeast' || c.type === 'equalTo') && cVal >= 1) {
          const uModels = upgradeSizeMap.get(c.childId);
          lower = Math.max(lower, uModels);
          explicitUpper = Math.min(explicitUpper, uModels);
          hasExplicitUpper = true;
          hasPositiveModelCond = true;
          positiveTerms++;
          continue;
        }

        const isModelTarget = c.childId === 'model' || sizeChildIds.has(c.childId);
        if (!isModelTarget) {
          return null;
        }

        hasPositiveModelCond = true;
        if (c.type === 'atLeast') {
          positiveTerms++;
          lower = positiveTerms > 1 ? lower + cVal : cVal;
        } else if (c.type === 'greaterThan') {
          positiveTerms++;
          lower = positiveTerms > 1 ? lower + (cVal + 1) : (cVal + 1);
        } else if (c.type === 'equalTo') {
          positiveTerms++;
          lower = positiveTerms > 1 ? lower + cVal : cVal;
          explicitUpper = positiveTerms === 1 ? Math.min(explicitUpper, cVal) : Infinity;
          hasExplicitUpper = positiveTerms === 1;
        } else if (c.type === 'lessThan') {
          explicitUpper = Math.min(explicitUpper, cVal - 1);
          hasExplicitUpper = true;
        } else if (c.type === 'atMost') {
          explicitUpper = Math.min(explicitUpper, cVal);
          hasExplicitUpper = true;
        } else {
          return null;
        }
      }

      if (!hasPositiveModelCond || lower <= 0) return null;
      return {
        lower,
        explicitUpper: hasExplicitUpper && Number.isFinite(explicitUpper) ? explicitUpper : null
      };
    }

    function extractModifierTierBounds(mod) {
      if (mod.conditions && mod.conditions.length > 0 && (!mod.conditionGroups || mod.conditionGroups.length === 0)) {
        return extractBoundsFromConditions(mod.conditions);
      }
      if (mod.conditionGroups && mod.conditionGroups.length > 0) {
        const grp = mod.conditionGroups[0];
        // Reject if nested conditionGroups contain non-size rules (e.g. chapter primary-catalogue checks)
        if (grp.type === 'and' && grp.conditions && (!grp.conditionGroups || grp.conditionGroups.length === 0)) {
          return extractBoundsFromConditions([...(mod.conditions || []), ...grp.conditions]);
        }
        if (grp.type === 'or' && grp.conditionGroups && grp.conditionGroups.length > 0 && (!mod.conditions || mod.conditions.length === 0)) {
          for (const branch of grp.conditionGroups) {
            if (branch.type === 'and' && branch.conditions) {
              const b = extractBoundsFromConditions(branch.conditions);
              if (b) return b;
            }
          }
        }
      }
      return null;
    }

    // Modifiers for point scaling
    if (entry.modifiers) {
      const rawTierMods = [];
      for (const m of entry.modifiers) {
        if (m.field !== '51b2-306e-1021-d207') continue;
        let val = 0;
        if (m.type === 'set') {
          val = Number(m.value) || 0;
        } else if (m.type === 'multiply') {
          val = Math.round(baseCost * (Number(m.value) || 0));
        } else {
          continue;
        }
        if (val <= 0 || val === baseCost) continue;

        const bounds = extractModifierTierBounds(m);
        if (bounds) {
          rawTierMods.push({ ...bounds, cost: val });
        }
      }

      if (rawTierMods.length > 0) {
        // Ensure maxModels covers any explicit threshold modifier (e.g. Atalan Jackals atLeast 10)
        const highestLower = Math.max(...rawTierMods.map(t => t.lower));
        if (highestLower > maxModels) {
          maxModels = highestLower;
        }

        // Sort ascending by minimum model threshold, and deduplicate identical thresholds
        rawTierMods.sort((a, b) => a.lower - b.lower || (a.explicitUpper ?? Infinity) - (b.explicitUpper ?? Infinity) || a.cost - b.cost);
        const dedupedMods = [];
        for (const rm of rawTierMods) {
          const existingIdx = dedupedMods.findIndex(x => x.lower === rm.lower);
          if (existingIdx === -1) {
            dedupedMods.push(rm);
          }
        }

        for (let i = 0; i < dedupedMods.length; i++) {
          const rm = dedupedMods[i];
          if (costTiers.some(t => t.cost === rm.cost)) continue;

          let tierModels;
          if (rm.explicitUpper !== null) {
            tierModels = Math.min(maxModels, Math.max(minModels, rm.explicitUpper));
          } else if (i + 1 < dedupedMods.length && dedupedMods[i + 1].lower > rm.lower) {
            tierModels = Math.min(maxModels, Math.max(minModels, dedupedMods[i + 1].lower - 1));
          } else {
            tierModels = maxModels;
          }

          if (!costTiers.some(t => t.models === tierModels)) {
            costTiers.push({ models: tierModels, cost: rm.cost });
          }
        }
      }
    }
    costTiers.sort((a, b) => a.models - b.models);

    // Duplicate unit escalation penalties (11e Rule of 3 / duplicate tax via localConditionGroups 'before')
    const duplicatePenalties = [];
    if (entry.modifiers) {
      for (const m of entry.modifiers) {
        if (m.field !== '51b2-306e-1021-d207' || m.type !== 'increment') continue;
        const penalty = Number(m.value) || 0;
        if (penalty <= 0) continue;
        const lcgs = (m.conditionGroups || []).flatMap(cg => cg.localConditionGroups || []);
        for (const lcg of lcgs) {
          const hasBefore = (lcg.conditions || []).some(c => c.type === 'before');
          if (!hasBefore) continue;
          const rawVal = Number(lcg.value);
          if (!Number.isFinite(rawVal)) continue;
          let afterCount = null;
          if (lcg.type === 'atLeast') afterCount = rawVal;
          else if (lcg.type === 'greaterThan') afterCount = rawVal + 1;
          if (afterCount !== null && afterCount >= 1) {
            duplicatePenalties.push({ afterCount, penalty });
          }
        }
      }
      duplicatePenalties.sort((a, b) => a.afterCount - b.afterCount);
    }

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

    // Collect embedded Character model keywords (e.g. Company Heroes includes an Ancient Character model eligible for Character Enhancements)
    let hasCharacterModel = false;
    const characterKeywordsSet = new Set();
    if (!isCharacter && !isEpicHero) {
      const inspectChildModelsForChar = (node, visited = new Set()) => {
        if (!node || typeof node !== 'object') return;
        const nid = node.id || node.targetId;
        if (nid) {
          if (visited.has(nid)) return;
          visited.add(nid);
        }
        const resolved = node.targetId ? (allEntriesById.get(node.targetId) || node) : node;
        const isModelNode = node.type === 'model' || (resolved && resolved.type === 'model');
        if (isModelNode) {
          const modelCats = [
            ...(node.categoryLinks || []),
            ...((resolved && resolved.categoryLinks) || [])
          ].map(c => c.name).filter(Boolean);
          const hasCharCat = modelCats.some(c => c.toLowerCase() === 'character');
          const modelHasEnhLink = [
            ...(node.entryLinks || []),
            ...((resolved && resolved.entryLinks) || [])
          ].some(l => (l.name || '').includes('Enhancement'));
          if (hasCharCat || modelHasEnhLink) {
            if (hasCharCat) hasCharacterModel = true;
            for (const c of modelCats) characterKeywordsSet.add(c);
          }
        }
        for (const k of ['selectionEntries', 'entryLinks', 'selectionEntryGroups']) {
          for (const child of (node[k] || [])) {
            inspectChildModelsForChar(child, visited);
          }
          if (resolved && resolved !== node) {
            for (const child of (resolved[k] || [])) {
              inspectChildModelsForChar(child, visited);
            }
          }
        }
      };
      inspectChildModelsForChar(entry);
    }
    const characterKeywords = [...characterKeywordsSet];

    const isLegends =
      Boolean(entry.hidden) ||
      (entry.name || '').toLowerCase().includes('legends') ||
      categories.some(c => c.toLowerCase().includes('legends'));

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
      ...(isLegends ? { isLegends: true } : {}),
      ...(hasCharacterModel ? { hasCharacterModel: true } : {}),
      ...(characterKeywords.length > 0 ? { characterKeywords } : {}),
      canLead,
      baseCost,
      minModels,
      maxModels,
      costTiers,
      ...(duplicatePenalties.length > 0 ? { duplicatePenalties } : {}),
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

