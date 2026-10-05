"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { runtime } from "../state";
import { rad } from "../world/layout";
import { resolve } from "../world/physics";

const o = new THREE.Object3D();
const merged = (parts: THREE.BufferGeometry[]) => mergeGeometries(parts.map((g) => (g.index ? g.toNonIndexed() : g)))!;

// the park: the open front arc, between the street and the promenade
const PARK = { a0: rad(48), a1: rad(132), r0: 11.8, r1: 19.2 };
function parkPoint(rnd: () => number) {
  const a = PARK.a0 + rnd() * (PARK.a1 - PARK.a0);
  const r = PARK.r0 + rnd() * (PARK.r1 - PARK.r0);
  return { x: Math.cos(a) * r, z: Math.sin(a) * r };
}
const seeded = (seed: number) => () => {
  seed = (seed * 16807) % 2147483647;
  return seed / 2147483647;
};

/* ── fireflies: drifting, flickering points in the park after dark ───── */
export function Fireflies({ lowDetail }: { lowDetail: boolean }) {
  const n = lowDetail ? 16 : 40;
  const ref = useRef<THREE.Points>(null);
  const data = useMemo(() => {
    const rnd = seeded(5);
    return Array.from({ length: n }, () => ({ ...parkPoint(rnd), y: 0.5 + rnd() * 1.8, ph: rnd() * 10, sp: 0.3 + rnd() * 0.5 }));
  }, [n]);
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    g.setAttribute("color", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    return g;
  }, [n]);
  const tex = useMemo(() => {
    const cv = document.createElement("canvas");
    cv.width = cv.height = 32;
    const g = cv.getContext("2d")!;
    const grad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.35, "rgba(255,255,255,0.6)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 32, 32);
    return new THREE.CanvasTexture(cv);
  }, []);

  useFrame(({ clock }) => {
    const pts = ref.current!;
    const night = runtime.env.night;
    pts.visible = night > 0.35;
    if (!pts.visible) return;
    const t = clock.elapsedTime;
    const pos = geo.getAttribute("position") as THREE.BufferAttribute;
    const col = geo.getAttribute("color") as THREE.BufferAttribute;
    data.forEach((f, i) => {
      const w = t * f.sp + f.ph;
      pos.setXYZ(i, f.x + Math.sin(w) * 0.8, f.y + Math.sin(w * 1.7) * 0.3, f.z + Math.cos(w * 0.8) * 0.8);
      const flick = Math.max(0, Math.sin(t * 2.2 + f.ph * 3)) ** 3 * (night - 0.35) * 2.6;
      col.setXYZ(i, 0.95 * flick, 1.0 * flick, 0.55 * flick);
    });
    pos.needsUpdate = true;
    col.needsUpdate = true;
  });

  return (
    <points ref={ref} geometry={geo} frustumCulled={false}>
      <pointsMaterial size={0.5} map={tex} vertexColors transparent depthWrite={false} blending={THREE.AdditiveBlending} />
    </points>
  );
}

