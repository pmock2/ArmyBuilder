import {
  ArmyRoster,
  BattleSize,
  Datasheet,
  Enhancement,
  SelectedDetachment,
  SelectedUnit,
  getUnitBaseCostForModelCount,
  normalizeDetachmentName
} from '../types/roster';
import { FactionDetail, FactionSummary } from '../types/faction';

interface ParsedBullet {
  count: number;
  name: string;
  isWarlord: boolean;
  isEnhancement: boolean;
  enhancementName?: string;
  subBullets: ParsedBullet[];
}

interface ParsedUnitBlock {
  name: string;
  points: number;
  section: string;
  format: 'gw' | 'nr';
  isWarlord: boolean;
  bullets: ParsedBullet[];
}

export interface GwImportResult {
  roster: ArmyRoster;
  warnings: string[];
}

const SECTION_HEADERS = new Set([
  'CHARACTER',
  'CHARACTERS',
  'EPIC HERO',
  'EPIC HEROES',
  'BATTLELINE',
  'DEDICATED TRANSPORT',
  'DEDICATED TRANSPORTS',
  'OTHER DATASHEETS',
  'ALLIED UNIT',
  'ALLIED UNITS',
  'INFANTRY',
  'MOUNTED',
  'MONSTER',
  'MONSTERS',
  'VEHICLE',
  'VEHICLES',
  'AIRCRAFT',
  'FORTIFICATION',
  'FORTIFICATIONS'
]);

const factionCache = new Map<string, FactionDetail>();

