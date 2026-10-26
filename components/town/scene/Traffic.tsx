"use client";
/* eslint-disable react-hooks/immutability -- R3F idiom: per-frame instance updates. */

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { runtime } from "../state";
import { STREET } from "../world/layout";
import { dynamicColliders } from "../world/physics";
import { CROSSWALK_ANGLES, CROSSWALK_HALF, signalRed } from "../world/signals";
import { cityAudio } from "../audio/engine";
import { getMats, type Mats } from "./materials";

const o = new THREE.Object3D();
const merged = (parts: THREE.BufferGeometry[]) => mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)))!;
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));
const box = (w: number, h: number, d: number, x: number, y: number, z: number, rx = 0) =>
  new THREE.BoxGeometry(w, h, d).rotateX(rx).translate(x, y, z);
const wheel = (r: number, x: number, y: number, z: number, w = 0.14) =>
  new THREE.CylinderGeometry(r, r, w, 14).rotateZ(Math.PI / 2).translate(x, y, z);

/* ── the four vehicle types ──────────────────────────────────────────────
 * Each type is a handful of merged, instanced parts (one InstancedMesh per
 * part material). Forward is +z. Bikes and motorbikes have rotating wheels;
 * bike riders pedal with simple two-bone legs.
 */
type Kind = "car" | "bike" | "moto" | "sports";
type Spec = { speed: number; len: number; width: number; lane: 0 | 1 };
const SPECS: Record<Kind, Spec> = {
  bike: { speed: 2.4, len: 1.5, width: 0.5, lane: 1 }, // curb lane
  car: { speed: 3.5, len: 2.15, width: 0.98, lane: 0 },
  moto: { speed: 4.4, len: 1.8, width: 0.55, lane: 0 },
  sports: { speed: 5.4, len: 2.3, width: 1.06, lane: 0 },
};
const LANES = [7.75, 9.05]; // inner (traffic) / outer (curb + bikes)
const CAR_COLORS = ["#F2E9DA", "#81D8D0", "#2B2A2E"];

type Part = { geo: THREE.BufferGeometry; mat: keyof Mats; tint?: boolean };

