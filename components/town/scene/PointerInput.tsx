"use client";
/* eslint-disable react-hooks/immutability -- R3F idiom: imperative per-frame updates. */

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { runtime, useTown } from "../state";
import { WALK_RADIUS, type BuildingId } from "../world/layout";
import { registry } from "../world/registry";
import { getMats } from "./materials";
import { enterBuilding } from "./Player";
import { setPov } from "../controls";

const DRAG_PX = 7;
const PITCH_MIN = 0.14;
const PITCH_MAX = 1.05;

/**
 * Canvas pointer handling:
 *  - drag (mouse or one finger) orbits the camera through a full 360°
 *  - in POV: pointer-locked mouse look on desktop; otherwise drag-to-look
 *    (on touch, only drags that start on the right half, so the joystick side
 *    stays free); losing pointer lock (Esc) returns to third person
 *  - a click / tap without dragging walks there; on a building it walks to
 *    that door (or enters, if already there)
 *  - pan (focus point moves off Eshaan): right- or middle-drag, Shift + drag,
 *    Shift + two-finger scroll on a trackpad, two-finger drag on touch
 *  - wheel and pinch zoom between the camera's min/max distance
 *  - click / tap Eshaan himself to bring the camera back to him
 * Also draws a small ring where a click-to-walk lands.
 */
