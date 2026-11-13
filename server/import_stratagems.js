/**
 * Imports 11th Edition Core & Detachment Stratagems from Wahapedia's Stratagems.csv
 * into client/src/data/stratagems_data.json.
 *
 * Usage:
 *   node server/import_stratagems.js          (uses local data_repo/wahapedia/Stratagems.csv)
 *   node server/import_stratagems.js --fetch  (downloads latest Stratagems.csv from Wahapedia first)
 */

const fs = require('fs');
const path = require('path');

const CSV_URL = 'https://wahapedia.ru/wh40k11ed/Stratagems.csv';
const CSV_PATH = path.resolve(__dirname, '..', 'data_repo', 'wahapedia', 'Stratagems.csv');
const OUT_PATH = path.resolve(__dirname, '..', 'client', 'src', 'data', 'stratagems_data.json');

function normalizeDetachmentKey(name) {
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

function mapTurn(rawTurn) {
  const t = (rawTurn || '').toLowerCase();
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

  // Bold / Italic / Underline
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
    if (obj.id && obj.name) {
      rows.push(obj);
    }
  }
  return rows;
}

async function main() {
  if (process.argv.includes('--fetch') || !fs.existsSync(CSV_PATH)) {
    console.log(`Fetching ${CSV_URL}...`);
    const res = await fetch(CSV_URL);
    if (!res.ok) {
      throw new Error(`Failed to fetch ${CSV_URL}: ${res.status} ${res.statusText}`);
    }
    const text = await res.text();
    fs.mkdirSync(path.dirname(CSV_PATH), { recursive: true });
    fs.writeFileSync(CSV_PATH, text, 'utf8');
    console.log(`Saved ${CSV_PATH}`);
  }

  const raw = fs.readFileSync(CSV_PATH, 'utf8');
  const rows = parsePipeCsv(raw);
  console.log(`Parsed ${rows.length} rows from Stratagems.csv`);

  const coreStratagems = [];
  const detachmentStratagems = {};

  for (const r of rows) {
    const cp = parseInt(r.cp_cost, 10);
    if (Number.isNaN(cp)) continue; // Skip non-CP ability entries like SNAP SHOOTING

    const detRaw = (r.detachment || '').trim();
    const is11eCore = r.id.startsWith('000010810');

    if (!is11eCore && !detRaw) {
      continue;
    }

    const stratObj = {
      id: `waha-${r.id}`,
      name: toTitleCase(r.name),
      cp,
      turn: mapTurn(r.turn),
      phase: mapPhase(r.phase),
      category: (r.type || 'Stratagem').replace(/\s+Stratagem$/i, '').trim(),
      description: convertHtmlDescription(r.description)
    };

    if (is11eCore) {
      coreStratagems.push(stratObj);
    } else if (detRaw) {
      stratObj.detachment = detRaw.replace(/[\u2018\u2019]/g, "'");
      const key = normalizeDetachmentKey(detRaw);
      if (!detachmentStratagems[key]) {
        detachmentStratagems[key] = [];
      }
      // Avoid duplicates by name within the same detachment
      if (!detachmentStratagems[key].some((s) => s.name.toLowerCase() === stratObj.name.toLowerCase())) {
        detachmentStratagems[key].push(stratObj);
      }
    }
  }

  // Sort core stratagems in a consistent logical order (by ID)
  coreStratagems.sort((a, b) => a.id.localeCompare(b.id));

  const output = {
    edition: '11th Edition',
    source: 'Wahapedia wh40k11ed Stratagems.csv',
    generatedAt: new Date().toISOString(),
    coreStratagems,
    detachmentStratagems
  };

  fs.writeFileSync(OUT_PATH, JSON.stringify(output, null, 2), 'utf8');
  console.log(
    `Wrote ${OUT_PATH}: ${coreStratagems.length} core stratagems, ${Object.keys(detachmentStratagems).length} detachments.`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
