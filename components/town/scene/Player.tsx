"use client";

import { useLayoutEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useTown, runtime } from "../state";
import { BUILDINGS, FLY_CEILING, SIGN_POSTS, buildingById, placement, type BuildingId } from "../world/layout";
import { landingSpot, routeTo } from "../world/nav";
import { PLAYER_RADIUS, floorAt, resolve, topAlong } from "../world/physics";
import { registry } from "../world/registry";
import { Character } from "./Character";
import { enterBuilding, leaveInterior } from "../interior/transitions";
import { outdoorIdleAt } from "@/lib/schedule";

export const WALK_SPEED = 3.3;
export const RUN_SPEED = 6.2;
/** the suit (outdoors): cruise / Shift boost, climb / descend rates (m/s) */
export const FLY_SPEED = 8;
export const FLY_BOOST = 15;
const FLY_UP = 6;
const FLY_DOWN = 5.5;
/** the ceiling: just over the highest roof (Experience's crown), so every roof can be landed on, never above the tallest building */
const MAX_ALT = FLY_CEILING;
/** a drop bigger than this off a roof edge and the suit catches him (he hovers); smaller ones he just steps down */
const STEP_DOWN = 1.7;
/** planning clearance around him in the air */
const AIR_R = PLAYER_RADIUS + 0.15;
const DOOR_RANGE = 2.1;

type V2 = { x: number; z: number };
/** fast travel / click-to-walk in the air: fly straight there over everything, set down, then walk to the door */
type AirTrip = {
  x: number;
  z: number;
  dest: BuildingId | null;
  startY: number;
  t: number;
  best: number; // closest he's got so far (stall check)
  bestT: number;
  detour: V2 | null; // a sidestep round something he can't fly over (the spire)
  detourT: number;
  side: 1 | -1;
};

/** Where Eshaan starts: on the path outside his front door, facing the plaza. */
export function spawnPoint() {
  const home = placement(buildingById("home"));
  return { x: home.approach.x + home.front.x * 0.6, z: home.approach.z + home.front.z * 0.6, yaw: Math.atan2(home.front.x, home.front.z) };
}

function angleLerp(a: number, b: number, t: number) {
  const d = Math.atan2(Math.sin(b - a), Math.cos(b - a));
  return a + d * t;
}

export { enterBuilding } from "../interior/transitions";

/**
 * Character controller. Priority each frame:
 *  1. manual input (keys / joystick) cancels any auto-walk
 *  2. fast-travel or click-to-walk route (waypoints)
 * Movement is camera-relative; collisions slide along walls; arriving at a
 * door turns him to face it and surfaces the "enter" prompt.
 */
