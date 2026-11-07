const fs = require('fs');
const path = require('path');

const dataDir = path.resolve(__dirname, '..', 'data_repo');
const outDir = path.resolve(__dirname, 'data');
const factionsOutDir = path.resolve(outDir, 'factions');

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
if (!fs.existsSync(factionsOutDir)) fs.mkdirSync(factionsOutDir, { recursive: true });

console.log('Loading catalogues from:', dataDir);

// 1. Index all catalogues
const allCatalogues = new Map();
const cataloguesById = new Map();

const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json'));
let gameSystem = null;

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

console.log(`Loaded ${allCatalogues.size} catalogues. GameSystem: ${gameSystem ? gameSystem.name : 'none'}`);

// Global index of all entries, groups, and links by ID
const allEntriesById = new Map();
function indexCatalogueItems(item) {
  if (!item || typeof item !== 'object') return;
  if (item.id) allEntriesById.set(item.id, item);
  if (item.selectionEntries) item.selectionEntries.forEach(indexCatalogueItems);
  if (item.selectionEntryGroups) item.selectionEntryGroups.forEach(indexCatalogueItems);
  if (item.sharedSelectionEntries) item.sharedSelectionEntries.forEach(indexCatalogueItems);
  if (item.sharedSelectionEntryGroups) item.sharedSelectionEntryGroups.forEach(indexCatalogueItems);
  if (item.entryLinks) item.entryLinks.forEach(indexCatalogueItems);
}

for (const cat of allCatalogues.values()) {
  indexCatalogueItems(cat);
}

// Helper: Resolve entry by ID
function resolveEntry(targetId, cat, visited = new Set()) {
  if (!targetId) return null;
  if (allEntriesById.has(targetId)) return allEntriesById.get(targetId);
  return null;
}

