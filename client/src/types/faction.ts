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
  detachments: SelectedDetachment[];
  enhancements: Enhancement[];
  units: Datasheet[];
}

