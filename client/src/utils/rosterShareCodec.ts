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

const PREFIX_RAW = '40K1:';
const PREFIX_ZLIB = '40K1Z:';

interface CompactUnitV1 {
  d: string; // datasheetId (or name fallback)
  m?: number; // modelsCount (omitted when === minModels)
  w?: 1; // isWarlord
  e?: string; // enhancement id (or name fallback)
  o?: [number, number[]][]; // non-default [groupIndex, optionIndices[]]
  oId?: Record<string, string[]>; // fallback by groupId/optionId
  al?: number; // attachedLeader unit index
  as?: number; // attachedSupport unit index
  ar?: number; // attachedRetinue unit index
  em?: number[]; // embarkedUnit indices
}

interface CompactRosterV1 {
  v: 1;
  n: string; // name
  f: string; // factionId
  sf?: string; // subFactionId
  sfn?: string; // subFactionName
  bs: 0 | 1 | 2; // 0=incursion, 1=strike-force, 2=onslaught
  cp?: number; // customPointsLimit
  d: string[]; // detachment IDs (or names)
  fd?: string; // forceDisposition
  lg?: 1; // includeLegends
  th?: string; // themeId
  nt?: string; // notes
  u: CompactUnitV1[];
}

const BATTLE_SIZE_TO_NUM: Record<BattleSize, 0 | 1 | 2> = {
  incursion: 0,
  'strike-force': 1,
  onslaught: 2
};

