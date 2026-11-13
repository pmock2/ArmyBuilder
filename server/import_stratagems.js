/**
 * Imports 11th Edition Core & Detachment Stratagems, Last Update timestamp,
 * and Datasheet->Stratagem eligibility links from Wahapedia CSV exports.
 *
 * Usage:
 *   node server/import_stratagems.js          (uses local data_repo/wahapedia/*.csv)
 *   node server/import_stratagems.js --fetch  (downloads latest CSVs from Wahapedia first)
 */

const fs = require('fs');
const path = require('path');

const WAHA_BASE = 'https://wahapedia.ru/wh40k11ed';
const WAHA_DIR = path.resolve(__dirname, '..', 'data_repo', 'wahapedia');
const FACTIONS_DIR = path.resolve(__dirname, '..', 'client', 'public', 'data', 'factions');

const STRAT_CSV_PATH = path.join(WAHA_DIR, 'Stratagems.csv');
const DS_CSV_PATH = path.join(WAHA_DIR, 'Datasheets.csv');
const DS_STRAT_CSV_PATH = path.join(WAHA_DIR, 'Datasheets_stratagems.csv');
const LAST_UPDATE_CSV_PATH = path.join(WAHA_DIR, 'Last_update.csv');

const OUT_STRAT_PATH = path.resolve(__dirname, '..', 'client', 'src', 'data', 'stratagems_data.json');
const OUT_DS_STRAT_PATH = path.resolve(__dirname, '..', 'client', 'public', 'data', 'datasheet_stratagems.json');

