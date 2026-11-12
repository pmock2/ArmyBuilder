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
        profiles.push(p);
      }
    }
    if (entry.infoLinks) {
      for (const il of entry.infoLinks) {
        if (il.targetId && allEntriesById.has(il.targetId)) {
          const target = allEntriesById.get(il.targetId);
          if (target && target.typeName) {
            profiles.push(target);
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

module.exports = {
  loadCatalogues
};

