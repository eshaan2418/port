"use client";
/* eslint-disable react-hooks/immutability -- R3F idiom: imperative per-frame updates. */

import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { runtime, useTown } from "../state";
import { registry } from "../world/registry";
import { ISLAND_RADIUS } from "../world/layout";

const PAN_LIMIT = ISLAND_RADIUS + 4;

const TARGET_HEIGHT = 1.35;
const EYE_HEIGHT = 1.62;
const MIN_BOOM = 1.6;
const WALL_GAP = 0.5;

const angleLerp = (a: number, b: number, t: number) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * t;

/**
 * Two cameras blended by `pov`:
 *  - third person: orbit-follow at chest height with damping and a full 360°
 *    azimuth (pitch is clamped). A fan of rays from the target toward the
 *    camera tests building volumes; the boom shortens fast when something is
 *    in the way and eases back out slowly, so it never clips or pops.
 *  - first person: eye height, a little forward of the head (hidden), looking
 *    along the same yaw, so switching keeps your heading.
 * Fast-travel arrival sets `autoTurn`, which eases the yaw toward the
 * building's sign for ~1.5 s before handing control back.
 *
 * Panning offsets the focus point from Eshaan (clamped to the island). Each
 * frame we also check whether he's still in the shot (on screen and not
 * hidden behind a building); if he's been lost for ~1 s, or the view is
 * panned away, the HUD offers "click on eshaan to get back focus".
 */
