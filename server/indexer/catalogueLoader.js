const fs = require('fs');
const path = require('path');

/**
 * Loads all BSData catalogues and gameSystem from dataDir and builds global ID lookups.
 */
function loadCatalogues(dataDir) {
  console.log('Loading catalogues from:', dataDir);

  const allCatalogues = new Map();
  const cataloguesById = new Map();
  const allEntriesById = new Map();
  let gameSystem = null;

  const files = fs.readdirSync(dataDir).filter((f) => f.endsWith('.json'));

  for (const file of files) {
    try {
      const raw = JSON.parse(fs.readFileSync(path.join(dataDir, file), 'utf8'));
      if (raw.gameSystem) {
        gameSystem = raw.gameSystem;
      } else if (raw.catalogue) {
        const cat = raw.catalogue;
        cat._file = file;
        allCatalogues.set(file, cat);
        cataloguesById.set(cat.id, cat);
      }
    } catch (err) {
      console.error(`Error loading ${file}:`, err.message);
    }
  }

  console.log(
    `Loaded ${allCatalogues.size} catalogues. GameSystem: ${gameSystem ? gameSystem.name : 'none'}`
  );

  function indexCatalogueItems(item) {
    if (!item || typeof item !== 'object') return;
    if (item.id) allEntriesById.set(item.id, item);
    if (item.selectionEntries) item.selectionEntries.forEach(indexCatalogueItems);
    if (item.selectionEntryGroups) item.selectionEntryGroups.forEach(indexCatalogueItems);
    if (item.sharedSelectionEntries) item.sharedSelectionEntries.forEach(indexCatalogueItems);
    if (item.sharedSelectionEntryGroups) item.sharedSelectionEntryGroups.forEach(indexCatalogueItems);
    if (item.entryLinks) item.entryLinks.forEach(indexCatalogueItems);
    if (item.sharedProfiles) item.sharedProfiles.forEach(indexCatalogueItems);
    if (item.sharedRules) item.sharedRules.forEach(indexCatalogueItems);
    if (item.profiles) item.profiles.forEach(indexCatalogueItems);
    if (item.rules) item.rules.forEach(indexCatalogueItems);
    if (item.categoryEntries) item.categoryEntries.forEach(indexCatalogueItems);
    if (item.categoryLinks) {
      item.categoryLinks.forEach((cl) => {
        if (cl.targetId && cl.name && !allEntriesById.has(cl.targetId)) {
          allEntriesById.set(cl.targetId, { id: cl.targetId, name: cl.name });
        }
      });
    }
  }

  if (gameSystem) {
    indexCatalogueItems(gameSystem);
  }
  for (const cat of allCatalogues.values()) {
    indexCatalogueItems(cat);
  }

  function resolveEntry(targetId) {
    if (!targetId) return null;
    return allEntriesById.get(targetId) || null;
  }

  function getCatalogueHierarchy(cat, visited = new Set()) {
    if (!cat || visited.has(cat.id)) return [];
    visited.add(cat.id);
    const result = [cat];
    if (cat.catalogueLinks) {
      for (const link of cat.catalogueLinks) {
        const linked = cataloguesById.get(link.targetId);
        if (linked) {
          result.push(...getCatalogueHierarchy(linked, visited));
        }
      }
    }
    return result;
  }

  function getCharacteristics(profile) {
    const chars = {};
    if (profile && profile.characteristics) {
      for (const c of profile.characteristics) {
        chars[c.name] = c.$text || c.value || '';
      }
    }
    return chars;
  }

  function extractProfiles(entry, visited = new Set()) {
    if (!entry || visited.has(entry.id)) return [];
    visited.add(entry.id);

    const profiles = [];
    if (entry.profiles) {
      for (const p of entry.profiles) {
        if (!isHiddenByDefault(p)) {
          profiles.push(p);
        }
      }
    }
    const isUnitOrModel = entry.type === 'unit' || entry.type === 'model';
    if (isUnitOrModel && entry.rules) {
      for (const r of entry.rules) {
        if (r && !isHiddenByDefault(r) && r.name && r.description !== undefined) {
          profiles.push({
            name: r.name,
            typeName: 'Abilities',
            characteristics: [{ name: 'Description', $text: r.description || '' }]
          });
        }
      }
    }
    if (entry.infoLinks) {
      for (const il of entry.infoLinks) {
        if (isHiddenByDefault(il)) continue;
        if (il.targetId && allEntriesById.has(il.targetId)) {
          const target = allEntriesById.get(il.targetId);
          if (target && !isHiddenByDefault(target)) {
            const resolvedName = resolveInfoLinkName(il, target);
            if (target.typeName) {
              profiles.push(resolvedName !== target.name ? { ...target, name: resolvedName } : target);
            } else if (isUnitOrModel && target.name && target.description !== undefined) {
              profiles.push({
                name: resolvedName,
                typeName: 'Abilities',
                characteristics: [{ name: 'Description', $text: target.description || '' }]
              });
            }
          }
        }
      }
    }

    if (entry.selectionEntries) {
      for (const child of entry.selectionEntries) {
        profiles.push(...extractProfiles(child, visited));
      }
    }

    if (entry.entryLinks) {
      for (const l of entry.entryLinks) {
        if (
          l.name &&
          (l.name.includes('Weapon Modifications') ||
            l.name.includes('Weapon Upgrades') ||
            l.name.includes('Enhancement') ||
            l.name.includes('Crusade') ||
            l.name.includes('Honours'))
        ) {
          continue;
        }
        profiles.push(...extractProfiles(l, visited));
        if (l.targetId && allEntriesById.has(l.targetId)) {
          profiles.push(...extractProfiles(allEntriesById.get(l.targetId), visited));
        }
      }
    }

    if (entry.selectionEntryGroups) {
      for (const group of entry.selectionEntryGroups) {
        if (
          group.name &&
          (group.name.includes('Enhancement') ||
            group.name.includes('Crusade') ||
            group.name.includes('Weapon Modifications') ||
            group.name.includes('Weapon Upgrades'))
        ) {
          continue;
        }
        if (group.selectionEntries) {
          for (const child of group.selectionEntries) {
            profiles.push(...extractProfiles(child, visited));
          }
        }
        if (group.entryLinks) {
          for (const l of group.entryLinks) {
            if (
              l.name &&
              (l.name.includes('Weapon Modifications') ||
                l.name.includes('Weapon Upgrades') ||
                l.name.includes('Enhancement') ||
                l.name.includes('Crusade'))
            ) {
              continue;
            }
            profiles.push(...extractProfiles(l, visited));
            if (l.targetId && allEntriesById.has(l.targetId)) {
              profiles.push(...extractProfiles(allEntriesById.get(l.targetId), visited));
            }
          }
        }
        if (group.selectionEntryGroups) {
          for (const subGroup of group.selectionEntryGroups) {
            profiles.push(...extractProfiles(subGroup, visited));
          }
        }
      }
    }

    return profiles;
  }

  return {
    allCatalogues,
    cataloguesById,
    allEntriesById,
    gameSystem,
    resolveEntry,
    getCatalogueHierarchy,
    getCharacteristics,
    extractProfiles
  };
}

