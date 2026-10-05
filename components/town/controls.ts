"use client";

import { runtime, useTown } from "./state";
import { registry } from "./world/registry";

const finePointer = () => typeof window !== "undefined" && window.matchMedia("(pointer: fine)").matches;

/**
 * First-person (POV) on/off. Call from a user gesture (button click / V key):
 * on desktop it requests pointer lock for mouse look; losing the lock (Esc)
 * drops back to third person (see PointerInput).
 */
export function setPov(on: boolean) {
  const store = useTown.getState();
  if (store.pov === on) return;
  store.setPov(on);
  runtime.camera.look = 0;
  const canvas = registry.canvas;
  if (on && finePointer() && canvas?.requestPointerLock) {
    try {
      const res = canvas.requestPointerLock() as unknown as Promise<void> | undefined;
      res?.catch?.(() => {}); // headless / denied: drag-to-look still works
    } catch {}
  }
  if (!on && document.pointerLockElement) document.exitPointerLock();
}

export const togglePov = () => setPov(!useTown.getState().pov);
