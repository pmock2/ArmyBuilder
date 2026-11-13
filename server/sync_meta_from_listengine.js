/**
 * Fetches recent 1st/2nd/3rd place Warhammer 40k tournament lists from
 * List Engine (https://listengine.online / listengine-v3-be.onrender.com)
 * and builds client/public/data/meta_snapshot.json to inform the AI Army Builder.
 */

const fs = require('fs');
const path = require('path');

const API_BASE = 'https://listengine-v3-be.onrender.com/lists/search/page';
const FACTIONS_INDEX_PATH = path.join(__dirname, '..', 'client', 'src', 'data', 'factions_index.json');
const OUTPUT_PATH = path.join(__dirname, '..', 'client', 'public', 'data', 'meta_snapshot.json');

const factionsIndex = JSON.parse(fs.readFileSync(FACTIONS_INDEX_PATH, 'utf8'));

function cleanListHtml(html) {
  if (!html) return '';
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const ARMY_TO_FACTION_ID = {
  'adepta sororitas': 'imperium-adepta-sororitas',
  'adeptus custodes': 'imperium-adeptus-custodes',
  'adeptus mechanicus': 'imperium-adeptus-mechanicus',
  'astra militarum': 'imperium-astra-militarum',
  'imperial agents': 'imperium-agents-of-the-imperium',
  'agents of the imperium': 'imperium-agents-of-the-imperium',
  'imperial knights': 'imperium-imperial-knights',
  'grey knights': 'imperium-grey-knights',
  'black templars': 'imperium-black-templars',
  'blood angels': 'imperium-blood-angels',
  'dark angels': 'imperium-dark-angels',
  'deathwatch': 'imperium-deathwatch',
  'imperial fists': 'imperium-imperial-fists',
  'iron hands': 'imperium-iron-hands',
  'raven guard': 'imperium-raven-guard',
  'salamanders': 'imperium-salamanders',
  'space wolves': 'imperium-space-wolves',
  'ultramarines': 'imperium-ultramarines',
  'white scars': 'imperium-white-scars',
  'space marines': 'imperium-space-marines',
  'space marines (astartes)': 'imperium-space-marines',
  'aeldari': 'aeldari-craftworlds',
  'drukhari': 'aeldari-drukhari',
  'chaos daemons': 'chaos-chaos-daemons',
  'chaos knights': 'chaos-chaos-knights',
  'chaos space marines': 'chaos-chaos-space-marines',
  'death guard': 'chaos-death-guard',
  'emperors children': 'chaos-emperor-s-children',
  "emperor's children": 'chaos-emperor-s-children',
  'thousand sons': 'chaos-thousand-sons',
  'world eaters': 'chaos-world-eaters',
  'genestealer cult': 'genestealer-cults',
  'genestealer cults': 'genestealer-cults',
  'genestealers cult': 'genestealer-cults',
  'leagues of votann': 'leagues-of-votann',
  'necrons': 'necrons',
  'orks': 'orks',
  "t'au empire": 't-au-empire',
  'tau empire': 't-au-empire',
  'tyranids': 'tyranids',
  'forces of the hive mind': 'tyranids'
};

const SM_CHAPTER_NAMES = [
  ['salamanders', 'imperium-salamanders'],
  ['ultramarines', 'imperium-ultramarines'],
  ['imperial fists', 'imperium-imperial-fists'],
  ['iron hands', 'imperium-iron-hands'],
  ['raven guard', 'imperium-raven-guard'],
  ['white scars', 'imperium-white-scars'],
  ['black templars', 'imperium-black-templars'],
  ['blood angels', 'imperium-blood-angels'],
  ['dark angels', 'imperium-dark-angels'],
  ['space wolves', 'imperium-space-wolves'],
  ['deathwatch', 'imperium-deathwatch']
];

function resolveFactionId(item, cleanText) {
  const candidates = [item.army, item.factionName].filter(Boolean).map((s) => s.toLowerCase().trim());
  let resolved = null;
  for (const c of candidates) {
    if (ARMY_TO_FACTION_ID[c]) {
      resolved = ARMY_TO_FACTION_ID[c];
      break;
    }
  }
  if (!resolved) {
    const match = factionsIndex.find((f) => candidates.some((c) => f.name.toLowerCase() === c));
    if (match) resolved = match.id;
  }
  // Refine generic Space Marines into specific chapter if declared at top of list
  if (resolved === 'imperium-space-marines' && cleanText) {
    const header = cleanText.split('\n').slice(0, 8).join('\n').toLowerCase();
    for (const [chap, fid] of SM_CHAPTER_NAMES) {
      if (header.includes(chap)) {
        return fid;
      }
    }
  }
  return resolved;
}

async function fetchPosition(pos, maxPages) {
  const all = [];
  for (let page = 1; page <= maxPages; page++) {
    const url = `${API_BASE}/${page}?position=${pos}`;
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`Failed ${url}: HTTP ${res.status}`);
      break;
    }
    const json = await res.json();
    const items = json.data || [];
    all.push(...items);
    if (!json.pagination?.hasNext) break;
  }
  return all;
}

