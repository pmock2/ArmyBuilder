const CHAPTER_KEYWORDS = {
  'imperium-salamanders': 'Faction: Salamanders',
  'imperium-blood-angels': 'Faction: Blood Angels',
  'imperium-dark-angels': 'Faction: Dark Angels',
  'imperium-space-wolves': 'Faction: Space Wolves',
  'imperium-black-templars': 'Faction: Black Templars',
  'imperium-deathwatch': 'Faction: Deathwatch',
  'imperium-imperial-fists': 'Faction: Imperial Fists',
  'imperium-iron-hands': 'Faction: Iron Hands',
  'imperium-raven-guard': 'Faction: Raven Guard',
  'imperium-white-scars': 'Faction: White Scars',
  'imperium-ultramarines': 'Faction: Ultramarines'
};

const ALL_CHAPTER_KEYWORDS = [
  'Faction: Salamanders',
  'Faction: Blood Angels',
  'Faction: Dark Angels',
  'Faction: Space Wolves',
  'Faction: Black Templars',
  'Faction: Deathwatch',
  'Faction: Imperial Fists',
  'Faction: Iron Hands',
  'Faction: Raven Guard',
  'Faction: White Scars',
  'Faction: Ultramarines',
  'Faction: Blood Ravens',
  'Faction: Crimson Fists',
  'Faction: Flesh Tearers'
];

function buildPlayableFactions(allCatalogues) {
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

  return playableFactions;
}

function isDetachmentCatalogueAllowed(c, faction, primaryCat, parentCat) {
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
  if (file.includes('genestealer') && catName.includes('tyranids')) return true;
  if (file.includes('aeldari') || file.includes('craftworlds') || file.includes('drukhari')) {
    if (catName.includes('aeldari library')) return true;
  }
  return false;
}

function isUnitAllowedForFaction(parsed, faction) {
  const isAstartesFaction = faction.id === 'imperium-space-marines' ||
                            faction.parentFaction === 'imperium-space-marines' ||
                            faction.file.includes('Space Marines') ||
                            faction.file.includes('Adeptus Astartes');
  if (!isAstartesFaction) return true;

  const cats = parsed.categories || [];
  const unitChapterCats = cats.filter(c => ALL_CHAPTER_KEYWORDS.includes(c));

  const expectedChapter = CHAPTER_KEYWORDS[faction.id];
  if (expectedChapter) {
    if (unitChapterCats.length > 0 && !unitChapterCats.includes(expectedChapter)) {
      return false;
    }
  } else if (faction.id === 'imperium-space-marines') {
    if (unitChapterCats.length > 0) {
      return false;
    }
  }

  if (parsed.isAllied) {
    if (cats.some(c => c.toLowerCase().includes('deathwatch')) ||
        parsed.name.toLowerCase().includes('artemis') ||
        parsed.name.toLowerCase().includes('watch master') ||
        parsed.name.toLowerCase().includes('corvus blackstar')) {
      return false;
    }
  }

  return true;
}

const KNOWN_ARMY_RULE_NAMES = new Set([
  'Combat Doctrines',
  'Oath of Moment',
  'Battle Focus',
  'Power from Pain',
  'Reanimation Protocols',
  'Waaagh!',
  'For The Greater Good',
  'Acts of Faith',
  "Martial Ka'tah",
  'Doctrina Imperatives',
  'Assigned Agents',
  'Voice Of Command',
  'Gate of Infinity',
  'Code Chivalric',
  'Harbingers of Dread',
  'The Shadow of Chaos',
  'Dark Pacts',
  "Nurgle's Gift (Aura)",
  'Thrill Seekers',
  'Cabal of Sorcerers',
  'Blessings of Khorne',
  'Prioritised Efficiency',
  'Cult Ambush',
  'Synapse',
  'Shadow in the Warp',
  'Towering Example'
]);

function extractFactionArmyRules(allowedCats, faction, allEntriesById) {
  const found = new Map();

  for (const c of allowedCats) {
    if (faction.id === 'genestealer-cults' && (c.name || '').toLowerCase().includes('tyranids')) {
      continue;
    }
    for (const r of [...(c.rules || []), ...(c.sharedRules || [])]) {
      if (!r || r.hidden || !r.name || !r.description) continue;
      if (faction.id === 'aeldari-craftworlds' && r.name === 'Power from Pain') continue;
      if (faction.id === 'aeldari-drukhari' && r.name === 'Battle Focus') continue;
      if (KNOWN_ARMY_RULE_NAMES.has(r.name) && !found.has(r.name)) {
        found.set(r.name, r.description);
      }
    }
    for (const il of c.infoLinks || []) {
      if (!il || il.hidden || !il.targetId) continue;
      const t = allEntriesById.get(il.targetId);
      const name = il.name || (t && t.name);
      if (t && !t.hidden && name && KNOWN_ARMY_RULE_NAMES.has(name) && !found.has(name)) {
        found.set(name, t.description || '');
      }
    }
  }

  return [...found.entries()].map(([name, description]) => ({ name, description }));
}

module.exports = {
  CHAPTER_KEYWORDS,
  ALL_CHAPTER_KEYWORDS,
  buildPlayableFactions,
  isDetachmentCatalogueAllowed,
  isUnitAllowedForFaction,
  extractFactionArmyRules
};

