"use client";

import { activityAt, introLineFor, type Activity } from "@/lib/schedule";
import { line } from "@/data/speech";
import { runtime, useTown, type IntroPhase } from "../state";
import { buildingById, placement, toWorld } from "../world/layout";
import { fadeSwap, speak } from "../interior/transitions";

/**
 * The opening sequence, played once per page load:
 *   hold   – the Home cutaway on whatever he's doing right now (Toronto time)
 *   notice – he spots you: a "!" pop, turns (or sits up) to face the camera
 *   speak  – the line for that activity types out
 *   getup  – stands up from the bed / chair
 *   walk   – heads for the stairs; the cutaway fades to the street
 *   out    – his front door opens and he comes down the stoop
 *   wave   – a small wave at the camera, the door swings shut
 *   swing  – the camera orbits round behind him and settles into the usual view
 * then the controls unlock and the "how to move around" card opens.
 *
 * The timeline runs on frame time (IntroDirector), so it pauses with the tab.
 * While it plays every control is locked; Esc / Enter / the skip link jump
 * straight to the handoff.
 */

export const INTRO_ORDER: IntroPhase[] = ["hold", "notice", "speak", "getup", "walk", "out", "wave", "swing"];

/** typewriter speed of the speech bubble (ms per character) */
export const TYPE_MS = 32;

/** stoop of the brownstone, in the house's local frame measured from the facade (see Buildings) */
const STOOP = { base: 1.15, edges: [1.18, 1.46, 1.74, 2.02, 2.3], rise: 0.23 };
/** where he stops on the sidewalk (in front of the facade) */
const OUT_STOP = 2.55;
/** in the doorway, just behind the threshold */
const OUT_START = 0.2;

export const intro = {
  phase: null as IntroPhase | null,
  /** seconds into the current phase */
  t: 0,
  dur: 0,
  act: null as Activity | null,
  lineId: "",
  /** this page load has already played (or skipped) it */
  done: false,
  skipping: false,
  /** one-shot cues within a phase */
  cues: new Set<string>(),
};

function introText() {
  return line(intro.lineId) ?? "";
}

export function phaseDuration(phase: IntroPhase): number {
  switch (phase) {
    case "hold":
      return 2.7; // ~0.7 s of it under the loading screen's fade-out
    case "notice":
      return 0.9;
    case "speak":
      return (introText().length * TYPE_MS) / 1000 + 1.2; // typed out, then a beat
    case "getup":
      return intro.act?.pose === "sleep" ? 1.0 : 0.8;
    case "walk":
      return 2.0;
    case "out":
      return 2.7;
    case "wave":
      return 1.4;
    case "swing":
      return 2.3;
  }
}

/** the outdoor third-person defaults (also set on mount in Town) */
export function cameraDefaults(touch: boolean) {
  return { dist: touch ? 13.5 : 10, pitch: touch ? 0.3 : 0.42 };
}
const isTouch = () => window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 768;

const home = () => buildingById("home");
/** facing out of his front door (also the camera yaw that looks back at it) */
export const homeFrontYaw = () => {
  const f = placement(home()).front;
  return Math.atan2(f.x, f.z);
};
/**
 * After the wave he sets off along the sidewalk (toward the gallery) and the
 * camera swings round behind him. Straight out from the door, "behind him"
 * would be his own front wall ~2.5 m away; along the sidewalk the boom has
 * room. Local frame: x along the facade, d = metres in front of it.
 */
const STROLL: [number, number][] = [
  [1.2, 2.62], // between the stoop's newel post and the signal pole
  [2.6, 2.45],
  [4.0, 2.35], // clear of the pole, so it isn't between him and the camera
];
const STROLL_SPEED = 1.9;
/** where the swing ends: behind him and toward the street, looking along the sidewalk */
export const handoffYaw = () => homeFrontYaw() - 0.75;

/** height of the stoop under him, `d` metres in front of the facade (eases over each step edge) */
function stoopY(d: number) {
  let y = STOOP.base;
  for (const e of STOOP.edges) {
    const k = Math.min(1, Math.max(0, (d - (e - 0.07)) / 0.14));
    y -= STOOP.rise * k * k * (3 - 2 * k);
  }
  return Math.max(0, y);
}

/** a point `d` metres in front of Home's facade (x along it), with the stoop height */
function stoopPoint(d: number, x = 0) {
  const b = home();
  const w = toWorld(b, x, b.d / 2 + d);
  return { x: w.x, y: stoopY(d), z: w.z };
}
const strollEnd = () => {
  const [x, d] = STROLL[STROLL.length - 1];
  const [px, pd] = STROLL[STROLL.length - 2];
  const a = stoopPoint(pd, px);
  const b = stoopPoint(d, x);
  return { ...b, yaw: Math.atan2(b.x - a.x, b.z - a.z) };
};

/* ── starting / ending ─────────────────────────────────────────────────── */

/**
 * Called once the world has loaded. Plays the intro, unless this load already
 * did, or the visitor asks for reduced motion (then it's skipped entirely).
 */
export function beginIntro() {
  if (intro.done) return;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduced) {
    handoff(true);
    return;
  }
  const s = useTown.getState();
  intro.act = activityAt(s.timeOfDay);
  intro.lineId = introLineFor(intro.act);
  s.setHomeRoom(null);
  s.setInterior("home");
  enterPhase("hold");
}

