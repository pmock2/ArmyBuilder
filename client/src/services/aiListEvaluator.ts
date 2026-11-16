import {
  ArmyRoster,
  SelectedUnit,
  ValidationResult,
  getUnitRole,
  getUnitTotalPts
} from '../types/roster';
import { FactionDetail } from '../types/faction';
import { callGemini } from './geminiService';
import { loadKeywordsCompendium } from './rulesSearchService';

interface MetaFactionEntry {
  factionName: string;
  podiumCount: number;
  firstPlaceCount: number;
  topDetachments: { name: string; count: number }[];
}

interface MetaSnapshot {
  totalPodiumListsAnalyzed?: number;
  factions?: Record<string, MetaFactionEntry>;
}

let cachedMeta: MetaSnapshot | null | undefined;

async function getMetaFactionSummary(factionId: string): Promise<string> {
  if (cachedMeta === undefined) {
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}data/meta_snapshot.json`);
      cachedMeta = res.ok ? await res.json() : null;
    } catch {
      cachedMeta = null;
    }
  }
  const entry = cachedMeta?.factions?.[factionId];
  if (!entry) return '';
  const topDets = (entry.topDetachments || [])
    .slice(0, 4)
    .map((d) => `${d.name} (${d.count})`)
    .join(', ');
  return `Tournament Meta Snapshot for ${entry.factionName}: ${entry.podiumCount} podium finishes (${entry.firstPlaceCount} 1st places)${topDets ? `; top detachments: ${topDets}` : ''}.`;
}

function summarizeSelectedWargear(u: SelectedUnit): string[] {
  const chosen: string[] = [];
  for (const g of u.datasheet.wargearGroups || []) {
    const ids =
      u.selectedOptions && u.selectedOptions[g.id] !== undefined
        ? u.selectedOptions[g.id]
        : g.defaultOptionIds || [];
    if (!ids || ids.length === 0) continue;
    const counts = new Map<string, number>();
    for (const id of ids) {
      counts.set(id, (counts.get(id) || 0) + 1);
    }
    for (const [id, count] of counts.entries()) {
      const opt = g.options.find((o) => o.id === id);
      if (!opt) continue;
      const ptsStr = opt.pts && opt.pts > 0 ? ` (+${opt.pts} pts)` : '';
      chosen.push(`${count > 1 ? `${count}x ` : ''}${opt.name}${ptsStr}`);
    }
  }
  return chosen;
}

function buildRosterSummaryForAi(
  roster: ArmyRoster,
  validation: ValidationResult,
  factionData?: FactionDetail | null
): string {
  const lines: string[] = [];
  lines.push(`Roster: ${roster.name}`);
  lines.push(
    `Faction: ${roster.subFactionName && roster.subFactionName !== roster.factionName ? `${roster.factionName} (${roster.subFactionName})` : roster.factionName}`
  );
  lines.push(`Battle Size: ${roster.battleSize} | Points: ${validation.totalPoints}/${validation.pointsLimit} | Detachment Points: ${validation.totalDP}/${validation.dpLimit}`);

  if (factionData?.armyRules && factionData.armyRules.length > 0) {
    lines.push(`Army Ability: ${factionData.armyRules.map((r) => r.name).join(', ')}`);
  }

  if (roster.detachments.length > 0) {
    lines.push(
      `Detachments: ${roster.detachments
        .map((d) => {
          const rulesText = (d.rules || []).map((r) => `${r.name}: ${r.description}`).join(' | ');
          return `${d.name} (${d.dpCost} DP)${rulesText ? ` [${rulesText}]` : ''}`;
        })
        .join('; ')}`
    );
  } else {
    lines.push('Detachments: None selected');
  }

  if (roster.forceDisposition) {
    lines.push(`Force Disposition: ${roster.forceDisposition}`);
  }

  if (validation.issues.length > 0) {
    lines.push(
      `Current Validator Issues: ${validation.issues
        .map((i) => `[${i.severity.toUpperCase()}] ${i.message}`)
        .join(' | ')}`
    );
  }

  lines.push('\nUnits:');
  for (const u of roster.units) {
    const pts = getUnitTotalPts(u);
    const role = getUnitRole(u);
    const flags: string[] = [];
    if (u.isWarlord) flags.push('WARLORD');
    if (u.enhancement) flags.push(`Enhancement: ${u.enhancement.name} (+${u.enhancement.pts} pts)`);
    if (u.attachedToBodyguardId) {
      const target = roster.units.find((x) => x.instanceId === u.attachedToBodyguardId);
      if (target) flags.push(`Attached to: ${target.name}`);
    }
    if (u.attachedLeaderId) {
      const leader = roster.units.find((x) => x.instanceId === u.attachedLeaderId);
      if (leader) flags.push(`Led by: ${leader.name}`);
    }
    if (u.attachedSupportId) {
      const sup = roster.units.find((x) => x.instanceId === u.attachedSupportId);
      if (sup) flags.push(`Support: ${sup.name}`);
    }

    const wargear = summarizeSelectedWargear(u);
    const abs = (u.datasheet.abilities || [])
      .filter((a) => !['leader', 'support'].includes(a.name.toLowerCase()))
      .slice(0, 4)
      .map((a) => a.name);

    lines.push(
      `- [${role}] ${u.name} (${u.modelsCount} models, ${pts} pts)${flags.length ? ` | ${flags.join(', ')}` : ''}${wargear.length ? ` | Loadout: ${wargear.join(', ')}` : ''}${abs.length ? ` | Key Abilities: ${abs.join(', ')}` : ''}`
    );
  }

  return lines.join('\n');
}

export async function evaluateRosterWithAi(
  roster: ArmyRoster,
  validation: ValidationResult,
  factionData?: FactionDetail | null,
  customFocus?: string
): Promise<string> {
  const rosterSummary = buildRosterSummaryForAi(roster, validation, factionData);
  const metaSummary = await getMetaFactionSummary(roster.factionId);

  // Pull brief 11e rules reminder if cached/available (e.g. Force Dispositions / 11e differences)
  let keywordsHint = '';
  try {
    const kws = await loadKeywordsCompendium();
    if (kws.length > 0) {
      keywordsHint = `Note: This roster is built for Warhammer 40,000 11th Edition (uses Detachment Points instead of CP, Force Dispositions, multiple Detachments when within DP limit).`;
    }
  } catch {
    // Non-fatal
  }

  const systemInstruction = `You are a veteran Warhammer 40,000 11th Edition competitive coach and list-building analyst.
Evaluate the user's current army list insightfully and concisely using Markdown headings and bullet points.

Areas you CAN evaluate (ONLY include the ones genuinely warranted by THIS specific list — none are strictly required if there is nothing meaningful to say for them):
- **Strengths & Weaknesses**: combat profile (anti-tank vs anti-horde, durability, primary scoring, secondary play, screening, mobility).
- **Competitiveness**: whether the list reads casual, tuned/semi-competitive, or tournament-ready and why.
- **Synergies**: detachment interactions, Leader/Support pairings, Force Disposition fit, aura/stratagem/enhancement combos.
- **Suggestions**: concrete point trims, wargear adjustments, attachment fixes, or unit swaps with point costs kept in mind.
- **Potential Issues**: unattached Leaders/Characters without bodyguards, validation errors, wasted spare points, rule traps, or severe matchup blind spots.

Guidelines:
- Do NOT force all five sections or add filler/generic boilerplate if an item is not relevant to this list.
- Call out specific unit names, attachments, detachments, and point totals from the roster accurately.
- Never invent units or rules that are not in the roster context or 11th Edition core framework.`;

  const promptParts = [
    keywordsHint,
    metaSummary,
    rosterSummary,
    customFocus?.trim()
      ? `\nAdditional evaluation focus from player: "${customFocus.trim()}"`
      : ''
  ].filter(Boolean);

  return await callGemini(promptParts.join('\n\n'), {
    systemInstruction,
    temperature: 0.35
  });
}
