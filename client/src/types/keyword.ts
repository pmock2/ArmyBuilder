export interface KeywordEntry {
  name: string;
  category: string;
  ruleRef?: string;
  summary: string;
  description: string;
}

export interface KeywordsCompendium {
  version: string;
  generatedAt: string;
  categories: {
    coreAbilities: KeywordEntry[];
    weaponAbilities: KeywordEntry[];
    battlefieldRoles: KeywordEntry[];
    factionKeywords: KeywordEntry[];
    armourAndEquipment: KeywordEntry[];
    movementAndScale: KeywordEntry[];
    generalKeywords: KeywordEntry[];
  };
  allKeywordsList: KeywordEntry[];
}
