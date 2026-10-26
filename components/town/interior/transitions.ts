"use client";

import { activityAt } from "@/lib/schedule";
import { line } from "@/data/speech";
import { runtime, useTown } from "../state";
import { setPov } from "../controls";
import { buildingById, placement, type BuildingId } from "../world/layout";
import { TOWERS } from "./floors";
import { cityAudio } from "../audio/engine";

const FADE_MS = 380;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Cross-fade through cream: fade out, swap the world underneath, fade back in. */
export async function fadeSwap(swap: () => void) {
  const s = useTown.getState();
  s.setFade(true);
  await wait(FADE_MS);
  swap();
  await wait(60);
  s.setFade(false);
}

/** Say a line (if it exists / is approved), with the little pop. */
export function speak(id: string) {
  const text = line(id);
  if (!text) return;
  useTown.getState().say(text);
  cityAudio.pop();
}

/** Door → dollhouse cutaway. */
export function enterBuilding(id: BuildingId) {
  const s = useTown.getState();
  if (s.interior || s.intro) return;
  void fadeSwap(() => {
    runtime.wasPov = s.pov;
    if (s.pov) setPov(false);
    if (id === "home") {
      s.setHomeRoom(null); // follow him
      s.setInterior("home");
      speak(`home-${activityAt(runtime.env.hour).room}`);
      return;
    }
    s.setFloor(TOWERS[id].start);
    s.setItem(null);
    s.say(null);
    runtime.room.id = ""; // the tower starts its arrival choreography
    s.setInterior(id);
  });
}

/**
 * Dollhouse → his front door: the camera starts close behind the doorway and
 * pulls out to the usual distance as he steps onto the sidewalk.
 */
export function leaveInterior() {
  const s = useTown.getState();
  if (!s.interior) return;
  const pl = placement(buildingById(s.interior));
  void fadeSwap(() => {
    s.say(null);
    s.setInterior(null);
    const p = runtime.player;
    p.x = pl.approach.x - pl.front.x * 0.1;
    p.z = pl.approach.z - pl.front.z * 0.1;
    p.yaw = Math.atan2(pl.front.x, pl.front.z);
    p.idle = null;
    Object.assign(p, { y: 0, flying: false, vx: 0, vy: 0, vz: 0, thrust: 0 }); // he steps out on the ground
    const c = runtime.camera;
    c.yaw = Math.atan2(pl.front.x, pl.front.z); // on the street side, looking back at the house
    c.pitch = 0.24;
    c.pan.x = c.pan.z = 0;
    runtime.boomReset = 3.2;
    runtime.input.walkTo = { x: pl.approach.x + pl.front.x * 1.6, z: pl.approach.z + pl.front.z * 1.6 };
    if (runtime.wasPov) {
      c.yaw = Math.atan2(-pl.front.x, -pl.front.z); // first person: look out at the street, not at the door
      setPov(true);
    }
  });
}