function carParts(): Part[] {
  return [
    { geo: merged([box(0.98, 0.4, 2.1, 0, 0.42, 0), box(0.88, 0.34, 1.12, 0, 0.79, -0.12), box(0.9, 0.08, 0.5, 0, 0.62, 0.8, -0.18)]), mat: "carPaint", tint: true },
    { geo: merged([box(0.9, 0.26, 1.0, 0, 0.81, -0.12)]), mat: "glassDark" },
    { geo: merged([box(1.0, 0.1, 2.14, 0, 0.25, 0), ...[-0.68, 0.68].flatMap((z) => [-0.46, 0.46].map((x) => wheel(0.2, x, 0.2, z)))]), mat: "tyre" },
    { geo: merged([-0.3, 0.3].map((x) => box(0.2, 0.1, 0.04, x, 0.48, 1.06))), mat: "lampGlow" },
    { geo: merged([-0.33, 0.33].map((x) => box(0.18, 0.09, 0.04, x, 0.5, -1.06))), mat: "tailLight" },
  ];
}
function sportsParts(): Part[] {
  return [
    {
      geo: merged([
        box(1.06, 0.3, 2.25, 0, 0.3, 0),
        box(0.86, 0.24, 0.92, 0, 0.56, -0.2, -0.06),
        box(1.0, 0.05, 0.24, 0, 0.66, -1.0),
        box(0.06, 0.16, 0.06, -0.38, 0.56, -1.0),
        box(0.06, 0.16, 0.06, 0.38, 0.56, -1.0),
        box(1.0, 0.06, 0.7, 0, 0.47, 0.75, -0.22),
      ]),
      mat: "sportPaint",
    },
    { geo: merged([box(0.88, 0.2, 0.84, 0, 0.58, -0.2, -0.06)]), mat: "glassDark" },
    { geo: merged([...[-0.72, 0.74].flatMap((z) => [-0.5, 0.5].map((x) => wheel(0.22, x, 0.22, z, 0.18)))]), mat: "tyre" },
    { geo: merged([-0.36, 0.36].map((x) => box(0.26, 0.06, 0.04, x, 0.38, 1.13))), mat: "lampGlow" },
    { geo: merged([box(0.9, 0.06, 0.04, 0, 0.42, -1.13)]), mat: "tailLight" },
  ];
}
function motoParts(): Part[] {
  return [
    { geo: merged([box(0.26, 0.28, 1.05, 0, 0.55, 0), box(0.3, 0.12, 0.5, 0, 0.78, -0.2), box(0.04, 0.55, 0.05, 0, 0.6, 0.55, 0.35)]), mat: "ink" },
    { geo: merged([box(0.32, 0.22, 0.46, 0, 0.8, 0.22)]), mat: "tiffany" }, // tank
    { geo: merged([box(0.62, 0.04, 0.04, 0, 1.0, 0.5)]), mat: "chrome" },
    // rider: jacket, helmet, arms reaching to the bars, legs on the pegs
    {
      geo: merged([
        new THREE.CapsuleGeometry(0.17, 0.32, 3, 8).rotateX(0.75).translate(0, 1.12, -0.05),
        box(0.09, 0.09, 0.5, -0.2, 1.08, 0.25, 0.35),
        box(0.09, 0.09, 0.5, 0.2, 1.08, 0.25, 0.35),
        box(0.12, 0.12, 0.45, -0.17, 0.72, 0.05, 0.4),
        box(0.12, 0.12, 0.45, 0.17, 0.72, 0.05, 0.4),
      ]),
      mat: "jacket",
    },
    { geo: merged([new THREE.SphereGeometry(0.17, 12, 10).translate(0, 1.43, 0.18)]), mat: "riderTop" }, // helmet
    { geo: merged([box(0.12, 0.08, 0.04, 0, 0.82, 0.83)]), mat: "lampGlow" },
    { geo: merged([box(0.12, 0.06, 0.04, 0, 0.72, -0.56)]), mat: "tailLight" },
  ];
}
function bikeParts(): Part[] {
  return [
    {
      geo: merged([
        box(0.05, 0.05, 0.62, 0, 0.62, 0.05, -0.15), // top tube
        box(0.05, 0.05, 0.66, 0, 0.48, 0.12, 0.62), // down tube
        box(0.05, 0.5, 0.05, 0, 0.55, -0.18), // seat tube
        box(0.04, 0.42, 0.04, 0, 0.52, 0.5, 0.25), // fork
        box(0.44, 0.04, 0.04, 0, 0.92, 0.42), // handlebar
        box(0.16, 0.05, 0.22, 0, 0.84, -0.22), // saddle
      ]),
      mat: "iron",
    },
    // rider torso + arms (upright, slightly forward), head + helmet
    {
      geo: merged([
        new THREE.CapsuleGeometry(0.15, 0.3, 3, 8).rotateX(0.32).translate(0, 1.22, -0.1),
        box(0.08, 0.08, 0.5, -0.17, 1.2, 0.18, 0.75),
        box(0.08, 0.08, 0.5, 0.17, 1.2, 0.18, 0.75),
      ]),
      mat: "riderTop",
    },
    { geo: merged([new THREE.SphereGeometry(0.13, 10, 8).translate(0, 1.58, 0.02)]), mat: "skinTone" },
    { geo: merged([new THREE.SphereGeometry(0.15, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2).translate(0, 1.62, 0.0)]), mat: "orange" }, // helmet
    { geo: merged([box(0.08, 0.06, 0.04, 0, 0.88, 0.5)]), mat: "lampGlow" },
    { geo: merged([box(0.06, 0.05, 0.03, 0, 0.66, -0.48)]), mat: "tailLight" },
  ];
}

const WHEEL_R: Record<"bike" | "moto", number> = { bike: 0.33, moto: 0.3 };
const WHEEL_Z: Record<"bike" | "moto", [number, number]> = { bike: [-0.5, 0.52], moto: [-0.62, 0.62] };