// Helper: Collect all catalogues in dependency tree
function getCatalogueHierarchy(cat, visited = new Set()) {
  if (visited.has(cat.id)) return [];
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

// Helper: Extract characteristics from a profile
function getCharacteristics(profile) {
  const chars = {};
  if (profile.characteristics) {
    for (const c of profile.characteristics) {
      chars[c.name] = c.$text || c.value || '';
    }
  }
  return chars;
}

// Helper: Recursively search for profiles in an entry and its children
function extractProfiles(entry, visited = new Set()) {
  if (!entry || visited.has(entry.id)) return [];
  visited.add(entry.id);

  const profiles = [];
  if (entry.profiles) {
    for (const p of entry.profiles) {
      profiles.push(p);
    }
  }

  if (entry.selectionEntries) {
    for (const child of entry.selectionEntries) {
      profiles.push(...extractProfiles(child, visited));
    }
  }

  if (entry.selectionEntryGroups) {
    for (const group of entry.selectionEntryGroups) {
      if (group.selectionEntries) {
        for (const child of group.selectionEntries) {
          profiles.push(...extractProfiles(child, visited));
        }
      }
    }
  }

  return profiles;
}

// Semantic Constraint Extractor for Detachments
function extractDetachmentConstraints(entry, primaryCatId) {
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
  const rules = entry.rules || [];
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
  if (/cannot include (?:any )?(?:Adeptus Astartes )?units drawn from any other Chapter/i.test(fullText)) {
    constraints.exclusiveChapters = true;
  }

  // Synergy detection (e.g., Vulkan He'stan buffs Infernus Squad)
  const synergyRegex = /If your army includes a\s+([^\.]+?)\s+unit,\s*friendly\s+([^\.]+?)\s+units\s+(?:have|gain)/gi;
  let synMatch;
  while ((synMatch = synergyRegex.exec(fullText)) !== null) {
    constraints.synergies.push({
      requiredUnit: synMatch[1].replace(/[*^]/g, '').trim(),
      beneficiaryUnit: synMatch[2].replace(/[*^]/g, '').trim(),
      effect: "Grants special action and shooting resilience"
    });
  }

  return constraints;
}

// Helper: Parse unit data
function parseUnit(entry, primaryCat) {
  const costs = entry.costs || [];
  const ptsCost = costs.find(c => c.name === 'pts');
  const baseCost = ptsCost ? Number(ptsCost.value) || 0 : 0;

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

  // Unit stat profile
  const unitProfile = allProfiles.find(p => p.typeName === 'Unit');
  let stats = null;
  if (unitProfile) {
    const chars = getCharacteristics(unitProfile);
    stats = {
      name: unitProfile.name || entry.name,
      M: chars['M'] || chars['Movement'] || '-',
      T: chars['T'] || chars['Toughness'] || '-',
      Sv: chars['Sv'] || chars['Save'] || '-',
      InSv: chars['InSv'] || chars['Invulnerable Save'] || '',
      W: chars['W'] || chars['Wounds'] || '-',
      Ld: chars['LD'] || chars['Ld'] || chars['Leadership'] || '-',
      OC: chars['OC'] || chars['Objective Control'] || '-',
      Base: chars['Base'] || ''
    };
  } else {
    stats = {
      name: entry.name,
      M: '6"', T: '4', Sv: '3+', InSv: '', W: '2', Ld: '6+', OC: '1', Base: '32mm'
    };
  }

  // Weapons
  const rangedWeapons = [];
  const meleeWeapons = [];
  const seenWeapons = new Set();

  for (const p of allProfiles) {
    if (p.typeName === 'Ranged Weapons' || p.typeName === 'Ranged Weapon') {
      if (!seenWeapons.has(p.name)) {
        seenWeapons.add(p.name);
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
      if (!seenWeapons.has(p.name)) {
        seenWeapons.add(p.name);
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
  let canLead = [];

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

        if (p.name.toLowerCase() === 'leader') {
          // Extract bodyguard units
          const match = desc.match(/attached to the following units?:\s*([^\.]+)/i);
          if (match && match[1]) {
            canLead = match[1]
              .split(/,|\n/)
              .map(s => s.trim().replace(/^[\*\^]+|[\*\^]+$/g, ''))
              .filter(s => s.length > 0 && !s.toLowerCase().startsWith('this model'));
          }
        }
      }
    }
  }

  // Model counts and point tiers
  let minModels = 1;
  let maxModels = 1;
  const costTiers = [{ models: minModels, cost: baseCost }];

  // Squad size groups
  if (entry.selectionEntryGroups) {
    for (const g of entry.selectionEntryGroups) {
      if (g.constraints) {
        const minC = g.constraints.find(c => c.type === 'min' && c.field === 'selections');
        const maxC = g.constraints.find(c => c.type === 'max' && c.field === 'selections');
        if (minC && minC.value > minModels) minModels = Number(minC.value);
        if (maxC && maxC.value > maxModels) maxModels = Number(maxC.value);
      }
    }
  }

  // Modifiers for point scaling
  if (entry.modifiers) {
    for (const m of entry.modifiers) {
      if (m.field === '51b2-306e-1021-d207' && m.type === 'set') {
        const val = Number(m.value) || 0;
        if (m.conditions && m.conditions[0]) {
          const condVal = Number(m.conditions[0].value) || maxModels;
          if (val > 0 && !costTiers.some(t => t.cost === val)) {
            costTiers.push({ models: condVal, cost: val });
          }
        }
      }
    }
  }

  // Transport Capacity
  let transportCapacity = null;
  const transportProfile = allProfiles.find(p => p.typeName && p.typeName.toLowerCase().includes('transport'));
  if (transportProfile) {
    const c = getCharacteristics(transportProfile);
    transportCapacity = c['Capacity'] || c['Description'] || 'Transport';
  }

  return {
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
    isLeader,
    isSupport,
    canLead,
    baseCost,
    minModels,
    maxModels,
    costTiers,
    stats,
    rangedWeapons,
    meleeWeapons,
    abilities,
    transportCapacity
  };
}

// 2. Playable Factions Setup
const playableFactions = [];

for (const [file, cat] of allCatalogues.entries()) {
  if (file === 'Warhammer 40,000.json' || cat.library) continue;

  let superFaction = 'Xenos';
  if (file.startsWith('Imperium') || cat.name.includes('Imperium')) {
    superFaction = 'Imperium';
  } else if (file.startsWith('Chaos') || cat.name.includes('Chaos')) {
    superFaction = 'Chaos';
  } else if (file.startsWith('Aeldari')) {
    superFaction = 'Aeldari';
  } else if (file.includes('Unaligned')) {
    superFaction = 'Unaligned';
  }

  let parentFaction = null;
  let isSubFaction = false;

  // Space Marine Chapters
  if (cat.name.includes('Adeptus Astartes') && !cat.name.endsWith('Space Marines')) {
    parentFaction = 'imperium-space-marines';
    isSubFaction = true;
  }

  const id = file.replace('.json', '').toLowerCase().replace(/[^a-z0-9]+/g, '-');

  playableFactions.push({
    id,
    catalogueId: cat.id,
    file,
    rawName: cat.name,
    name: cat.name
      .replace(/^Imperium - Adeptus Astartes - /, '')
      .replace(/^Imperium - /, '')
      .replace(/^Chaos - /, '')
      .replace(/^Xenos - /, '')
      .replace(/^Aeldari - /, ''),
    superFaction,
    isSubFaction,
    parentFaction
  });
}

console.log(`Processing ${playableFactions.length} playable factions...`);

// 3. Process Each Faction
for (const faction of playableFactions) {
  const primaryCat = allCatalogues.get(faction.file);
  const hierarchy = getCatalogueHierarchy(primaryCat);
  const parentCat = faction.parentFaction ? allCatalogues.get(playableFactions.find(p => p.id === faction.parentFaction)?.file) : null;

  // Determine which catalogues belong strictly to this faction vs allied/foreign libraries
  const isDetachmentCatalogueAllowed = (c) => {
    if (c.id === primaryCat.id) return true;
    if (faction.isSubFaction && parentCat && c.id === parentCat.id) return true;
    const catName = (c.name || '').toLowerCase();
    const file = (faction.file || '').toLowerCase();

    // Specific internal libraries that belong to the faction itself
    if (file.includes('imperial knights') && catName.includes('imperial knights')) return true;
    if (file.includes('chaos knights') && catName.includes('chaos knights')) return true;
    if (file.includes('astra militarum') && catName.includes('astra militarum')) return true;
    if (file.includes('daemons') && (catName.includes('daemons') || catName.includes('daemon'))) return true;
    if (file.includes('tyranids') && catName.includes('tyranids')) return true;
    if (file.includes('aeldari') || file.includes('craftworlds') || file.includes('drukhari')) {
      if (catName.includes('aeldari library')) return true;
    }
    return false;
  };

  const allowedCats = hierarchy.filter(isDetachmentCatalogueAllowed);

  const unitsMap = new Map();
  const detachmentsMap = new Map();
  const enhancementsList = [];

  for (const cat of hierarchy) {
    const isAllowedCat = isDetachmentCatalogueAllowed(cat);

    // Process entryLinks
    if (cat.entryLinks) {
      for (const link of cat.entryLinks) {
        if (link.type === 'selectionEntry') {
          const target = resolveEntry(link.targetId, cat);
          if (target && (target.type === 'unit' || target.type === 'model')) {
            if (!unitsMap.has(target.id)) {
              const parsed = parseUnit(target, primaryCat);
              if (!isAllowedCat) {
                parsed.isAllied = true;
                parsed.primaryCategory = 'Allied Units';
              }
              unitsMap.set(target.id, parsed);
            }
          }
        }
      }
    }

    // Process sharedSelectionEntries directly
    if (cat.sharedSelectionEntries) {
      for (const entry of cat.sharedSelectionEntries) {
        if (entry.type === 'unit' || entry.type === 'model') {
          if (entry.costs && !unitsMap.has(entry.id)) {
            const isConfig = entry.categoryLinks && entry.categoryLinks.some(c => c.name === 'Configuration');
            if (!isConfig) {
              const parsed = parseUnit(entry, primaryCat);
              if (!isAllowedCat) {
                parsed.isAllied = true;
                parsed.primaryCategory = 'Allied Units';
              }
              unitsMap.set(entry.id, parsed);
            }
          }
        }
      }
    }

  }

  // --- FACTION-SCOPED DETACHMENTS & ENHANCEMENTS ---

  // Process Detachments recursively
  const searchDetachments = (item, inDetScope = false) => {
    if (!item) return;

    const isDetContainer = item.name && (
      item.name === 'Detachment' ||
      item.name.toLowerCase().includes('shield host detachments') ||
      item.name.toLowerCase().includes('chapter detachments')
    );
    const inScope = inDetScope || isDetContainer;

    // Check if this upgrade is a detachment
    const hasDpCost = item.costs && item.costs.some(c => (c.name === 'Detachment Points' || c.typeId === '82ae-1066-5107-6ae0') && Number(c.value) > 0);
    const has3DpCat = item.categoryLinks && item.categoryLinks.some(c => c.name === '3DP Detachment');
    const hasDetCat = item.categoryLinks && item.categoryLinks.some(c => c.name.toLowerCase().includes('detachment'));

    if (item.type === 'upgrade' && !isDetContainer && (hasDpCost || has3DpCat || (inScope && hasDetCat))) {
      // Evaluate primary-catalogue gating
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
        const constraints = extractDetachmentConstraints(item, primaryCat.id);

        // Detachment points cost
        const dpCostObj = item.costs ? item.costs.find(c => c.name === 'Detachment Points' || c.typeId === '82ae-1066-5107-6ae0') : null;
        let dpCost = dpCostObj ? Number(dpCostObj.value) || 0 : 0;
        if (item.categoryLinks && item.categoryLinks.some(c => c.name === '3DP Detachment')) dpCost = 3;

        // Tags
        const tags = item.categoryLinks ? item.categoryLinks.map(c => c.name.toUpperCase()) : [];

        // Rules
        const rules = [];
        if (item.rules) {
          for (const r of item.rules) {
            rules.push({ name: r.name, description: r.description || '' });
          }
        }

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

    // Recurse into children
    if (item.selectionEntries) item.selectionEntries.forEach(e => searchDetachments(e, inScope));
    if (item.selectionEntryGroups) item.selectionEntryGroups.forEach(g => searchDetachments(g, inScope));
    if (item.entryLinks) {
      item.entryLinks.forEach(l => {
        const target = resolveEntry(l.targetId, primaryCat);
        if (target) searchDetachments(target, inScope);
      });
    }
  };

  // Process Enhancements
  const searchEnhancements = (entries) => {
    if (!entries) return;
    for (const entry of entries) {
      if (entry.categoryLinks && entry.categoryLinks.some(c => c.name.toLowerCase().includes('enhancement') || c.name.toLowerCase().includes('upgrade'))) {
        const ptsCost = entry.costs ? entry.costs.find(c => c.name === 'pts') : null;
        const pts = ptsCost ? Number(ptsCost.value) || 0 : 0;
        if (pts > 0) {
          let desc = '';
          if (entry.profiles && entry.profiles[0]) {
            const c = getCharacteristics(entry.profiles[0]);
            desc = c['Description'] || '';
          }
          if (!enhancementsList.some(e => e.name === entry.name)) {
            enhancementsList.push({
              id: entry.id,
              name: entry.name,
              pts,
              description: desc,
              isUpgrade: entry.type === 'upgrade' || (entry.categoryLinks && entry.categoryLinks.some(c => c.name.toLowerCase() === 'upgrade'))
            });
          }
        }
      }
    }
  };

  for (const cat of allowedCats) {
    // 1. Root entry links named Detachment
    if (cat.entryLinks) {
      for (const l of cat.entryLinks) {
        if (l.name === 'Detachment') {
          const target = resolveEntry(l.targetId, cat);
          if (target) searchDetachments(target, true);
        }
      }
    }
    // 2. Shared selection entries
    if (cat.sharedSelectionEntries) {
      for (const e of cat.sharedSelectionEntries) {
        if (e.name === 'Detachment') searchDetachments(e, true);
      }
    }
    // 3. Shared selection entry groups
    if (cat.sharedSelectionEntryGroups) {
      for (const g of cat.sharedSelectionEntryGroups) {
        if (g.name.toLowerCase().includes('detachment')) searchDetachments(g, true);
      }
    }

    // Enhancements
    if (cat.sharedSelectionEntries) searchEnhancements(cat.sharedSelectionEntries);
    if (cat.sharedSelectionEntryGroups) {
      for (const g of cat.sharedSelectionEntryGroups) {
        if (g.name.toLowerCase().includes('enhancement')) searchEnhancements(g.selectionEntries);
      }
    }
  }

  // Filter out invalid/empty units
  const units = [...unitsMap.values()].filter(u => u.name && u.baseCost >= 0);

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

  const outFilePath = path.join(factionsOutDir, `${faction.id}.json`);
  fs.writeFileSync(outFilePath, JSON.stringify(factionData, null, 2), 'utf8');
}

// 4. Write Factions Index
const factionsIndex = playableFactions.map(f => {
  const subFactions = playableFactions.filter(sub => sub.parentFaction === f.id).map(sub => ({ id: sub.id, name: sub.name }));
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

fs.writeFileSync(path.join(outDir, 'factions_index.json'), JSON.stringify(factionsIndex, null, 2), 'utf8');
console.log(`\nSuccessfully indexed ${factionsIndex.length} factions into ${outDir}`);
