function createDetachmentEnhancementParser({
  allEntriesById,
  resolveEntry,
  getCharacteristics,
  extractOptionPts,
  extractOptionProfiles,
  extractStatAndRuleModifiers
}) {
  // Semantic Constraint Extractor for Detachments
  function extractDetachmentConstraints(entry, resolvedRules) {
    const constraints = {
      exclusiveTags: [],
      exclusiveChapters: false,
      requiredPrimaryCatalogue: null,
      synergies: []
    };

    // 1. Check formal modifiers (like Salamanders primary catalogue restriction)
    if (entry.modifiers) {
      for (const mod of entry.modifiers) {
        if (mod.field === 'hidden' && mod.type === 'set' && mod.value === true) {
          if (mod.conditions) {
            for (const cond of mod.conditions) {
              if (cond.scope === 'primary-catalogue' && cond.type === 'notInstanceOf') {
                constraints.requiredPrimaryCatalogue = cond.childId;
              }
            }
          }
        }
      }
    }

    // 2. Parse rules text for prose-embedded constraints
    const rules = resolvedRules || entry.rules || [];
    const rawText = rules.map(r => `${r.name}: ${r.description}`).join('\n\n');
    const fullText = rawText.replace(/[\u00a0\s]+/g, ' ').replace(/[*^_]/g, '');

    // Tag exclusivity: "This detachment has the [TAG] tag and cannot be taken with another [TAG] detachment"
    const tagRegex = /cannot be taken with (?:another|any other)\s+([A-Za-z0-9\-_]+)\s+detachment/gi;
    let match;
    while ((match = tagRegex.exec(fullText)) !== null) {
      const tag = match[1].trim().toUpperCase();
      if (!constraints.exclusiveTags.includes(tag)) {
        constraints.exclusiveTags.push(tag);
      }
    }

    // Also check if any category link is explicitly tagged as exclusive in prose
    if (entry.categoryLinks) {
      for (const cl of entry.categoryLinks) {
        const tagName = cl.name.toUpperCase();
        if (fullText.toUpperCase().includes(`${tagName} TAG`) && fullText.toLowerCase().includes('cannot be taken with another')) {
          if (!constraints.exclusiveTags.includes(tagName)) {
            constraints.exclusiveTags.push(tagName);
          }
        }
      }
    }

    // Chapter exclusivity
    if (/cannot include (?:any )?(?:Adeptus Astartes )?(?:units drawn from )?any other Chapter/i.test(fullText)) {
      constraints.exclusiveChapters = true;
    }

    // Synergy detection (e.g., Vulkan He'stan buffs Infernus Squad)
    const synergyRegex = /If your army includes a\s+([^\.]+?)\s+unit,\s*friendly\s+([^\.]+?)\s+units\s+(?:have|gain)/gi;
    let synMatch;
    while ((synMatch = synergyRegex.exec(fullText)) !== null) {
      constraints.synergies.push({
        requiredUnit: synMatch[1].replace(/[*^]/g, '').trim(),
        beneficiaryUnit: synMatch[2].replace(/[*^]/g, '').trim(),
        effect: 'Grants special action and shooting resilience'
      });
    }

    return constraints;
  }

  function extractFactionDetachments(allowedCats, primaryCat) {
    const detachmentsMap = new Map();

    const searchDetachments = (item, inDetScope = false) => {
      if (!item) return;

      const isDetContainer = item.name && (
        item.name === 'Detachment' ||
        item.name.toLowerCase().includes('shield host detachments') ||
        item.name.toLowerCase().includes('chapter detachments')
      );
      const inScope = inDetScope || isDetContainer;

      const hasDpCost = item.costs && item.costs.some(c => (c.name === 'Detachment Points' || c.typeId === '82ae-1066-5107-6ae0') && Number(c.value) > 0);
      const has3DpCat = item.categoryLinks && item.categoryLinks.some(c => c.name === '3DP Detachment');
      const hasDetCat = item.categoryLinks && item.categoryLinks.some(c => c.name.toLowerCase().includes('detachment'));

      if (item.type === 'upgrade' && !isDetContainer && (hasDpCost || has3DpCat || (inScope && hasDetCat))) {
        let isVisible = true;
        if (item.modifiers) {
          for (const m of item.modifiers) {
            if (m.field === 'hidden' && m.type === 'set' && m.value === true && m.conditions) {
              for (const cond of m.conditions) {
                if (cond.scope === 'primary-catalogue' && cond.type === 'notInstanceOf' && cond.childId !== primaryCat.id) {
                  isVisible = false;
                }
                if (cond.scope === 'primary-catalogue' && cond.type === 'instanceOf' && cond.childId === primaryCat.id) {
                  isVisible = false;
                }
              }
            }
          }
        }

        if (isVisible && !detachmentsMap.has(item.name)) {
          const rules = [];
          const seenRuleNames = new Set();
          const addRule = (rName, rDesc) => {
            if (!rName || seenRuleNames.has(rName)) return;
            seenRuleNames.add(rName);
            rules.push({ name: rName, description: rDesc || '' });
          };

          if (item.rules) {
            for (const r of item.rules) {
              if (!r.hidden) addRule(r.name, r.description);
            }
          }
          if (item.infoLinks) {
            for (const il of item.infoLinks) {
              if (il.hidden) continue;
              if (il.type === 'rule' || il.targetId) {
                const targetRule = allEntriesById.get(il.targetId);
                if (targetRule && !targetRule.hidden && (targetRule.description || il.type === 'rule')) {
                  addRule(targetRule.name || il.name, targetRule.description || '');
                }
              }
            }
          }

          const constraints = extractDetachmentConstraints(item, rules);

          const dpCostObj = item.costs ? item.costs.find(c => c.name === 'Detachment Points' || c.typeId === '82ae-1066-5107-6ae0') : null;
          let dpCost = dpCostObj ? Number(dpCostObj.value) || 0 : 0;
          if (item.categoryLinks && item.categoryLinks.some(c => c.name === '3DP Detachment')) dpCost = 3;

          const tags = item.categoryLinks ? item.categoryLinks.map(c => c.name.toUpperCase()) : [];

          detachmentsMap.set(item.name, {
            id: item.id,
            name: item.name,
            dpCost,
            tags,
            constraints,
            rules
          });
        }
      }

      if (item.selectionEntries) item.selectionEntries.forEach(e => searchDetachments(e, inScope));
      if (item.selectionEntryGroups) item.selectionEntryGroups.forEach(g => searchDetachments(g, inScope));
      if (item.entryLinks) {
        item.entryLinks.forEach(l => {
          const target = resolveEntry(l.targetId, primaryCat);
          if (target) searchDetachments(target, inScope);
        });
      }
    };

    for (const cat of allowedCats) {
      if (cat.entryLinks) {
        for (const l of cat.entryLinks) {
          if (l.name === 'Detachment') {
            const target = resolveEntry(l.targetId, cat);
            if (target) searchDetachments(target, true);
          }
        }
      }
      if (cat.sharedSelectionEntries) {
        for (const e of cat.sharedSelectionEntries) {
          if (e.name === 'Detachment') searchDetachments(e, true);
        }
      }
      if (cat.sharedSelectionEntryGroups) {
        for (const g of cat.sharedSelectionEntryGroups) {
          if (g.name.toLowerCase().includes('detachment')) searchDetachments(g, true);
        }
      }
    }

    return detachmentsMap;
  }

  function extractFactionEnhancements(allowedCats, detachmentsMap, primaryCat, parentCat) {
    const enhancementsList = [];

    const normalizeDetName = (s) =>
      String(s || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[’‘]/g, "'")
        .trim()
        .toLowerCase();

    const findAllowedDetachmentName = (candidate, allowSubstring = false) => {
      if (!candidate) return null;
      const norm = normalizeDetName(candidate);
      if (!norm) return null;
      for (const detName of detachmentsMap.keys()) {
        if (normalizeDetName(detName) === norm) return detName;
      }
      if (allowSubstring && norm.length >= 4) {
        const matches = [];
        for (const detName of detachmentsMap.keys()) {
          const dNorm = normalizeDetName(detName);
          if (dNorm.includes(norm) || norm.includes(dNorm)) {
            matches.push(detName);
          }
        }
        if (matches.length === 1) return matches[0];
      }
      return null;
    };

    const parseEnhancementEntry = (rawEntry, topGroup, subGroup, subGroupLink = null, unitOwnerName = null) => {
      if (!rawEntry) return;
      const entry = rawEntry.targetId ? (allEntriesById.get(rawEntry.targetId) || rawEntry) : rawEntry;
      if (!entry || entry.hidden) return;

      const pts = extractOptionPts(rawEntry);
      const hasEnhCost = (entry.costs || []).some(c => c.name === 'Enhancements' || c.typeId === 'f759-1bc4-cb3a-f0d2');
      if (pts <= 0 && !hasEnhCost) return;

      let isVisibleForCatalogue = true;
      let detectedDetachment = null;
      const requiredKeywords = unitOwnerName ? [unitOwnerName] : [];
      const anyOfKeywords = [];
      const excludedKeywords = [];

      const addUnique = (arr, val) => {
        if (val && !arr.includes(val)) arr.push(val);
      };

      const resolveCondTargetName = (childId) => {
        if (!childId) return null;
        const obj = allEntriesById.get(childId);
        if (!obj || !obj.name) return null;
        if (obj.name === 'Configuration' || obj.name === 'Detachment') return null;
        return obj.name;
      };

      const walkConditionNode = (condList, cgList, groupType = 'and') => {
        if (condList && condList.length > 0) {
          const unitNotInstance = [];
          const unitInstance = [];
          let hasForceCondition = false;

          for (const cond of condList) {
            if (!cond) continue;
            const isRosterOrForce = cond.scope === 'roster' || cond.scope === 'force';
            const isMissingSelectionCheck =
              (cond.type === 'lessThan' && Number(cond.value) === 1) ||
              (cond.type === 'equalTo' && Number(cond.value) === 0);

            if (cond.scope === 'primary-catalogue') {
              if (cond.type === 'notInstanceOf' && cond.childId !== primaryCat.id && (!parentCat || cond.childId !== parentCat.id)) {
                isVisibleForCatalogue = false;
              }
              if (cond.type === 'instanceOf' && cond.childId === primaryCat.id) {
                isVisibleForCatalogue = false;
              }
            } else if (
              isRosterOrForce &&
              isMissingSelectionCheck &&
              cond.childId &&
              cond.childId !== 'cac3-71d1-ea4b-795d' &&
              cond.childId !== entry.id &&
              cond.childId !== rawEntry.id
            ) {
              hasForceCondition = true;
              const tName = resolveCondTargetName(cond.childId);
              if (tName) {
                const matchedAllowed = findAllowedDetachmentName(tName);
                if (matchedAllowed) {
                  detectedDetachment = matchedAllowed;
                } else if (!detectedDetachment) {
                  detectedDetachment = tName;
                }
              }
            } else if (isRosterOrForce || cond.ChildId === 'cac3-71d1-ea4b-795d' || cond.childId === 'cac3-71d1-ea4b-795d') {
              hasForceCondition = true;
            } else if (['ancestor', 'parent', 'self', 'unit', 'model'].includes(cond.scope)) {
              const kName = resolveCondTargetName(cond.childId);
              if (kName && cond.childId !== entry.id && cond.childId !== rawEntry.id) {
                if (cond.type === 'notInstanceOf') unitNotInstance.push(kName);
                else if (cond.type === 'instanceOf') unitInstance.push(kName);
              }
            }
          }

          if (groupType === 'or') {
            unitNotInstance.forEach(k => addUnique(requiredKeywords, k));
            unitInstance.forEach(k => addUnique(excludedKeywords, k));
          } else {
            if (unitNotInstance.length > 1) {
              const comboKey = unitNotInstance.join('|');
              if (!anyOfKeywords.some(g => g.join('|') === comboKey)) {
                anyOfKeywords.push(unitNotInstance);
              }
            } else if (unitNotInstance.length === 1 && !hasForceCondition) {
              addUnique(requiredKeywords, unitNotInstance[0]);
            }
            if (unitInstance.length === 1 && unitNotInstance.length === 0 && !hasForceCondition) {
              addUnique(excludedKeywords, unitInstance[0]);
            }
          }
        }

        if (cgList && cgList.length > 0) {
          for (const cg of cgList) {
            if (!cg) continue;
            walkConditionNode(cg.conditions, cg.conditionGroups, cg.type || 'and');
          }
        }
      };

      const inspectHiddenModifiers = (node) => {
        if (!node) return;
        const allMods = [
          ...(node.modifiers || []),
          ...((node.modifierGroups || []).flatMap(mg => mg.modifiers || []))
        ];
        for (const m of allMods) {
          if (m && m.field === 'hidden' && m.type === 'set' && (m.value === true || m.value === 'true')) {
            walkConditionNode(m.conditions, m.conditionGroups, 'and');
          }
        }
      };

      if (topGroup) inspectHiddenModifiers(topGroup);
      if (subGroupLink && subGroupLink !== subGroup) inspectHiddenModifiers(subGroupLink);
      if (subGroup) inspectHiddenModifiers(subGroup);
      inspectHiddenModifiers(rawEntry);
      if (entry !== rawEntry) inspectHiddenModifiers(entry);

      if (!isVisibleForCatalogue) return;

      const tryFallbackDetachment = (candidateStr, stripEnhSuffix = false) => {
        if (!candidateStr) return null;
        const cleaned = stripEnhSuffix ? candidateStr.replace(/\s*Enhancements.*$/i, '').trim() : candidateStr;
        return findAllowedDetachmentName(cleaned, true);
      };

      if (!detectedDetachment || !findAllowedDetachmentName(detectedDetachment)) {
        const fallbackCandidates = [
          [entry.comment, false],
          [rawEntry.comment, false],
          [subGroup && subGroup.comment, false],
          [topGroup && topGroup.comment, false],
          [subGroup && subGroup.name, true],
          [subGroupLink && subGroupLink.name, true],
          [topGroup && topGroup.name, true]
        ];
        for (const [cand, stripSuffix] of fallbackCandidates) {
          const matched = tryFallbackDetachment(cand, stripSuffix);
          if (matched) {
            detectedDetachment = matched;
            break;
          }
        }
      }

      let finalDetachment = null;
      if (detectedDetachment) {
        finalDetachment = findAllowedDetachmentName(detectedDetachment, true);
        if (!finalDetachment) return;
      } else if (subGroup && subGroup.name && !normalizeDetName(subGroup.name).startsWith('enhancement')) {
        return;
      }

      let maxPerRoster = 1;
      const allC = [...(rawEntry.constraints || []), ...(entry.constraints || [])];
      for (const c of allC) {
        if (c.type === 'max' && c.field === 'selections' && (c.scope === 'roster' || c.scope === 'force')) {
          const v = Number(c.value);
          if (v > maxPerRoster) maxPerRoster = v;
        }
      }

      const profiles = extractOptionProfiles(entry);
      const statModifiers = extractStatAndRuleModifiers(entry, profiles);

      let desc = '';
      const abilityProfile = profiles.find(p => p.type === 'ability' && p.description);
      if (abilityProfile) {
        desc = abilityProfile.description;
      } else if (entry.profiles && entry.profiles[0]) {
        const c = getCharacteristics(entry.profiles[0]);
        desc = c['Description'] || '';
      }
      if (!desc) {
        const weapProfile = profiles.find(p => p.type === 'ranged' || p.type === 'melee');
        if (weapProfile) {
          const skillStr = weapProfile.type === 'ranged' ? `BS:${weapProfile.BS}` : `WS:${weapProfile.WS}`;
          desc = `Grants ${weapProfile.name} (${weapProfile.range} A:${weapProfile.A} ${skillStr} S:${weapProfile.S} AP:${weapProfile.AP} D:${weapProfile.D}${weapProfile.keywords ? ` [${weapProfile.keywords}]` : ''})`;
        }
      }

      const topGroupId = unitOwnerName ? undefined : (topGroup ? topGroup.id : undefined);
      const isUpgrade = Boolean(unitOwnerName) ||
                        entry.name.toLowerCase().includes('(upgrade)') ||
                        maxPerRoster > 1 ||
                        Boolean(topGroup && topGroup.name && topGroup.name.toLowerCase().includes('upgrade'));

      const existingEnh = enhancementsList.find(e => e.name === entry.name && e.detachment === (finalDetachment || undefined));
      if (!existingEnh) {
        enhancementsList.push({
          id: entry.id,
          name: entry.name,
          pts,
          description: desc,
          isUpgrade,
          groupId: topGroupId,
          detachment: finalDetachment || undefined,
          maxPerRoster,
          requiredKeywords: requiredKeywords.length > 0 ? requiredKeywords : undefined,
          anyOfKeywords: anyOfKeywords.length > 0 ? anyOfKeywords : undefined,
          excludedKeywords: excludedKeywords.length > 0 ? excludedKeywords : undefined,
          profiles: profiles.length > 0 ? profiles : undefined,
          statModifiers: statModifiers.length > 0 ? statModifiers : undefined
        });
      } else if (unitOwnerName) {
        existingEnh.groupId = undefined;
        existingEnh.isUpgrade = true;
        if (existingEnh.requiredKeywords && existingEnh.requiredKeywords.length === 1) {
          const prevUnit = existingEnh.requiredKeywords[0];
          if (prevUnit !== unitOwnerName) {
            delete existingEnh.requiredKeywords;
            existingEnh.anyOfKeywords = [[prevUnit, unitOwnerName]];
          }
        } else if (existingEnh.anyOfKeywords && existingEnh.anyOfKeywords.length > 0) {
          if (!existingEnh.anyOfKeywords[0].includes(unitOwnerName)) {
            existingEnh.anyOfKeywords[0].push(unitOwnerName);
          }
        }
      }
    };

    const processSubGroupEntries = (subGLink, topG, unitOwnerName = null) => {
      const resSubG = subGLink.targetId ? (allEntriesById.get(subGLink.targetId) || subGLink) : subGLink;
      if (!resSubG || resSubG.hidden) return;
      if (resSubG.selectionEntries) {
        for (const e of resSubG.selectionEntries) {
          parseEnhancementEntry(e, topG, resSubG, subGLink, unitOwnerName);
        }
      }
      if (resSubG.entryLinks) {
        for (const l of resSubG.entryLinks) {
          if (l.type === 'selectionEntryGroup') {
            processSubGroupEntries(l, topG, unitOwnerName);
          } else {
            parseEnhancementEntry(l, topG, resSubG, subGLink, unitOwnerName);
          }
        }
      }
    };

    const processEnhancementGroup = (topG, unitOwnerName = null) => {
      if (!topG || topG.hidden) return;
      if (topG.selectionEntries) {
        for (const e of topG.selectionEntries) {
          parseEnhancementEntry(e, topG, null, null, unitOwnerName);
        }
      }
      if (topG.entryLinks) {
        for (const l of topG.entryLinks) {
          if (l.type === 'selectionEntryGroup') {
            processSubGroupEntries(l, topG, unitOwnerName);
          } else {
            parseEnhancementEntry(l, topG, null, null, unitOwnerName);
          }
        }
      }
      if (topG.selectionEntryGroups) {
        for (const subG of topG.selectionEntryGroups) {
          processSubGroupEntries(subG, topG, unitOwnerName);
        }
      }
    };

    // Collect enhancement groups and identify child groups linked inside parent enhancement groups
    const allEnhGroups = [];
    const linkedChildGroupIds = new Set();
    for (const cat of allowedCats) {
      for (const g of [...(cat.sharedSelectionEntryGroups || []), ...(cat.selectionEntryGroups || [])]) {
        if (g.name && g.name.toLowerCase().includes('enhancement')) {
          allEnhGroups.push(g);
          for (const l of g.entryLinks || []) {
            if (l.type === 'selectionEntryGroup' && l.targetId) {
              linkedChildGroupIds.add(l.targetId);
            }
          }
        }
      }
    }

    for (const g of allEnhGroups) {
      if (!linkedChildGroupIds.has(g.id)) {
        processEnhancementGroup(g);
      }
    }

    // Also extract unit-embedded enhancement groups and detachment-gated upgrades
    for (const cat of allowedCats) {
      const units = [...(cat.sharedSelectionEntries || []), ...(cat.selectionEntries || [])].filter(
        u => u && (u.type === 'unit' || u.type === 'model')
      );
      for (const u of units) {
        for (const g of u.selectionEntryGroups || []) {
          if (g && !g.hidden && g.name && g.name.toLowerCase().includes('enhancement')) {
            processEnhancementGroup(g, u.name);
          }
        }
        for (const l of u.entryLinks || []) {
          if (
            l &&
            !l.hidden &&
            l.type === 'selectionEntryGroup' &&
            (l.name || '').toLowerCase().includes('enhancement') &&
            (l.selectionEntries || l.entryLinks || l.selectionEntryGroups)
          ) {
            processEnhancementGroup({ ...l, id: l.targetId || l.id }, u.name);
          }
        }

        const candidateEntries = [
          ...(u.selectionEntries || []),
          ...(u.selectionEntryGroups || []).flatMap(g => g.selectionEntries || [])
        ];
        for (const e of candidateEntries) {
          if (!e || !e.hidden || e.type !== 'upgrade') continue;
          const pts = extractOptionPts(e);
          if (pts <= 0) continue;

          let matchedDet = null;
          for (const mg of e.modifierGroups || []) {
            const unhideMod = (mg.modifiers || []).some(
              m => m.field === 'hidden' && m.type === 'set' && (m.value === false || m.value === 'false')
            );
            if (!unhideMod) continue;
            for (const cond of mg.conditions || []) {
              if (cond.type === 'atLeast' && Number(cond.value) === 1 && cond.childId) {
                const targetObj = allEntriesById.get(cond.childId);
                if (targetObj && targetObj.name) {
                  matchedDet = findAllowedDetachmentName(targetObj.name);
                  if (matchedDet) break;
                }
              }
            }
            if (matchedDet) break;
          }

          if (!matchedDet) continue;

          const profiles = extractOptionProfiles(e);
          const statModifiers = extractStatAndRuleModifiers(e, profiles);
          let desc = '';
          const abilityProfile = profiles.find(p => p.type === 'ability' && p.description);
          if (abilityProfile) {
            desc = abilityProfile.description;
          } else if (e.profiles && e.profiles[0]) {
            const c = getCharacteristics(e.profiles[0]);
            desc = c['Description'] || '';
          }

          if (!enhancementsList.some(x => x.name === e.name && x.detachment === matchedDet)) {
            enhancementsList.push({
              id: e.id,
              name: e.name,
              pts,
              description: desc,
              isUpgrade: true,
              groupId: u.id,
              detachment: matchedDet,
              maxPerRoster: 3,
              requiredKeywords: [u.name],
              profiles: profiles.length > 0 ? profiles : undefined,
              statModifiers: statModifiers.length > 0 ? statModifiers : undefined
            });
          }
        }
      }
    }

    return enhancementsList;
  }

  return {
    extractDetachmentConstraints,
    extractFactionDetachments,
    extractFactionEnhancements
  };
}

module.exports = {
  createDetachmentEnhancementParser
};