/**
 * Mixed traffic on the one-way loop (counter-clockwise), two lanes.
 *  - each type cruises at its own speed; bikes keep to the curb lane
 *  - a faster vehicle stuck behind a slower one changes lanes to pass
 *  - everyone stops before a crosswalk on red, and for Eshaan in the road
 *  - they're solid (moving colliders); headlights + taillights glow at night
 */
export function Traffic({ lowDetail }: { lowDetail: boolean }) {
  const m = getMats();
  const fleet = useMemo<Kind[]>(() => (lowDetail ? ["car", "bike", "moto", "sports"] : ["car", "bike", "car", "moto", "bike", "sports"]), [lowDetail]);
  const cars = useRef(
    fleet.map((kind, i) => ({
      kind,
      a: (i / fleet.length) * Math.PI * 2 + 0.2,
      v: SPECS[kind].speed,
      lane: SPECS[kind].lane as number, // current (eased) lane index 0..1
      targetLane: SPECS[kind].lane as number,
      blocked: 0,
      returnIn: 0,
      wheel: 0,
      crank: 0,
      bellCooldown: 3 + i,
      color: CAR_COLORS[i % CAR_COLORS.length],
    })),
  );
  const kinds = useMemo(() => {
    const index: Record<Kind, number[]> = { car: [], bike: [], moto: [], sports: [] };
    fleet.forEach((k, i) => index[k].push(i));
    return index;
  }, [fleet]);
  const parts = useMemo(() => ({ car: carParts(), sports: sportsParts(), moto: motoParts(), bike: bikeParts() }), []);
  // instanced meshes by type, filled by callback refs (a plain object, not a ref)
  const store = useMemo(
    () => ({
      meshes: { car: [], bike: [], moto: [], sports: [] } as Record<Kind, (THREE.InstancedMesh | null)[]>,
      wheels: { bike: null, moto: null } as Record<"bike" | "moto", THREE.InstancedMesh | null>,
    }),
    [],
  );
  const legs = useRef<THREE.InstancedMesh>(null);
  const beams = useRef<THREE.InstancedMesh>(null);
  const wheelGeo = useMemo(
    () => ({
      bike: merged([new THREE.TorusGeometry(WHEEL_R.bike, 0.03, 6, 20).rotateY(Math.PI / 2), box(0.02, WHEEL_R.bike * 2, 0.02, 0, 0, 0), box(0.02, 0.02, WHEEL_R.bike * 2, 0, 0, 0)]),
      moto: merged([new THREE.TorusGeometry(WHEEL_R.moto, 0.085, 8, 20).rotateY(Math.PI / 2), box(0.04, WHEEL_R.moto * 1.6, 0.04, 0, 0, 0)]),
    }),
    [],
  );
  const beamTex = useMemo(() => {
    const cv = document.createElement("canvas");
    cv.width = cv.height = 64;
    const g = cv.getContext("2d")!;
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, "rgba(255,236,190,1)");
    grad.addColorStop(1, "rgba(255,220,160,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(cv);
  }, []);

  const colored = useRef(false); // sedans get their colours once the mesh exists

  useFrame(({ clock }, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const t = clock.elapsedTime;
    const p = runtime.player;
    // flying overhead, he's not in the road: cars don't stop for him
    const pr = p.y > 1.2 ? 99 : Math.hypot(p.x, p.z);
    const pa = Math.atan2(p.z, p.x);
    const red = signalRed(t);
    const list = cars.current;
    dynamicColliders.length = 0;
    runtime.traffic.length = 0;

    if (!colored.current && store.meshes.car[0]) {
      const c = new THREE.Color();
      kinds.car.forEach((idx, k) => store.meshes.car[0]!.setColorAt(k, c.set(list[idx].color)));
      if (store.meshes.car[0]!.instanceColor) store.meshes.car[0]!.instanceColor.needsUpdate = true;
      colored.current = true;
    }

    for (const car of list) {
      const spec = SPECS[car.kind];
      const r = LANES[0] + (LANES[1] - LANES[0]) * car.lane;
      let target = spec.speed;

      // Eshaan in the road ahead (any lane he's actually in)
      if (pr > STREET.inner - 0.2 && pr < STREET.outer + 0.2 && Math.abs(pr - r) < spec.width / 2 + 0.9) {
        const ahead = wrap(pa - car.a) * r - spec.len / 2;
        if (ahead > -0.3 && ahead < 6) target = Math.min(target, Math.max(0, (ahead - 1.4) * 1.3));
      }
      // red light: stop before the crosswalk (unless already on it)
      if (red) {
        for (const c of CROSSWALK_ANGLES) {
          const toLine = wrap(c - car.a) * r - CROSSWALK_HALF - spec.len / 2 - 0.3;
          if (toLine > -0.15 && toLine < 7) target = Math.min(target, Math.max(0, toLine * 1.1));
        }
      }
      // following distance in the same lane
      let blockedBy = 0;
      for (const other of list) {
        if (other === car || Math.abs(other.lane - car.lane) > 0.5) continue;
        const gap = wrap(other.a - car.a) * r - (spec.len + SPECS[other.kind].len) / 2;
        if (gap > -0.5 && gap < 6) {
          target = Math.min(target, Math.max(0, (gap - 1.2) * 1.0));
          if (other.v < spec.speed * 0.8) blockedBy = Math.max(blockedBy, 1);
        }
      }
      // pass slower traffic by borrowing the other lane when it's clear
      if (blockedBy && !red) car.blocked += dt;
      else car.blocked = Math.max(0, car.blocked - dt);
      if (car.blocked > 1.2 && car.targetLane === SPECS[car.kind].lane) {
        const other = 1 - SPECS[car.kind].lane;
        const clear = list.every((o) => o === car || Math.abs(o.lane - other) > 0.5 || Math.abs(wrap(o.a - car.a) * LANES[other]) > 7);
        if (clear) {
          car.targetLane = other;
          car.returnIn = 3.2;
          car.blocked = 0;
        }
      }
      if (car.targetLane !== SPECS[car.kind].lane) {
        car.returnIn -= dt;
        const home = SPECS[car.kind].lane;
        const clear = list.every((o) => o === car || Math.abs(o.lane - home) > 0.5 || Math.abs(wrap(o.a - car.a) * LANES[home]) > 4.5);
        if (car.returnIn <= 0 && clear) car.targetLane = home;
      }
      car.lane += (car.targetLane - car.lane) * Math.min(1, dt * 1.6);

      car.v += (target - car.v) * Math.min(1, dt * (target < car.v ? 4.5 : 1.1));
      car.a += (car.v / r) * dt;
      car.wheel += (car.v / (car.kind === "bike" ? WHEEL_R.bike : WHEEL_R.moto)) * dt;
      car.crank += car.v * dt * 2.2;

      // the occasional bell, when Eshaan is close
      if (car.kind === "bike") {
        car.bellCooldown -= dt;
        const x = Math.cos(car.a) * r;
        const z = Math.sin(car.a) * r;
        if (car.bellCooldown <= 0 && Math.hypot(p.x - x, p.z - z) < 5.5) {
          cityAudio.bell();
          car.bellCooldown = 9 + Math.random() * 8;
        }
      }
    }

    // write instances
    const night = 1 - runtime.env.dayness;
    let beamK = 0;
    let legK = 0;
    const counters: Record<Kind, number> = { car: 0, bike: 0, moto: 0, sports: 0 };
    for (const car of list) {
      const spec = SPECS[car.kind];
      const r = LANES[0] + (LANES[1] - LANES[0]) * car.lane;
      const x = Math.cos(car.a) * r;
      const z = Math.sin(car.a) * r;
      // heading along the loop, plus a little steer while changing lanes
      const steer = (car.targetLane - car.lane) * 0.25;
      const yaw = Math.atan2(-Math.sin(car.a), Math.cos(car.a)) + steer;
      const lean = car.kind === "bike" || car.kind === "moto" ? -0.08 - steer * 0.4 : 0; // lean into the curve
      const k = counters[car.kind]++;
      o.position.set(x, 0, z);
      o.rotation.set(0, yaw, lean, "YXZ");
      o.scale.set(1, 1, 1);
      o.updateMatrix();
      const base = o.matrix.clone();
      for (const mesh of store.meshes[car.kind]) mesh?.setMatrixAt(k, base);

      if (car.kind === "bike" || car.kind === "moto") {
        const wm = store.wheels[car.kind];
        WHEEL_Z[car.kind].forEach((wz, wi) => {
          const local = new THREE.Matrix4().compose(
            new THREE.Vector3(0, WHEEL_R[car.kind as "bike" | "moto"], wz),
            new THREE.Quaternion().setFromEuler(new THREE.Euler(car.wheel, 0, 0)),
            new THREE.Vector3(1, 1, 1),
          );
          wm?.setMatrixAt(k * 2 + wi, base.clone().multiply(local));
        });
      }
      if (car.kind === "bike") {
        // two-bone legs: hip → knee → pedal on the crank
        const hip = new THREE.Vector3(0, 0.95, -0.18);
        for (const side of [-1, 1]) {
          const ang = car.crank + (side > 0 ? Math.PI : 0);
          const foot = new THREE.Vector3(side * 0.1, 0.36 + Math.sin(ang) * 0.17, 0.08 + Math.cos(ang) * 0.17);
          const h = hip.clone().setX(side * 0.1);
          const d = Math.min(0.86, h.distanceTo(foot));
          const along = foot.clone().sub(h).normalize();
          const bend = Math.sqrt(Math.max(0, 0.43 * 0.43 - (d / 2) * (d / 2)));
          const knee = h.clone().addScaledVector(along, d / 2).add(new THREE.Vector3(0, along.z, -along.y).normalize().multiplyScalar(-bend)); // knees forward
          for (const [a, b2] of [
            [h, knee],
            [knee, foot],
          ]) {
            const mid = a.clone().add(b2).multiplyScalar(0.5);
            const len = a.distanceTo(b2);
            const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b2.clone().sub(a).normalize());
            legs.current?.setMatrixAt(legK++, base.clone().multiply(new THREE.Matrix4().compose(mid, q, new THREE.Vector3(0.1, len, 0.1))));
          }
        }
      }
      // headlight pool on the road ahead (night)
      if (car.kind !== "bike" && beams.current) {
        o.position.set(x + Math.sin(yaw) * 2.6, 0.035, z + Math.cos(yaw) * 2.6);
        o.rotation.set(-Math.PI / 2, 0, -yaw);
        o.scale.set(car.kind === "moto" ? 1.6 : 2.4, 3.6, 1);
        o.updateMatrix();
        beams.current.setMatrixAt(beamK++, o.matrix);
      }

      dynamicColliders.push({ kind: "box", x, z, hw: spec.width / 2 + 0.04, hd: spec.len / 2 + 0.04, rot: yaw, h: 1.5 });
      runtime.traffic.push({ kind: car.kind, x, z, v: car.v });
    }
    for (const k of Object.keys(store.meshes) as Kind[]) for (const mesh of store.meshes[k]) if (mesh) mesh.instanceMatrix.needsUpdate = true;
    for (const wm of Object.values(store.wheels)) if (wm) wm.instanceMatrix.needsUpdate = true;
    if (legs.current) legs.current.instanceMatrix.needsUpdate = true;
    if (beams.current) {
      beams.current.instanceMatrix.needsUpdate = true;
      (beams.current.material as THREE.MeshBasicMaterial).opacity = night * 0.55;
      beams.current.visible = night > 0.03;
    }
  });

  const beamCount = fleet.filter((k) => k !== "bike").length;
  return (
    <>
      {(Object.keys(parts) as Kind[]).map((kind) =>
        kinds[kind].length
          ? parts[kind].map((part, pi) => (
              <instancedMesh
                key={`${kind}${pi}`}
                ref={(mesh) => {
                  store.meshes[kind][pi] = mesh;
                }}
                args={[part.geo, m[part.mat] as THREE.Material, kinds[kind].length]}
                castShadow
                frustumCulled={false}
              />
            ))
          : null,
      )}
      {(["bike", "moto"] as const).map((kind) =>
        kinds[kind].length ? (
          <instancedMesh
            key={`w${kind}`}
            ref={(mesh) => {
              store.wheels[kind] = mesh;
            }}
            args={[wheelGeo[kind], m.tyre, kinds[kind].length * 2]}
            castShadow
            frustumCulled={false}
          />
        ) : null,
      )}
      {kinds.bike.length > 0 && (
        <instancedMesh ref={legs} args={[undefined, m.trousers, kinds.bike.length * 4]} castShadow frustumCulled={false}>
          <boxGeometry args={[1, 1, 1]} />
        </instancedMesh>
      )}
      <instancedMesh ref={beams} args={[undefined, undefined, beamCount]} frustumCulled={false} renderOrder={2}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial map={beamTex} transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} />
      </instancedMesh>
    </>
  );
}