async function main() {
  console.log('Fetching top tournament lists from List Engine...');
  const [pos1, pos2, pos3] = await Promise.all([
    fetchPosition(1, 20),
    fetchPosition(2, 10),
    fetchPosition(3, 10)
  ]);

  const seenIds = new Set();
  const combined = [];
  for (const item of [...pos1, ...pos2, ...pos3]) {
    if (!item._id || seenIds.has(item._id)) continue;
    seenIds.add(item._id);
    combined.push(item);
  }

  console.log(`Fetched ${combined.length} unique podium lists (1st: ${pos1.length}, 2nd: ${pos2.length}, 3rd: ${pos3.length}).`);

  const byFaction = {};

  for (const item of combined) {
    const listText = cleanListHtml(item.list);
    if (!listText || listText.length < 120) continue;

    const factionId = resolveFactionId(item, listText);
    if (!factionId) continue;

    if (!byFaction[factionId]) {
      const fMeta = factionsIndex.find((f) => f.id === factionId);
      byFaction[factionId] = {
        factionId,
        factionName: fMeta?.name || item.factionName || item.army,
        podiumCount: 0,
        firstPlaceCount: 0,
        detachmentCounts: {},
        lists: []
      };
    }

    const bucket = byFaction[factionId];
    bucket.podiumCount++;
    if (Number(item.rank) === 1) bucket.firstPlaceCount++;

    const dets = Array.isArray(item.detachment)
      ? item.detachment
      : item.detachment
      ? [item.detachment]
      : [];
    for (const d of dets) {
      const cleanD = String(d).trim();
      if (!cleanD) continue;
      bucket.detachmentCounts[cleanD] = (bucket.detachmentCounts[cleanD] || 0) + 1;
    }

    bucket.lists.push({
      eventName: item.eventName || 'Tournament',
      date: item.eventDateTimeFormat || '',
      playersNumber: Number(item.playersNumber) || 0,
      rank: Number(item.rank) || 1,
      wins: Number(item.wins) || 0,
      loss: Number(item.loss) || 0,
      detachments: dets,
      listText: listText.slice(0, 2400)
    });
  }

  const factionsOut = {};
  const leaderboard = [];

  for (const [fid, bucket] of Object.entries(byFaction)) {
    const topDetachments = Object.entries(bucket.detachmentCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, count]) => ({ name, count }));

    // Prioritize 1st place, larger events, and most recent dates
    bucket.lists.sort((a, b) => {
      if (a.rank !== b.rank) return a.rank - b.rank;
      if (b.playersNumber !== a.playersNumber) return b.playersNumber - a.playersNumber;
      return String(b.date).localeCompare(String(a.date));
    });

    factionsOut[fid] = {
      factionId: fid,
      factionName: bucket.factionName,
      podiumCount: bucket.podiumCount,
      firstPlaceCount: bucket.firstPlaceCount,
      topDetachments,
      sampleWinningLists: bucket.lists.slice(0, 3)
    };

    leaderboard.push({
      factionId: fid,
      factionName: bucket.factionName,
      firstPlaceCount: bucket.firstPlaceCount,
      podiumCount: bucket.podiumCount,
      topDetachment: topDetachments[0]?.name || null
    });
  }

  leaderboard.sort((a, b) => b.firstPlaceCount - a.firstPlaceCount || b.podiumCount - a.podiumCount);

  const snapshot = {
    source: 'List Engine (listengine.online)',
    updatedAt: new Date().toISOString(),
    totalPodiumListsAnalyzed: combined.length,
    topPerformingFactions: leaderboard.slice(0, 12),
    factions: factionsOut
  };

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(snapshot, null, 2) + '\n', 'utf8');
  console.log(`Wrote ${OUTPUT_PATH} (${Object.keys(factionsOut).length} factions, ${leaderboard.length} ranked).`);
  console.log('Top 5 factions:', leaderboard.slice(0, 5));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
