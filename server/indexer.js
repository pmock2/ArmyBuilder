const fs = require('fs');
const path = require('path');

const { loadCatalogues } = require('./indexer/catalogueLoader');
const { createModifiersParser } = require('./indexer/modifiersParser');
const { createWargearParser } = require('./indexer/wargearParser');
const { createUnitParser } = require('./indexer/unitParser');
const { createDetachmentEnhancementParser } = require('./indexer/detachmentEnhancementParser');
const {
  buildPlayableFactions,
  isDetachmentCatalogueAllowed,
  isUnitAllowedForFaction
} = require('./indexer/factionRules');

const dataDir = path.resolve(__dirname, '..', 'data_repo');
const outDir = path.join(__dirname, 'data');
const factionsOutDir = path.join(outDir, 'factions');
const clientPublicDataDir = path.join(__dirname, '..', 'client', 'public', 'data');
const clientPublicFactionsDir = path.join(clientPublicDataDir, 'factions');
const clientSrcDataDir = path.join(__dirname, '..', 'client', 'src', 'data');
const clientSrcFactionsDir = path.join(clientSrcDataDir, 'factions');

for (const d of [outDir, factionsOutDir, clientPublicDataDir, clientPublicFactionsDir, clientSrcDataDir, clientSrcFactionsDir]) {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

const startTime = Date.now();

// 1. Load all catalogues and initialize parser modules
const {
  allCatalogues,
  allEntriesById,
  resolveEntry,
  getCatalogueHierarchy,
  getCharacteristics,
  extractProfiles
} = loadCatalogues(dataDir);

const {
  extractOptionPts,
  extractStatAndRuleModifiers
} = createModifiersParser(allEntriesById);

const {
  extractOptionProfiles,
  extractWargearGroups,
  extractBaseProfileNames
} = createWargearParser({
  allEntriesById,
  getCharacteristics,
  extractOptionPts,
  extractStatAndRuleModifiers
});

const {
  parseUnit,
  computeLeaderSupportFlags
} = createUnitParser({
  allEntriesById,
  getCharacteristics,
  extractProfiles,
  extractWargearGroups,
  extractBaseProfileNames
});

const {
  extractFactionDetachments,
  extractFactionEnhancements
} = createDetachmentEnhancementParser({
  allEntriesById,
  resolveEntry,
  getCharacteristics,
  extractOptionPts,
  extractOptionProfiles,
  extractStatAndRuleModifiers
});

// 2. Discover playable factions
const playableFactions = buildPlayableFactions(allCatalogues);
console.log(`Processing ${playableFactions.length} playable factions...`);

// 3. Process each faction
for (const faction of playableFactions) {
  const primaryCat = allCatalogues.get(faction.file);
  const hierarchy = getCatalogueHierarchy(primaryCat);
  const parentCat = faction.parentFaction
    ? allCatalogues.get(playableFactions.find(p => p.id === faction.parentFaction)?.file)
    : null;

  const allowedCats = hierarchy.filter(c => isDetachmentCatalogueAllowed(c, faction, primaryCat, parentCat));
  const unitsMap = new Map();

  for (const cat of hierarchy) {
    const isAllowedCat = isDetachmentCatalogueAllowed(cat, faction, primaryCat, parentCat);

    // Process entryLinks
    if (cat.entryLinks) {
      for (const link of cat.entryLinks) {
        if (link.type === 'selectionEntry') {
          const target = resolveEntry(link.targetId, cat);
          if (target && (target.type === 'unit' || target.type === 'model') && !unitsMap.has(target.id)) {
            const parsed = parseUnit(target);
            if (!isAllowedCat) {
              parsed.isAllied = true;
              parsed.primaryCategory = 'Allied Units';
            }
            if (isUnitAllowedForFaction(parsed, faction)) {
              unitsMap.set(target.id, parsed);
            }
          }
        }
      }
    }

    // Process sharedSelectionEntries directly
    if (cat.sharedSelectionEntries) {
      for (const entry of cat.sharedSelectionEntries) {
        if ((entry.type === 'unit' || entry.type === 'model') && entry.costs && !unitsMap.has(entry.id)) {
          const isConfig = entry.categoryLinks && entry.categoryLinks.some(c => c.name === 'Configuration');
          if (!isConfig) {
            const parsed = parseUnit(entry);
            if (!isAllowedCat) {
              parsed.isAllied = true;
              parsed.primaryCategory = 'Allied Units';
            }
            if (isUnitAllowedForFaction(parsed, faction)) {
              unitsMap.set(entry.id, parsed);
            }
          }
        }
      }
    }
  }

  // Extract faction detachments & enhancements
  const detachmentsMap = extractFactionDetachments(allowedCats, primaryCat);
  const enhancementsList = extractFactionEnhancements(allowedCats, detachmentsMap, primaryCat, parentCat);

  // Filter out invalid/empty units and compute Leader/Support bodyguard eligibility
  const units = [...unitsMap.values()].filter(u => u.name && u.baseCost >= 0);
  computeLeaderSupportFlags(units);

  // Write faction JSON
  const factionData = {
    faction: {
      id: faction.id,
      catalogueId: faction.catalogueId,
      name: faction.name,
      rawName: faction.rawName,
      superFaction: faction.superFaction,
      isSubFaction: faction.isSubFaction,
      parentFaction: faction.parentFaction,
      file: faction.file
    },
    detachments: [...detachmentsMap.values()],
    enhancements: enhancementsList,
    units
  };

  const jsonStr = JSON.stringify(factionData, null, 2);
  fs.writeFileSync(path.join(factionsOutDir, `${faction.id}.json`), jsonStr, 'utf8');
  fs.writeFileSync(path.join(clientPublicFactionsDir, `${faction.id}.json`), jsonStr, 'utf8');
  fs.writeFileSync(path.join(clientSrcFactionsDir, `${faction.id}.json`), jsonStr, 'utf8');
}

// 4. Write Factions Index
const factionsIndex = playableFactions.map(f => {
  const subFactions = playableFactions
    .filter(sub => sub.parentFaction === f.id)
    .map(sub => ({ id: sub.id, name: sub.name }));
  return {
    id: f.id,
    catalogueId: f.catalogueId,
    name: f.name,
    rawName: f.rawName,
    superFaction: f.superFaction,
    isSubFaction: f.isSubFaction,
    parentFaction: f.parentFaction,
    subFactions
  };
});

const indexJsonStr = JSON.stringify(factionsIndex, null, 2);
fs.writeFileSync(path.join(outDir, 'factions_index.json'), indexJsonStr, 'utf8');
fs.writeFileSync(path.join(clientPublicDataDir, 'factions_index.json'), indexJsonStr, 'utf8');
fs.writeFileSync(path.join(clientSrcDataDir, 'factions_index.json'), indexJsonStr, 'utf8');

const elapsedMs = Date.now() - startTime;
console.log(`Successfully indexed ${factionsIndex.length} factions into ${outDir} in ${(elapsedMs / 1000).toFixed(2)}s`);