/**
 * Pigeons on the square: they peck about, and flutter up and away when he
 * walks too close, landing again a few seconds later.
 */
export function Pigeons({ lowDetail }: { lowDetail: boolean }) {
  const n = lowDetail ? 6 : 12;
  const ref = useRef<THREE.InstancedMesh>(null);
  const birds = useRef(
    Array.from({ length: n }, (_, i) => {
      const a = (i / n) * Math.PI * 2 + 0.3;
      const r = 3.6 + (i % 3) * 0.7;
      return { hx: Math.cos(a) * r, hz: Math.sin(a) * r, x: Math.cos(a) * r, z: Math.sin(a) * r, y: 0, yaw: a, fly: 0, t: i };
    }),
  );
  const geo = useMemo(
    () =>
      merged([
        new THREE.SphereGeometry(0.12, 8, 6).scale(1, 0.85, 1.45),
        new THREE.SphereGeometry(0.07, 8, 6).translate(0, 0.1, 0.15),
        new THREE.ConeGeometry(0.06, 0.16, 4).rotateX(-Math.PI / 2).translate(0, 0.02, -0.2),
      ]).translate(0, 0.12, 0),
    [],
  );

  useFrame(({ clock }, rawDt) => {
    const mesh = ref.current;
    if (!mesh) return;
    const dt = Math.min(rawDt, 0.05);
    const t = clock.elapsedTime;
    const p = runtime.player;
    birds.current.forEach((b, i) => {
      const near = Math.hypot(p.x - b.x, p.z - b.z) < 1.8;
      if (near && b.fly <= 0) b.fly = 4.5; // seconds aloft
      if (b.fly > 0) {
        b.fly -= dt;
        const up = Math.sin(Math.min(1, (4.5 - b.fly) / 4.5) * Math.PI);
        b.y = up * 3.2;
        b.x += Math.cos(b.yaw) * dt * 1.6 * up;
        b.z += Math.sin(b.yaw) * dt * 1.6 * up;
        if (b.fly <= 0) {
          b.x = b.hx + Math.sin(t + i) * 0.5;
          b.z = b.hz + Math.cos(t * 1.3 + i) * 0.5;
          b.y = 0;
        }
      }
      const peck = b.fly > 0 ? 0 : Math.max(0, Math.sin(t * 5 + i * 1.7)) ** 6 * 0.6;
      o.position.set(b.x, b.y, b.z);
      o.rotation.set(peck, b.yaw + Math.sin(t * 0.4 + i) * 0.6, 0);
      o.scale.setScalar(1);
      o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={ref} args={[geo, undefined, n]} castShadow frustumCulled={false}>
      <meshStandardMaterial color="#8C93A1" roughness={0.8} flatShading />
    </instancedMesh>
  );
}
