import { callGemini } from './geminiService';
import {
  AppTheme,
  DEFAULT_THEMES,
  GRADIENT_DIRECTION_OPTIONS,
  GradientDirection
} from '../utils/themeStorage';

export const THEME_PROMPT_EXAMPLES: string[] = [
  'Salamanders volcanic obsidian & molten forge orange glow',
  'Imperial Fists fortified slate & heraldic gold armor',
  'Slaanesh midnight violet & neon magenta warp energy',
  'Adeptus Mechanicus Mars rust red & brass cogwork',
  'Tau Stealth Suit crisp arctic slate & cyan HUD',
  'Warm Grimdark Parchment light mode with crimson ink'
];

export type GeneratedThemePayload = Omit<AppTheme, 'id' | 'isDefault'>;

const VALID_GRADIENTS = new Set<GradientDirection>(
  GRADIENT_DIRECTION_OPTIONS.map((opt) => opt.id)
);

function normalizeHexColor(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback;
  let clean = value.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{3}$/.test(clean)) {
    clean = clean
      .split('')
      .map((c) => c + c)
      .join('');
  }
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) {
    return fallback;
  }
  return `#${clean.toLowerCase()}`;
}

function relativeLuminance(hex: string): number {
  const clean = hex.replace(/^#/, '');
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function contrastRatio(hexA: string, hexB: string): number {
  const l1 = relativeLuminance(hexA);
  const l2 = relativeLuminance(hexB);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function shiftHexBrightness(hex: string, amount: number): string {
  const clean = hex.replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return hex;
  const clamp = (n: number) => Math.max(0, Math.min(255, n));
  const r = clamp(parseInt(clean.slice(0, 2), 16) + amount);
  const g = clamp(parseInt(clean.slice(2, 4), 16) + amount);
  const b = clamp(parseInt(clean.slice(4, 6), 16) + amount);
  return `#${[r, g, b].map((x) => x.toString(16).padStart(2, '0')).join('')}`;
}

function sanitizeGeneratedTheme(
  raw: Record<string, unknown>,
  fallback: AppTheme,
  userPrompt: string
): GeneratedThemePayload {
  const bgColor = normalizeHexColor(raw.bgColor, fallback.bgColor);
  const bgSecondaryColor = normalizeHexColor(raw.bgSecondaryColor, fallback.bgSecondaryColor);
  const surfaceColor = normalizeHexColor(raw.surfaceColor, fallback.surfaceColor);
  const cardColor = normalizeHexColor(raw.cardColor, fallback.cardColor);
  const elevatedColor = normalizeHexColor(raw.elevatedColor, shiftHexBrightness(cardColor, relativeLuminance(cardColor) > 0.5 ? -14 : 14));
  const borderColor = normalizeHexColor(raw.borderColor, fallback.borderColor);
  const accentColor = normalizeHexColor(raw.accentColor, fallback.accentColor);
  const isLightCard = relativeLuminance(cardColor) > 0.45;

  let textColor = normalizeHexColor(raw.textColor, isLightCard ? '#1b1917' : '#edf2f7');
  // Ensure legible contrast between primary text and card/surface backgrounds
  if (contrastRatio(textColor, cardColor) < 4.5 || contrastRatio(textColor, surfaceColor) < 4.5) {
    textColor = isLightCard ? '#171717' : '#f1f5f9';
  }

  const accentHoverColor = normalizeHexColor(
    raw.accentHoverColor,
    shiftHexBrightness(accentColor, isLightCard ? -18 : 22)
  );
  const accentSoftColor = normalizeHexColor(
    raw.accentSoftColor,
    shiftHexBrightness(accentColor, isLightCard ? -45 : 72)
  );

  const rawDir = typeof raw.gradientDirection === 'string' ? raw.gradientDirection.trim() : '';
  const gradientDirection: GradientDirection = VALID_GRADIENTS.has(rawDir as GradientDirection)
    ? (rawDir as GradientDirection)
    : 'to bottom right';

  const rawName = typeof raw.name === 'string' ? raw.name.trim() : '';
  const fallbackName = userPrompt.trim().slice(0, 32) || 'AI Custom Theme';
  const name = rawName ? rawName.slice(0, 48) : fallbackName;

  return {
    name,
    bgColor,
    bgSecondaryColor,
    gradientDirection,
    surfaceColor,
    cardColor,
    elevatedColor,
    borderColor,
    textColor,
    accentColor,
    accentHoverColor,
    accentSoftColor
  };
}

/**
 * Generates a cohesive AppTheme palette from a natural-language user prompt using Gemini.
 */
export async function generateThemeWithAi(
  prompt: string,
  currentDraft?: AppTheme
): Promise<GeneratedThemePayload> {
  const cleanPrompt = prompt.trim();
  if (!cleanPrompt) {
    throw new Error('Please describe the theme you want to create.');
  }

  const systemInstruction = `You are an expert UI/UX visual designer creating color themes for a Warhammer 40,000 tabletop Army Builder web app.
Return ONLY a single valid JSON object (no markdown fences, no commentary) with this exact schema:
{
  "name": "Short evocative theme title (2-4 words)",
  "bgColor": "#rrggbb",
  "bgSecondaryColor": "#rrggbb",
  "gradientDirection": "none | to bottom | to right | to bottom right | to bottom left | to top right | radial",
  "surfaceColor": "#rrggbb",
  "cardColor": "#rrggbb",
  "elevatedColor": "#rrggbb",
  "borderColor": "#rrggbb",
  "textColor": "#rrggbb",
  "accentColor": "#rrggbb",
  "accentHoverColor": "#rrggbb",
  "accentSoftColor": "#rrggbb"
}

Strict design rules:
- All colors MUST be 6-digit hex strings (#rrggbb).
- Ensure strong readability (WCAG AA >= 4.5:1 contrast between textColor and bgColor, surfaceColor, cardColor, elevatedColor).
- surfaceColor, cardColor, and elevatedColor must form a clean visual hierarchy slightly stepping away from bgColor.
- borderColor should frame cards cleanly without overpowering the content.
- accentColor is used for primary buttons and active highlights; accentHoverColor is a crisp hover shade; accentSoftColor is used for icons, badges, and subtle highlights on surfaceColor/cardColor.
- Keep themes dark-first unless the user explicitly asks for a light/parchment/bright theme.
- Only reference the current preview theme if the user prompt explicitly asks to tweak, adjust, darken, lighten, or refine it; otherwise design a fresh palette from scratch.`;

  const userMessage = currentDraft
    ? `User Theme Prompt: "${cleanPrompt}"\n\nCurrent preview theme for reference (only if refining): ${JSON.stringify({
        name: currentDraft.name,
        bgColor: currentDraft.bgColor,
        bgSecondaryColor: currentDraft.bgSecondaryColor,
        gradientDirection: currentDraft.gradientDirection,
        surfaceColor: currentDraft.surfaceColor,
        cardColor: currentDraft.cardColor,
        elevatedColor: currentDraft.elevatedColor,
        borderColor: currentDraft.borderColor,
        textColor: currentDraft.textColor,
        accentColor: currentDraft.accentColor
      })}`
    : `User Theme Prompt: "${cleanPrompt}"`;

  const responseText = await callGemini(userMessage, {
    systemInstruction,
    json: true,
    temperature: 0.65
  });

  let parsed: Record<string, unknown>;
  try {
    const cleaned = responseText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```$/i, '')
      .trim();
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error('AI returned an invalid theme format. Please try again.');
  }

  return sanitizeGeneratedTheme(parsed, currentDraft || DEFAULT_THEMES[0], cleanPrompt);
}