function normalizeKey(name) {
  return (name || '')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function toTitleCase(str) {
  return (str || '')
    .toLowerCase()
    .replace(/(^|[\s\-\u2013\u2014'’])([a-z])/g, (_, sep, ch) => sep + ch.toUpperCase());
}

function mapTurn(rawTurn, convertedDesc) {
  const t = (rawTurn || '').toLowerCase();
  const whenLine = (convertedDesc || '').split('\n')[0].toLowerCase();

  // Catch occasional upstream Wahapedia turn-column typos when WHEN is unambiguous
  if (whenLine.includes('your ') && !whenLine.includes('opponent') && !whenLine.includes('either')) {
    return 'your';
  }
  if (whenLine.includes('opponent') && !whenLine.includes('your ') && !whenLine.includes('either')) {
    return 'opponent';
  }

  if (t.includes('opponent')) return 'opponent';
  if (t.includes('either')) return 'either';
  return 'your';
}

function mapPhase(rawPhase) {
  const p = (rawPhase || '').trim().toLowerCase();
  if (p === 'command phase') return 'Command';
  if (p === 'movement phase') return 'Movement';
  if (p === 'movement or charge phase') return 'Movement / Charge';
  if (p === 'shooting phase') return 'Shooting';
  if (p === 'shooting or charge phase') return 'Shooting / Charge';
  if (p === 'shooting or fight phase') return 'Shooting / Fight';
  if (p === 'charge phase') return 'Charge';
  if (p === 'charge or fight phase') return 'Charge / Fight';
  if (p === 'fight phase') return 'Fight';
  return 'Any Phase';
}

function decodeHtmlEntities(str) {
  return str
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&rsquo;/g, '’')
    .replace(/&lsquo;/g, '‘')
    .replace(/&ldquo;/g, '“')
    .replace(/&rdquo;/g, '”')
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function convertHtmlDescription(html) {
  if (!html) return '';

  let text = html;

  // Merge adjacent <span class="kwb">WORD1</span> <span class="kwb">WORD2</span> into one keyword badge
  let prev;
  do {
    prev = text;
    text = text.replace(
      /<span[^>]*class="[^"]*\bkwb\b[^"]*"[^>]*>(.*?)<\/span>(\s+|\/)<span[^>]*class="[^"]*\bkwb\b[^"]*"[^>]*>(.*?)<\/span>/gi,
      (_, a, sep, b) => `<span class="kwb">${a}${sep}${b}</span>`
    );
  } while (text !== prev);

  // Convert <span class="kwb">...</span> to ^^**...**^^ for FormattedText
  text = text.replace(/<span[^>]*class="[^"]*\bkwb\b[^"]*"[^>]*>(.*?)<\/span>/gi, (_, inner) => {
    const clean = inner.replace(/<[^>]+>/g, '').trim();
    return clean ? `^^**${clean}**^^` : '';
  });

  // Structural line breaks and lists
  text = text
    .replace(/<div[^>]*class="[^"]*str11Line[^"]*"[^>]*><\/div>/gi, '\n')
    .replace(/<br\s*\/?>\s*<br\s*\/?>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/li>\s*<li[^>]*>/gi, '\n• ')
    .replace(/<ul[^>]*>\s*<li[^>]*>/gi, '\n• ')
    .replace(/<\/li>\s*<\/ul>/gi, '\n')
    .replace(/<li[^>]*>/gi, '\n• ')
    .replace(/<\/li>/gi, '');

  // Bold / Italic
  text = text
    .replace(/<b[^>]*>(.*?)<\/b>/gi, (_, inner) => `**${inner.trim()}**`)
    .replace(/<strong[^>]*>(.*?)<\/strong>/gi, (_, inner) => `**${inner.trim()}**`)
    .replace(/<i[^>]*>(.*?)<\/i>/gi, (_, inner) => `*${inner.trim()}*`)
    .replace(/<em[^>]*>(.*?)<\/em>/gi, (_, inner) => `*${inner.trim()}*`);

  // Strip remaining HTML tags
  text = text.replace(/<[^>]+>/g, '');

  // Decode entities and clean whitespace
  text = decodeHtmlEntities(text)
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return text;
}

function parsePipeCsv(raw) {
  const cleaned = raw.replace(/^\uFEFF/, '');
  const lines = cleaned.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];

  const headers = lines[0].split('|').map((h) => h.trim());
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split('|');
    const obj = {};
    for (let j = 0; j < headers.length; j++) {
      if (headers[j]) {
        obj[headers[j]] = (cols[j] || '').trim();
      }
    }
    rows.push(obj);
  }
  return rows;
}

async function ensureCsv(filename, localPath) {
  if (process.argv.includes('--fetch') || !fs.existsSync(localPath)) {
    const url = `${WAHA_BASE}/${filename}`;
    console.log(`Fetching ${url}...`);
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
    }
    const text = await res.text();
    fs.mkdirSync(path.dirname(localPath), { recursive: true });
    fs.writeFileSync(localPath, text, 'utf8');
  }
}

async function main() {
  await ensureCsv('Stratagems.csv', STRAT_CSV_PATH);
  await ensureCsv('Datasheets.csv', DS_CSV_PATH);
  await ensureCsv('Datasheets_stratagems.csv', DS_STRAT_CSV_PATH);
  await ensureCsv('Last_update.csv', LAST_UPDATE_CSV_PATH);

  // 1. Read Last_update.csv
  let wahapediaUpdatedAt = '';
  if (fs.existsSync(LAST_UPDATE_CSV_PATH)) {
    const luRows = parsePipeCsv(fs.readFileSync(LAST_UPDATE_CSV_PATH, 'utf8'));
    if (luRows[0]?.last_update) {
      wahapediaUpdatedAt = luRows[0].last_update;
    }
  }

  // 2. Parse Stratagems.csv
  const rows = parsePipeCsv(fs.readFileSync(STRAT_CSV_PATH, 'utf8')).filter((r) => r.id && r.name);
  const coreStratagems = [];
  const detachmentStratagems = {};
  const validStratIds = new Set();

  for (const r of rows) {
    const cp = parseInt(r.cp_cost, 10);
    if (Number.isNaN(cp)) continue;

    const detRaw = (r.detachment || '').trim();
    const is11eCore = r.id.startsWith('000010810');

    if (!is11eCore && !detRaw) {
      continue;
    }

    const description = convertHtmlDescription(r.description);
    const stratObj = {
      id: `waha-${r.id}`,
      name: toTitleCase(r.name),
      cp,
      turn: mapTurn(r.turn, description),
      phase: mapPhase(r.phase),
      category: (r.type || 'Stratagem').replace(/\s+Stratagem$/i, '').trim(),
      description
    };

    if (is11eCore) {
      coreStratagems.push(stratObj);
      validStratIds.add(stratObj.id);
    } else if (detRaw) {
      stratObj.detachment = detRaw.replace(/[\u2018\u2019]/g, "'");
      const key = normalizeKey(detRaw);
      if (!detachmentStratagems[key]) {
        detachmentStratagems[key] = [];
      }
      if (!detachmentStratagems[key].some((s) => s.name.toLowerCase() === stratObj.name.toLowerCase())) {
        detachmentStratagems[key].push(stratObj);
        validStratIds.add(stratObj.id);
      }
    }
  }

  coreStratagems.sort((a, b) => a.id.localeCompare(b.id));

  const stratOutput = {
    edition: '11th Edition',
    source: 'Wahapedia wh40k11ed Stratagems.csv',
    wahapediaUpdatedAt,
    generatedAt: new Date().toISOString(),
    coreStratagems,
    detachmentStratagems
  };

  fs.writeFileSync(OUT_STRAT_PATH, JSON.stringify(stratOutput, null, 2), 'utf8');
  console.log(
    `Wrote ${OUT_STRAT_PATH}: ${coreStratagems.length} core, ${Object.keys(detachmentStratagems).length} detachments.`
  );

  // 3. Build compact Datasheet -> Stratagem IDs map for units in our app
  const appUnitNames = new Set();
  if (fs.existsSync(FACTIONS_DIR)) {
    for (const file of fs.readdirSync(FACTIONS_DIR)) {
      if (!file.endsWith('.json')) continue;
      const data = JSON.parse(fs.readFileSync(path.join(FACTIONS_DIR, file), 'utf8'));
      for (const u of data.units || []) {
        appUnitNames.add(normalizeKey(u.name));
      }
    }
  }

  const dsRows = parsePipeCsv(fs.readFileSync(DS_CSV_PATH, 'utf8'));
  const dsIdToName = new Map();
  for (const r of dsRows) {
    if (r.id && r.name) {
      dsIdToName.set(r.id, normalizeKey(r.name));
    }
  }

  const dsStratRows = parsePipeCsv(fs.readFileSync(DS_STRAT_CSV_PATH, 'utf8'));
  const unitStratMap = {};
  for (const r of dsStratRows) {
    const unitKey = dsIdToName.get(r.datasheet_id);
    const stratId = r.stratagem_id ? `waha-${r.stratagem_id}` : '';
    if (!unitKey || !stratId || !validStratIds.has(stratId)) continue;
    if (appUnitNames.size > 0 && !appUnitNames.has(unitKey)) continue;

    if (!unitStratMap[unitKey]) {
      unitStratMap[unitKey] = [];
    }
    if (!unitStratMap[unitKey].includes(stratId)) {
      unitStratMap[unitKey].push(stratId);
    }
  }

  fs.writeFileSync(OUT_DS_STRAT_PATH, JSON.stringify(unitStratMap), 'utf8');
  console.log(
    `Wrote ${OUT_DS_STRAT_PATH}: ${Object.keys(unitStratMap).length} units mapped to eligible stratagems.`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
