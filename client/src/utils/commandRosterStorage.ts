import factionsIndexData from '../data/factions_index.json';
import { FactionSummary } from '../types/faction';
import { ArmyRoster } from '../types/roster';
import { AppTheme } from './themeStorage';

export const FACTION_GROUP_PREFS_STORAGE_KEY = 'wh40k_11e_command_roster_faction_prefs';

export interface FactionGroupPrefs {
  order: string[];
  colors: Record<string, string>;
  collapsed: Record<string, boolean>;
}

export interface FactionGroup {
  key: string;
  name: string;
  rosters: ArmyRoster[];
}

const factionsIndex = factionsIndexData as FactionSummary[];

export function getFactionGroupInfo(roster: ArmyRoster): { key: string; name: string } {
  const summary = factionsIndex.find((f) => f.id === roster.factionId);
  const parentSummary = summary?.parentFaction
    ? factionsIndex.find((f) => f.id === summary.parentFaction)
    : undefined;

  if (parentSummary) {
    return {
      key: parentSummary.id,
      name: parentSummary.name
    };
  }

  if (summary && !summary.isSubFaction) {
    return {
      key: summary.id,
      name: roster.factionName || summary.name
    };
  }

  const fallbackName = (roster.factionName || summary?.name || 'Other').trim();
  const fallbackKey = (roster.factionId || fallbackName.toLowerCase().replace(/\s+/g, '-')).trim();
  return {
    key: fallbackKey || 'other',
    name: fallbackName || 'Other'
  };
}

export function loadFactionGroupPrefs(): FactionGroupPrefs {
  try {
    const raw = localStorage.getItem(FACTION_GROUP_PREFS_STORAGE_KEY);
    if (!raw) {
      return { order: [], colors: {}, collapsed: {} };
    }
    const parsed = JSON.parse(raw);
    return {
      order: Array.isArray(parsed?.order) ? parsed.order.filter((k: unknown) => typeof k === 'string') : [],
      colors: parsed?.colors && typeof parsed.colors === 'object' ? parsed.colors : {},
      collapsed: parsed?.collapsed && typeof parsed.collapsed === 'object' ? parsed.collapsed : {}
    };
  } catch {
    return { order: [], colors: {}, collapsed: {} };
  }
}

export function saveFactionGroupPrefs(prefs: FactionGroupPrefs): void {
  try {
    localStorage.setItem(FACTION_GROUP_PREFS_STORAGE_KEY, JSON.stringify(prefs));
  } catch (err) {
    console.error('Failed to save faction group preferences:', err);
  }
}

export function groupRostersByFaction(rosters: ArmyRoster[], order: string[]): FactionGroup[] {
  const map = new Map<string, FactionGroup>();

  for (const roster of rosters) {
    const { key, name } = getFactionGroupInfo(roster);
    const existing = map.get(key);
    if (existing) {
      existing.rosters.push(roster);
    } else {
      map.set(key, { key, name, rosters: [roster] });
    }
  }

  const orderIndex = new Map<string, number>();
  order.forEach((key, idx) => {
    if (!orderIndex.has(key)) {
      orderIndex.set(key, idx);
    }
  });

  const groups = Array.from(map.values());
  const firstSeenIndex = new Map<string, number>();
  groups.forEach((g, idx) => firstSeenIndex.set(g.key, idx));

  groups.sort((a, b) => {
    const idxA = orderIndex.get(a.key);
    const idxB = orderIndex.get(b.key);
    if (idxA !== undefined && idxB !== undefined) return idxA - idxB;
    if (idxA !== undefined) return -1;
    if (idxB !== undefined) return 1;
    return (firstSeenIndex.get(a.key) ?? 0) - (firstSeenIndex.get(b.key) ?? 0);
  });

  return groups;
}