export function Player() {
  const group = useRef<THREE.Group>(null);
  const route = useRef<V2[]>([]);
  const air = useRef<AirTrip | null>(null);
  const destination = useRef<BuildingId | null>(null);
  const stuck = useRef({ t: 0, x: 0, z: 0 });
  const idleFor = useRef(0);
  const hit = useRef<THREE.Mesh>(null);
  const ring = useRef<THREE.Mesh>(null);

  useLayoutEffect(() => {
    registry.player = hit.current;
    return () => {
      registry.player = null;
    };
  }, []);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const p = runtime.player;
    const input = runtime.input;
    const store = useTown.getState();
    // inside a dollhouse he's on the interior stage; the outdoor body waits at the door
    if (store.interior) {
      input.walkTo = null;
      if (input.enter) {
        input.enter = false;
        leaveInterior();
      }
      return;
    }

    // intro (outside part): he's choreographed, nobody steers him
    if (store.intro) {
      route.current = [];
      air.current = null;
      destination.current = null;
      input.walkTo = null;
      input.enter = false;
      let speed = 0;
      const w = runtime.introWalk;
      if (w) {
        let step = w.speed * dt;
        while (step > 0 && w.i < w.pts.length) {
          const t = w.pts[w.i];
          const dx = t.x - p.x;
          const dz = t.z - p.z;
          const d = Math.hypot(dx, dz);
          if (d <= step) {
            Object.assign(p, { x: t.x, y: t.y, z: t.z });
            step -= d;
            w.i++;
          } else {
            p.x += (dx / d) * step;
            p.z += (dz / d) * step;
            p.y += (t.y - p.y) * (step / d);
            step = 0;
          }
          if (d > 0.02) p.yaw = angleLerp(p.yaw, Math.atan2(dx, dz), Math.min(1, dt * 7)); // turns onto the sidewalk
        }
        if (w.i >= w.pts.length) runtime.introWalk = null;
        else speed = w.speed;
      }
      p.speed = speed;
      p.moving = speed > 0.2;
      p.running = false;
      store.setNearDoor(null);
      group.current!.position.set(p.x, p.y, p.z);
      group.current!.rotation.y = p.yaw;
      ring.current!.visible = false;
      return;
    }

    // ── 1. manual input
    const k = input.keys;
    let ix = (k.has("KeyD") || k.has("ArrowRight") ? 1 : 0) - (k.has("KeyA") || k.has("ArrowLeft") ? 1 : 0);
    let iy = (k.has("KeyW") || k.has("ArrowUp") ? 1 : 0) - (k.has("KeyS") || k.has("ArrowDown") ? 1 : 0);
    let mag = Math.min(1, Math.hypot(ix, iy));
    if (input.joy.active) {
      ix = input.joy.x;
      iy = input.joy.y;
      mag = Math.min(1, Math.hypot(ix, iy));
    }
    const manual = mag > 0.12;
    const running = k.has("ShiftLeft") || k.has("ShiftRight") || (input.joy.active && mag > 0.92);
    const up = k.has("Space") || input.flyUp;
    const down = k.has("KeyC") || input.flyDown;

    // ── 2. requests
    // moving him always brings the camera back
    if (manual && (runtime.camera.pan.x || runtime.camera.pan.z)) runtime.camera.recenter = true;
    // steering (or Space / C) takes over from any trip in progress
    if ((manual || up || down) && (route.current.length || air.current)) {
      route.current = [];
      air.current = null;
      destination.current = null;
      store.setTravelling(null);
    }
    const fly = (to: V2, dest: BuildingId | null) => {
      air.current = { x: to.x, z: to.z, dest, startY: p.y, t: 0, best: Infinity, bestT: 0, detour: null, detourT: 0, side: 1 };
      route.current = [];
      destination.current = dest;
      store.setTravelling(dest);
      p.flying = true; // (off a roof: the suit lifts him)
    };
    // in the air or up on a roof, trips are flown; on the street, walked
    const airborne = p.flying || p.y > 0.05;
    if (store.travelRequest) {
      const id = store.travelRequest.id;
      store.clearTravelRequest();
      const target = placement(buildingById(id)).approach;
      if (airborne) fly(landingSpot(id), id);
      else if (Math.hypot(target.x - p.x, target.z - p.z) < 0.6) enterBuilding(id);
      else {
        air.current = null;
        route.current = routeTo(p, target);
        destination.current = id;
        store.setTravelling(id);
      }
    }
    if (input.walkTo) {
      if (airborne) fly(input.walkTo, null);
      else {
        air.current = null;
        route.current = routeTo(p, input.walkTo);
        destination.current = null;
        store.setTravelling(null);
      }
      input.walkTo = null;
    }

    // ── 3. desired velocity
    let vx = 0;
    let vz = 0;
    let speed = 0;
    let airWantY: number | null = null; // the altitude an air trip wants right now
    let landing = false; // an air trip that's over its spot (allowed to touch down)
    if (air.current && !manual) {
      const a = air.current;
      a.t += dt;
      const d = Math.hypot(a.x - p.x, a.z - p.z);
      if (d < a.best - 0.1) {
        a.best = d;
        a.bestT = a.t;
      }
      // pinned against something he can't clear (the spire tops the ceiling): sidestep, alternating sides
      if (a.t - a.bestT > 1.4 && !a.detour && d > 0.6) {
        const nx = (a.x - p.x) / d;
        const nz = (a.z - p.z) / d;
        a.detour = { x: p.x - nz * 2.4 * a.side, z: p.z + nx * 2.4 * a.side };
        a.detourT = 1.1;
        a.side = a.side === 1 ? -1 : 1;
        a.bestT = a.t;
      }
      if (a.detour && (a.detourT -= dt) <= 0) a.detour = null;
      const aim = a.detour ?? a;
      const ad = Math.hypot(aim.x - p.x, aim.z - p.z);
      const dir = ad > 1e-4 ? { x: (aim.x - p.x) / ad, z: (aim.z - p.z) / ad } : { x: 0, z: 0 };
      // what's in the way: just ahead (must clear it before going on), and over the rest of the way (cruise above it)
      const ahead = Math.min(ad, 3.5);
      const reach = (h: number) => (h > MAX_ALT - 0.4 ? 0 : h); // too tall to clear: go round it instead
      const near = ad > 0.45 ? reach(topAlong(p, { x: p.x + dir.x * ahead, z: p.z + dir.z * ahead }, AIR_R, 0.35)) : 0;
      const all = reach(topAlong(p, aim, AIR_R, 0.35, 0.6));
      const cruise = Math.min(MAX_ALT, Math.max(a.startY, all > 0 ? all + 1.2 : 0));
      // a glide path down to the spot: lower the closer he gets
      airWantY = Math.min(MAX_ALT, Math.max(near > 0 ? near + 0.6 : 0, Math.min(cruise, d * 0.7)));
      speed = Math.min(FLY_SPEED * 1.25, ad * 1.3 + 0.2);
      if (near > 0) speed *= THREE.MathUtils.clamp((p.y - near) / 0.6, 0, 1); // climb first
      vx = dir.x * speed;
      vz = dir.z * speed;
      landing = d < 0.5;
      if (a.t > 40) {
        // never got there: stop and hover (nothing's left "in progress")
        air.current = null;
        destination.current = null;
        store.setTravelling(null);
      }
    } else if (manual) {
      const cy = runtime.camera.yaw;
      const fx = -Math.sin(cy);
      const fz = -Math.cos(cy);
      const rx = Math.cos(cy);
      const rz = -Math.sin(cy);
      const dx = rx * ix + fx * iy;
      const dz = rz * ix + fz * iy;
      const len = Math.hypot(dx, dz) || 1;
      speed = (p.flying ? (running ? FLY_BOOST : FLY_SPEED) : running ? RUN_SPEED : WALK_SPEED) * mag;
      vx = (dx / len) * speed;
      vz = (dz / len) * speed;
    } else if (route.current.length) {
      const wp = route.current[0];
      const dx = wp.x - p.x;
      const dz = wp.z - p.z;
      const d = Math.hypot(dx, dz);
      const last = route.current.length === 1;
      if (d < (last ? 0.12 : 0.6)) {
        route.current.shift();
        if (!route.current.length) {
          if (destination.current) {
            // arrived: face the door, and swing the view round to the sign
            const pl = placement(buildingById(destination.current));
            p.yaw = Math.atan2(-pl.front.x, -pl.front.z);
            const signY = SIGN_POSTS.find((s) => s.building === destination.current && s.mount === "facade")?.y ?? 3.6;
            runtime.camera.autoTurn = {
              yaw: Math.atan2(pl.front.x, pl.front.z), // camera on the street side, looking at the facade
              pitch: Math.max(0.06, 0.22 - (signY - 3.6) * 0.1), // flatter for higher signs (Education)
              until: performance.now() + 1500,
            };
            store.setTravelling(null);
            destination.current = null;
          }
        }
      } else {
        // remaining distance decides walk vs. a light jog
        let remaining = d;
        for (let i = 1; i < route.current.length; i++)
          remaining += Math.hypot(route.current[i].x - route.current[i - 1].x, route.current[i].z - route.current[i - 1].z);
        speed = remaining > 9 ? RUN_SPEED * 0.85 : WALK_SPEED;
        if (p.flying) speed = Math.min(FLY_SPEED, remaining * 1.5 + 2); // in the air: fly the route (and come down)
        if (last) speed = Math.min(speed, d * 4 + 0.6); // ease into the stop
        vx = (dx / d) * speed;
        vz = (dz / d) * speed;
      }
    }

    // ── 4. the suit: take off, climb, hover, descend, land (on the ground or a roof)
    const prevY = p.y;
    if (!p.flying && up) {
      p.flying = true;
      p.vy = 2.5; // a little hop off the ground
    }
    if (p.flying) {
      // climb while Space (▲) is held, descend with C (▼); otherwise hover. A trip flies its own glide path.
      let wantVy = up ? FLY_UP : down || route.current.length ? -FLY_DOWN : 0;
      if (airWantY !== null) {
        const e = airWantY - p.y;
        wantVy = Math.abs(e) < 0.03 ? 0 : THREE.MathUtils.clamp(e * 2 + Math.sign(e) * 0.5, -FLY_DOWN, FLY_UP);
      }
      p.vy += (wantVy - p.vy) * (1 - Math.exp(-dt * 4));
      p.y = Math.min(MAX_ALT, p.y + p.vy * dt);
      p.y = Math.max(p.y, floorAt(p.x, p.z, prevY)); // settle on a roof before the sideways move (or the walls would push him off it)
      if (p.y >= MAX_ALT) p.vy = Math.min(0, p.vy);
      // horizontal: the suit has momentum (eases toward the wanted velocity)
      const k2 = 1 - Math.exp(-dt * (manual || route.current.length || air.current ? 2.6 : 1.8));
      p.vx += (vx - p.vx) * k2;
      p.vz += (vz - p.vz) * k2;
      vx = p.vx;
      vz = p.vz;
    } else {
      p.vx = vx;
      p.vz = vz;
    }

    // ── 5. move + collide (slides along walls; anything lower than his feet is flown over)
    const next = { x: p.x + vx * dt, z: p.z + vz * dt };
    resolve(next, undefined, p.flying ? Math.min(p.y, prevY) : p.y, p.flying);
    const moved = Math.hypot(next.x - p.x, next.z - p.z);
    p.speed = dt > 0 ? moved / dt : 0;
    p.x = next.x;
    p.z = next.z;
    const floor = floorAt(p.x, p.z, Math.max(p.y, prevY));
    if (p.flying) {
      if (p.y < floor) p.y = floor;
      if (p.y <= floor + 0.01 && p.vy <= 0.05 && (!air.current || landing)) {
        // touchdown
        p.flying = false;
        p.y = floor;
        p.vy = 0;
        p.vx = p.vz = 0;
        const a = air.current;
        if (a) {
          air.current = null;
          if (a.dest) {
            // set down in front of the building: the last few steps to the door are walked
            route.current = [placement(buildingById(a.dest)).approach];
            destination.current = a.dest;
          }
        }
      }
    } else if (p.y > floor + 0.01) {
      // walked off an edge: a small step he drops down; a real drop and the suit catches him (he hovers)
      if (p.y - floor > STEP_DOWN) {
        p.flying = true;
        p.vy = 0;
      } else {
        p.vy -= 22 * dt;
        p.y = Math.max(floor, p.y + p.vy * dt);
        if (p.y === floor) p.vy = 0;
      }
    } else {
      p.y = floor;
      p.vy = 0;
    }
    store.setAirborne(p.flying);
    p.moving = p.speed > 0.2;
    p.running = !p.flying && speed > WALK_SPEED + 0.5;
    // thruster level, for the flames and the sound
    const wantThrust = p.flying ? Math.min(1, 0.4 + (up || p.vy > 1 ? 0.6 : 0) + (p.speed / FLY_BOOST) * 0.5) : 0;
    p.thrust += (wantThrust - p.thrust) * (1 - Math.exp(-dt * 8));

    // auto-walk stuck guard: if pinned against something, skip the waypoint
    if (route.current.length && !manual) {
      stuck.current.t += dt;
      if (stuck.current.t > 0.7) {
        if (Math.hypot(p.x - stuck.current.x, p.z - stuck.current.z) < 0.25) {
          route.current.shift();
          if (!route.current.length) {
            // gave up: don't leave the fast-travel button "in progress"
            destination.current = null;
            store.setTravelling(null);
          }
        }
        stuck.current = { t: 0, x: p.x, z: p.z };
      }
    }

    // ── idle: left alone for a few seconds, he does something for the hour
    const busy = manual || route.current.length > 0 || air.current !== null || store.pov || store.intro || p.speed > 0.1 || p.flying;
    idleFor.current = busy ? 0 : idleFor.current + dt;
    const idle = idleFor.current > 5 ? outdoorIdleAt(runtime.env.hour) : null;
    p.idle = idle === "coffee" ? "stretch" : idle; // no coffee in the suit
    if (p.idle === "sunset") {
      const sd = runtime.env.sunDir; // turn to watch it
      p.yaw = angleLerp(p.yaw, Math.atan2(sd.x, sd.z), Math.min(1, dt * 2));
    }

    // ── 6. facing (in POV he always faces where you look)
    if (store.pov) p.yaw = Math.atan2(-Math.sin(runtime.camera.yaw), -Math.cos(runtime.camera.yaw));
    else if (speed > 0.2 && moved > 1e-4) p.yaw = angleLerp(p.yaw, Math.atan2(vx, vz), Math.min(1, dt * 12));

    // ── 7. doors (on the ground only)
    let near: BuildingId | null = null;
    if (!p.flying && p.y < 0.3) for (const b of BUILDINGS) {
      const a = placement(b).approach;
      if (Math.hypot(a.x - p.x, a.z - p.z) < DOOR_RANGE) near = b.id;
    }
    store.setNearDoor(near);
    if (input.enter) {
      input.enter = false;
      if (near) enterBuilding(near);
    }

    const g = group.current!;
    g.position.set(p.x, p.y, p.z);
    g.rotation.y = p.yaw;

    // "here he is": a pulsing tiffany ring while the camera has lost him
    const r = ring.current!;
    r.visible = runtime.focus.lost;
    if (r.visible) {
      const k = (performance.now() / 1000) % 1.4 / 1.4;
      r.scale.setScalar(0.7 + k * 0.9);
      (r.material as THREE.MeshBasicMaterial).opacity = 0.9 * (1 - k);
    }
  });

  return (
    <group ref={group}>
      {/* outdoors he always wears the suit (inside, the interiors show him without it) */}
      <Character pose="auto" isPlayer suit />
      {/* click target for "click on eshaan" (invisible, raycast only) */}
      <mesh ref={hit} position={[0, 0.95, 0]} visible={false}>
        <capsuleGeometry args={[0.45, 1.0, 2, 8]} />
      </mesh>
      <mesh ref={ring} rotation-x={-Math.PI / 2} position={[0, 0.05, 0]} visible={false}>
        <ringGeometry args={[0.55, 0.7, 40]} />
        <meshBasicMaterial color="#81D8D0" transparent depthWrite={false} />
      </mesh>
    </group>
  );
}