export function enterPhase(phase: IntroPhase) {
  intro.phase = phase;
  intro.t = 0;
  intro.dur = phaseDuration(phase);
  intro.cues.clear();
  const s = useTown.getState();
  s.setIntroPhase(phase);
  switch (phase) {
    case "notice":
      s.setExclaim();
      break;
    case "speak":
      speak(intro.lineId);
      break;
    case "getup":
      s.say(null);
      break;
    case "out":
      stepOutside();
      break;
    case "wave":
      runtime.player.idle = "wave";
      break;
    case "swing":
      runtime.player.idle = null;
      runtime.introWalk = { pts: STROLL.map(([x, d]) => stoopPoint(d, x)), speed: STROLL_SPEED, i: 0 };
      break;
  }
}

/** per-frame cues inside a phase (driven by IntroDirector) */
export function tickPhase(dt: number) {
  const s = useTown.getState();
  const cue = (name: string, at: number, fn: () => void) => {
    if (intro.t >= at && !intro.cues.has(name)) {
      intro.cues.add(name);
      fn();
    }
  };
  const c = runtime.camera;
  switch (intro.phase) {
    case "walk":
      cue("fade", intro.dur - 0.42, () => s.setFade(true)); // into the cream just before he reaches the stairs
      break;
    case "out": {
      cue("unfade", 0.05, () => s.setFade(false));
      cue("door", 0.35, () => s.setDoorOpen(true));
      cue("step", 0.8, () => {
        const pts = [];
        for (let d = OUT_START; d <= OUT_STOP + 1e-6; d += 0.1) pts.push(stoopPoint(d));
        runtime.introWalk = { pts, speed: 1.7, i: 0 };
      });
      break;
    }
    case "wave":
      cue("shut", 0.55, () => s.setDoorOpen(false));
      break;
    case "swing": {
      // orbit round to behind him while easing into the usual distance / angle
      const u = Math.min(1, intro.t / intro.dur);
      const k = u * u * u * (u * (u * 6 - 15) + 10);
      const from = swingFrom();
      const to = { ...cameraDefaults(isTouch()), yaw: handoffYaw() };
      c.yaw = from.yaw + (to.yaw - from.yaw) * k;
      c.pitch = from.pitch + (to.pitch - from.pitch) * k + Math.sin(u * Math.PI) * 0.14; // rise a little mid-swing
      c.dist = from.dist + (to.dist - from.dist) * k;
      break;
    }
  }
  intro.t += dt;
}

/** the street shot as he comes out: in front of the house, looking back at the door */
function swingFrom() {
  // high enough to see over passing traffic (and, on phones, over the fountain behind the camera)
  return { yaw: homeFrontYaw(), pitch: isTouch() ? 0.36 : 0.3, dist: isTouch() ? 12 : 8.5 };
}

/** cutaway → street: he's in his doorway, the camera on the sidewalk opposite */
function stepOutside() {
  const s = useTown.getState();
  s.say(null);
  s.setInterior(null);
  s.setDoorOpen(false);
  const p = runtime.player;
  const at = stoopPoint(OUT_START);
  Object.assign(p, { x: at.x, y: at.y, z: at.z, yaw: homeFrontYaw(), speed: 0, idle: null });
  const c = runtime.camera;
  const from = swingFrom();
  c.yaw = from.yaw;
  c.pitch = from.pitch;
  c.dist = from.dist;
  c.pan.x = c.pan.z = 0;
  c.autoTurn = null;
  runtime.boomReset = from.dist - 2.4; // starts a little close, then eases back (a gentle pull-out)
}

/** Esc / Enter / the skip link: straight to the handoff, through a quick fade */
export function skipIntro() {
  if (!useTown.getState().intro || intro.skipping) return;
  intro.skipping = true;
  void fadeSwap(() => handoff(false));
}

/**
 * Hand control to the visitor: he's on the sidewalk outside his door, the
 * camera in its usual third-person spot, the HUD fades in and the controls
 * card opens.
 */
function handoff(instant: boolean) {
  const s = useTown.getState();
  s.say(null);
  s.setInterior(null);
  s.setDoorOpen(false);
  s.setFade(false);
  const p = runtime.player;
  const end = strollEnd();
  // played to the end: everything is already in place. Skipped: put it there.
  const natural = !instant && !intro.skipping && intro.phase === "swing";
  if (!natural) {
    Object.assign(p, { x: end.x, z: end.z, yaw: end.yaw });
    const c = runtime.camera;
    Object.assign(c, cameraDefaults(isTouch()), { yaw: handoffYaw(), autoTurn: null });
    c.pan.x = c.pan.z = 0;
  }
  const unfinished = natural && runtime.introWalk; // (a slow frame) let him finish the last steps
  Object.assign(p, { y: 0, idle: null });
  if (!unfinished) Object.assign(p, { speed: 0, moving: false });
  runtime.introWalk = null;
  runtime.input.keys.clear();
  runtime.input.joy = { x: 0, y: 0, active: false };
  runtime.input.walkTo = unfinished ? { x: end.x, z: end.z } : null;
  runtime.input.enter = false;
  intro.phase = null;
  intro.done = true;
  intro.skipping = false;
  s.setIntroPhase(null);
  s.openStart(); // after every intro
}

/** the site is falling back to the list (a weak device): drop the intro, ready for "enter anyway" */
export function abortIntro() {
  if (intro.done) return;
  handoff(true);
}

/** advance to the next phase, or hand off after the last */
export function nextPhase() {
  const i = INTRO_ORDER.indexOf(intro.phase!);
  if (i < INTRO_ORDER.length - 1) enterPhase(INTRO_ORDER[i + 1]);
  else handoff(false);
}