function evalDefaultCondition(c) {
  if (!c) return null;
  if (c.type === 'instanceOf' || c.type === 'notInstanceOf') {
    if (c.scope === 'force' || c.scope === 'roster') {
      return c.type === 'notInstanceOf';
    }
    return null;
  }
  if (c.field !== 'associations' && c.field !== 'selections' && c.field !== 'forces') {
    return null;
  }
  const target = Number(c.value);
  if (Number.isNaN(target)) return null;
  // In the default standalone datasheet state (no attached units, detachments, enhancements, or upgrades), count = 0
  if (c.type === 'lessThan') return 0 < target;
  if (c.type === 'atMost') return 0 <= target;
  if (c.type === 'equalTo') return target === 0;
  if (c.type === 'atLeast') return 0 >= target;
  if (c.type === 'greaterThan') return 0 > target;
  return null;
}

function evalDefaultConditionTree(node, fallbackType = 'and') {
  if (!node) return true;
  const results = [];
  for (const c of node.conditions || []) {
    results.push(evalDefaultCondition(c));
  }
  for (const cg of node.conditionGroups || []) {
    results.push(evalDefaultConditionTree(cg, cg.type || 'and'));
  }
  if (results.length === 0) return true;
  const mode = node.type || fallbackType;
  if (mode === 'or') {
    if (results.some((r) => r === true)) return true;
    if (results.some((r) => r === null)) return null;
    return false;
  }
  if (results.some((r) => r === false)) return false;
  if (results.some((r) => r === null)) return null;
  return true;
}

