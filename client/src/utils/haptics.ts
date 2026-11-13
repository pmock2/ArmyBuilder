const HAPTICS_STORAGE_KEY = 'wh40k_haptics_enabled';

export type HapticPattern = 'light' | 'medium' | 'success' | 'warning';

const PATTERNS: Record<HapticPattern, number | number[]> = {
  light: 10,
  medium: 20,
  success: [12, 30, 18],
  warning: [20, 40, 20]
};

export function isHapticsEnabled(): boolean {
  try {
    const val = localStorage.getItem(HAPTICS_STORAGE_KEY);
    return val === null ? true : val === 'true';
  } catch {
    return true;
  }
}

export function setHapticsEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(HAPTICS_STORAGE_KEY, String(enabled));
  } catch {
    // ignore storage errors
  }
}

export function isVibrationSupported(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function';
}

export function triggerHaptic(pattern: HapticPattern = 'light'): void {
  if (!isHapticsEnabled() || !isVibrationSupported()) return;
  try {
    navigator.vibrate(PATTERNS[pattern]);
  } catch {
    // ignore browser restrictions
  }
}

// Vox-caster style rhythmic telemetry pattern (~22s) played in a single synchronous
// navigator.vibrate() call so Android Chrome's user-activation check allows it.
const VOX_BURST_UNITS: number[][] = [
  [26, 45, 16, 45, 38],             // Opening squelch
  [22, 45, 14, 45, 32, 95, 16],     // Burst 1
  [16, 40, 28, 55, 14, 40, 14],     // Burst 2
  [28, 50, 14, 40, 18, 85, 26],     // Burst 3
  [14, 35, 14, 35, 34, 70, 16]      // Burst 4
];

const VOX_LONG_PATTERN: number[] = (() => {
  const seq: number[] = [...VOX_BURST_UNITS[0]];
  for (let i = 0; i < 18; i++) {
    seq.push(650); // pause between telemetry bursts
    seq.push(...VOX_BURST_UNITS[1 + (i % (VOX_BURST_UNITS.length - 1))]);
  }
  return seq;
})();

export function startVoxTransmission(): () => void {
  if (!isHapticsEnabled() || !isVibrationSupported()) {
    return () => {};
  }

  try {
    navigator.vibrate(VOX_LONG_PATTERN);
  } catch {
    // ignore
  }

  return () => {
    try {
      navigator.vibrate(0);
    } catch {
      // ignore
    }
  };
}

const INTERACTIVE_SELECTOR =
  'button, a, select, input[type="checkbox"], input[type="radio"], input[type="color"], [role="button"], [role="switch"], [role="tab"]';

let initialized = false;

export function initGlobalHaptics(): void {
  if (initialized || typeof document === 'undefined') return;
  initialized = true;

  document.addEventListener(
    'click',
    (e) => {
      const target = e.target as Element | null;
      if (!target || typeof target.closest !== 'function') return;
      const interactive = target.closest(INTERACTIVE_SELECTOR) as HTMLElement | null;
      if (!interactive) return;
      if ((interactive as HTMLButtonElement).disabled || interactive.getAttribute('aria-disabled') === 'true') {
        return;
      }
      triggerHaptic('light');
    },
    { capture: true, passive: true }
  );
}