const NUM_TO_BATTLE_SIZE: Record<number, BattleSize> = {
  0: 'incursion',
  1: 'strike-force',
  2: 'onslaught'
};

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(str: string): Uint8Array {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((str.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function deflateRaw(bytes: Uint8Array): Promise<Uint8Array | null> {
  if (typeof CompressionStream === 'undefined') return null;
  try {
    const cs = new CompressionStream('deflate-raw');
    const writer = cs.writable.getWriter();
    const copy = new Uint8Array(bytes.byteLength);
    copy.set(bytes);
    await writer.write(copy);
    await writer.close();
    const buf = await new Response(cs.readable).arrayBuffer();
    return new Uint8Array(buf);
  } catch {
    return null;
  }
}

async function inflateRaw(bytes: Uint8Array): Promise<Uint8Array> {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('This browser does not support compressed QR codes (DecompressionStream unavailable).');
  }
  const ds = new DecompressionStream('deflate-raw');
  const writer = ds.writable.getWriter();
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  await writer.write(copy);
  await writer.close();
  const buf = await new Response(ds.readable).arrayBuffer();
  return new Uint8Array(buf);
}

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

export async function encodeRosterToShareCode(roster: ArmyRoster): Promise<string> {
  const indexByInstanceId = new Map<string, number>();
  roster.units.forEach((u, idx) => indexByInstanceId.set(u.instanceId, idx));

  const compactUnits: CompactUnitV1[] = roster.units.map((u) => {
    const cu: CompactUnitV1 = {
      d: u.datasheetId || u.name
    };
    const minModels = u.datasheet?.minModels || 1;
    if (u.modelsCount !== minModels) {
      cu.m = u.modelsCount;
    }
    if (u.isWarlord) cu.w = 1;
    if (u.enhancement) {
      cu.e = u.enhancement.id || u.enhancement.name;
    }

    const groups = u.datasheet?.wargearGroups || [];
    const nonDefaultPairs: [number, number[]][] = [];
    const fallbackIds: Record<string, string[]> = {};

    groups.forEach((g, gi) => {
      const defIds = g.defaultOptionIds || [];
      const selIds =
        u.selectedOptions && u.selectedOptions[g.id] !== undefined
          ? u.selectedOptions[g.id]
          : defIds;
      if (arraysEqual(selIds, defIds)) return;

      const optIndices = selIds.map((id) => g.options.findIndex((o) => o.id === id));
      if (optIndices.every((idx) => idx >= 0)) {
        nonDefaultPairs.push([gi, optIndices]);
      } else {
        fallbackIds[g.id] = selIds;
      }
    });

    if (nonDefaultPairs.length > 0) cu.o = nonDefaultPairs;
    if (Object.keys(fallbackIds).length > 0) cu.oId = fallbackIds;

    if (u.attachedLeaderId !== undefined) {
      const li = indexByInstanceId.get(u.attachedLeaderId);
      if (li !== undefined) cu.al = li;
    }
    if (u.attachedSupportId !== undefined) {
      const si = indexByInstanceId.get(u.attachedSupportId);
      if (si !== undefined) cu.as = si;
    }
    if (u.attachedRetinueId !== undefined) {
      const ri = indexByInstanceId.get(u.attachedRetinueId);
      if (ri !== undefined) cu.ar = ri;
    }
    if (u.embarkedUnitIds && u.embarkedUnitIds.length > 0) {
      const em = u.embarkedUnitIds
        .map((id) => indexByInstanceId.get(id))
        .filter((idx): idx is number => idx !== undefined);
      if (em.length > 0) cu.em = em;
    }

    return cu;
  });

  // Safety pass: capture any unit with attachedToBodyguardId not already reflected on bodyguard
  roster.units.forEach((u, idx) => {
    if (!u.attachedToBodyguardId) return;
    const bgIdx = indexByInstanceId.get(u.attachedToBodyguardId);
    if (bgIdx === undefined) return;
    const bgCompact = compactUnits[bgIdx];
    if (bgCompact.al === idx || bgCompact.as === idx || bgCompact.ar === idx) return;
    if (u.isLeader && bgCompact.al === undefined) bgCompact.al = idx;
    else if (u.isSupport && bgCompact.as === undefined) bgCompact.as = idx;
    else if (bgCompact.ar === undefined) bgCompact.ar = idx;
  });

  const payload: CompactRosterV1 = {
    v: 1,
    n: roster.name,
    f: roster.factionId,
    bs: BATTLE_SIZE_TO_NUM[roster.battleSize] ?? 1,
    d: roster.detachments.map((det) => det.id || det.name),
    u: compactUnits
  };

  if (roster.subFactionId && roster.subFactionId !== roster.factionId) {
    payload.sf = roster.subFactionId;
  }
  if (roster.subFactionName && !roster.subFactionId) {
    payload.sfn = roster.subFactionName;
  }
  if (typeof roster.customPointsLimit === 'number' && roster.customPointsLimit > 0) {
    payload.cp = roster.customPointsLimit;
  }
  const disp = roster.forceDisposition || roster.forceDispositions?.[0];
  if (disp) payload.fd = disp;
  if (roster.includeLegends) payload.lg = 1;
  if (roster.themeId) payload.th = roster.themeId;
  if (roster.notes && roster.notes.trim()) payload.nt = roster.notes;

  const jsonBytes = new TextEncoder().encode(JSON.stringify(payload));
  const rawCode = `${PREFIX_RAW}${toBase64Url(jsonBytes)}`;

  const compressed = await deflateRaw(jsonBytes);
  if (compressed) {
    const zipCode = `${PREFIX_ZLIB}${toBase64Url(compressed)}`;
    if (zipCode.length < rawCode.length) return zipCode;
  }
  return rawCode;
}

export function buildShareUrl(shareCode: string): string {
  const base = `${window.location.origin}${window.location.pathname}`;
  return `${base}#import=${shareCode}`;
}

export function extractShareCodeFromInput(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith(PREFIX_ZLIB) || trimmed.startsWith(PREFIX_RAW)) {
    return trimmed;
  }

  try {
    const url = new URL(trimmed);
    const searchCode = url.searchParams.get('import');
    if (searchCode && (searchCode.startsWith(PREFIX_ZLIB) || searchCode.startsWith(PREFIX_RAW))) {
      return searchCode;
    }
    if (url.hash) {
      const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''));
      const hashCode = hashParams.get('import');
      if (hashCode && (hashCode.startsWith(PREFIX_ZLIB) || hashCode.startsWith(PREFIX_RAW))) {
        return hashCode;
      }
    }
  } catch {
    // Not a full URL; fall through to regex match
  }

  const match = trimmed.match(/(?:^|[?#&\s])(?:import=)?(40K1Z?:[A-Za-z0-9_-]+)/);
  return match ? match[1] : null;
}

async function defaultLoadFactionDetail(factionId: string): Promise<FactionDetail> {
  const staticRes = await fetch(`${import.meta.env.BASE_URL}data/factions/${factionId}.json`, {
    cache: 'no-cache'
  });
  if (staticRes.ok) {
    return (await staticRes.json()) as FactionDetail;
  }
  const apiRes = await fetch(`/api/factions/${factionId}`, { cache: 'no-cache' });
  if (apiRes.ok) {
    return (await apiRes.json()) as FactionDetail;
  }
  throw new Error(`Failed to load faction data for "${factionId}".`);
}

export async function decodeShareCodeToRoster(
  rawInput: string,
  factionsIndex: FactionSummary[],
  loadFaction: (id: string) => Promise<FactionDetail> = defaultLoadFactionDetail
): Promise<{ roster: ArmyRoster; warnings: string[] }> {
  const code = extractShareCodeFromInput(rawInput);
  if (!code) {
    throw new Error('Invalid share code or link.');
  }

  let jsonText: string;
  if (code.startsWith(PREFIX_ZLIB)) {
    const compressed = fromBase64Url(code.slice(PREFIX_ZLIB.length));
    const decompressed = await inflateRaw(compressed);
    jsonText = new TextDecoder().decode(decompressed);
  } else if (code.startsWith(PREFIX_RAW)) {
    const rawBytes = fromBase64Url(code.slice(PREFIX_RAW.length));
    jsonText = new TextDecoder().decode(rawBytes);
  } else {
    throw new Error('Unsupported share code version.');
  }

  const compact = JSON.parse(jsonText) as CompactRosterV1;
  if (!compact || compact.v !== 1 || !compact.f || !Array.isArray(compact.u)) {
    throw new Error('Invalid or corrupted shared roster payload.');
  }

  const factionData = await loadFaction(compact.f);
  const warnings: string[] = [];

  const summary = factionsIndex.find((f) => f.id === compact.f);
  const parentSummary = summary?.parentFaction
    ? factionsIndex.find((f) => f.id === summary.parentFaction)
    : undefined;

  const isSub = Boolean(summary?.isSubFaction || factionData.faction.isSubFaction);
  const factionName = isSub && parentSummary ? parentSummary.name : factionData.faction.name;
  const subFactionId = compact.sf ?? (isSub ? factionData.faction.id : null);
  const subFactionName =
    compact.sfn ?? (isSub ? factionData.faction.name : subFactionId ? factionsIndex.find((f) => f.id === subFactionId)?.name ?? null : null);

  const detachments: SelectedDetachment[] = [];
  for (const detKey of compact.d || []) {
    const found = factionData.detachments.find(
      (d) => d.id === detKey || normalizeDetachmentName(d.name) === normalizeDetachmentName(detKey)
    );
    if (found) {
      if (!detachments.some((x) => x.id === found.id)) detachments.push(found);
    } else {
      warnings.push(`Detachment "${detKey}" was not found in ${factionData.faction.name}.`);
    }
  }

  const baseTs = Date.now();
  const units: SelectedUnit[] = [];
  const compactIndexToUnit = new Map<number, SelectedUnit>();

  compact.u.forEach((cu, idx) => {
    const ds: Datasheet | undefined = factionData.units.find(
      (u) => u.id === cu.d || u.name.toLowerCase() === String(cu.d).toLowerCase()
    );
    if (!ds) {
      warnings.push(`Unit "${cu.d}" was not found in ${factionData.faction.name}.`);
      return;
    }

    const modelsCount = Math.min(
      Math.max(cu.m ?? (ds.minModels || 1), ds.minModels || 1),
      ds.maxModels || ds.minModels || 1
    );
    const cost = getUnitBaseCostForModelCount(ds, modelsCount);

    const selectedOptions: Record<string, string[]> = {};
    const groups = ds.wargearGroups || [];
    groups.forEach((g) => {
      selectedOptions[g.id] = [...(g.defaultOptionIds || [])];
    });

    if (cu.o) {
      for (const [gi, optIndices] of cu.o) {
        const g = groups[gi];
        if (!g) continue;
        const validIds = optIndices
          .map((oi) => g.options[oi]?.id)
          .filter((id): id is string => Boolean(id));
        selectedOptions[g.id] = validIds;
      }
    }
    if (cu.oId) {
      for (const [gid, optIds] of Object.entries(cu.oId)) {
        const g = groups.find((grp) => grp.id === gid);
        if (!g) continue;
        const validSet = new Set(g.options.map((o) => o.id));
        selectedOptions[g.id] = optIds.filter((id) => validSet.has(id));
      }
    }

    let enhancement: Enhancement | undefined;
    if (cu.e && factionData.enhancements) {
      enhancement = factionData.enhancements.find(
        (enh) => enh.id === cu.e || enh.name.toLowerCase() === String(cu.e).toLowerCase()
      );
      if (!enhancement) {
        warnings.push(`Enhancement "${cu.e}" on "${ds.name}" was not found.`);
      }
    }

    const unit: SelectedUnit = {
      instanceId: `unit-${baseTs}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
      datasheetId: ds.id,
      name: ds.name,
      cost,
      modelsCount,
      isCharacter: ds.isCharacter,
      isEpicHero: ds.isEpicHero,
      isBattleline: ds.isBattleline,
      isDedicatedTransport: ds.isDedicatedTransport,
      isLeader: ds.isLeader,
      isSupport: ds.isSupport,
      isWarlord: Boolean(cu.w),
      enhancement,
      selectedOptions,
      datasheet: ds
    };

    units.push(unit);
    compactIndexToUnit.set(idx, unit);
  });

  // Restore attachments and embarked transport links
  compact.u.forEach((cu, idx) => {
    const unit = compactIndexToUnit.get(idx);
    if (!unit) return;

    if (cu.al !== undefined) {
      const leader = compactIndexToUnit.get(cu.al);
      if (leader) {
        unit.attachedLeaderId = leader.instanceId;
        leader.attachedToBodyguardId = unit.instanceId;
      }
    }
    if (cu.as !== undefined) {
      const support = compactIndexToUnit.get(cu.as);
      if (support) {
        unit.attachedSupportId = support.instanceId;
        support.attachedToBodyguardId = unit.instanceId;
      }
    }
    if (cu.ar !== undefined) {
      const retinue = compactIndexToUnit.get(cu.ar);
      if (retinue) {
        unit.attachedRetinueId = retinue.instanceId;
        retinue.attachedToBodyguardId = unit.instanceId;
      }
    }
    if (cu.em && cu.em.length > 0) {
      const embarkedIds = cu.em
        .map((eIdx) => compactIndexToUnit.get(eIdx)?.instanceId)
        .filter((id): id is string => Boolean(id));
      if (embarkedIds.length > 0) {
        unit.embarkedUnitIds = embarkedIds;
      }
    }
  });

  const now = new Date().toISOString();
  const roster: ArmyRoster = {
    id: `roster-${baseTs}-${Math.random().toString(36).slice(2, 7)}`,
    name: (compact.n || `${factionData.faction.name} Import`).trim(),
    factionId: factionData.faction.id,
    factionName,
    superFaction: factionData.faction.superFaction,
    subFactionId,
    subFactionName,
    battleSize: NUM_TO_BATTLE_SIZE[compact.bs] ?? 'strike-force',
    customPointsLimit: compact.cp ?? null,
    detachments,
    forceDisposition: compact.fd ?? null,
    forceDispositions: compact.fd ? [compact.fd] : [],
    includeLegends: Boolean(compact.lg) || units.some((u) => /\[legends\]/i.test(u.name)),
    themeId: compact.th ?? null,
    notes: compact.nt,
    units,
    createdAt: now,
    updatedAt: now
  };

  return { roster, warnings };
}
