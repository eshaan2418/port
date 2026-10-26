"use client";

import { create } from "zustand";
import { isDayTime, clockHours } from "@/lib/time";
import type { BuildingId } from "./world/layout";
import type { HomeRoom } from "@/lib/schedule";

/**
 * Game/UI state (zustand). Per-frame values (positions, input vectors) live in
 * the mutable `runtime` object below instead, so 60 fps updates never trigger
 * React renders.
 */

/** "choose" = the first-load mode chooser (free roam / normal website / agent) */
export type ViewMode = "choose" | "town" | "list";
/** time-appropriate idle he slips into outdoors when left alone */
export type IdlePose = "coffee" | "stretch" | "sunset" | "stargaze" | "wave";

/**
 * The cinematic intro, in order. While it's set, the UI is hidden and every
 * input is ignored (except Esc / Enter / the skip link).
 */
export type IntroPhase = "hold" | "notice" | "speak" | "getup" | "walk" | "out" | "wave" | "swing";

/** dev/test only: a harness can force the starting clock (window.__forceHour) */
function startHour() {
  if (typeof window === "undefined") return 12;
  const forced = (window as unknown as { __forceHour?: number }).__forceHour;
  if (process.env.NODE_ENV !== "production" && typeof forced === "number") return forced;
  return clockHours(); // always the real local time (TIME_ZONE) on load
}

type TownState = {
  mode: ViewMode;
  /** the client has decided town vs. list (avoids mounting the town needlessly) */
  checked: boolean;
  /** why the list is showing by default (reduced motion / no WebGL / a slow device), if any */
  listReason: string | null;
  /** the visitor chose the city themselves ("enter anyway", ?view=city): don't auto-switch */
  chosen: boolean;
  /** slugs with a real image in /public/projects (found at build time; empty = no images anywhere) */
  projectImages: string[];
  loading: number; // 0..1
  ready: boolean;
  nearDoor: BuildingId | null;
  travelling: BuildingId | null;
  /** he's in the air */
  airborne: boolean;
  /** the in-world tutorial: the current step (see hud/Tutorial.tsx), or null when it isn't running */
  tutorial: number | null;
  /** fast-travel request; the player consumes it and clears it */
  travelRequest: { id: BuildingId; at: number } | null;
  /** "how to move around" card (after the intro, or reopened with "?") */
  startOpen: boolean;
  /** the camera has lost Eshaan (panned away / off-screen / hidden) */
  focusLost: boolean;
  toast: string | null;

  /**
   * Simulated clock (lib/time TIME_ZONE), fractional hours (0–24). Everything lighting- and
   * routine-related derives from this one value. It starts at the real
   * time and ticks in real time; the day/night toggle snaps it to noon or
   * midnight (milestone 2 adds a full scrubber on top).
   */
  timeOfDay: number;
  /** first-person view */
  pov: boolean;
  /** which building's dollhouse interior we're in (null = outdoors) */
  interior: BuildingId | null;
  /** room the dollhouse camera is framing; null = follow Eshaan */
  homeRoom: HomeRoom | null;
  /** towers: the floor he's on (index into the building's floor list, top first) */
  floor: number;
  /** towers: the thing he's showing on this floor (a project's slug in the gallery) */
  item: string | null;
  /** cream fade used for entering / leaving interiors and the intro */
  fade: boolean;
  /** the opening sequence is playing (UI hidden, input locked) */
  intro: boolean;
  introPhase: IntroPhase | null;
  /** bumps when he's surprised (the little "!" pop) */
  exclaim: number;
  /** Home's front door stands open (intro walk-out) */
  doorOpen: boolean;
  /** speech bubble: text + a key so the same line can replay */
  speech: { text: string; key: number } | null;
  sound: boolean;
  /** the visitor pressed M (silent mute shortcut; there's no sound button) */
  muted: boolean;
  volume: number; // 0..1

  setMode: (mode: ViewMode, reason?: string | null) => void;
  setLoading: (v: number) => void;
  setReady: () => void;
  setNearDoor: (id: BuildingId | null) => void;
  setTravelling: (id: BuildingId | null) => void;
  setAirborne: (v: boolean) => void;
  setTutorial: (step: number | null) => void;
  travelTo: (id: BuildingId) => void;
  clearTravelRequest: () => void;
  openStart: () => void;
  closeStart: () => void;
  setFocusLost: (lost: boolean) => void;
  showToast: (msg: string) => void;
  setTimeOfDay: (h: number) => void;
  toggleDayNight: () => void;
  setPov: (on: boolean) => void;
  setInterior: (id: BuildingId | null) => void;
  setHomeRoom: (room: HomeRoom | null) => void;
  setFloor: (floor: number) => void;
  setItem: (item: string | null) => void;
  setFade: (on: boolean) => void;
  setIntroPhase: (phase: IntroPhase | null) => void;
  setExclaim: () => void;
  setDoorOpen: (open: boolean) => void;
  say: (text: string | null) => void;
  toggleSound: () => void;
  setVolume: (v: number) => void;
};

let toastTimer: ReturnType<typeof setTimeout> | undefined;

