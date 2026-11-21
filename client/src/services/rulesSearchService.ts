// Rules Search Service: Local lexical search over 11th Edition Core Rules, Keywords, Stratagems, and Rules Diagrams
import { CORE_STRATAGEMS, getDetachmentStratagems, Stratagem } from '../data/stratagems';
import { SelectedDetachment } from '../types/roster';

export interface RuleSection {
  id: string;
  title: string;
  sectionNum: string;
  level?: number;
  text: string;
}

export interface KeywordEntry {
  name: string;
  category: string;
  ruleRef?: string;
  summary: string;
  description: string;
}

export interface RuleDiagram {
  file: string;
  title: string;
  caption: string;
  sectionNum: string;
  sectionTitle: string;
}

export interface FactionArmyRule {
  name: string;
  description: string;
}

let cachedRules: RuleSection[] | null = null;
let cachedKeywords: KeywordEntry[] | null = null;
let cachedDiagrams: RuleDiagram[] | null = null;
const cachedFactionArmyRules = new Map<string, FactionArmyRule[]>();

export async function loadRulesReference(): Promise<RuleSection[]> {
  if (cachedRules) return cachedRules;
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}data/rules_reference.json`);
    if (res.ok) {
      cachedRules = await res.json();
      return cachedRules || [];
    }
  } catch (err) {
    console.warn('Failed to fetch rules_reference.json:', err);
  }
  return [];
}

export async function loadKeywordsCompendium(): Promise<KeywordEntry[]> {
  if (cachedKeywords) return cachedKeywords;
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}data/keywords.json`);
    if (res.ok) {
      const data = await res.json();
      cachedKeywords = data.allKeywordsList || [];
      return cachedKeywords || [];
    }
  } catch (err) {
    console.warn('Failed to fetch keywords.json:', err);
  }
  return [];
}

export async function loadRulesDiagrams(): Promise<RuleDiagram[]> {
  if (cachedDiagrams) return cachedDiagrams;
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}data/rules_images.json`);
    if (res.ok) {
      cachedDiagrams = await res.json();
      return cachedDiagrams || [];
    }
  } catch (err) {
    console.warn('Failed to fetch rules_images.json:', err);
  }
  return [];
}

export async function loadFactionArmyRules(factionId: string): Promise<FactionArmyRule[]> {
  if (!factionId) return [];
  if (cachedFactionArmyRules.has(factionId)) {
    return cachedFactionArmyRules.get(factionId) || [];
  }
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}data/factions/${factionId}.json`);
    if (res.ok) {
      const data = await res.json();
      const rules: FactionArmyRule[] = Array.isArray(data?.armyRules) ? data.armyRules : [];
      cachedFactionArmyRules.set(factionId, rules);
      return rules;
    }
  } catch (err) {
    console.warn(`Failed to fetch faction rules for ${factionId}:`, err);
  }
  return [];
}

const STOP_WORDS = new Set([
  'what', 'when', 'where', 'which', 'does', 'with', 'from', 'have', 'that', 'this',
  'work', 'works', 'rule', 'rules', 'about', 'into', 'they', 'them', 'their', 'your',
  'there', 'then', 'than', 'only', 'also', 'still', 'just', 'make', 'unit', 'units',
  'model', 'models', 'turn', 'phase'
]);

const SHORT_WARHAMMER_TOKENS = new Set(['ap', 'cp', 'oc', 'ws', 'bs', 'sv', 'mw', 'ld', 'hp']);

function stemToken(token: string): string {
  if (token.length <= 4) return token;
  if (token.endsWith('ing') && token.length > 5) {
    const base = token.slice(0, -3);
    // e.g. advancing -> advanc, charging -> charg, shooting -> shoot
    return base;
  }
  if (token.endsWith('ies') && token.length > 5) {
    return token.slice(0, -3) + 'y';
  }
  if (token.endsWith('ed') && token.length > 5) {
    return token.slice(0, -2);
  }
  if (token.endsWith('es') && token.length > 5) {
    return token.slice(0, -2);
  }
  if (token.endsWith('s') && !token.endsWith('ss') && token.length > 4) {
    return token.slice(0, -1);
  }
  return token;
}

