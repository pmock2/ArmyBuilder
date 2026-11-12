// Gemini AI Service for Warhammer 40k 11th Edition Army Builder

const GEMINI_API_KEY_STORAGE = 'wh40k_11e_gemini_api_key';

export function getStoredApiKey(): string {
  try {
    const key = localStorage.getItem(GEMINI_API_KEY_STORAGE);
    if (key && key.trim()) return key.trim();
    // Fallback to Vite environment variable if configured
    const envKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
    if (envKey && typeof envKey === 'string' && envKey.trim()) return envKey.trim();
    return '';
  } catch {
    return '';
  }
}

export function setStoredApiKey(key: string): void {
  try {
    if (key && key.trim()) {
      localStorage.setItem(GEMINI_API_KEY_STORAGE, key.trim());
    } else {
      localStorage.removeItem(GEMINI_API_KEY_STORAGE);
    }
  } catch (err) {
    console.error('Failed to save Gemini API key:', err);
  }
}

export function hasApiKey(): boolean {
  return Boolean(getStoredApiKey());
}

const PRIMARY_MODEL = 'gemini-2.5-flash';
const FALLBACK_MODEL = 'gemini-1.5-flash';

export async function validateApiKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
  const cleanKey = apiKey.trim();
  if (!cleanKey) {
    return { valid: false, error: 'Please enter a Gemini API key.' };
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${PRIMARY_MODEL}:generateContent?key=${cleanKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Respond with OK' }] }],
        generationConfig: { maxOutputTokens: 10 }
      })
    });

    if (res.ok) {
      return { valid: true };
    }

    const data = await res.json().catch(() => null);
    const msg = data?.error?.message || `API error (${res.status} ${res.statusText})`;
    return { valid: false, error: msg };
  } catch (err: any) {
    return { valid: false, error: err.message || 'Network error connecting to Gemini API' };
  }
}

interface GenerateOptions {
  systemInstruction?: string;
  json?: boolean;
  temperature?: number;
}

export async function callGemini(prompt: string, options: GenerateOptions = {}): Promise<string> {
  const apiKey = getStoredApiKey();
  if (!apiKey) {
    throw new Error('NO_API_KEY: Gemini API key is not configured. Please add your API key in AI Settings.');
  }

  const payload: any = {
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }]
      }
    ],
    generationConfig: {
      temperature: options.temperature ?? 0.2
    }
  };

  if (options.systemInstruction) {
    payload.systemInstruction = {
      parts: [{ text: options.systemInstruction }]
    };
  }

  if (options.json) {
    payload.generationConfig.responseMimeType = 'application/json';
  }

  const makeCall = async (model: string) => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => null);
      const errorMsg = errData?.error?.message || `HTTP ${res.status} ${res.statusText}`;
      const err = new Error(errorMsg);
      (err as any).status = res.status;
      throw err;
    }

    const data = await res.json();
    const candidate = data.candidates?.[0];
    if (!candidate || !candidate.content?.parts?.[0]?.text) {
      throw new Error('Gemini returned an empty response. Please try again.');
    }

    return candidate.content.parts[0].text;
  };

  try {
    return await makeCall(PRIMARY_MODEL);
  } catch (err: any) {
    // If primary model not found or failed, try fallback model
    if (err.status === 404 || err.message?.includes('not found')) {
      console.warn(`Primary model ${PRIMARY_MODEL} failed, trying fallback ${FALLBACK_MODEL}...`);
      return await makeCall(FALLBACK_MODEL);
    }
    throw err;
  }
}

