export type GradientDirection =
  | 'none'
  | 'to bottom'
  | 'to right'
  | 'to bottom right'
  | 'to bottom left'
  | 'to top right'
  | 'radial';

export interface AppTheme {
  id: string;
  name: string;
  isDefault?: boolean;
  bgColor: string;
  bgSecondaryColor: string;
  gradientDirection: GradientDirection;
  surfaceColor: string;
  cardColor: string;
  elevatedColor: string;
  borderColor: string;
  textColor: string;
  accentColor: string;
  accentHoverColor: string;
  accentSoftColor: string;
}

export const GRADIENT_DIRECTION_OPTIONS: { id: GradientDirection; label: string }[] = [
  { id: 'none', label: 'Solid (No Gradient)' },
  { id: 'to bottom', label: 'Top → Bottom' },
  { id: 'to right', label: 'Left → Right' },
  { id: 'to bottom right', label: 'Diagonal ↘' },
  { id: 'to bottom left', label: 'Diagonal ↙' },
  { id: 'to top right', label: 'Diagonal ↗' },
  { id: 'radial', label: 'Radial Glow' }
];

// 5 built-in themes thematically inspired by iconic factions (without naming them directly)
export const DEFAULT_THEMES: AppTheme[] = [
  {
    id: 'theme-cobalt-vigil',
    name: 'Cobalt Vigil',
    isDefault: true,
    bgColor: '#0b1220',
    bgSecondaryColor: '#13223f',
    gradientDirection: 'to bottom right',
    surfaceColor: '#111b2e',
    cardColor: '#17253e',
    elevatedColor: '#1f3152',
    borderColor: '#2d4570',
    textColor: '#e8eef8',
    accentColor: '#2563eb',
    accentHoverColor: '#3b82f6',
    accentSoftColor: '#93c5fd'
  },
  {
    id: 'theme-forge-ember',
    name: 'Forge & Ember',
    isDefault: true,
    bgColor: '#0b140f',
    bgSecondaryColor: '#172b1e',
    gradientDirection: 'to bottom right',
    surfaceColor: '#111e17',
    cardColor: '#172a20',
    elevatedColor: '#20382b',
    borderColor: '#2c4d3b',
    textColor: '#e7f3ec',
    accentColor: '#059669',
    accentHoverColor: '#10b981',
    accentSoftColor: '#6ee7b7'
  },
  {
    id: 'theme-ochre-horizon',
    name: 'Ochre Horizon',
    isDefault: true,
    bgColor: '#131417',
    bgSecondaryColor: '#262016',
    gradientDirection: 'to bottom right',
    surfaceColor: '#1a1c21',
    cardColor: '#22252c',
    elevatedColor: '#2c303a',
    borderColor: '#424754',
    textColor: '#f1efe9',
    accentColor: '#d97706',
    accentHoverColor: '#f59e0b',
    accentSoftColor: '#fcd34d'
  },
  {
    id: 'theme-tomb-awakening',
    name: 'Tomb Awakening',
    isDefault: true,
    bgColor: '#070b09',
    bgSecondaryColor: '#0c2418',
    gradientDirection: 'radial',
    surfaceColor: '#0e1612',
    cardColor: '#13201a',
    elevatedColor: '#1a2c24',
    borderColor: '#254234',
    textColor: '#e2f2e9',
    accentColor: '#16a34a',
    accentHoverColor: '#22c55e',
    accentSoftColor: '#86efac'
  },
  {
    id: 'theme-crimson-warp',
    name: 'Crimson Warp',
    isDefault: true,
    bgColor: '#14090d',
    bgSecondaryColor: '#2b0e18',
    gradientDirection: 'to bottom right',
    surfaceColor: '#1c0e13',
    cardColor: '#26131a',
    elevatedColor: '#331922',
    borderColor: '#522634',
    textColor: '#f5eaed',
    accentColor: '#dc2626',
    accentHoverColor: '#ef4444',
    accentSoftColor: '#fca5a5'
  }
];

export const ACTIVE_THEME_STORAGE_KEY = 'wh40k_11e_active_theme_id';
export const CUSTOM_THEMES_STORAGE_KEY = 'wh40k_11e_custom_themes';

function hexToRgbChannels(hex: string, fallback: string): string {
  const clean = (hex || '').trim().replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return fallback;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `${r} ${g} ${b}`;
}

export function buildGradientCss(theme: Pick<AppTheme, 'bgColor' | 'bgSecondaryColor' | 'gradientDirection'>): string {
  if (theme.gradientDirection === 'none') return 'none';
  if (theme.gradientDirection === 'radial') {
    return `radial-gradient(circle at top left, ${theme.bgColor}, ${theme.bgSecondaryColor})`;
  }
  return `linear-gradient(${theme.gradientDirection}, ${theme.bgColor}, ${theme.bgSecondaryColor})`;
}

export function applyThemeToDocument(theme: AppTheme): void {
  const root = document.documentElement;
  root.style.setProperty('--theme-bg', hexToRgbChannels(theme.bgColor, '11 18 32'));
  root.style.setProperty('--theme-surface', hexToRgbChannels(theme.surfaceColor, '17 27 46'));
  root.style.setProperty('--theme-card', hexToRgbChannels(theme.cardColor, '23 37 62'));
  root.style.setProperty('--theme-elevated', hexToRgbChannels(theme.elevatedColor, '31 49 82'));
  root.style.setProperty('--theme-border-subtle', hexToRgbChannels(theme.borderColor, '45 69 112'));
  root.style.setProperty('--theme-border', hexToRgbChannels(theme.borderColor, '45 69 112'));
  root.style.setProperty('--theme-text', hexToRgbChannels(theme.textColor, '232 238 248'));
  root.style.setProperty('--theme-accent', hexToRgbChannels(theme.accentColor, '37 99 235'));
  root.style.setProperty('--theme-accent-hover', hexToRgbChannels(theme.accentHoverColor, '59 130 246'));
  root.style.setProperty('--theme-accent-soft', hexToRgbChannels(theme.accentSoftColor, '147 197 253'));
  root.style.setProperty('--theme-bg-gradient', buildGradientCss(theme));
}

export function loadCustomThemes(): AppTheme[] {
  try {
    const raw = localStorage.getItem(CUSTOM_THEMES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveCustomThemes(themes: AppTheme[]): void {
  localStorage.setItem(CUSTOM_THEMES_STORAGE_KEY, JSON.stringify(themes));
}

export function getAllThemes(): AppTheme[] {
  return [...DEFAULT_THEMES, ...loadCustomThemes()];
}

export function getActiveThemeId(): string {
  return localStorage.getItem(ACTIVE_THEME_STORAGE_KEY) || DEFAULT_THEMES[0].id;
}

export function setActiveTheme(theme: AppTheme): void {
  localStorage.setItem(ACTIVE_THEME_STORAGE_KEY, theme.id);
  applyThemeToDocument(theme);
}

export function initTheme(): AppTheme {
  const all = getAllThemes();
  const activeId = getActiveThemeId();
  const found = all.find((t) => t.id === activeId) || DEFAULT_THEMES[0];
  applyThemeToDocument(found);
  return found;
}
