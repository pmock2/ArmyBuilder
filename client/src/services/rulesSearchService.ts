// Rules Search Service: Local lexical search over 11th edition Core Rules & Keywords

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

let cachedRules: RuleSection[] | null = null;
let cachedKeywords: KeywordEntry[] | null = null;

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

export interface SearchRulesResult {
  ruleSections: { section: RuleSection; score: number }[];
  keywords: { keyword: KeywordEntry; score: number }[];
}

export function searchRulesAndKeywords(
  query: string,
  rules: RuleSection[],
  keywords: KeywordEntry[],
  maxRules: number = 4,
  maxKeywords: number = 3
): SearchRulesResult {
  const cleanTokens = query
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length >= 3 && !['what', 'when', 'does', 'with', 'from', 'have', 'that', 'this', 'work', 'rule', 'rules'].includes(t));

  if (cleanTokens.length === 0) {
    return { ruleSections: [], keywords: [] };
  }

  // 1. Score Rule Sections
  const scoredRules = rules
    .map(section => {
      let score = 0;
      const titleLower = section.title.toLowerCase();
      const textLower = section.text.toLowerCase();

      for (const token of cleanTokens) {
        if (titleLower.includes(token)) score += 8;
        if (section.sectionNum && section.sectionNum.includes(token)) score += 10;
        // Count occurrences in body
        const matches = textLower.split(token).length - 1;
        score += Math.min(matches, 5) * 1.5;
      }

      return { section, score };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxRules);

  // 2. Score Keywords
  const scoredKeywords = keywords
    .map(keyword => {
      let score = 0;
      const nameLower = keyword.name.toLowerCase().replace(/[\[\]]/g, '');
      const descLower = keyword.description.toLowerCase();
      const summaryLower = keyword.summary.toLowerCase();

      for (const token of cleanTokens) {
        if (nameLower === token) score += 15;
        else if (nameLower.includes(token)) score += 9;
        if (summaryLower.includes(token)) score += 4;
        if (descLower.includes(token)) score += 2;
      }

      return { keyword, score };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxKeywords);

  return {
    ruleSections: scoredRules,
    keywords: scoredKeywords
  };
}