/* ── the cat: an orange tabby who lives in the park ───────────────────── */
export function Cat() {
  const root = useRef<THREE.Group>(null);
  const body = useRef<THREE.Group>(null);
  const tail = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const legs = useRef<(THREE.Mesh | null)[]>([]);
  const mats = useMemo(
    () => ({
      fur: new THREE.MeshStandardMaterial({ color: "#E7883D", roughness: 0.9, flatShading: true }),
      stripe: new THREE.MeshStandardMaterial({ color: "#C4632A", roughness: 0.9, flatShading: true }),
      cream: new THREE.MeshStandardMaterial({ color: "#F6EFE3", roughness: 0.9, flatShading: true }),
      eye: new THREE.MeshStandardMaterial({ color: "#1E1917", roughness: 0.3 }),
    }),
    [],
  );
  const st = useRef({ x: 14 * Math.cos(rad(80)), z: 14 * Math.sin(rad(80)), yaw: 0, mode: "sit" as "walk" | "sit" | "flee" | "sleep", target: { x: 0, z: 0 }, until: 2, phase: 0, rnd: seeded(9) });

  useFrame(({ clock }, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const t = clock.elapsedTime;
    const c = st.current;
    const p = runtime.player;
    const dP = Math.hypot(p.x - c.x, p.z - c.z);
    const night = runtime.env.night > 0.7;

    if (dP < 1.7 && c.mode !== "flee") {
      // scamper off, away from him
      const ax = c.x - p.x;
      const az = c.z - p.z;
      const l = Math.hypot(ax, az) || 1;
      c.target = { x: c.x + (ax / l) * 4, z: c.z + (az / l) * 4 };
      c.mode = "flee";
      c.until = t + 1.6;
    }
    if (c.mode === "sit" || c.mode === "sleep") {
      if (t > c.until) {
        c.target = parkPoint(c.rnd);
        c.mode = "walk";
      }
    }
    let speed = 0;
    if (c.mode === "walk" || c.mode === "flee") {
      const dx = c.target.x - c.x;
      const dz = c.target.z - c.z;
      const d = Math.hypot(dx, dz);
      speed = c.mode === "flee" ? 3.4 : 1.1;
      if (d < 0.2 || (c.mode === "flee" && t > c.until)) {
        c.mode = night ? "sleep" : "sit";
        c.until = t + (night ? 25 : 3 + c.rnd() * 5);
        speed = 0;
      } else {
        const next = { x: c.x + (dx / d) * speed * dt, z: c.z + (dz / d) * speed * dt };
        resolve(next, 0.25);
        // stay in the park
        const r = Math.hypot(next.x, next.z);
        if (r > PARK.r0 - 0.3 && r < PARK.r1 + 0.6) {
          c.x = next.x;
          c.z = next.z;
        } else c.until = 0;
        c.yaw += (Math.atan2(dx, dz) - c.yaw + Math.PI * 3) % (Math.PI * 2) - Math.PI;
        c.yaw = Math.atan2(Math.sin(c.yaw), Math.cos(c.yaw));
      }
    }
    c.phase += dt * speed * 7;

    const g = root.current!;
    g.position.set(c.x, 0, c.z);
    g.rotation.y = c.yaw;
    const sleeping = c.mode === "sleep";
    const sitting = c.mode === "sit";
    body.current!.rotation.x = sitting ? -0.45 : 0;
    body.current!.position.y = sleeping ? -0.12 : sitting ? 0.03 : Math.abs(Math.sin(c.phase)) * 0.02;
    body.current!.scale.set(1, sleeping ? 0.8 : 1, sleeping ? 0.85 : 1);
    head.current!.rotation.set(sleeping ? 0.5 : sitting ? 0.35 : 0, sitting ? Math.sin(t * 0.6) * 0.5 : 0, 0);
    tail.current!.rotation.set(sleeping ? 1.2 : -0.6 + Math.sin(t * (speed ? 6 : 2)) * 0.25, sleeping ? 1.4 : Math.sin(t * 1.4) * 0.5, 0);
    legs.current.forEach((l, i) => {
      if (!l) return;
      l.visible = !sleeping;
      l.rotation.x = Math.sin(c.phase + (i % 2 ? Math.PI : 0) + (i > 1 ? Math.PI / 2 : 0)) * 0.6 * Math.min(1, speed);
    });
  });

  return (
    <group ref={root}>
      <group ref={body} position={[0, 0, 0]}>
        <mesh position={[0, 0.24, 0]} rotation-x={Math.PI / 2} material={mats.fur} castShadow>
          <capsuleGeometry args={[0.11, 0.3, 3, 8]} />
        </mesh>
        <mesh position={[0, 0.3, 0.02]} rotation-x={Math.PI / 2} scale={[1.02, 1, 0.3]} material={mats.stripe}>
          <capsuleGeometry args={[0.11, 0.12, 3, 8]} />
        </mesh>
        <group ref={head} position={[0, 0.34, 0.23]}>
          <mesh material={mats.fur} castShadow>
            <icosahedronGeometry args={[0.1, 1]} />
          </mesh>
          <mesh position={[0, -0.03, 0.07]} scale={[1, 0.7, 0.7]} material={mats.cream}>
            <sphereGeometry args={[0.055, 8, 6]} />
          </mesh>
          {[-1, 1].map((s) => (
            <group key={s}>
              <mesh position={[s * 0.055, 0.09, 0]} rotation-z={-s * 0.3} material={mats.fur}>
                <coneGeometry args={[0.035, 0.07, 4]} />
              </mesh>
              <mesh position={[s * 0.04, 0.02, 0.085]} material={mats.eye}>
                <sphereGeometry args={[0.013, 6, 4]} />
              </mesh>
            </group>
          ))}
        </group>
        <group ref={tail} position={[0, 0.27, -0.24]}>
          <mesh position={[0, 0.11, -0.04]} rotation-x={-0.4} material={mats.stripe}>
            <capsuleGeometry args={[0.025, 0.2, 3, 6]} />
          </mesh>
        </group>
        {[
          [-0.06, 0.14],
          [0.06, 0.14],
          [-0.06, -0.14],
          [0.06, -0.14],
        ].map(([x, z], i) => (
          <mesh
            key={i}
            ref={(m) => {
              legs.current[i] = m;
            }}
            position={[x, 0.08, z]}
            material={i < 2 ? mats.cream : mats.fur}
          >
            <cylinderGeometry args={[0.025, 0.022, 0.16, 6]} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/* ── birds: a small flock circling overhead by day ─────────────────────── */
export function Birds({ lowDetail }: { lowDetail: boolean }) {
  const n = lowDetail ? 4 : 8;
  const body = useRef<THREE.InstancedMesh>(null);
  const wingL = useRef<THREE.InstancedMesh>(null);
  const wingR = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(
    () => ({
      body: merged([new THREE.SphereGeometry(0.12, 8, 6).scale(0.8, 0.7, 1.6), new THREE.ConeGeometry(0.05, 0.14, 4).rotateX(Math.PI / 2).translate(0, 0, 0.22)]),
      wing: new THREE.BoxGeometry(0.42, 0.015, 0.16).translate(0.21, 0, 0),
    }),
    [],
  );
  const flock = useMemo(() => {
    const rnd = seeded(21);
    return Array.from({ length: n }, (_, i) => ({ r: 9 + rnd() * 6, y: 15 + rnd() * 5, ph: (i / n) * Math.PI * 2 + rnd() * 0.5, sp: 0.16 + rnd() * 0.05, flap: rnd() * 6 }));
  }, [n]);
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: "#3A3534", roughness: 0.8, flatShading: true }), []);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    const vis = runtime.env.night < 0.45; // they roost at night
    for (const r of [body, wingL, wingR]) if (r.current) r.current.visible = vis;
    if (!vis) return;
    flock.forEach((b, i) => {
      const a = b.ph + t * b.sp;
      const x = Math.cos(a) * b.r;
      const z = Math.sin(a) * b.r;
      const y = b.y + Math.sin(t * 0.7 + i) * 0.6;
      const yaw = Math.atan2(-Math.sin(a), Math.cos(a));
      o.position.set(x, y, z);
      o.rotation.set(0, yaw, 0.35);
      o.scale.setScalar(1);
      o.updateMatrix();
      body.current!.setMatrixAt(i, o.matrix);
      const flap = Math.sin(t * 9 + b.flap) * 0.7;
      for (const [ref, side] of [
        [wingL, -1],
        [wingR, 1],
      ] as const) {
        const w = o.matrix.clone().multiply(new THREE.Matrix4().makeRotationY(side > 0 ? 0 : Math.PI)).multiply(new THREE.Matrix4().makeRotationZ(flap));
        ref.current!.setMatrixAt(i, w);
      }
    });
    for (const r of [body, wingL, wingR]) r.current!.instanceMatrix.needsUpdate = true;
  });

  return (
    <>
      <instancedMesh ref={body} args={[geo.body, mat, n]} frustumCulled={false} />
      <instancedMesh ref={wingL} args={[geo.wing, mat, n]} frustumCulled={false} />
      <instancedMesh ref={wingR} args={[geo.wing, mat, n]} frustumCulled={false} />
    </>
  );
}
