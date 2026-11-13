/**
 * Syncs Legends unit status in client/public/data/factions/*.json
 * against Wahapedia's 11th Edition Datasheets.csv.
 *
 * Units in Wahapedia Legends source_ids or absent from Wahapedia's active
 * 11e Datasheets.csv (excluding Crucible/narrative tokens and known aliases)
 * are marked with `isLegends: true`.
 */

const fs = require('fs');
const path = require('path');

const WAHA_DATASHEETS = path.join(__dirname, '..', 'data_repo', 'wahapedia', 'Datasheets.csv');
const FACTIONS_DIR = path.join(__dirname, '..', 'client', 'public', 'data', 'factions');

const norm = (s) =>
  (s || '')
    .toLowerCase()
    .replace(/['’`]/g, "'")
    .replace(/\s*\[legends\]\s*/gi, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const LEGENDS_SOURCE_IDS = new Set([
  '000000353', '000000355', '000000356', '000000357', '000000358',
  '000000363', '000000364', '000000366', '000000368', '000000371',
  '000000374', '000000377', '000000379', '000000381', '000000383',
  '000000384', '000000397'
]);

// Active units whose BSData name differs slightly from Wahapedia
const ACTIVE_ALIASES = new Set([
  'captain sicarius',          // Cato Sicarius
  'lieutenant titus',          // Captain Titus
  'emperor s champion anointed', // Emperor's Champion (Anointed)
  'khorne soul grinder',       // Soul Grinder
  'nurgle soul grinder',       // Soul Grinder
  'slaanesh soul grinder',     // Soul Grinder
  'tzeentch soul grinder',     // Soul Grinder
  'jakhal'                     // Jakhals
]);

// Narrative / token entries that are not Wahapedia datasheets
const NON_UNIT_TOKENS = new Set([
  'sentry gun',
  'searchlight',
  'breaching robot',
  'spore mines biovore',
  'ripper swarms parasite of mortrex',
  'mucolid spores sporocyst',
  'spore mines harpy',
  'chaos spawn flesh change'
]);

const wahaLines = fs
  .readFileSync(WAHA_DATASHEETS, 'utf8')
  .split(/\r?\n/)
  .slice(1)
  .filter(Boolean);

const wahaActiveNames = new Set();
const wahaLegendsNames = new Set();

for (const line of wahaLines) {
  const cols = line.split('|');
  const name = norm(cols[1]);
  const sourceId = (cols[3] || '').trim();
  if (!name) continue;
  if (LEGENDS_SOURCE_IDS.has(sourceId)) {
    wahaLegendsNames.add(name);
  } else {
    wahaActiveNames.add(name);
  }
}

const files = fs.readdirSync(FACTIONS_DIR).filter((f) => f.endsWith('.json'));
let totalFilesUpdated = 0;
let totalNewlyMarked = 0;
const newlyMarkedNames = new Set();

for (const file of files) {
  const filePath = path.join(FACTIONS_DIR, file);
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  let changed = false;

  for (const u of data.units || []) {
    const rawName = u.name || '';
    const hasLegendsTag =
      rawName.toLowerCase().includes('legends') ||
      (Array.isArray(u.categories) && u.categories.some((c) => c.toLowerCase().includes('legends'))) ||
      (Array.isArray(u.keywords) && u.keywords.some((k) => k.toLowerCase().includes('legends')));

    if (hasLegendsTag) {
      if (u.isLegends !== true) {
        u.isLegends = true;
        changed = true;
      }
      continue;
    }

    if (rawName.includes('[Crucible]')) continue;

    const n = norm(rawName);
    if (NON_UNIT_TOKENS.has(n) || ACTIVE_ALIASES.has(n)) continue;

    const shouldBeLegends = !wahaActiveNames.has(n);
    if (shouldBeLegends && u.isLegends !== true) {
      u.isLegends = true;
      changed = true;
      totalNewlyMarked++;
      newlyMarkedNames.add(rawName);
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
    totalFilesUpdated++;
  }
}

console.log(`Updated ${totalFilesUpdated} faction files.`);
console.log(`Newly marked ${totalNewlyMarked} unit entries as isLegends: true.`);
console.log('Newly marked unique unit names:', [...newlyMarkedNames].sort());