/**
 * Returns true when a BSData profile, rule, or infoLink is hidden statically or
 * via a `field: "hidden", type: "set", value: true` modifier whose conditions
 * hold in a unit's standalone default state (e.g. requiring an attached Leader
 * or detachment/enhancement that is not active by default).
 */
function isHiddenByDefault(node) {
  if (!node) return false;
  if (node.hidden === true || node.hidden === 'true') return true;

  for (const m of node.modifiers || []) {
    if (m && m.field === 'hidden' && m.type === 'set' && (m.value === true || m.value === 'true')) {
      if (evalDefaultConditionTree(m) === true) return true;
    }
  }

  for (const mg of node.modifierGroups || []) {
    const groupApplies = evalDefaultConditionTree(mg);
    if (groupApplies !== true) continue;
    for (const m of mg.modifiers || []) {
      if (m && m.field === 'hidden' && m.type === 'set' && (m.value === true || m.value === 'true')) {
        if (evalDefaultConditionTree(m) === true) return true;
      }
    }
  }

  return false;
}

function applyNameModifier(name, m) {
  const val = m.value !== undefined && m.value !== null ? String(m.value) : '';
  if (!val) return name;
  if (m.type === 'set') return val;
  if (m.type === 'append') {
    const joiner = m.join !== undefined ? String(m.join).replace(/\u00a0/g, ' ') : ' ';
    return `${name}${joiner}${val}`;
  }
  if (m.type === 'prepend') {
    const joiner = m.join !== undefined ? String(m.join).replace(/\u00a0/g, ' ') : ' ';
    return `${val}${joiner}${name}`;
  }
  return name;
}

function isDefaultFallbackNameCondition(m) {
  if (!m.conditions || m.conditions.length === 0 || (m.conditionGroups && m.conditionGroups.length > 0)) {
    return false;
  }
  return m.conditions.every(
    (c) =>
      (c.childId === 'any' && c.type === 'atLeast' && Number(c.value) >= 1) ||
      (c.type === 'lessThan' && Number(c.value) <= 1) ||
      (c.type === 'equalTo' && Number(c.value) === 0)
  );
}

function resolveInfoLinkName(il, target) {
  let name = (il && il.name) || (target && target.name) || '';
  if (!name || !il || !Array.isArray(il.modifiers)) return name;

  const nameMods = il.modifiers.filter((m) => m.field === 'name');
  const unconditionalMods = nameMods.filter(
    (m) => (!m.conditions || m.conditions.length === 0) && (!m.conditionGroups || m.conditionGroups.length === 0)
  );

  if (unconditionalMods.length > 0) {
    for (const m of unconditionalMods) {
      name = applyNameModifier(name, m);
    }
  } else {
    const defaultMod = nameMods.find(isDefaultFallbackNameCondition);
    if (defaultMod) {
      name = applyNameModifier(name, defaultMod);
    }
  }

  return name.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}

module.exports = {
  loadCatalogues,
  resolveInfoLinkName
};