export function PointerInput() {
  const { gl, camera } = useThree();
  const marker = useRef<THREE.Mesh>(null);
  const markerT = useRef(1);

  useEffect(() => {
    const el = gl.domElement;
    el.style.touchAction = "none";
    const pointers = new Map<number, { x: number; y: number }>();
    let start: { x: number; y: number; t: number } | null = null;
    let dragged = false;
    let pinch = 0;
    let panning = false;
    let mid: { x: number; y: number } | null = null;
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const hitPoint = new THREE.Vector3();
    const c = runtime.camera;
    const touch = window.matchMedia("(pointer: coarse)").matches;
    const pov = () => useTown.getState().pov;
    // the intro ignores every pointer; inside a cutaway the room's own objects take clicks
    const locked = () => useTown.getState().intro || useTown.getState().interior !== null;
    let lookAllowed = true;
    let hadLock = false;

    /** screen drag → move the focus point across the ground (drag the world) */
    const pan = (dx: number, dy: number) => {
      const k = c.dist * 0.0017;
      const rx = Math.cos(c.yaw);
      const rz = -Math.sin(c.yaw);
      const fx = -Math.sin(c.yaw);
      const fz = -Math.cos(c.yaw);
      c.pan.x += -rx * dx * k + fx * dy * k;
      c.pan.z += -rz * dx * k + fz * dy * k;
      c.recenter = false;
      c.autoTurn = null;
    };
    const look = (dx: number, dy: number, k: number) => {
      c.yaw -= dx * k;
      c.look = THREE.MathUtils.clamp(c.look - dy * k, -1.25, 1.25);
    };
    const onLockedMove = (e: MouseEvent) => {
      if (document.pointerLockElement === el) look(e.movementX, e.movementY, 0.0024);
    };
    const onLockChange = () => {
      if (document.pointerLockElement === el) hadLock = true;
      else if (hadLock) {
        hadLock = false;
        if (pov()) setPov(false); // Esc
      }
    };

    const onDown = (e: PointerEvent) => {
      if (locked()) return;
      if (document.pointerLockElement === el) return; // mouse look owns the pointer
      el.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 1) {
        start = { x: e.clientX, y: e.clientY, t: performance.now() };
        dragged = false;
        lookAllowed = !(pov() && touch && e.clientX < window.innerWidth / 2);
        panning = !pov() && (e.button === 1 || e.button === 2 || e.shiftKey);
      } else if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        pinch = Math.hypot(a.x - b.x, a.y - b.y);
        mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        dragged = true; // a pinch is never a tap
      }
    };

    const onMove = (e: PointerEvent) => {
      const prev = pointers.get(e.pointerId);
      if (!prev || locked()) return;
      const cur = { x: e.clientX, y: e.clientY };
      pointers.set(e.pointerId, cur);
      if (pointers.size === 2) {
        const [a, b] = [...pointers.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinch > 0) c.dist = THREE.MathUtils.clamp(c.dist * (pinch / d), c.minDist, c.maxDist);
        pinch = d;
        // two-finger drag pans (the midpoint moves); pinch still zooms
        const m2 = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        if (mid && !pov()) pan(m2.x - mid.x, m2.y - mid.y);
        mid = m2;
        return;
      }
      if (start && !dragged && Math.hypot(cur.x - start.x, cur.y - start.y) > DRAG_PX) dragged = true;
      if (dragged) {
        c.autoTurn = null; // the visitor takes over
        if (pov()) {
          if (lookAllowed) look(cur.x - prev.x, cur.y - prev.y, 0.0055);
        } else if (panning) {
          pan(cur.x - prev.x, cur.y - prev.y);
        } else {
          c.yaw -= (cur.x - prev.x) * 0.0065;
          c.pitch = THREE.MathUtils.clamp(c.pitch + (cur.y - prev.y) * 0.0045, PITCH_MIN, PITCH_MAX);
        }
      }
    };

    const onUp = (e: PointerEvent) => {
      pointers.delete(e.pointerId);
      if (locked()) {
        start = null;
        return;
      }
      if (pointers.size < 2) {
        pinch = 0;
        mid = null;
      }
      if (!start || dragged || pointers.size > 0) {
        if (pointers.size === 0) start = null;
        return;
      }
      const quick = performance.now() - start.t < 600;
      start = null;
      if (!quick) return;
      const rect = el.getBoundingClientRect();
      ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);

      // clicked Eshaan: bring the camera back to him
      if (registry.player && ray.intersectObject(registry.player, false).length) {
        c.recenter = true;
        return;
      }

      const building = ray.intersectObjects(registry.blockers, false)[0];
      const groundHit = ray.ray.intersectPlane(ground, hitPoint);
      const groundDist = groundHit ? camera.position.distanceTo(hitPoint) : Infinity;
      const id = building?.object.userData.buildingId as BuildingId | undefined;
      if (building && id && building.distance < groundDist) {
        if (useTown.getState().nearDoor === id) enterBuilding(id);
        else useTown.getState().travelTo(id);
        return;
      }
      if (groundHit && Math.hypot(hitPoint.x, hitPoint.z) < WALK_RADIUS) {
        runtime.input.walkTo = { x: hitPoint.x, z: hitPoint.z };
        marker.current?.position.set(hitPoint.x, 0.04, hitPoint.z);
        markerT.current = 0;
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (pov() || locked()) return;
      if (e.shiftKey) {
        // Shift + two-finger scroll pans (browsers may swap the axes under Shift)
        pan(-(e.deltaX || 0) * 0.6, -(e.deltaY || 0) * 0.6);
        return;
      }
      c.dist = THREE.MathUtils.clamp(c.dist * (1 + e.deltaY * 0.0012), c.minDist, c.maxDist);
    };

    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", onUp);
    el.addEventListener("wheel", onWheel, { passive: false });
    const noMenu = (e: Event) => e.preventDefault(); // right-drag pans
    el.addEventListener("contextmenu", noMenu);
    document.addEventListener("mousemove", onLockedMove);
    document.addEventListener("pointerlockchange", onLockChange);
    return () => {
      document.removeEventListener("mousemove", onLockedMove);
      document.removeEventListener("pointerlockchange", onLockChange);
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", onUp);
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("contextmenu", noMenu);
    };
  }, [gl, camera]);

  // click-to-walk marker: a tiffany ring that pops and fades
  useFrame((_, dt) => {
    const m = marker.current;
    if (!m) return;
    markerT.current = Math.min(1, markerT.current + dt * 1.6);
    const t = markerT.current;
    m.visible = t < 1;
    m.scale.setScalar(0.6 + t * 0.8);
    (m.material as THREE.MeshBasicMaterial).opacity = 1 - t;
  });

  return (
    <mesh ref={marker} rotation-x={-Math.PI / 2} visible={false}>
      <ringGeometry args={[0.32, 0.42, 32]} />
      <meshBasicMaterial color={getMats().tiffanyDeep.color} transparent depthWrite={false} />
    </mesh>
  );
}
