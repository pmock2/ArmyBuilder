// AI Roster Builder: Turns user natural language prompts into valid Warhammer 40k 11e rosters

import { ArmyRoster, BattleSize, SelectedUnit, SelectedDetachment, getUnitBaseCostForModelCount, normalizeDetachmentName } from '../types/roster';
import { FactionSummary, FactionDetail } from '../types/faction';
import { callGemini } from './geminiService';
import factionsIndexData from '../data/factions_index.json';
import { getOwnedModelsForFaction } from '../utils/ownedModelsStorage';

interface AiUnitDirective {
  name: string;
  modelsCount?: number;
  isWarlord?: boolean;
  attachedTo?: string; // Name of bodyguard unit to attach to
  enhancement?: string; // Name of enhancement to give this character
}

interface AiRosterPlan {
  rosterName: string;
  battleSize: 'incursion' | 'strike-force' | 'onslaught';
  factionId: string;
  detachments: string[];
  units: AiUnitDirective[];
  summary?: string;
}

// 1. Identify which faction the user wants from their prompt
export async function identifyTargetFaction(userPrompt: string): Promise<string> {
  const factions = factionsIndexData as FactionSummary[];
  const promptLower = userPrompt.toLowerCase();

  // Fast direct keyword match first
  for (const f of factions) {
    const fNameLower = f.name.toLowerCase();
    if (promptLower.includes(fNameLower)) {
      return f.id;
    }
  }

  // Common aliases
  if (promptLower.includes('salamander')) return 'imperium-salamanders';
  if (promptLower.includes('space marine') || promptLower.includes('astartes')) return 'imperium-space-marines';
  if (promptLower.includes('black templar')) return 'imperium-black-templars';
  if (promptLower.includes('blood angel')) return 'imperium-blood-angels';
  if (promptLower.includes('dark angel')) return 'imperium-dark-angels';
  if (promptLower.includes('space wolf') || promptLower.includes('space wolves')) return 'imperium-space-wolves';
  if (promptLower.includes('grey knight')) return 'imperium-grey-knights';
  if (promptLower.includes('custodes')) return 'imperium-adeptus-custodes';
  if (promptLower.includes('guard') || promptLower.includes('astramilitarum') || promptLower.includes('astra militarum') || promptLower.includes('cadian')) return 'imperium-astra-militarum';
  if (promptLower.includes('necron')) return 'necrons';
  if (promptLower.includes('tau') || promptLower.includes("t'au")) return 't-au-empire';
  if (promptLower.includes('ork') || promptLower.includes('waaagh')) return 'orks';
  if (promptLower.includes('nid') || promptLower.includes('tyranid')) return 'tyranids';
  if (promptLower.includes('eldar') || promptLower.includes('aeldari') || promptLower.includes('craftworld')) return 'aeldari-craftworlds';
  if (promptLower.includes('drukhari') || promptLower.includes('dark eldar')) return 'aeldari-drukhari';
  if (promptLower.includes('votann') || promptLower.includes('dwarf')) return 'leagues-of-votann';
  if (promptLower.includes('sororitas') || promptLower.includes('sister')) return 'imperium-adepta-sororitas';
  if (promptLower.includes('death guard') || promptLower.includes('nurgle')) return 'chaos-death-guard';
  if (promptLower.includes('world eater') || promptLower.includes('khorne')) return 'chaos-world-eaters';
  if (promptLower.includes('thousand son') || promptLower.includes('tzeentch') || promptLower.includes('rubric')) return 'chaos-thousand-sons';
  if (promptLower.includes('chaos space marine') || promptLower.includes('csm') || promptLower.includes('black legion')) return 'chaos-chaos-space-marines';

  // Fallback to Gemini if ambiguous
  const factionListStr = factions.map(f => `${f.id}: ${f.name} (${f.superFaction})`).join('\n');
  const res = await callGemini(
    `Identify the best matching Warhammer 40k faction ID for this user prompt: "${userPrompt}"\n\nAvailable factions:\n${factionListStr}\n\nRespond ONLY with the exact faction ID string (e.g. "imperium-salamanders").`,
    { temperature: 0.1 }
  );

  const matched = res.trim().toLowerCase().replace(/['"`]/g, '');
  const exists = factions.find(f => f.id === matched);
  return exists ? exists.id : 'imperium-space-marines';
}

// 2. Dynamically Generate a Creative Prompt Idea using AI
export async function generateAiPromptIdea(): Promise<string> {
  const factions = factionsIndexData as FactionSummary[];
  const randomFac = factions[Math.floor(Math.random() * factions.length)];

  const systemInstruction = `You are an imaginative Warhammer 40,000 player.
Generate a single, natural, 1-sentence prompt for building a 40k 11th Edition army list (e.g. "Build a 2k competitive Salamanders Army", "1000pt fast-attack White Scars mounted force with Outriders", "2000pt competitive Necrons silver tide with Illuminor Szeras").
Keep it simple, punchy, and under 15 words. Respond ONLY with the prompt text itself—do NOT wrap in quotes or code blocks.`;

  try {
    const res = await callGemini(
      `Generate an army prompt for ${randomFac.name}.`,
      { systemInstruction, temperature: 0.85 }
    );
    const cleaned = res.trim().replace(/^["']|["']$/g, '');
    return cleaned || `Build a 2k competitive ${randomFac.name} Army`;
  } catch {
    return `Build a 2k competitive ${randomFac.name} Army`;
  }
}

// 3. Generate Roster Plan from Prompt and Faction Data
export async function generateRosterPlan(
  userPrompt: string,
  factionData: FactionDetail,
  preferredBattleSize?: BattleSize,
  onlyOwnedModels?: boolean
): Promise<AiRosterPlan> {
  // Detect battle size and target points from prompt or preferred option
  let detectedBattleSize: BattleSize = preferredBattleSize || 'strike-force';
  if (!preferredBattleSize) {
    if (/\b(1k|1000|1000pt|1000pts|incursion)\b/i.test(userPrompt)) {
      detectedBattleSize = 'incursion';
    } else if (/\b(3k|3000|3000pt|3000pts|onslaught)\b/i.test(userPrompt)) {
      detectedBattleSize = 'onslaught';
    } else {
      detectedBattleSize = 'strike-force';
    }
  }

  const pointsTarget = detectedBattleSize === 'incursion' ? 1000 : detectedBattleSize === 'onslaught' ? 3000 : 2000;
  const dpBudget = detectedBattleSize === 'incursion' ? 2 : detectedBattleSize === 'onslaught' ? 4 : 3;

  // Compress available units and detachments into a lean prompt schema
  const detachmentsList = (factionData.detachments || []).map(d => ({
    name: d.name,
    dpCost: d.dpCost,
    enhancements: (factionData.enhancements || [])
      .filter(e => e.detachment && normalizeDetachmentName(e.detachment) === normalizeDetachmentName(d.name))
      .map(e => `${e.name} (${e.pts} pts)`)
  }));

  let candidateUnits = factionData.units || [];
  let ownedById: Map<string, number> | null = null;

  if (onlyOwnedModels) {
    const ownedEntries = getOwnedModelsForFaction(factionData.faction.id);
    if (ownedEntries.length === 0) {
      throw new Error(
        `You have no owned models recorded for ${factionData.faction.name}. Add units in the Owned Models tab or disable "Use only my Owned Models".`
      );
    }
    ownedById = new Map(ownedEntries.map(e => [e.datasheetId, e.modelsCount]));
    candidateUnits = candidateUnits.filter(u => {
      const ownedCount = ownedById!.get(u.id) || 0;
      return ownedCount >= (u.minModels || 1);
    });
    if (candidateUnits.length === 0) {
      throw new Error(
        `None of your owned models for ${factionData.faction.name} meet the minimum squad size for a unit.`
      );
    }
  }

  const unitsList = candidateUnits.map(u => {
    const base: Record<string, any> = {
      name: u.name,
      role: u.primaryCategory,
      pts: u.baseCost,
      minModels: u.minModels || 1,
      maxModels: ownedById ? Math.min(u.maxModels || 1, ownedById.get(u.id) || 1) : (u.maxModels || 1),
      costTiers: u.costTiers?.map(t => `${t.models}m=${t.cost}pts`) || [],
      isLeader: u.isLeader,
      canLead: u.canLead || []
    };
    if (ownedById) {
      base.maxOwnedModels = ownedById.get(u.id) || 0;
    }
    return base;
  });

  const ownedModelsRule = onlyOwnedModels
    ? `\n5. OWNED MODELS RESTRICTION (STRICT):
   - The user has enabled "Owned Models Only". The catalogue above ONLY contains units the user owns.
   - Each unit includes "maxOwnedModels", which is the TOTAL number of models the user owns across ALL copies of that unit combined.
   - NEVER include any unit not in the list, and NEVER exceed "maxOwnedModels" total models for any unit across the entire roster.`
    : '';

  const systemInstruction = `You are an expert Warhammer 40,000 11th Edition Army Builder and Tournament Strategist AI.
Your job is to analyze the user's army list prompt (e.g. "Build a 2k competitive Salamanders Army" or specific unit requirements) and build a complete, battle-forged, competitive army roster utilizing the points available from the provided faction catalogue.

CRITICAL ARMY BUILDING RULES:
1. TARGET POINTS BUDGET: ${pointsTarget} pts.
   - Build a full roster using as close to ${pointsTarget} pts as possible (aim for ${pointsTarget - 45} to ${pointsTarget} pts).
   - NEVER exceed ${pointsTarget} pts.
   - If the user gave a generic prompt like "Build a 2k competitive army", DO NOT stop at 2-3 units—fill out the full army with characters, battleline, elite infantry, heavy anti-tank armor, and skirmishers!
2. DETACHMENT POINTS (DP) BUDGET: Up to ${dpBudget} DP total.
   - Select 1 (or 2 if DP budget allows) powerful, synergistic detachments from the catalogue.
3. ROSTER COMPOSITION & ROLES:
   - Exactly ONE unit must have "isWarlord": true (must be a CHARACTER).
   - Attach Leaders to valid Bodyguard units where synergistic (using "attachedTo" with the bodyguard's exact name).
   - Squad Sizes: If increasing model count for a squad (e.g. 6 Bladeguard, 10 Intercessors, 20 Boyz), set "modelsCount".
   - Include 1-2 Battleline units for Primary Objective scoring.
   - Include heavy firepower / anti-tank armor support (Vehicles, Dreadnoughts, Tanks, Monsters).
   - Include fast skirmish/objective scoring units.
   - Assign 1-2 Enhancements from the selected detachment to eligible non-Epic Hero Characters.
4. CATALOGUE FIDELITY:
   - ONLY select units, detachments, and enhancements that exist in the provided catalogue. Use their EXACT names.${ownedModelsRule}

Output strictly valid JSON conforming to this schema:
{
  "rosterName": "string",
  "battleSize": "${detectedBattleSize}",
  "detachments": ["exact detachment name"],
  "units": [
    {
      "name": "exact unit name from catalog",
      "modelsCount": number,
      "isWarlord": boolean,
      "attachedTo": "exact bodyguard unit name or null",
      "enhancement": "exact enhancement name or null"
    }
  ],
  "summary": "brief 1-2 sentence explanation of list strategy and total points"
}`;

  const promptContent = `USER REQUEST: "${userPrompt}"
FACTION: ${factionData.faction.name} (${factionData.faction.id})
TARGET POINTS: ${pointsTarget} pts (${detectedBattleSize.toUpperCase()})
DP BUDGET: ${dpBudget} DP

CATALOGUE DETACHMENTS:
${JSON.stringify(detachmentsList, null, 2)}

CATALOGUE UNITS (Summary):
${JSON.stringify(unitsList, null, 2)}

Generate the complete JSON army roster plan. Fill the points budget up to ~${pointsTarget} pts.`;

  const rawJson = await callGemini(promptContent, {
    systemInstruction,
    json: true,
    temperature: 0.2
  });

  try {
    const parsed: AiRosterPlan = JSON.parse(rawJson);
    parsed.factionId = factionData.faction.id;
    return parsed;
  } catch (err: any) {
    throw new Error(`Failed to parse AI roster plan: ${err.message}. Response was:\n${rawJson}`);
  }
}

// 3. Convert AiRosterPlan into a fully hydrated ArmyRoster
export function buildRosterFromPlan(
  plan: AiRosterPlan,
  factionData: FactionDetail,
  factionsIndex: FactionSummary[],
  onlyOwnedModels?: boolean
): ArmyRoster {
  const currentFaction = factionsIndex.find(f => f.id === factionData.faction.id);

  // 1. Detachments
  const selectedDetachments: SelectedDetachment[] = [];
  for (const detName of plan.detachments || []) {
    const norm = normalizeDetachmentName(detName);
    const matched = factionData.detachments?.find(d => normalizeDetachmentName(d.name) === norm);
    if (matched && !selectedDetachments.some(sd => sd.id === matched.id)) {
      selectedDetachments.push(matched);
    }
  }

  // If no detachment was matched, default to the faction's first detachment
  if (selectedDetachments.length === 0 && factionData.detachments && factionData.detachments.length > 0) {
    selectedDetachments.push(factionData.detachments[0]);
  }

  // 2. Units Matching
  const instantiatedUnits: SelectedUnit[] = [];
  const attachedMapping: { leaderInstanceId: string; bodyguardName: string }[] = [];
  const remainingOwned = onlyOwnedModels
    ? new Map<string, number>(
        getOwnedModelsForFaction(factionData.faction.id).map(e => [e.datasheetId, e.modelsCount])
      )
    : null;

  for (const uDirective of plan.units || []) {
    // Find matching datasheet (restrict to owned datasheets when onlyOwnedModels is active)
    const cleanDirName = uDirective.name.toLowerCase().trim();
    const candidatePool = remainingOwned
      ? (factionData.units || []).filter(u => remainingOwned.has(u.id))
      : (factionData.units || []);
    const ds = candidatePool.find(u => {
      const uName = u.name.toLowerCase();
      return uName === cleanDirName ||
        uName.includes(cleanDirName) ||
        cleanDirName.includes(uName);
    });

    if (!ds) {
      console.warn(`AI suggested unit "${uDirective.name}" not found in ${onlyOwnedModels ? 'owned ' : ''}${factionData.faction.name} catalogue.`);
      continue;
    }

    const minReq = ds.minModels || 1;
    let maxAllowed = ds.maxModels || 1;
    if (remainingOwned) {
      const avail = remainingOwned.get(ds.id) ?? 0;
      if (avail < minReq) {
        console.warn(`Skipping "${ds.name}" — insufficient remaining owned models (${avail} < ${minReq}).`);
        continue;
      }
      maxAllowed = Math.min(maxAllowed, avail);
    }

    const instanceId = `unit-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const modelsCount = Math.min(
      maxAllowed,
      Math.max(minReq, uDirective.modelsCount || minReq)
    );
    if (remainingOwned) {
      remainingOwned.set(ds.id, Math.max(0, (remainingOwned.get(ds.id) ?? 0) - modelsCount));
    }
    const cost = getUnitBaseCostForModelCount(ds, modelsCount);

    // Default wargear options
    const defaultOptions: Record<string, string[]> = {};
    if (ds.wargearGroups) {
      for (const g of ds.wargearGroups) {
        defaultOptions[g.id] = g.defaultOptionIds || [];
      }
    }

    // Match Enhancement if specified
    let unitEnhancement = undefined;
    if (uDirective.enhancement) {
      const cleanEnh = uDirective.enhancement.toLowerCase().trim();
      const enh = factionData.enhancements?.find(e => {
        const eName = e.name.toLowerCase();
        return eName === cleanEnh || eName.includes(cleanEnh) || cleanEnh.includes(eName);
      });
      if (enh) {
        unitEnhancement = enh;
      }
    }

    const selectedUnit: SelectedUnit = {
      instanceId,
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
      isWarlord: Boolean(uDirective.isWarlord),
      enhancement: unitEnhancement,
      selectedOptions: defaultOptions,
      datasheet: ds
    };

    instantiatedUnits.push(selectedUnit);

    if (uDirective.attachedTo && (ds.isLeader || ds.isSupport)) {
      attachedMapping.push({
        leaderInstanceId: instanceId,
        bodyguardName: uDirective.attachedTo.toLowerCase().trim()
      });
    }
  }

  // 3. Resolve attachments
  for (const { leaderInstanceId, bodyguardName } of attachedMapping) {
    const leaderUnit = instantiatedUnits.find(u => u.instanceId === leaderInstanceId);
    if (!leaderUnit) continue;

    // Find first matching bodyguard unit that doesn't already have a leader attached
    const bodyguardUnit = instantiatedUnits.find(u => {
      const uName = u.name.toLowerCase();
      const nameMatches = uName === bodyguardName || uName.includes(bodyguardName) || bodyguardName.includes(uName);
      return nameMatches && !u.attachedLeaderId;
    });

    if (bodyguardUnit) {
      if (leaderUnit.isSupport) {
        bodyguardUnit.attachedSupportId = leaderUnit.instanceId;
        leaderUnit.attachedToBodyguardId = bodyguardUnit.instanceId;
      } else {
        bodyguardUnit.attachedLeaderId = leaderUnit.instanceId;
        leaderUnit.attachedToBodyguardId = bodyguardUnit.instanceId;
      }
    }
  }

  // 4. Ensure exactly one Warlord if any characters exist
  const warlordCount = instantiatedUnits.filter(u => u.isWarlord).length;
  if (warlordCount === 0) {
    const firstChar = instantiatedUnits.find(u => u.isCharacter);
    if (firstChar) firstChar.isWarlord = true;
  } else if (warlordCount > 1) {
    let keptFirst = false;
    for (const u of instantiatedUnits) {
      if (u.isWarlord) {
        if (!keptFirst) keptFirst = true;
        else u.isWarlord = false;
      }
    }
  }

  const finalBattleSize: BattleSize = plan.battleSize || 'strike-force';

  const newRoster: ArmyRoster = {
    id: `roster-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    name: plan.rosterName || `${factionData.faction.name} Army`,
    factionId: factionData.faction.id,
    factionName: currentFaction?.name || factionData.faction.name,
    superFaction: currentFaction?.superFaction || factionData.faction.superFaction || 'Imperium',
    subFactionId: currentFaction?.isSubFaction ? currentFaction.id : null,
    subFactionName: currentFaction?.isSubFaction ? currentFaction.name : null,
    battleSize: finalBattleSize,
    detachments: selectedDetachments,
    units: instantiatedUnits,
    notes: plan.summary || undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  return newRoster;
}
