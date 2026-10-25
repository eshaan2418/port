/** "remember my choice" from the mode chooser (localStorage). Mirrored by the pre-paint script in app/layout.tsx. */
export type SavedMode = "town" | "list" | "agent";
const KEY = "site-mode";

export function readSavedMode(): SavedMode | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === "town" || v === "list" || v === "agent" ? v : null;
  } catch {
    return null;
  }
}

export function saveMode(mode: SavedMode | null) {
  try {
    if (mode) localStorage.setItem(KEY, mode);
    else localStorage.removeItem(KEY);
  } catch {}
}

/** touch-first or modest hardware: free roam still works, but say it's best on a laptop */
export function lowPowerDevice() {
  const nav = navigator as Navigator & { deviceMemory?: number };
  const touch = window.matchMedia("(pointer: coarse)").matches; // a touch screen as the main input
  const fewCores = typeof nav.hardwareConcurrency === "number" && nav.hardwareConcurrency <= 4;
  const lowMemory = typeof nav.deviceMemory === "number" && nav.deviceMemory <= 4;
  return touch || fewCores || lowMemory;
}