export function normalizeHexColor(hex: string, fallback = '#3b82f6'): string {
  const clean = (hex || '').trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{6}$/.test(clean)) {
    return `#${clean.toLowerCase()}`;
  }
  if (/^[0-9a-fA-F]{3}$/.test(clean)) {
    return `#${clean
      .split('')
      .map((c) => c + c)
      .join('')
      .toLowerCase()}`;
  }
  return fallback;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const norm = normalizeHexColor(hex);
  return {
    r: parseInt(norm.slice(1, 3), 16),
    g: parseInt(norm.slice(3, 5), 16),
    b: parseInt(norm.slice(5, 7), 16)
  };
}

export function hexToRgba(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rn:
        h = (gn - bn) / d + (gn < bn ? 6 : 0);
        break;
      case gn:
        h = (bn - rn) / d + 2;
        break;
      default:
        h = (rn - gn) / d + 4;
        break;
    }
    h *= 60;
  }

  return { h, s: s * 100, l: l * 100 };
}

function hslToHex(h: number, s: number, l: number): string {
  const hue = ((h % 360) + 360) % 360;
  const sat = Math.max(0, Math.min(100, s)) / 100;
  const lig = Math.max(0, Math.min(100, l)) / 100;

  const c = (1 - Math.abs(2 * lig - 1)) * sat;
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1));
  const m = lig - c / 2;

  let r = 0;
  let g = 0;
  let b = 0;
  if (hue < 60) {
    r = c;
    g = x;
  } else if (hue < 120) {
    r = x;
    g = c;
  } else if (hue < 180) {
    g = c;
    b = x;
  } else if (hue < 240) {
    g = x;
    b = c;
  } else if (hue < 300) {
    r = x;
    b = c;
  } else {
    r = c;
    b = x;
  }

  const toHex = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, '0');

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function getRelativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const toLinear = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

export function mixHexColors(hexA: string, hexB: string, weightB: number): string {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  const w = Math.max(0, Math.min(1, weightB));
  const r = Math.round(a.r * (1 - w) + b.r * w);
  const g = Math.round(a.g * (1 - w) + b.g * w);
  const bl = Math.round(a.b * (1 - w) + b.b * w);
  return `#${[r, g, bl].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

export function getReadableTitleColor(accentHex: string, theme: AppTheme): string {
  const isLightTheme = getRelativeLuminance(theme.surfaceColor) > 0.45;
  return isLightTheme
    ? mixHexColors(accentHex, '#0f172a', 0.35)
    : mixHexColors(accentHex, '#ffffff', 0.48);
}

const HUE_OFFSETS = [0, 145, -145, 55, -55, 180, 95, -95];

/**
 * Generates a list of distinct colors harmonized with the user's currently selected theme.
 */
export function getThemeDerivedPalette(theme: AppTheme, count = 8): string[] {
  const baseHex = normalizeHexColor(theme.accentColor, '#2563eb');
  const { r, g, b } = hexToRgb(baseHex);
  const { h, s, l } = rgbToHsl(r, g, b);
  const isLightTheme = getRelativeLuminance(theme.surfaceColor) > 0.45;

  const targetS = s < 15 ? 30 : Math.max(52, Math.min(84, s));
  const targetL = isLightTheme
    ? Math.max(34, Math.min(48, l))
    : Math.max(48, Math.min(60, l));

  const colors: string[] = [];
  for (let i = 0; i < count; i++) {
    if (i === 0) {
      colors.push(baseHex);
      continue;
    }
    const offset =
      i < HUE_OFFSETS.length
        ? HUE_OFFSETS[i]
        : (i * 137.508) % 360;
    colors.push(hslToHex(h + offset, targetS, targetL));
  }
  return colors;
}

export function getFactionColorSwatches(theme: AppTheme, allThemes: AppTheme[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  const pushUnique = (hex: string) => {
    const norm = normalizeHexColor(hex, '');
    if (!norm || seen.has(norm)) return;
    seen.add(norm);
    result.push(norm);
  };

  // First: harmonized colors anchored to the user's active color scheme
  for (const c of getThemeDerivedPalette(theme, 8)) {
    pushUnique(c);
  }

  // Second: accent colors from other saved / built-in themes
  for (const t of allThemes) {
    pushUnique(t.accentColor);
  }

  return result;
}
