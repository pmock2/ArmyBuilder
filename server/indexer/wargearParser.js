const { shouldSkipWargearNode, isHiddenByAncestorModifiers, getWargearMinMax } = require('./modifiersParser');

function createWargearParser({
  allEntriesById,
  getCharacteristics,
  extractOptionPts,
  extractStatAndRuleModifiers
}) {
  function extractOptionProfiles(item) {
    if (!item) return [];
    const resolved = item.targetId ? allEntriesById.get(item.targetId) : item;
    const profiles = [];
    const seen = new Map();

    const itemType = item.type === 'model' || (resolved && resolved.type === 'model') ? 'model' : ((resolved && resolved.type) || item.type);
    const { min: rootMin, max: rootMax } = getWargearMinMax(item, resolved);
    let initialMult = 1;
    if (itemType !== 'model' && rootMin >= 2 && (rootMax === rootMin || rootMax === null)) {
      initialMult = rootMin;
    }

    function walk(node, wVisited = new Set(), mult = 1) {
      if (!node || (node.id && wVisited.has(node.id))) return;
      if (node.id) wVisited.add(node.id);

      const addProfile = (p) => {
        if (!p || !p.name || !p.typeName) return;
        const key = `${p.name}|${p.typeName}`;
        if (seen.has(key)) {
          const existing = seen.get(key);
          if (mult > (existing.count || 1)) {
            existing.count = mult;
          }
          return;
        }
        const c = getCharacteristics(p);
        let created = null;
        if (p.typeName === 'Ranged Weapons' || p.typeName === 'Ranged Weapon') {
          created = {
            name: p.name,
            type: 'ranged',
            count: mult,
            range: c['Range'] || '24"',
            A: c['A'] || c['Attacks'] || '1',
            BS: c['BS'] || c['Ballistic Skill'] || '3+',
            S: c['S'] || c['Strength'] || '4',
            AP: c['AP'] || c['Armour Penetration'] || '0',
            D: c['D'] || c['Damage'] || '1',
            keywords: c['Keywords'] || ''
          };
        } else if (p.typeName === 'Melee Weapons' || p.typeName === 'Melee Weapon') {
          created = {
            name: p.name,
            type: 'melee',
            count: mult,
            range: 'Melee',
            A: c['A'] || c['Attacks'] || '1',
            WS: c['WS'] || c['Weapon Skill'] || '3+',
            S: c['S'] || c['Strength'] || '4',
            AP: c['AP'] || c['Armour Penetration'] || '0',
            D: c['D'] || c['Damage'] || '1',
            keywords: c['Keywords'] || ''
          };
        } else if (p.typeName === 'Abilities') {
          created = {
            name: p.name,
            type: 'ability',
            description: c['Description'] || ''
          };
        }
        if (created) {
          seen.set(key, created);
          profiles.push(created);
        }
      };

      if (node.typeName) {
        addProfile(node);
      } else if (node.name && node.description !== undefined && !node.type) {
        const key = `${node.name}|rule`;
        if (!seen.has(key)) {
          const created = {
            name: node.name,
            type: 'ability',
            description: node.description || ''
          };
          seen.set(key, created);
          profiles.push(created);
        }
      }
      if (node.profiles) {
        node.profiles.forEach(addProfile);
      }
      if (node.rules) {
        for (const r of node.rules) {
          if (r && r.name && r.description !== undefined) {
            const key = `${r.name}|rule`;
            if (!seen.has(key)) {
              const created = {
                name: r.name,
                type: 'ability',
                description: r.description || ''
              };
              seen.set(key, created);
              profiles.push(created);
            }
          }
        }
      }
      const checkAddInfoModifiers = (modList) => {
        if (!modList) return;
        for (const m of modList) {
          if (m && m.field === 'add-info' && m.type === 'add' && m.value && allEntriesById.has(m.value)) {
            const ruleEntry = allEntriesById.get(m.value);
            if (ruleEntry && ruleEntry.name) {
              const key = `${ruleEntry.name}|rule`;
              if (!seen.has(key)) {
                const created = {
                  name: ruleEntry.name,
                  type: 'ability',
                  description: ruleEntry.description || ''
                };
                seen.set(key, created);
                profiles.push(created);
              }
            }
          }
        }
      };
      checkAddInfoModifiers(node.modifiers);
      if (node.modifierGroups) {
        for (const mg of node.modifierGroups) {
          checkAddInfoModifiers(mg.modifiers);
        }
      }
      if (node.infoLinks) {
        for (const il of node.infoLinks) {
          if (il.targetId && allEntriesById.has(il.targetId)) {
            walk(allEntriesById.get(il.targetId), wVisited, mult);
          }
        }
      }
      if (node.selectionEntries) {
        node.selectionEntries.forEach(child => {
          if (shouldSkipWargearNode(child)) return;
          const cRes = child.targetId ? allEntriesById.get(child.targetId) : child;
          const cType = child.type === 'model' || (cRes && cRes.type === 'model') ? 'model' : ((cRes && cRes.type) || child.type);
          const { min: cMin, max: cMax } = getWargearMinMax(child, cRes);
          const nextMult = (cType !== 'model' && cMin >= 2 && (cMax === cMin || cMax === null)) ? mult * cMin : mult;
          walk(child, wVisited, nextMult);
        });
      }
      if (node.entryLinks) {
        node.entryLinks.forEach(l => {
          if (shouldSkipWargearNode(l)) return;
          const lRes = l.targetId ? allEntriesById.get(l.targetId) : l;
          const lType = l.type === 'model' || (lRes && lRes.type === 'model') ? 'model' : ((lRes && lRes.type) || l.type);
          const { min: lMin, max: lMax } = getWargearMinMax(l, lRes);
          const nextMult = (lType !== 'model' && lMin >= 2 && (lMax === lMin || lMax === null)) ? mult * lMin : mult;
          walk(l, wVisited, nextMult);
          if (l.targetId && allEntriesById.has(l.targetId)) {
            walk(allEntriesById.get(l.targetId), wVisited, nextMult);
          }
        });
      }
    }

    walk(item, new Set(), initialMult);
    if (resolved && resolved !== item) {
      walk(resolved, new Set(), initialMult);
    }
    return profiles;
  }

  function extractWargearGroups(unitEntry) {
    const groups = [];
    const visitedGroups = new Set();

    const addNodeAncestorIds = (node, set) => {
      if (!node) return;
      if (node.id) set.add(node.id);
      if (node.targetId) set.add(node.targetId);
      if (node.categoryLinks) {
        for (const cl of node.categoryLinks) {
          if (cl && cl.targetId) set.add(cl.targetId);
        }
      }
    };

    const rootAncestors = new Set();
    addNodeAncestorIds(unitEntry, rootAncestors);

    function processContainer(container, contextLabel, parentModelOptional = false, modelScopeMax = 1, ancestorIds = rootAncestors) {
      if (!container) return;
      const currentAncestors = new Set(ancestorIds);
      addNodeAncestorIds(container, currentAncestors);

      // 1. Direct optional upgrades in selectionEntries / entryLinks (non-models)
      const directEntries = [
        ...(container.selectionEntries || []),
        ...(container.entryLinks || []).filter(l => l.type === 'selectionEntry')
      ];

      const optionalUpgrades = [];
      const childModels = [];

      for (const item of directEntries) {
        if (shouldSkipWargearNode(item)) continue;
        const resolved = item.targetId ? allEntriesById.get(item.targetId) : item;
        if (!resolved || shouldSkipWargearNode(resolved)) continue;
        if (isHiddenByAncestorModifiers(currentAncestors, item, resolved !== item ? resolved : null)) continue;

        const itemType = item.type === 'model' || resolved.type === 'model' ? 'model' : (resolved.type || item.type);
        const { min, max } = getWargearMinMax(item, resolved, currentAncestors);

        if (itemType === 'model') {
          childModels.push({ item, resolved, min, max });
        } else if (itemType === 'upgrade' || itemType === 'selectionEntry') {
          if (min === 0 && (max === null || max >= 1)) {
            const profiles = extractOptionProfiles(item);
            const statModifiers = extractStatAndRuleModifiers(item, profiles);
            const pts = extractOptionPts(item);
            if (profiles.length > 0 || statModifiers.length > 0 || pts > 0) {
              const optObj = {
                id: item.id,
                name: item.name || resolved.name,
                maxCount: max || 1,
                profiles
              };
              if (pts > 0) optObj.pts = pts;
              if (statModifiers.length > 0) optObj.statModifiers = statModifiers;
              optionalUpgrades.push(optObj);
            }
          }
        }
      }

      if (optionalUpgrades.length > 0) {
        const groupId = `${container.id}-optional-wargear`;
        if (!visitedGroups.has(groupId)) {
          visitedGroups.add(groupId);
          const groupObj = {
            id: groupId,
            name: contextLabel ? `${contextLabel} — Optional Wargear` : 'Optional Wargear',
            min: 0,
            max: optionalUpgrades.length,
            isExclusive: false,
            defaultOptionIds: optionalUpgrades.filter(o => !o.pts).map(o => o.id),
            options: optionalUpgrades
          };
          if (modelScopeMax > 1) {
            groupObj.perModel = true;
          }
          groups.push(groupObj);
        }
      }

      // 2. selectionEntryGroups and entryLinks of type selectionEntryGroup
      const rawGroups = [
        ...(container.selectionEntryGroups || []),
        ...(container.entryLinks || []).filter(l => l.type === 'selectionEntryGroup')
      ];

      for (const rawG of rawGroups) {
        if (shouldSkipWargearNode(rawG)) continue;
        const g = rawG.targetId ? (allEntriesById.get(rawG.targetId) || rawG) : rawG;
        if (!g || shouldSkipWargearNode(g)) continue;
        if (isHiddenByAncestorModifiers(currentAncestors, rawG, g !== rawG ? g : null)) continue;
        const groupAncestors = new Set(currentAncestors);
        addNodeAncestorIds(rawG, groupAncestors);
        addNodeAncestorIds(g, groupAncestors);
        const uniqueGroupId = rawG.id || g.id;
        if (visitedGroups.has(uniqueGroupId)) continue;

        const gEntries = [
          ...(g.selectionEntries || []),
          ...(g.entryLinks || []).filter(l => l.type === 'selectionEntry')
        ];

        const hasModelChildren = gEntries.some(e => {
          const res = e.targetId ? allEntriesById.get(e.targetId) : e;
          return e.type === 'model' || (res && res.type === 'model');
        });

        if (hasModelChildren) {
          visitedGroups.add(uniqueGroupId);

          // Identify profiles that are already mandatory on min >= 1 models in this squad group
          const mandatoryModelProfileNames = new Set();
          let mandatoryModelEntriesCount = 0;
          let mandatoryModelMinSum = 0;

          for (const e of gEntries) {
            if (shouldSkipWargearNode(e)) continue;
            const res = e.targetId ? allEntriesById.get(e.targetId) : e;
            if (!res || shouldSkipWargearNode(res)) continue;
            const { min: mMin } = getWargearMinMax(e, res);
            if (mMin >= 1 || gEntries.length === 1) {
              mandatoryModelEntriesCount++;
              mandatoryModelMinSum += Math.max(1, mMin);
              // Collect profiles from direct mandatory (min >= 1) wargear on this mandatory model
              const mDirect = [
                ...(res.selectionEntries || []),
                ...(res.entryLinks || []).filter(l => l.type === 'selectionEntry')
              ];
              for (const md of mDirect) {
                if (shouldSkipWargearNode(md)) continue;
                const mdRes = md.targetId ? allEntriesById.get(md.targetId) : md;
                if (!mdRes || shouldSkipWargearNode(mdRes)) continue;
                const { min: wMin } = getWargearMinMax(md, mdRes);
                if (wMin >= 1) {
                  for (const p of extractOptionProfiles(md)) {
                    mandatoryModelProfileNames.add(p.name);
                  }
                }
              }
            }
          }

          const squadModelOptions = [];
          let optionalSubGroupModelsCount = 0;

          for (const e of gEntries) {
            if (shouldSkipWargearNode(e)) continue;
            const res = e.targetId ? allEntriesById.get(e.targetId) : e;
            if (!res || shouldSkipWargearNode(res)) continue;
            const { min: mMin, max: mMax } = getWargearMinMax(e, res, groupAncestors);
            const isOptionalModel = mMin === 0 && gEntries.length > 1;

            const modelAncestors = new Set(groupAncestors);
            addNodeAncestorIds(e, modelAncestors);
            addNodeAncestorIds(res, modelAncestors);

            const groupsBefore = groups.length;
            processContainer(res, e.name || res.name, parentModelOptional || isOptionalModel, mMax || 1, modelAncestors);
            const addedGroups = groups.slice(groupsBefore);
            const addedSubGroups = addedGroups.length > 0;

            if (isOptionalModel && addedSubGroups) {
              const hasActiveExclusiveSubGroup = addedGroups.some(
                ag => ag.isExclusive && ag.defaultOptionIds && ag.defaultOptionIds.length > 0
              );
              if (hasActiveExclusiveSubGroup) {
                optionalSubGroupModelsCount += 1;
              }
            }

            if (isOptionalModel && !addedSubGroups) {
              const allModelProfiles = extractOptionProfiles(e);
              const uniqueProfiles = allModelProfiles.filter(p => !mandatoryModelProfileNames.has(p.name));
              const statModifiers = extractStatAndRuleModifiers(e, uniqueProfiles);
              const pts = extractOptionPts(e);
              let effectiveSquadMax = mMax || 1;
              const allMods = [...(e.modifiers || [])];
              if (res && res !== e && res.modifiers) {
                allMods.push(...res.modifiers);
              }
              for (const mod of allMods) {
                if (mod.type === 'increment' && Number(mod.value) > 0) {
                  effectiveSquadMax += Number(mod.value);
                }
              }

              if (uniqueProfiles.length > 0 || statModifiers.length > 0 || pts > 0) {
                const optObj = {
                  id: e.id,
                  name: e.name || res.name,
                  maxCount: effectiveSquadMax,
                  profiles: uniqueProfiles
                };
                if (pts > 0) optObj.pts = pts;
                if (statModifiers.length > 0) optObj.statModifiers = statModifiers;
                squadModelOptions.push(optObj);
              }
            }
          }

          if (squadModelOptions.length > 0) {
            const squadGroupId = `${uniqueGroupId}-squad-options`;
            if (!visitedGroups.has(squadGroupId)) {
              visitedGroups.add(squadGroupId);
              const groupName = rawG.name || g.name;
              const isSpecialistUpgrade = mandatoryModelEntriesCount >= 2 || squadModelOptions.every(o => o.maxCount <= 2);
              const freeSquadOpts = squadModelOptions.filter(o => !o.pts);
              let gMax = squadModelOptions.reduce((acc, o) => acc + (o.maxCount || 1), 0);
              if (rawG.constraints) {
                const gMaxC = rawG.constraints.find(c => c.type === 'max' && c.field === 'selections');
                if (gMaxC && Number(gMaxC.value) > 0) gMax = Number(gMaxC.value);
              }
              const { min: groupMinModels } = getWargearMinMax(rawG, g);
              const defEntryId = rawG.defaultSelectionEntryId || g.defaultSelectionEntryId;
              const preferredDef = defEntryId && squadModelOptions.find(o => o.id === defEntryId);
              const defaultOpt = (preferredDef && !preferredDef.pts)
                ? preferredDef
                : (freeSquadOpts[0] || squadModelOptions[0]);
              const accountedModels = mandatoryModelMinSum + optionalSubGroupModelsCount;
              const targetDefaultCount = Math.max(1, (groupMinModels || 1) - accountedModels);
              const clampedDefaultCount = Math.min(targetDefaultCount, defaultOpt.maxCount || targetDefaultCount);

              groups.push({
                id: squadGroupId,
                name: isSpecialistUpgrade ? `${groupName} — Optional Wargear` : `${groupName} — Loadout Options`,
                min: isSpecialistUpgrade ? 0 : 1,
                max: gMax,
                isExclusive: false,
                defaultOptionIds: isSpecialistUpgrade
                  ? []
                  : Array(clampedDefaultCount).fill(defaultOpt.id),
                options: squadModelOptions
              });
            }
          }
          continue;
        }

        const hasSubGroups = (g.selectionEntryGroups && g.selectionEntryGroups.length > 0) ||
                             (g.entryLinks && g.entryLinks.some(l => l.type === 'selectionEntryGroup'));

        const { min: gMin, max: gMax } = getWargearMinMax(rawG, g, currentAncestors);

        // Only flatten a generic "Wargear" container when it has child groups or doesn't impose its own
        // choice constraints (e.g. Armiger Moirax: leaf "Wargear" group with min 2 / max 2 is a real choice).
        const isConstrainedChoice = gEntries.length > 0 && (gMax !== null || gMin > 0);
        const isPlainWargearContainer = g.name === 'Wargear' && (hasSubGroups || !isConstrainedChoice);

        if (isPlainWargearContainer || (hasSubGroups && gEntries.every(e => {
          const res = e.targetId ? allEntriesById.get(e.targetId) : e;
          const m = getWargearMinMax(e, res, groupAncestors);
          return m.min >= 1 && m.max === m.min;
        }))) {
          visitedGroups.add(uniqueGroupId);
          processContainer(g, contextLabel, parentModelOptional, modelScopeMax, groupAncestors);
          continue;
        }

        const options = [];
        for (const opt of gEntries) {
          if (shouldSkipWargearNode(opt)) continue;
          const resOpt = opt.targetId ? allEntriesById.get(opt.targetId) : opt;
          if (!resOpt || shouldSkipWargearNode(resOpt)) continue;
          if (isHiddenByAncestorModifiers(groupAncestors, opt, resOpt !== opt ? resOpt : null)) continue;
          const { min: oMin, max: oMax } = getWargearMinMax(opt, resOpt, groupAncestors);
          if (gMax === null && oMin >= 1 && oMax === oMin) continue;

          const profiles = extractOptionProfiles(opt);
          const statModifiers = extractStatAndRuleModifiers(opt, profiles);
          const pts = extractOptionPts(opt);
          const optObj = {
            id: opt.id,
            name: opt.name || resOpt.name,
            maxCount: oMax || 1,
            profiles
          };
          if (pts > 0) optObj.pts = pts;
          if (statModifiers.length > 0) optObj.statModifiers = statModifiers;
          options.push(optObj);
        }

        if (options.length > 0) {
          visitedGroups.add(uniqueGroupId);
          const groupName = rawG.name || g.name;
          const effectiveMax = gMax !== null ? gMax : options.length;
          const effectiveMin = parentModelOptional ? 0 : (gMin || 0);
          const isExclusive = effectiveMax === 1 && options.length > 1;

          let defaultOptionIds = [];
          const defId = rawG.defaultSelectionEntryId || g.defaultSelectionEntryId;
          const firstFree = options.find(o => !o.pts);
          if (isExclusive) {
            const foundDef = defId && options.find(o => o.id === defId);
            if (foundDef && !foundDef.pts) {
              defaultOptionIds = [foundDef.id];
            } else if (firstFree) {
              defaultOptionIds = [firstFree.id];
            } else {
              defaultOptionIds = [foundDef ? foundDef.id : options[0].id];
            }
          } else if (gMax === null && effectiveMin === 0) {
            defaultOptionIds = options.filter(o => !o.pts).map(o => o.id);
          } else {
            const foundDef = defId && options.find(o => o.id === defId);
            if (foundDef && (!foundDef.pts || !firstFree)) defaultOptionIds.push(foundDef.id);
            for (const o of options) {
              if (defaultOptionIds.length >= effectiveMax) break;
              if (!o.pts && !defaultOptionIds.includes(o.id)) {
                defaultOptionIds.push(o.id);
              }
            }
            if (defaultOptionIds.length < effectiveMin) {
              for (const o of options) {
                if (defaultOptionIds.length >= effectiveMin) break;
                if (!defaultOptionIds.includes(o.id)) {
                  defaultOptionIds.push(o.id);
                }
              }
            }
          }

          const groupObj = {
            id: uniqueGroupId,
            name: contextLabel && !groupName.toLowerCase().includes(contextLabel.toLowerCase())
              ? `${contextLabel} — ${groupName}`
              : groupName,
            min: effectiveMin,
            max: effectiveMax,
            isExclusive,
            defaultOptionIds,
            options
          };
          if (modelScopeMax > 1) {
            groupObj.perModel = true;
          }
          groups.push(groupObj);
        }

        if (hasSubGroups) {
          processContainer(g, contextLabel, parentModelOptional, modelScopeMax, groupAncestors);
        }
      }

      // 3. Recurse into direct child models
      for (const cm of childModels) {
        const isOpt = cm.min === 0 && childModels.length > 1;
        const childAncestors = new Set(currentAncestors);
        addNodeAncestorIds(cm.item, childAncestors);
        addNodeAncestorIds(cm.resolved, childAncestors);
        processContainer(cm.resolved, cm.item.name || cm.resolved.name, parentModelOptional || isOpt, cm.max || 1, childAncestors);
      }
    }

    processContainer(unitEntry, '', false);
    return groups;
  }

  function extractBaseProfileNames(unitEntry, wargearGroups) {
    const baseNames = new Set();
    const baseWeaponCounts = {};
    const selectableGroupIds = new Set((wargearGroups || []).map(g => g.id));
    const selectableOptionIds = new Set();
    for (const g of (wargearGroups || [])) {
      for (const opt of (g.options || [])) {
        selectableOptionIds.add(opt.id);
      }
    }

    function addNodeDirectProfiles(node, visited = new Set()) {
      if (!node || (node.id && visited.has(node.id))) return;
      if (node.id) visited.add(node.id);

      if (node.typeName && node.name) {
        baseNames.add(node.name);
      }
      if (node.profiles) {
        for (const p of node.profiles) {
          if (p && p.name) baseNames.add(p.name);
        }
      }
      if (node.rules) {
        for (const r of node.rules) {
          if (r && r.name) baseNames.add(r.name);
        }
      }
      if (node.infoLinks) {
        for (const il of node.infoLinks) {
          if (il.targetId && allEntriesById.has(il.targetId)) {
            addNodeDirectProfiles(allEntriesById.get(il.targetId), visited);
          }
        }
      }
    }

    function walkBase(container, visited = new Set()) {
      if (!container || (container.id && visited.has(container.id))) return;
      if (container.id) visited.add(container.id);

      addNodeDirectProfiles(container);

      const directEntries = [
        ...(container.selectionEntries || []),
        ...(container.entryLinks || []).filter(l => l.type === 'selectionEntry')
      ];

      for (const item of directEntries) {
        if (shouldSkipWargearNode(item)) continue;
        if (selectableOptionIds.has(item.id)) continue;
        const resolved = item.targetId ? allEntriesById.get(item.targetId) : item;
        if (!resolved || shouldSkipWargearNode(resolved)) continue;
        if (selectableOptionIds.has(resolved.id)) continue;

        const { min } = getWargearMinMax(item, resolved);
        const itemType = item.type === 'model' || resolved.type === 'model' ? 'model' : (resolved.type || item.type);

        if (itemType === 'model') {
          if (min >= 1 || directEntries.length === 1) {
            addNodeDirectProfiles(item);
            walkBase(resolved, visited);
          }
        } else {
          if (min >= 1) {
            for (const p of extractOptionProfiles(item)) {
              baseNames.add(p.name);
              if (p.type === 'ranged' || p.type === 'melee') {
                const cnt = p.count || min || 1;
                // Track counts independently per weapon type so hybrid weapons (e.g. ranged & melee of same name)
                // don't collapse their separate counts.
                const key = `${p.type}:${p.name}`;
                if (cnt > (baseWeaponCounts[key] || 0)) {
                  baseWeaponCounts[key] = cnt;
                }
                // Backwards-compatibility for un-prefixed lookups: store maximum count of that weapon type
                if (cnt > (baseWeaponCounts[p.name] || 0)) {
                  baseWeaponCounts[p.name] = cnt;
                }
              }
            }
          }
        }
      }

      const rawGroups = [
        ...(container.selectionEntryGroups || []),
        ...(container.entryLinks || []).filter(l => l.type === 'selectionEntryGroup')
      ];

      for (const rawG of rawGroups) {
        if (shouldSkipWargearNode(rawG)) continue;
        const g = rawG.targetId ? (allEntriesById.get(rawG.targetId) || rawG) : rawG;
        if (!g || shouldSkipWargearNode(g)) continue;
        const uniqueGroupId = rawG.id || g.id;
        if (selectableGroupIds.has(uniqueGroupId) || selectableGroupIds.has(g.id)) continue;

        const gEntries = [
          ...(g.selectionEntries || []),
          ...(g.entryLinks || []).filter(l => l.type === 'selectionEntry')
        ];

        const hasModelChildren = gEntries.some(e => {
          const res = e.targetId ? allEntriesById.get(e.targetId) : e;
          return e.type === 'model' || (res && res.type === 'model');
        });

        if (hasModelChildren) {
          for (const e of gEntries) {
            if (shouldSkipWargearNode(e) || selectableOptionIds.has(e.id)) continue;
            const res = e.targetId ? allEntriesById.get(e.targetId) : e;
            if (!res || shouldSkipWargearNode(res) || selectableOptionIds.has(res.id)) continue;
            const { min: mMin } = getWargearMinMax(e, res);
            if (mMin >= 1 || gEntries.length === 1) {
              addNodeDirectProfiles(e);
              walkBase(res, visited);
            }
          }
        } else {
          walkBase(g, visited);
        }
      }
    }

    walkBase(unitEntry);
    return {
      baseProfileNames: Array.from(baseNames),
      baseWeaponCounts
    };
  }

  return {
    extractOptionProfiles,
    extractWargearGroups,
    extractBaseProfileNames
  };
}

module.exports = {
  createWargearParser
};

