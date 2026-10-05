"use client";

import { useLayoutEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useTown, runtime } from "../state";
import { BUILDINGS, SIGN_POSTS, buildingById, placement, type BuildingId } from "../world/layout";
import { routeTo } from "../world/nav";
import { resolve } from "../world/physics";
import { registry } from "../world/registry";
import { Character } from "./Character";
import { enterBuilding, leaveInterior } from "../interior/transitions";
import { outdoorIdleAt } from "@/lib/schedule";

export const WALK_SPEED = 3.3;
export const RUN_SPEED = 6.2;
const DOOR_RANGE = 2.1;

type V2 = { x: number; z: number };

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

    // ── 2. requests
    // moving him always brings the camera back
    if (manual && (runtime.camera.pan.x || runtime.camera.pan.z)) runtime.camera.recenter = true;
    if (manual && route.current.length) {
      route.current = [];
      destination.current = null;
      store.setTravelling(null);
    }
    if (store.travelRequest) {
      const id = store.travelRequest.id;
      store.clearTravelRequest();
      const target = placement(buildingById(id)).approach;
      if (Math.hypot(target.x - p.x, target.z - p.z) < 0.6) {
        enterBuilding(id);
      } else {
        route.current = routeTo(p, target);
        destination.current = id;
        store.setTravelling(id);
      }
    }
    if (input.walkTo) {
      route.current = routeTo(p, input.walkTo);
      destination.current = null;
      store.setTravelling(null);
      input.walkTo = null;
    }

    // ── 3. desired velocity
    let vx = 0;
    let vz = 0;
    let speed = 0;
    if (manual) {
      const cy = runtime.camera.yaw;
      const fx = -Math.sin(cy);
      const fz = -Math.cos(cy);
      const rx = Math.cos(cy);
      const rz = -Math.sin(cy);
      const dx = rx * ix + fx * iy;
      const dz = rz * ix + fz * iy;
      const len = Math.hypot(dx, dz) || 1;
      speed = (running ? RUN_SPEED : WALK_SPEED) * mag;
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
        if (last) speed = Math.min(speed, d * 4 + 0.6); // ease into the stop
        vx = (dx / d) * speed;
        vz = (dz / d) * speed;
      }
    }

    // ── 4. move + collide (slides along walls)
    const next = { x: p.x + vx * dt, z: p.z + vz * dt };
    resolve(next);
    const moved = Math.hypot(next.x - p.x, next.z - p.z);
    p.speed = dt > 0 ? moved / dt : 0;
    p.x = next.x;
    p.z = next.z;
    p.moving = p.speed > 0.2;
    p.running = speed > WALK_SPEED + 0.5;

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
    const busy = manual || route.current.length > 0 || store.pov || store.intro || p.speed > 0.1;
    idleFor.current = busy ? 0 : idleFor.current + dt;
    p.idle = idleFor.current > 5 ? outdoorIdleAt(runtime.env.hour) : null;
    if (p.idle === "sunset") {
      const sd = runtime.env.sunDir; // turn to watch it
      p.yaw = angleLerp(p.yaw, Math.atan2(sd.x, sd.z), Math.min(1, dt * 2));
    }

    // ── 5. facing (in POV he always faces where you look)
    if (store.pov) p.yaw = Math.atan2(-Math.sin(runtime.camera.yaw), -Math.cos(runtime.camera.yaw));
    else if (speed > 0.2 && moved > 1e-4) p.yaw = angleLerp(p.yaw, Math.atan2(vx, vz), Math.min(1, dt * 12));

    // ── 6. doors
    let near: BuildingId | null = null;
    for (const b of BUILDINGS) {
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
      <Character pose="auto" isPlayer />
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