function normalizeText(str: string): string {
  return String(str || '')
    .replace(/[’‘]/g, "'")
    .replace(/\s*\[(?:legends|crucible)\]\s*/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function parseCountAndName(raw: string): { count: number; name: string } {
  const cleaned = raw.trim();
  const match = cleaned.match(/^(\d+)\s*x\s+(.+)$/i);
  if (match) {
    return { count: Math.max(1, parseInt(match[1], 10) || 1), name: match[2].trim() };
  }
  return { count: 1, name: cleaned };
}

function parseBulletLine(rawText: string): ParsedBullet {
  const text = rawText.trim();
  if (/^warlord$/i.test(text)) {
    return { count: 1, name: 'Warlord', isWarlord: true, isEnhancement: false, subBullets: [] };
  }
  const enhMatch = text.match(/^enhancements?\s*:\s*(.+?)(?:\s*[\[(]\+?\d+\s*pts?[\])])?$/i);
  if (enhMatch) {
    return {
      count: 1,
      name: enhMatch[1].trim(),
      isWarlord: false,
      isEnhancement: true,
      enhancementName: enhMatch[1].trim(),
      subBullets: []
    };
  }
  const { count, name } = parseCountAndName(text);
  return { count, name, isWarlord: false, isEnhancement: false, subBullets: [] };
}

function parseListSections(text: string): {
  headerLines: string[];
  configLines: string[];
  units: ParsedUnitBlock[];
  totalPointsHint: number;
  detectedFormat: 'gw' | 'nr';
} {
  const lines = text.split(/\r?\n/);
  const headerLines: string[] = [];
  const configLines: string[] = [];
  const units: ParsedUnitBlock[] = [];
  let currentSection = '';
  let inConfigSection = false;
  let currentUnit: ParsedUnitBlock | null = null;
  let currentTopBullet: ParsedBullet | null = null;
  let startedSections = false;
  let hasNrMarkers = /\[\d+\s*(?:points?|pts?)\]/i.test(text) || /^\s*#\s*\+\+\s*Army Roster/im.test(text);

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    // Ignore New Recruit / GW App export footers
    if (/^(?:exported with|created with)\b/i.test(trimmed)) continue;

    // Ignore NR top army title banner like "# ++ Army Roster ++ [4630 pts]"
    if (/^#\s*\+\+.*\+\+/i.test(trimmed)) {
      hasNrMarkers = true;
      const ptsMatch = trimmed.match(/\[(\d+)\s*(?:points?|pts?)\]/i);
      if (ptsMatch && !startedSections) {
        headerLines.push(trimmed.replace(/^#+\s*/, ''));
      }
      continue;
    }

    // Check NR configuration section heading ("## Configuration" / "## ++ Configuration ++")
    const strippedHeading = trimmed
      .replace(/^#+\s*/, '')
      .replace(/\s*\[\d+\s*(?:points?|pts?)\]\s*$/i, '')
      .replace(/^\+\+\s*|\s*\+\+$/g, '')
      .replace(/:$/, '')
      .trim()
      .toUpperCase();

    if (strippedHeading === 'CONFIGURATION') {
      inConfigSection = true;
      currentUnit = null;
      currentTopBullet = null;
      continue;
    }

    if (SECTION_HEADERS.has(strippedHeading)) {
      startedSections = true;
      inConfigSection = false;
      currentSection = strippedHeading;
      currentUnit = null;
      currentTopBullet = null;
      if (trimmed.startsWith('#') || /\[\d+\s*pts?\]/i.test(trimmed)) {
        hasNrMarkers = true;
      }
      continue;
    }

    if (inConfigSection) {
      configLines.push(trimmed.replace(/^[•◦*\-]\s*/, '').trim());
      continue;
    }

    // Check if this is a unit header line:
    // GW style: "Adrax Agatone (90 Points)" or "Captain (90 pts)"
    // NR style: "Adrax Agatone [90 pts]" or "Assault Intercessor Squad [85 pts]:"
    const isBulletChar = /^[•◦*\-]/.test(trimmed);
    const unitHeaderMatch = !isBulletChar
      ? trimmed.match(/^(.+?)\s*(?:\((\d+)\s*(?:points?|pts?)\)|\[(\d+)\s*(?:points?|pts?)\])\s*(\[warlord\])?\s*:?\s*$/i)
      : null;

    if (unitHeaderMatch && startedSections) {
      const unitPts = parseInt(unitHeaderMatch[2] || unitHeaderMatch[3], 10) || 0;
      const isNrUnit = Boolean(unitHeaderMatch[3]) || hasNrMarkers;
      if (unitHeaderMatch[3]) hasNrMarkers = true;
      currentUnit = {
        name: unitHeaderMatch[1].trim(),
        points: unitPts,
        section: currentSection,
        format: isNrUnit ? 'nr' : 'gw',
        isWarlord: Boolean(unitHeaderMatch[4]),
        bullets: []
      };
      units.push(currentUnit);
      currentTopBullet = null;
      continue;
    }

    if (!startedSections) {
      headerLines.push(trimmed);
      continue;
    }

    if (!currentUnit) continue;

    // Sub-bullet (indented or starting with ◦)
    const isSubBullet = /^◦/.test(trimmed) || (/^\s{3,}/.test(rawLine) && /^[*\-◦]/.test(trimmed));
    const cleanBulletText = trimmed.replace(/^[•◦*\-]\s*/, '').trim();
    if (!cleanBulletText) continue;

    // In NR verbose exports, bullets can carry inline loadouts after a colon:
    // e.g. "1x Captain: Warlord, Master-crafted Bolter, Power Weapon"
    const colonSplit = currentUnit.format === 'nr' && !/^enhancements?\s*:/i.test(cleanBulletText)
      ? cleanBulletText.match(/^([^:]+):\s*(.+)$/)
      : null;

    if (colonSplit) {
      const parsedMain = parseBulletLine(colonSplit[1]);
      if (parsedMain.isWarlord) currentUnit.isWarlord = true;
      const parts = colonSplit[2].split(',').map((p) => p.trim()).filter(Boolean);
      for (const part of parts) {
        const sub = parseBulletLine(part);
        if (sub.isWarlord) currentUnit.isWarlord = true;
        parsedMain.subBullets.push(sub);
      }
      currentTopBullet = parsedMain;
      currentUnit.bullets.push(parsedMain);
      continue;
    }

    const parsedBullet = parseBulletLine(cleanBulletText);
    if (parsedBullet.isWarlord) {
      currentUnit.isWarlord = true;
    }

    if (isSubBullet && currentTopBullet) {
      currentTopBullet.subBullets.push(parsedBullet);
    } else {
      currentTopBullet = parsedBullet;
      currentUnit.bullets.push(parsedBullet);
    }
  }

  const totalPointsHint = units.reduce((sum, u) => sum + u.points, 0);
  return {
    headerLines,
    configLines,
    units,
    totalPointsHint,
    detectedFormat: hasNrMarkers ? 'nr' : 'gw'
  };
}

function findBestDatasheetMatch(unitName: string, datasheets: Datasheet[]): Datasheet | null {
  const target = normalizeText(unitName);
  if (!target) return null;

  // 1. Exact normalized match
  const exact = datasheets.find((d) => normalizeText(d.name) === target);
  if (exact) return exact;

  // 2. Singular/plural minor differences (e.g. "Invader ATV" vs "Invader ATVs")
  const singularTarget = target.replace(/s$/, '');
  const pluralMatch = datasheets.find((d) => normalizeText(d.name).replace(/s$/, '') === singularTarget);
  if (pluralMatch) return pluralMatch;

  // 3. Containment fallback
  const contains = datasheets.find(
    (d) => normalizeText(d.name).includes(target) || target.includes(normalizeText(d.name))
  );
  return contains || null;
}

function inferModelCount(block: ParsedUnitBlock, ds: Datasheet): number {
  const minModels = ds.minModels || 1;
  const maxModels = ds.maxModels || minModels;
  if (minModels === maxModels) return minModels;

  // 1. Top-level bullets that contain sub-bullets represent model entries (e.g. "1x Sergeant" + "4x Intercessors")
  const modelBullets = block.bullets.filter(
    (b) => !b.isWarlord && !b.isEnhancement && b.subBullets.length > 0
  );
  if (modelBullets.length > 0) {
    const sum = modelBullets.reduce((acc, b) => acc + b.count, 0);
    if (sum >= minModels && sum <= maxModels) return sum;
    return Math.min(Math.max(sum, minModels), maxModels);
  }

  // 2. In NR compact format ("4x Intercessor", "1x Intercessor Sergeant"), top-level bullets ARE models
  if (block.format === 'nr' && block.bullets.length > 0) {
    const nrModelBullets = block.bullets.filter((b) => !b.isWarlord && !b.isEnhancement);
    if (nrModelBullets.length > 0) {
      const sum = nrModelBullets.reduce((acc, b) => acc + b.count, 0);
      if (sum >= minModels && sum <= maxModels) {
        return sum;
      }
    }
  }

  // 3. Bullets matching stat profile model names
  const profileNames = [
    ds.stats?.name,
    ...(ds.extraStats || []).map((p) => p.name),
    ...(ds.baseProfileNames || [])
  ]
    .filter((n): n is string => Boolean(n))
    .map((n) => normalizeText(n));
  if (profileNames.length > 0) {
    const matchedModelSum = block.bullets
      .filter((b) =>
        profileNames.some((pn) => pn === normalizeText(b.name) || pn.replace(/s$/, '') === normalizeText(b.name).replace(/s$/, ''))
      )
      .reduce((acc, b) => acc + b.count, 0);
    if (matchedModelSum >= minModels && matchedModelSum <= maxModels) {
      return matchedModelSum;
    }
  }

  // 4. Match unit points against costTiers
  if (block.points > 0 && ds.costTiers && ds.costTiers.length > 0) {
    const exactTier = ds.costTiers.find((t) => t.cost === block.points);
    if (exactTier) return exactTier.models;
  }

  return minModels;
}

function inferSelectedOptions(
  block: ParsedUnitBlock,
  ds: Datasheet
): Record<string, string[]> {
  const selectedOptions: Record<string, string[]> = {};
  if (!ds.wargearGroups || ds.wargearGroups.length === 0) return selectedOptions;

  // Collect all mentioned bullet/sub-bullet counts (including NR "4x Terminator w/ Power Fist" style names)
  const mentionedCounts = new Map<string, number>();
  const addMention = (name: string, count: number) => {
    const norm = normalizeText(name);
    if (!norm) return;
    mentionedCounts.set(norm, (mentionedCounts.get(norm) || 0) + count);
  };

  for (const b of block.bullets) {
    if (b.isWarlord || b.isEnhancement) continue;
    addMention(b.name, b.count);
    for (const sb of b.subBullets) {
      if (!sb.isWarlord && !sb.isEnhancement) addMention(sb.name, sb.count);
    }
  }

  for (const group of ds.wargearGroups) {
    const matchedIds: string[] = [];

    for (const opt of group.options) {
      const optNorm = normalizeText(opt.name);
      let matchedCount = 0;

      for (const [mName, mCount] of mentionedCounts.entries()) {
        if (mName === optNorm || mName.replace(/s$/, '') === optNorm.replace(/s$/, '')) {
          matchedCount += mCount;
        }
      }

      if (matchedCount > 0) {
        const cap = group.isExclusive || group.max === 1 ? 1 : (opt.maxCount || group.max || matchedCount);
        const times = Math.min(matchedCount, cap);
        for (let i = 0; i < times; i++) {
          matchedIds.push(opt.id);
        }
      }
    }

    if (matchedIds.length > 0) {
      selectedOptions[group.id] = group.isExclusive ? [matchedIds[0]] : matchedIds;
    } else if (group.defaultOptionIds && group.defaultOptionIds.length > 0) {
      selectedOptions[group.id] = [...group.defaultOptionIds];
    }
  }

  return selectedOptions;
}

async function defaultLoadFactionDetail(factionId: string): Promise<FactionDetail> {
  if (factionCache.has(factionId)) {
    return factionCache.get(factionId)!;
  }
  const res = await fetch(`${import.meta.env.BASE_URL}data/factions/${factionId}.json`);
  if (!res.ok) {
    throw new Error(`Failed to load faction data for "${factionId}".`);
  }
  const data = (await res.json()) as FactionDetail;
  factionCache.set(factionId, data);
  return data;
}

function matchHeaderToFaction(
  headerLines: string[],
  factionsIndex: FactionSummary[]
): { faction: FactionSummary; extractedRosterName?: string } | null {
  // Check exact faction or NR title format: "<rawName> - <Roster Name> - [4630 pts]"
  const sortedByRawLen = [...factionsIndex].sort((a, b) => b.rawName.length - a.rawName.length);

  for (const line of headerLines) {
    const cleanLine = line.replace(/\s*[\[(]\d+\s*(?:points?|pts?)[\])]\s*$/i, '').trim();
    const normLine = normalizeText(cleanLine);

    for (const f of sortedByRawLen) {
      const normRaw = normalizeText(f.rawName);
      if (normLine === normRaw || normLine === normalizeText(f.name)) {
        return { faction: f };
      }
      if (normLine.startsWith(`${normRaw} - `)) {
        const rest = cleanLine
          .slice(f.rawName.length)
          .replace(/^\s*-\s*/, '')
          .replace(/\s*-\s*$/, '')
          .trim();
        return { faction: f, extractedRosterName: rest || undefined };
      }
    }
  }
  return null;
}

async function detectFaction(
  headerLines: string[],
  parsedUnits: ParsedUnitBlock[],
  factionsIndex: FactionSummary[],
  loadFaction: (id: string) => Promise<FactionDetail>
): Promise<{ detail: FactionDetail; extractedRosterName?: string }> {
  // 1. Check if header explicitly names a faction (supports NR "<rawName> - <Roster Name> - [pts]")
  const headerMatch = matchHeaderToFaction(headerLines, factionsIndex);
  if (headerMatch) {
    const detail = await loadFaction(headerMatch.faction.id);
    return { detail, extractedRosterName: headerMatch.extractedRosterName };
  }

  // 2. Score all factions by how many units match
  const allDetails = await Promise.all(
    factionsIndex.map(async (summary) => {
      try {
        const detail = await loadFaction(summary.id);
        return { summary, detail };
      } catch {
        return null;
      }
    })
  );

  let best: { score: number; detail: FactionDetail } | null = null;
  for (const item of allDetails) {
    if (!item) continue;
    const { summary, detail } = item;
    let matchedCount = 0;
    let epicHeroBonus = 0;

    for (const pu of parsedUnits) {
      const ds = findBestDatasheetMatch(pu.name, detail.units);
      if (ds) {
        matchedCount++;
        if (ds.isEpicHero) epicHeroBonus += 2;
      }
    }

    let detBonus = 0;
    for (const line of headerLines) {
      const normLine = normalizeDetachmentName(line);
      if (detail.detachments.some((d) => normalizeDetachmentName(d.name) === normLine)) {
        detBonus += 5;
      }
    }

    const score = matchedCount * 10 + epicHeroBonus + detBonus + (summary.isSubFaction ? 1 : 0);
    if (!best || score > best.score) {
      best = { score, detail };
    }
  }

  if (!best || best.score === 0) {
    throw new Error('Could not match the pasted units to any Warhammer 40,000 faction.');
  }

  return { detail: best.detail };
}

export function isProbablySupportedTextList(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed || trimmed.startsWith('{') || trimmed.startsWith('[')) return false;
  return (
    /(?:CHARACTERS?|EPIC HEROES?|BATTLELINE|INFANTRY|VEHICLE|DEDICATED TRANSPORTS?|OTHER DATASHEETS)/i.test(trimmed) ||
    /\(\d+\s*(?:points?|pts?)\)/i.test(trimmed) ||
    /\[\d+\s*(?:points?|pts?)\]/i.test(trimmed) ||
    /^\s*#\s*\+\+\s*Army Roster/im.test(trimmed)
  );
}

export async function parseGwTextRoster(
  rawText: string,
  factionsIndex: FactionSummary[],
  loadFaction: (id: string) => Promise<FactionDetail> = defaultLoadFactionDetail
): Promise<GwImportResult> {
  const { headerLines, configLines, units: parsedUnits, totalPointsHint } = parseListSections(rawText);

  if (parsedUnits.length === 0) {
    throw new Error('No units were detected. Supports GW ("Unit (90 Points)") and New Recruit ("Unit [90 pts]") text formats.');
  }

  const { detail: factionData, extractedRosterName } = await detectFaction(
    headerLines,
    parsedUnits,
    factionsIndex,
    loadFaction
  );
  const warnings: string[] = [];

  const allMetaLines = [...headerLines, ...configLines];
  const matchedDetachments: SelectedDetachment[] = [];
  let battleSize: BattleSize =
    totalPointsHint <= 1000 ? 'incursion' : totalPointsHint <= 2000 ? 'strike-force' : 'onslaught';
  let rosterName = extractedRosterName || `${factionData.faction.name} Import`;

  for (const line of allMetaLines) {
    if (/incursion/i.test(line)) battleSize = 'incursion';
    else if (/strike force/i.test(line)) battleSize = 'strike-force';
    else if (/onslaught/i.test(line)) battleSize = 'onslaught';

    const cleanDet = normalizeDetachmentName(
      line.replace(/^detachment(?:\s+choice)?\s*:\s*/i, '')
    );
    const det = factionData.detachments.find((d) => normalizeDetachmentName(d.name) === cleanDet);
    if (det && !matchedDetachments.some((x) => x.name === det.name)) {
      matchedDetachments.push(det);
    }
  }

  if (!extractedRosterName && headerLines.length > 0) {
    const firstClean = headerLines[0]
      .replace(/\s*[\[(]\d+\s*(?:points?|pts?)[\])]\s*$/i, '')
      .replace(/^\+\+\s*|\s*\+\+$/g, '')
      .trim();
    if (
      firstClean &&
      !/^army roster$/i.test(firstClean) &&
      normalizeText(firstClean) !== normalizeText(factionData.faction.name) &&
      normalizeText(firstClean) !== normalizeText(factionData.faction.rawName) &&
      !matchedDetachments.some((d) => normalizeDetachmentName(d.name) === normalizeDetachmentName(firstClean))
    ) {
      rosterName = firstClean;
    }
  }

  const selectedUnits: SelectedUnit[] = [];
  let hasWarlord = false;

  for (const block of parsedUnits) {
    const ds = findBestDatasheetMatch(block.name, factionData.units);
    if (!ds) {
      warnings.push(`Could not find datasheet for "${block.name}".`);
      continue;
    }

    const modelsCount = inferModelCount(block, ds);
    const cost = getUnitBaseCostForModelCount(ds, modelsCount);
    const selectedOptions = inferSelectedOptions(block, ds);

    let enhancement: Enhancement | undefined;
    const allBullets = [...block.bullets, ...block.bullets.flatMap((b) => b.subBullets)];
    const enhBullet = allBullets.find((b) => b.isEnhancement && b.enhancementName);
    if (enhBullet?.enhancementName) {
      const normEnh = normalizeText(enhBullet.enhancementName);
      enhancement = factionData.enhancements.find((e) => normalizeText(e.name) === normEnh);
    }

    if (block.isWarlord) hasWarlord = true;

    selectedUnits.push({
      instanceId: `unit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      datasheetId: ds.id,
      name: ds.name,
      modelsCount,
      cost,
      isWarlord: block.isWarlord,
      isCharacter: ds.isCharacter,
      isEpicHero: ds.isEpicHero,
      isBattleline: ds.isBattleline,
      isDedicatedTransport: ds.isDedicatedTransport,
      isLeader: ds.isLeader,
      isSupport: ds.isSupport,
      selectedOptions,
      enhancement,
      datasheet: ds
    });
  }

  if (selectedUnits.length === 0) {
    throw new Error('None of the units in the pasted list matched any known datasheets.');
  }

  if (!hasWarlord) {
    const firstChar = selectedUnits.find((u) => {
      const cats = u.datasheet.categories.map((c) => c.toLowerCase());
      return cats.includes('character') || u.isEpicHero;
    });
    if (firstChar) firstChar.isWarlord = true;
  }

  const now = new Date().toISOString();
  const roster: ArmyRoster = {
    id: `roster-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: rosterName,
    factionId: factionData.faction.id,
    factionName: factionData.faction.name,
    superFaction: factionData.faction.superFaction,
    subFactionId: factionData.faction.isSubFaction ? factionData.faction.id : null,
    subFactionName: factionData.faction.isSubFaction ? factionData.faction.name : null,
    battleSize,
    detachments: matchedDetachments,
    units: selectedUnits,
    includeLegends: selectedUnits.some((u) => /\[legends\]/i.test(u.name)),
    createdAt: now,
    updatedAt: now
  };

  return { roster, warnings };
}
