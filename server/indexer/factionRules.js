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

module.exports = {
  CHAPTER_KEYWORDS,
  ALL_CHAPTER_KEYWORDS,
  buildPlayableFactions,
  isDetachmentCatalogueAllowed,
  isUnitAllowedForFaction
};