export const useTown = create<TownState>((set, get) => ({
  mode: "choose",
  checked: false,
  listReason: null,
  chosen: false,
  projectImages: [],
  loading: 0,
  ready: false,
  nearDoor: null,
  travelling: null,
  airborne: false,
  tutorial: null,
  travelRequest: null,
  startOpen: false,
  focusLost: false,
  toast: null,
  timeOfDay: startHour(),
  pov: false,
  interior: "home", // the intro opens inside Home (see intro/intro.ts)
  homeRoom: null,
  floor: 0,
  item: null,
  fade: false,
  intro: true,
  introPhase: "hold",
  exclaim: 0,
  doorOpen: false,
  speech: null,
  sound: false, // on once free roam is picked (that click starts the audio); M mutes
  muted: false,
  volume: 0.6,

  setMode: (mode, reason = null) => set({ mode, listReason: reason }),
  setLoading: (v) => set({ loading: Math.max(get().loading, v) }),
  setReady: () => set({ ready: true, loading: 1 }),
  setNearDoor: (id) => get().nearDoor !== id && set({ nearDoor: id }),
  setTravelling: (id) => set({ travelling: id }),
  setAirborne: (v) => get().airborne !== v && set({ airborne: v }),
  setTutorial: (step) => set({ tutorial: step }),
  travelTo: (id) => set({ travelRequest: { id, at: performance.now() } }),
  clearTravelRequest: () => set({ travelRequest: null }),
  openStart: () => set({ startOpen: true }),
  closeStart: () => set({ startOpen: false }),
  setFocusLost: (lost) => get().focusLost !== lost && set({ focusLost: lost }),
  showToast: (msg) => {
    clearTimeout(toastTimer);
    set({ toast: msg });
    toastTimer = setTimeout(() => set({ toast: null }), 3200);
  },
  setTimeOfDay: (h) => set({ timeOfDay: ((h % 24) + 24) % 24 }),
  toggleDayNight: () => set({ timeOfDay: isDayTime(get().timeOfDay) ? 0 : 12 }),
  setPov: (on) => set({ pov: on }),
  setInterior: (id) => set({ interior: id }),
  setHomeRoom: (room) => set({ homeRoom: room }),
  setFloor: (floor) => get().floor !== floor && set({ floor, item: null }),
  setItem: (item) => set({ item }),
  setFade: (on) => set({ fade: on }),
  setIntroPhase: (phase) => set({ introPhase: phase, intro: phase !== null }),
  setExclaim: () => set({ exclaim: performance.now() }),
  setDoorOpen: (open) => set({ doorOpen: open }),
  say: (text) => set({ speech: text ? { text, key: performance.now() } : null }),
  toggleSound: () => set({ sound: !get().sound, muted: get().sound }),
  setVolume: (v) => set({ volume: Math.min(1, Math.max(0, v)), sound: v > 0 ? get().sound : false }),
}));

/** Mutable per-frame state shared between the controller, camera, audio and HUD. */
export const runtime = {
  player: {
    x: 0,
    y: 0,
    z: 0,
    yaw: 0,
    speed: 0,
    moving: false,
    running: false,
    idle: null as IdlePose | null,
    /** the suit: airborne (not standing on the ground or a roof) */
    flying: false,
    /** flight velocity (m/s) */
    vx: 0,
    vy: 0,
    vz: 0,
    /** how hard the thrusters are firing, 0–1 (flames + sound) */
    thrust: 0,
  },
  /** intro choreography: a path the outdoor Eshaan follows (with heights, for the stoop) */
  introWalk: null as { pts: { x: number; y: number; z: number }[]; speed: number; i: number } | null,
  camera: {
    yaw: 0, // orbit yaw (third person) / view yaw (POV): forward = (−sin yaw, −cos yaw)
    pitch: 0.42, // orbit elevation
    look: 0, // POV look pitch (+ up)
    dist: 10,
    minDist: 4.5,
    maxDist: 17,
    /** fast-travel arrival: ease the view toward a building's sign, then hand back */
    autoTurn: null as { yaw: number; pitch: number; until: number } | null,
    /** two-finger / right-drag pan: offset of the focus point from Eshaan */
    pan: { x: 0, z: 0 },
    /** ease the pan back to zero (click Eshaan, F / Space, or walking) */
    recenter: false,
  },
  input: {
    keys: new Set<string>(),
    joy: { x: 0, y: 0, active: false },
    /** set by click/tap-to-walk; consumed by the player controller */
    walkTo: null as { x: number; z: number } | null,
    /** touch: the fly ▲ / ▼ buttons are held */
    flyUp: false,
    flyDown: false,
    enter: false,
  },
  /** Home actor's head on screen (for the speech bubble), written by the interior rig */
  bubble: { x: 0, y: 0, visible: false },
  /** first-person was on when we went inside; restore it when we come out */
  wasPov: false,
  /**
   * Inside a tower: seconds since he arrived on the current floor (drives each
   * room's arrival choreography), plus a camera shake amount rooms can bump.
   */
  room: { id: "", t: 0, shake: 0 },
  /** CameraRig snaps its boom to this once (e.g. a close start before a pull-out) */
  boomReset: null as number | null,
  /** where Eshaan is on screen, for the "get back focus" prompt and edge arrow */
  focus: { lost: false, offscreen: false, sx: 0, sy: 0 },
  /** outdoor Eshaan's head on screen, in px (for the flight-hint speech bubble), written by the camera rig */
  head: { x: 0, y: 0, visible: false },
  /** visual day amount (0 night → 1 day), eased toward the clock's target */
  env: {
    dayness: 1,
    /** the clock the visuals show: eases toward timeOfDay (time-lapse on scrub/toggle) */
    hour: 12,
    /** 0 day → 1 night: drives glows, stars, fireflies */
    night: 0,
    sunDir: { x: 0.5, y: 0.7, z: 0.4 },
  },
  /** vehicles on the loop this frame (audio reads it for passing sounds) */
  traffic: [] as { kind: "car" | "bike" | "moto" | "sports"; x: number; z: number; v: number }[],
};
