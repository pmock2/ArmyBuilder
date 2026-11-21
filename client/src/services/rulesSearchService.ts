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
  'the', 'and', 'for', 'are', 'can', 'how', 'you', 'all', 'any', 'not', 'but', 'its',
  'was', 'were', 'been', 'being', 'will', 'would', 'could', 'should', 'may', 'might',
  'must', 'into', 'onto', 'over', 'under', 'with', 'without', 'when', 'where', 'what',
  'which', 'while', 'after', 'before', 'during', 'between', 'does', 'did', 'done',
  'have', 'has', 'had', 'this', 'that', 'these', 'those', 'from', 'they', 'them',
  'their', 'your', 'our', 'out', 'off', 'use', 'using', 'used', 'get', 'gets', 'getting',
  'give', 'gives', 'take', 'takes', 'taking', 'make', 'makes', 'making', 'work', 'works',
  'working', 'rule', 'rules', 'mean', 'means', 'explain', 'tell', 'show', 'help', 'please',
  'question', 'need', 'want', 'know', 'one', 'two', 'about', 'there', 'then', 'than',
  'only', 'also', 'still', 'just', 'unit', 'units', 'model', 'models', 'turn', 'phase'
]);

const SHORT_WARHAMMER_TOKENS = new Set(['ap', 'cp', 'oc', 'ws', 'bs', 'sv', 'mw', 'ld', 'hp', 'fly']);

