import { Datasheet, Enhancement, SelectedDetachment } from './roster';

export interface FactionSummary {
  id: string;
  catalogueId: string;
  name: string;
  rawName: string;
  superFaction: string;
  isSubFaction: boolean;
  parentFaction: string | null;
  subFactions: { id: string; name: string }[];
}

export interface FactionArmyRuleTableRow {
  roll?: string;
  name: string;
  description: string;
}

export interface FactionArmyRuleTable {
  title: string;
  rows: FactionArmyRuleTableRow[];
}

export interface FactionArmyRule {
  name: string;
  description: string;
  tables?: FactionArmyRuleTable[];
}

export interface FactionDetail {
  faction: {
    id: string;
    catalogueId: string;
    name: string;
    rawName: string;
    superFaction: string;
    isSubFaction: boolean;
    parentFaction: string | null;
    file: string;
  };
  armyRules?: FactionArmyRule[];
  detachments: SelectedDetachment[];
  enhancements: Enhancement[];
  units: Datasheet[];
}