export function CameraRig() {
  const { camera } = useThree();
  const v = useMemo(
    () => ({
      target: new THREE.Vector3(),
      dir: new THREE.Vector3(),
      right: new THREE.Vector3(),
      up: new THREE.Vector3(),
      origin: new THREE.Vector3(),
      tp: new THREE.Vector3(),
      eye: new THREE.Vector3(),
      look: new THREE.Vector3(),
      povLook: new THREE.Vector3(),
      ray: new THREE.Raycaster(),
      ndc: new THREE.Vector3(),
      chest: new THREE.Vector3(),
    }),
    [],
  );
  const boom = useRef(runtime.camera.dist);
  const blend = useRef(0);
  const first = useRef(true);
  const lostFor = useRef(0);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const c = runtime.camera;
    const p = runtime.player;
    const pov = useTown.getState().pov;
    if (useTown.getState().interior) return; // the dollhouse rig owns the camera inside
    if (runtime.boomReset !== null) {
      boom.current = runtime.boomReset; // start close (leaving a building), then ease out
      runtime.boomReset = null;
    }

    // ── auto-turn toward a sign after fast travel
    if (c.autoTurn) {
      if (performance.now() > c.autoTurn.until) c.autoTurn = null;
      else {
        const k = 1 - Math.exp(-dt * 3.4);
        c.yaw = angleLerp(c.yaw, c.autoTurn.yaw, k);
        if (pov) c.look += (0.18 - c.look) * k;
        else c.pitch += (c.autoTurn.pitch - c.pitch) * k;
      }
    }

    // ── pan: ease back to Eshaan when asked; keep the focus over the island
    if (c.recenter) {
      const k = 1 - Math.exp(-dt * 6);
      c.pan.x -= c.pan.x * k;
      c.pan.z -= c.pan.z * k;
      if (Math.hypot(c.pan.x, c.pan.z) < 0.05) {
        c.pan.x = c.pan.z = 0;
        c.recenter = false;
      }
    }
    if (pov) c.pan.x = c.pan.z = 0;
    const fx0 = p.x + c.pan.x;
    const fz0 = p.z + c.pan.z;
    const fd = Math.hypot(fx0, fz0);
    if (fd > PAN_LIMIT) {
      c.pan.x = (fx0 * PAN_LIMIT) / fd - p.x;
      c.pan.z = (fz0 * PAN_LIMIT) / fd - p.z;
    }
    const goal = new THREE.Vector3(p.x + c.pan.x, TARGET_HEIGHT + p.y, p.z + c.pan.z); // p.y: on his stoop (intro)
    if (first.current) {
      v.target.copy(goal);
      first.current = false;
    } else {
      v.target.lerp(goal, 1 - Math.exp(-dt * 9));
    }

    // ── third person
    const cp = Math.cos(c.pitch);
    v.dir.set(Math.sin(c.yaw) * cp, Math.sin(c.pitch), Math.cos(c.yaw) * cp).normalize();
    v.right.set(Math.cos(c.yaw), 0, -Math.sin(c.yaw));
    v.up.crossVectors(v.right, v.dir).normalize();
    let allowed = c.dist;
    v.ray.far = c.dist + WALL_GAP;
    for (const [ox, oy] of [
      [0, 0],
      [0.35, 0.2],
      [-0.35, 0.2],
      [0.35, -0.2],
      [-0.35, -0.2],
    ]) {
      v.origin.copy(v.target).addScaledVector(v.right, ox * 0.4).addScaledVector(v.up, oy * 0.4);
      v.ray.set(v.origin, v.dir);
      const hit = v.ray.intersectObjects(registry.blockers, false)[0];
      if (hit) allowed = Math.min(allowed, Math.max(MIN_BOOM, hit.distance - WALL_GAP));
    }
    const k = allowed < boom.current ? 1 - Math.exp(-dt * 30) : 1 - Math.exp(-dt * 2.5);
    boom.current += (allowed - boom.current) * k;
    v.tp.copy(v.target).addScaledVector(v.dir, boom.current);
    v.tp.y = Math.max(v.tp.y, 0.6);

    // ── first person (forward = −sin yaw, −cos yaw)
    const fx = -Math.sin(c.yaw);
    const fz = -Math.cos(c.yaw);
    v.eye.set(p.x + fx * 0.22, EYE_HEIGHT, p.z + fz * 0.22);
    const cl = Math.cos(c.look);
    v.povLook.set(v.eye.x + fx * cl, EYE_HEIGHT + Math.sin(c.look), v.eye.z + fz * cl);

    blend.current += ((pov ? 1 : 0) - blend.current) * (1 - Math.exp(-dt * 7));
    const b = blend.current < 0.002 ? 0 : blend.current > 0.998 ? 1 : blend.current;
    camera.position.lerpVectors(v.tp, v.eye, b);
    v.look.lerpVectors(v.target, v.povLook, b);
    camera.lookAt(v.look);
    camera.updateMatrixWorld();

    // ── is Eshaan still in the shot?
    const f = runtime.focus;
    const inside = useTown.getState().interior !== null;
    if (pov || inside || useTown.getState().intro) {
      f.lost = false;
      lostFor.current = 0;
    } else {
      v.chest.set(p.x, 1.1, p.z);
      v.ndc.copy(v.chest).project(camera);
      const behind = v.ndc.z > 1;
      const offscreen = behind || Math.abs(v.ndc.x) > 1 || Math.abs(v.ndc.y) > 1;
      let hidden = false;
      if (!offscreen) {
        const toHim = v.chest.clone().sub(camera.position);
        const dist = toHim.length();
        v.ray.set(camera.position, toHim.normalize());
        v.ray.far = dist - 0.4;
        hidden = v.ray.intersectObjects(registry.blockers, false).length > 0;
      }
      lostFor.current = offscreen || hidden ? lostFor.current + dt : 0;
      const panned = Math.hypot(c.pan.x, c.pan.z) > 1.2 && !c.recenter;
      f.lost = panned || lostFor.current > 1;
      f.offscreen = offscreen;
      f.sx = behind ? -v.ndc.x : v.ndc.x; // behind the camera: mirror so the arrow still points the right way
      f.sy = behind ? -v.ndc.y : v.ndc.y;
    }
    useTown.getState().setFocusLost(f.lost);
  });

  return null;
}
