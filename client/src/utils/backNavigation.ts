import { useEffect, useRef } from 'react';

interface BackEntry {
  id: number;
  onBack: () => void;
}

let nextId = 1;
const stack: BackEntry[] = [];
let ignoreNextPopCount = 0;
let listenerAttached = false;

function ensureListener(): void {
  if (listenerAttached || typeof window === 'undefined') return;
  listenerAttached = true;

  window.addEventListener('popstate', () => {
    if (ignoreNextPopCount > 0) {
      ignoreNextPopCount--;
      return;
    }
    const top = stack.pop();
    if (top) {
      top.onBack();
    }
  });
}

/**
 * Registers a back-button handler when `isActive` is true.
 * Supports Android hardware/gesture Back in both installed PWAs and mobile browsers.
 */
export function useBackNavigation(isActive: boolean, onBack: () => void): void {
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;

  useEffect(() => {
    if (!isActive || typeof window === 'undefined') return;
    ensureListener();

    const id = nextId++;
    stack.push({
      id,
      onBack: () => onBackRef.current()
    });
    window.history.pushState({ wh40kBackId: id }, '');

    return () => {
      const idx = stack.findIndex((entry) => entry.id === id);
      if (idx !== -1) {
        // Closed via UI rather than hardware Back: remove from stack and pop synthetic history entry if on top
        const isTop = idx === stack.length - 1;
        stack.splice(idx, 1);
        if (isTop && window.history.state?.wh40kBackId === id) {
          ignoreNextPopCount++;
          window.history.back();
        }
      }
    };
  }, [isActive]);
}