function stemToken(token: string): string {
  if (token.length <= 4) return token;
  if (token.endsWith('ing') && token.length > 5) {
    return token.slice(0, -3);
  }
  if (token.endsWith('ies') && token.length > 4) {
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

function countOccurrences(haystack: string, token: string): number {
  if (token.length <= 3) {
    const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const matches = haystack.match(new RegExp(`\\b${escaped}\\b`, 'g'));
    return matches ? matches.length : 0;
  }
  return haystack.split(token).length - 1;
}

function containsToken(haystack: string, token: string): boolean {
  return countOccurrences(haystack, token) > 0;
}

function tokenizeQuery(query: string): { tokens: string[]; phrases: string[] } {
  const cleaned = query
    .toLowerCase()
    .replace(/[^\w\s.-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const rawWords = cleaned.split(' ').filter(Boolean);

  const tokens = new Set<string>();

  for (const w of rawWords) {
    if (SHORT_WARHAMMER_TOKENS.has(w) || /^\d{2}\.\d{2}/.test(w)) {
      tokens.add(w);
      continue;
    }
    if (w.length < 3 || STOP_WORDS.has(w)) continue;
    tokens.add(w);
    const stemmed = stemToken(w);
    if (stemmed.length >= 3 && !STOP_WORDS.has(stemmed)) tokens.add(stemmed);
  }

  // Fallback if all words were stop words (e.g. "how do units move")
  if (tokens.size === 0) {
    for (const w of rawWords) {
      if (w.length >= 3 && !['the', 'and', 'for', 'are', 'can', 'how', 'does', 'what'].includes(w)) {
        tokens.add(w);
      }
    }
  }

  // Extract 2-, 3-, and 4-word phrases that contain at least one non-stop word
  // so exact named rules like "take to the skies", "benefit of cover", "feel no pain" match verbatim
  const phrases: string[] = [];
  for (let len = 2; len <= 4; len++) {
    for (let i = 0; i <= rawWords.length - len; i++) {
      const slice = rawWords.slice(i, i + len);
      const hasContentWord = slice.some(w => (w.length >= 3 && !STOP_WORDS.has(w)) || SHORT_WARHAMMER_TOKENS.has(w));
      if (!hasContentWord) continue;
      // Don't start or end a phrase with weak question words
      if (['how', 'what', 'when', 'does', 'can', 'the', 'and', 'for'].includes(slice[0])) continue;
      if (['work', 'works', 'rule', 'rules', 'mean', 'the', 'and', 'for', 'to', 'of', 'in'].includes(slice[slice.length - 1])) continue;
      const phrase = slice.join(' ');
      if (phrase.length >= 6) phrases.push(phrase);
    }
  }

  return { tokens: Array.from(tokens), phrases };
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
  maxKeywords: number = 4,
  diagrams: RuleDiagram[] = []
): SearchRulesResult {
  const { tokens, phrases } = tokenizeQuery(query);
  if (tokens.length === 0 && phrases.length === 0) {
    return { ruleSections: [], expandedSections: [], keywords: [] };
  }

  // Precompute Inverse Document Frequency (IDF) so rare domain terms ("skies", "overwatch", "coherency")
  // vastly outrank generic words ("move", "attack", "target").
  const docCount = Math.max(rules.length, 1);
  const idfMap = new Map<string, number>();
  for (const token of tokens) {
    let df = 0;
    for (const r of rules) {
      if (containsToken(`${r.title} ${r.text}`.toLowerCase(), token)) df++;
    }
    idfMap.set(token, Math.log((docCount + 1) / (df + 1)) + 1);
  }

  // 1. Score Rule Sections using IDF-weighted tokens + exact multi-word phrase boosts
  const scoredRules = rules
    .map(section => {
      let score = 0;
      const titleLower = section.title.toLowerCase();
      const textLower = section.text.toLowerCase();

      for (const token of tokens) {
        const idf = idfMap.get(token) || 1;
        if (section.sectionNum && section.sectionNum === token) score += 30;
        else if (section.sectionNum && section.sectionNum.includes(token)) score += 12;

        if (containsToken(titleLower, token)) score += 6 * idf;
        const matches = countOccurrences(textLower, token);
        if (matches > 0) {
          score += Math.min(matches, 5) * 1.4 * idf;
        }
      }

      for (const phrase of phrases) {
        const wordCount = phrase.split(' ').length;
        const phraseWeight = wordCount >= 3 ? 28 : 16;
        if (titleLower.includes(phrase)) score += phraseWeight * 1.5;
        else if (textLower.includes(phrase)) score += phraseWeight;
      }

      return { section, score };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxRules);

  // 1b. Expand with sibling chapter sections (for top 2 non-glossary chapters),
  // diagram-title reverse links, and explicit (XX.XX) cross-references
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

  // Reverse-link: if a diagram title directly matches a query phrase/token (e.g. "TAKING TO THE SKIES" -> 21.03),
  // guarantee its parent rule section is included
  for (const d of diagrams) {
    if (!d.sectionNum) continue;
    const dTitle = d.title.toLowerCase();
    const phraseHit = phrases.some(p => dTitle.includes(p));
    const tokenHits = tokens.filter(t => (idfMap.get(t) || 1) >= 2.5 && containsToken(dTitle, t)).length;
    if (phraseHit || tokenHits >= 1) {
      const target = bySectionNum.get(d.sectionNum);
      if (target) addSection(target);
    }
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
        const idf = idfMap.get(token) || 1;
        if (nameLower === token) score += 18 * idf;
        else if (containsToken(nameLower, token)) score += 8 * idf;
        if (containsToken(summaryLower, token)) score += 3 * idf;
        if (containsToken(descLower, token)) score += 1.5 * idf;
      }

      for (const phrase of phrases) {
        if (nameLower.includes(phrase)) score += 24;
        else if (summaryLower.includes(phrase)) score += 10;
        else if (descLower.includes(phrase)) score += 6;
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
  const { tokens, phrases } = tokenizeQuery(query);
  if (tokens.length === 0 && phrases.length === 0) return [];

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
        if (containsToken(nameLower, token)) score += 12;
        if (containsToken(phaseLower, token)) score += 3;
        const matches = countOccurrences(descLower, token);
        if (matches > 0) score += Math.min(matches, 4) * 1.5;
      }

      for (const phrase of phrases) {
        if (nameLower.includes(phrase)) score += 24;
        else if (descLower.includes(phrase)) score += 10;
      }

      return { stratagem, source, score };
    })
    .filter(item => item.score >= 8)
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
  const { tokens, phrases } = tokenizeQuery(query);

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
        score += 4;
      }

      for (const token of tokens) {
        if (containsToken(titleLower, token)) score += 12;
        if (containsToken(secTitleLower, token)) score += 6;
        if (containsToken(captionLower, token)) score += 4;
      }

      for (const phrase of phrases) {
        if (titleLower.includes(phrase)) score += 24;
        else if (captionLower.includes(phrase)) score += 14;
        if (secTitleLower.includes(phrase)) score += 10;
      }

      return { diagram, score };
    })
    .filter(item => item.score >= 10)
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
