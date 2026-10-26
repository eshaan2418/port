export type Mode = "town" | "list" | "agent";

/** an older build saved the chooser pick here; it's cleared on every load so the chooser always shows */
export const LEGACY_MODE_KEY = "site-mode";

/** touch-first or modest hardware: free roam still works, but say it's best on a laptop */
export function lowPowerDevice() {
  const nav = navigator as Navigator & { deviceMemory?: number };
  const touch = window.matchMedia("(pointer: coarse)").matches; // a touch screen as the main input
  const fewCores = typeof nav.hardwareConcurrency === "number" && nav.hardwareConcurrency <= 4;
  const lowMemory = typeof nav.deviceMemory === "number" && nav.deviceMemory <= 4;
  return touch || fewCores || lowMemory;
}