function tokenizeQuery(query: string): { tokens: string[]; bigrams: string[] } {
  const rawWords = query
    .toLowerCase()
    .replace(/[^\w\s.-]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  const tokens = new Set<string>();
  const filteredWords: string[] = [];

  for (const w of rawWords) {
    if (SHORT_WARHAMMER_TOKENS.has(w) || /^\d{2}\.\d{2}/.test(w)) {
      tokens.add(w);
      filteredWords.push(w);
      continue;
    }
    if (w.length < 3 || STOP_WORDS.has(w)) continue;
    tokens.add(w);
    const stemmed = stemToken(w);
    if (stemmed.length >= 3) tokens.add(stemmed);
    filteredWords.push(w);
  }

  // Fallback if all words were stop words (e.g. "how do units move")
  if (tokens.size === 0) {
    for (const w of rawWords) {
      if (w.length >= 3) tokens.add(w);
    }
  }

  const bigrams: string[] = [];
  for (let i = 0; i < rawWords.length - 1; i++) {
    const pair = `${rawWords[i]} ${rawWords[i + 1]}`;
    if (pair.length >= 6) bigrams.push(pair);
  }

  return { tokens: Array.from(tokens), bigrams };
}

export interface SearchRulesResult {
  ruleSections: { section: RuleSection; score: number }[];
  expandedSections: RuleSection[];
  keywords: { keyword: KeywordEntry; score: number }[];
}

export function searchRulesAndKeywords(
  query: string,
  rules: RuleSection[],
  keywords: KeywordEntry[],
  maxRules: number = 6,
  maxKeywords: number = 4
): SearchRulesResult {
  const { tokens, bigrams } = tokenizeQuery(query);
  if (tokens.length === 0) {
    return { ruleSections: [], expandedSections: [], keywords: [] };
  }

  // 1. Score Rule Sections
  const scoredRules = rules
    .map(section => {
      let score = 0;
      const titleLower = section.title.toLowerCase();
      const textLower = section.text.toLowerCase();

      for (const token of tokens) {
        if (section.sectionNum && section.sectionNum === token) score += 25;
        else if (section.sectionNum && section.sectionNum.includes(token)) score += 10;

        if (titleLower.includes(token)) score += 9;
        const matches = textLower.split(token).length - 1;
        if (matches > 0) {
          score += Math.min(matches, 6) * 1.6;
        }
      }

      for (const bg of bigrams) {
        if (titleLower.includes(bg)) score += 16;
        else if (textLower.includes(bg)) score += 6;
      }

      return { section, score };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxRules);

  // 1b. Expand with sibling chapter sections (for top 2 non-glossary chapters) + explicit (XX.XX) cross-references
  const bySectionNum = new Map<string, RuleSection>();
  for (const r of rules) {
    if (r.sectionNum) bySectionNum.set(r.sectionNum, r);
  }

  const expandedMap = new Map<string, RuleSection>();
  const addSection = (s: RuleSection) => {
    const key = s.sectionNum ? `num:${s.sectionNum}` : `id:${s.id}`;
    if (!expandedMap.has(key)) expandedMap.set(key, s);
  };

  for (const item of scoredRules) {
    addSection(item.section);
  }

  // Include all sibling sub-sections of the top 2 matched chapters (except Ch. 24 glossary)
  // so "(see below)" cards like 09.04-09.07, 10.04-10.07, 11.04, 12.03-12.08, 15.02-15.12, 18.04-18.07 are always present
  const expandedChapters = new Set<string>();
  for (const item of scoredRules) {
    const ch = item.section.sectionNum?.split('.')[0];
    if (!ch || ch === '24' || expandedChapters.has(ch)) continue;
    expandedChapters.add(ch);
    for (const r of rules) {
      if (r.sectionNum && r.sectionNum.startsWith(`${ch}.`)) {
        addSection(r);
      }
    }
    if (expandedChapters.size >= 2) break;
  }

  // Follow explicit rule cross-references like (03.04) or (24.13) found in the selected sections
  const currentSections = Array.from(expandedMap.values());
  for (const sec of currentSections) {
    const refMatches = sec.text.matchAll(/\((\d{2}\.\d{2}(?:\.\d{2})?)\)/g);
    for (const match of refMatches) {
      const target = bySectionNum.get(match[1]);
      if (target && expandedMap.size < 28) {
        addSection(target);
      }
    }
  }

  // Sort expanded sections in natural sectionNum order for clean reading
  const expandedSections = Array.from(expandedMap.values()).sort((a, b) =>
    (a.sectionNum || '99').localeCompare(b.sectionNum || '99', undefined, { numeric: true })
  );

  // 2. Score Keywords
  const scoredKeywords = keywords
    .map(keyword => {
      let score = 0;
      const nameLower = keyword.name.toLowerCase().replace(/[\[\]]/g, '');
      const descLower = keyword.description.toLowerCase();
      const summaryLower = keyword.summary.toLowerCase();

      for (const token of tokens) {
        if (nameLower === token) score += 18;
        else if (nameLower.includes(token)) score += 10;
        if (summaryLower.includes(token)) score += 4;
        if (descLower.includes(token)) score += 2;
      }

      for (const bg of bigrams) {
        if (nameLower.includes(bg)) score += 18;
        else if (summaryLower.includes(bg)) score += 6;
      }

      return { keyword, score };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxKeywords);

  return {
    ruleSections: scoredRules,
    expandedSections,
    keywords: scoredKeywords
  };
}

export function searchStratagems(
  query: string,
  detachments: SelectedDetachment[] = [],
  maxStratagems: number = 4
): { stratagem: Stratagem; source: string; score: number }[] {
  const { tokens, bigrams } = tokenizeQuery(query);
  if (tokens.length === 0) return [];

  const pool: { stratagem: Stratagem; source: string }[] = [
    ...CORE_STRATAGEMS.map(s => ({ stratagem: s, source: 'Core Stratagem' })),
    ...getDetachmentStratagems(detachments).flatMap(group =>
      group.stratagems.map(s => ({ stratagem: s, source: `${group.detachmentName} Detachment` }))
    )
  ];

  return pool
    .map(({ stratagem, source }) => {
      let score = 0;
      const nameLower = stratagem.name.toLowerCase();
      const descLower = stratagem.description.toLowerCase();
      const phaseLower = stratagem.phase.toLowerCase();

      for (const token of tokens) {
        if (nameLower.includes(token)) score += 12;
        if (phaseLower.includes(token)) score += 3;
        const matches = descLower.split(token).length - 1;
        if (matches > 0) score += Math.min(matches, 4) * 1.5;
      }

      for (const bg of bigrams) {
        if (nameLower.includes(bg)) score += 20;
        else if (descLower.includes(bg)) score += 6;
      }

      return { stratagem, source, score };
    })
    .filter(item => item.score >= 6)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxStratagems);
}

export function searchRulesDiagrams(
  query: string,
  matchedSections: RuleSection[],
  diagrams: RuleDiagram[],
  maxDiagrams: number = 4
): { diagram: RuleDiagram; score: number }[] {
  if (!diagrams.length) return [];
  const { tokens, bigrams } = tokenizeQuery(query);

  const matchedNums = new Set(matchedSections.map(s => s.sectionNum).filter(Boolean));
  const matchedChapters = new Set(
    matchedSections
      .map(s => s.sectionNum?.split('.')[0])
      .filter((c): c is string => Boolean(c))
  );

  return diagrams
    .map(diagram => {
      let score = 0;
      const titleLower = diagram.title.toLowerCase();
      const captionLower = diagram.caption.toLowerCase();
      const secTitleLower = diagram.sectionTitle.toLowerCase();
      const chapter = diagram.sectionNum?.split('.')[0] || '';

      if (diagram.sectionNum && matchedNums.has(diagram.sectionNum)) {
        score += 12;
      } else if (chapter && matchedChapters.has(chapter)) {
        score += 5;
      }

      for (const token of tokens) {
        if (titleLower.includes(token)) score += 10;
        if (secTitleLower.includes(token)) score += 6;
        if (captionLower.includes(token)) score += 3;
      }

      for (const bg of bigrams) {
        if (titleLower.includes(bg)) score += 18;
        if (captionLower.includes(bg)) score += 8;
        if (secTitleLower.includes(bg)) score += 8;
      }

      return { diagram, score };
    })
    .filter(item => item.score >= 8)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxDiagrams);
}

/**
 * Extracts validated [DIAGRAM:Filename.png] markers from Gemini's response.
 */
export function extractDiagramTags(
  responseText: string,
  allDiagrams: RuleDiagram[]
): { cleanText: string; selectedDiagrams: RuleDiagram[] } {
  const byFileLower = new Map<string, RuleDiagram>();
  for (const d of allDiagrams) {
    byFileLower.set(d.file.toLowerCase(), d);
  }

  const selected: RuleDiagram[] = [];
  const seen = new Set<string>();

  const cleanText = responseText
    .replace(/\[DIAGRAM:\s*([^\]]+?)\s*\]/gi, (_full, rawFile: string) => {
      const key = rawFile.trim().toLowerCase();
      const found = byFileLower.get(key);
      if (found && !seen.has(found.file)) {
        seen.add(found.file);
        selected.push(found);
      }
      return '';
    })
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return { cleanText, selectedDiagrams: selected.slice(0, 3) };
}
